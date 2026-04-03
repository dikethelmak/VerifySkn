import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — VerifySkn",
  description:
    "Learn how VerifySkn helps you verify skincare product authenticity, why counterfeit skincare is dangerous, and how brands can partner with us.",
};

// ── Step card ─────────────────────────────────────────────────

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6">
      <div>
        <p className="font-mono text-xs tracking-widest text-text-secondary">
          {number}
        </p>
        <h3 className="mt-1 font-syne text-base font-semibold text-lime">
          {title}
        </h3>
      </div>
      <p className="font-syne text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-8 sm:py-12 space-y-10 sm:space-y-12">

      {/* ── Hero ── */}
      <section className="space-y-4">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">
          About
        </p>
        <h1 className="font-syne text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight text-text-primary">
          Protecting Skin,<br />One Scan at a Time
        </h1>
        <p className="font-syne text-base leading-relaxed text-text-secondary">
          VerifySkn is a free tool that helps you verify skincare authenticity
          before it reaches your skin.
        </p>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-border" />

      {/* ── How it works + Why it matters ── */}
      <section className="space-y-10">
        <div className="space-y-6">
          <h2 className="font-syne text-xl sm:text-2xl font-semibold text-text-primary">
            How It Works
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Step
              number="01"
              title="Scan the Barcode"
              description="Point your camera at the EAN-13 or UPC barcode on the packaging, or type it in manually."
            />
            <Step
              number="02"
              title="AI Verification"
              description="We check the barcode against our verified product database and apply AI trained on packaging authenticity signals."
            />
            <Step
              number="03"
              title="Get Your Verdict"
              description="Receive an instant verdict: Authentic, Unverified, or Suspicious. With a confidence score."
            />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-syne text-xl sm:text-2xl font-semibold text-text-primary">
            Why It Matters
          </h2>
          <p className="font-syne text-sm leading-relaxed text-text-secondary">
            Counterfeit skincare is a public health risk. Fakes are produced
            without safety testing, quality controls, or regulatory oversight.
            The WHO estimates 1 in 10 medical products in low- and
            middle-income countries is substandard or falsified.
          </p>
          <div
            className="rounded-xl border-l-4 px-5 py-4"
            style={{ borderLeftColor: "#7dc98a", backgroundColor: "rgba(125,201,138,0.07)" }}
          >
            <p className="font-syne text-sm leading-relaxed text-text-primary">
              Always buy from authorised retailers and brand-owned stores. When
              in doubt, scan before you apply.
            </p>
          </div>
        </div>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-border" />

      {/* ── Founder ── */}
      <section className="space-y-4">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">
          Founder
        </p>
        <h2 className="font-syne text-2xl font-semibold text-text-primary">
          Thelma Dike, Lagos Nigeria
        </h2>
        <p className="font-syne text-sm leading-relaxed text-text-secondary">
          After moving to a new city, I kept buying the same products that had
          always worked on my skin. A month passed and nothing changed. I
          switched vendors and within a week, the results were back. That was
          the moment I understood what had actually happened: the first batch
          was fake. Same packaging, same labels, completely different product.
          I built VerifySkn so no one else has to spend weeks wondering why
          their skincare stopped working.
        </p>
      </section>

      {/* ── Divider ── */}
      <div className="border-t border-border" />

      {/* ── Contact ── */}
      <section>
        <p className="font-syne text-sm text-text-secondary">
          Questions, press enquiries, or data removal requests?
        </p>
        <a
          href="mailto:dikethelmak@gmail.com"
          className="mt-2 inline-block font-mono text-sm text-lime hover:underline"
        >
          dikethelmak@gmail.com
        </a>
      </section>

    </main>
  );
}
