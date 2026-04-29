import React from "react";
import { Link } from "react-router-dom";

function Landing() {
  return (
    <div>
      <section className="hero">
        <div>
          <span className="hero-eyebrow">
            <span aria-hidden>●</span> Now scanning receipts
          </span>
          <h1>
            Settle up with friends, <em>without the spreadsheet.</em>
          </h1>
          <p className="hero-sub">
            IGES tracks shared expenses for trips, roommates, and dinner crews —
            then tells everyone exactly what they owe. Snap a receipt, split it
            evenly or your way, and let gentle reminders do the rest.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-accent">
              Get started — it&apos;s free
            </Link>
            <a href="#features" className="btn btn-ghost">
              See how it works
            </a>
          </div>
        </div>

        <aside className="hero-card" aria-label="Sample group balances">
          <h3>Spring Break · Miami</h3>
          <div className="hero-stack">
            <div className="mini-row">
              <div>
                <div className="desc">Beach house · 3 nights</div>
                <div className="who">Paid by Maya</div>
              </div>
              <span className="amount neg">−$184.50</span>
            </div>
            <div className="mini-row">
              <div>
                <div className="desc">Sushi at Komodo</div>
                <div className="who">Paid by you</div>
              </div>
              <span className="amount pos">+$62.25</span>
            </div>
            <div className="mini-row">
              <div>
                <div className="desc">Uber from MIA</div>
                <div className="who">Paid by Jordan</div>
              </div>
              <span className="amount neg">−$14.80</span>
            </div>
            <div
              className="mini-row"
              style={{ background: "var(--accent-soft)", borderColor: "#bde0cf" }}
            >
              <div>
                <div className="desc" style={{ color: "var(--accent-2)" }}>
                  You owe Maya
                </div>
                <div className="who">Settles with one tap</div>
              </div>
              <span className="amount neg">$137.05</span>
            </div>
          </div>
        </aside>
      </section>

      <section id="features" style={{ marginTop: 60 }}>
        <div className="section-eyebrow">What it does</div>
        <h2 style={{ fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
          Built for groups that share everything except the math.
        </h2>

        <div className="feature-grid">
          <div className="feature">
            <div className="ico">$</div>
            <h3>Smart splits</h3>
            <p>
              Split equally, by percentage, or with custom amounts — IGES
              handles the rounding and keeps every cent accounted for.
            </p>
          </div>
          <div className="feature">
            <div className="ico">⌬</div>
            <h3>Receipt OCR</h3>
            <p>
              Snap a photo of a receipt and IGES pulls the total automatically.
              Powered by Tesseract — no manual entry needed.
            </p>
          </div>
          <div className="feature">
            <div className="ico">~</div>
            <h3>Gentle reminders</h3>
            <p>
              Friendly nudges based on real balances — never spammy, never
              passive-aggressive. Dismissable per group.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Landing;
