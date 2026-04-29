"""Receipt OCR via Tesseract."""
import re


_AMOUNT_RE = re.compile(r"(?<![\d.])\$?\s*(\d{1,5}(?:[.,]\d{2}))(?!\d)")
_PRIMARY_KEYWORDS = (
    "grand total",
    "total due",
    "amount due",
    "balance due",
    "total",
    "amount",
    "balance",
)
_SECONDARY_KEYWORDS = ("subtotal", "sub total", "sub-total")
_EXCLUDE_KEYWORDS = ("tax", "tip", "change", "cash", "card")


def _to_float(raw):
    try:
        return float(raw.replace(",", "."))
    except (AttributeError, ValueError):
        return None


def _amounts_in(line):
    found = []
    for match in _AMOUNT_RE.findall(line):
        value = _to_float(match)
        if value is not None:
            found.append(value)
    return found


def extract_receipt_total(image_stream):
    """Extract the total amount from a receipt image.

    Strategy (in order):
      1. Lines containing strong total keywords ("grand total", "total due", "total"...)
      2. Lines containing weaker keywords ("subtotal") as a fallback
      3. The largest standalone $X.XX amount on the receipt

    Lines mentioning "tax", "tip", "change", "cash", or "card" are skipped
    while searching for keyword matches so we don't pick those up by mistake.

    Requires Tesseract installed on the system + pytesseract + Pillow.
    Returns float or None.
    """
    try:
        import pytesseract
        from PIL import Image
    except ImportError:
        return None

    try:
        image = Image.open(image_stream)
        text = pytesseract.image_to_string(image)
    except Exception:
        return None

    if not text:
        return None

    primary = None
    secondary = None
    all_amounts = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        lower = line.lower()
        amounts = _amounts_in(line)
        all_amounts.extend(amounts)

        if not amounts:
            continue

        if any(k in lower for k in _EXCLUDE_KEYWORDS) and not any(
            k in lower for k in _PRIMARY_KEYWORDS
        ):
            continue

        if any(k in lower for k in _PRIMARY_KEYWORDS):
            primary = amounts[-1]
        elif any(k in lower for k in _SECONDARY_KEYWORDS):
            secondary = amounts[-1]

    if primary is not None:
        return primary
    if secondary is not None:
        return secondary
    if all_amounts:
        return max(all_amounts)
    return None


def categorize_expense(description):
    """Very simple keyword-based categorization stub."""
    d = description.lower()
    if any(k in d for k in ("pizza", "restaurant", "dinner", "lunch", "cafe")):
        return "food"
    if any(k in d for k in ("uber", "lyft", "taxi", "gas", "flight", "train")):
        return "transport"
    if any(k in d for k in ("hotel", "airbnb", "lodging")):
        return "lodging"
    if any(k in d for k in ("grocery", "walmart", "target", "kroger")):
        return "groceries"
    return "uncategorized"
