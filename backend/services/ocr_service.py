"""Receipt OCR via Tesseract."""
import re


def extract_receipt_total(image_stream):
    """Extract the total amount from a receipt image.

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

    # Look for a line where "total" appears as a word on its own (i.e. not
    # inside "subtotal"), then grab the last numeric value on that line.
    total = None
    for line in text.splitlines():
        lower = line.lower()
        if re.search(r"\btotal\b", lower) and "subtotal" not in lower:
            matches = re.findall(r"\d+\.\d{2}", line)
            if matches:
                total = float(matches[-1])
    return total


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
