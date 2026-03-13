import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About VerifySkn",
  description:
    "Learn how VerifySkn helps you verify skincare product authenticity, why counterfeit skincare is dangerous, and how brands can partner with us.",
};

// ── Section heading ───────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-fraunces text-3xl font-semibold text-text-primary">
      {children}
    </h2>
  );
}

// ── How It Works step ─────────────────────────────────────────

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
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div>
        <p className="font-mono text-xs tracking-widest text-text-secondary">
          {number}
        </p>
        <h3 className="mt-1 font-fraunces text-xl font-semibold text-primary">
          {title}
        </h3>
      </div>
      <p className="font-rethink text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

// ── Danger fact ───────────────────────────────────────────────

function DangerFact({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
      <span className="font-rethink text-sm leading-relaxed text-text-secondary">
        {children}
      </span>
    </li>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section className="bg-primary py-20 text-white">
        <div className="mx-auto max-w-3xl px-6">
          <p className="font-mono text-xs uppercase tracking-widest text-white/50">
            About
          </p>
          <h1 className="mt-3 font-fraunces text-5xl font-semibold leading-tight">
            Protecting Skin,<br />One Scan at a Time
          </h1>
          <p className="mt-5 max-w-xl font-rethink text-lg leading-relaxed text-white/70">
            VerifySkn is a free product verification tool built to help
            consumers identify counterfeit and mislabelled skincare before it
            causes harm.
          </p>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <SectionHeading>How VerifySkn Works</SectionHeading>
          <p className="mt-2 font-rethink text-sm text-text-secondary">
            Three steps between you and a confident answer.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Step
              number="01"
              title="Scan the Barcode"
              description="Use your camera to scan the EAN-13 or UPC barcode on the product packaging, or type it in manually."
            />
            <Step
              number="02"
              title="AI Verification"
              description="We cross-reference the barcode against our database of verified products, then apply an AI model trained on packaging authenticity signals."
            />
            <Step
              number="03"
              title="Get Your Verdict"
              description="Receive an instant verdict — Authentic, Unverified, or Suspicious — along with a confidence score and specific packaging tips."
            />
          </div>
        </div>
      </section>

      {/* ── Why dangerous ── */}
      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto max-w-3xl px-6">
          <SectionHeading>Why Counterfeit Skincare is Dangerous</SectionHeading>
          <p className="mt-3 font-rethink text-sm leading-relaxed text-text-secondary">
            Counterfeit skincare is not just an economic issue — it is a public
            health risk. Unlike genuine products, counterfeits are produced
            without safety testing, quality controls, or regulatory oversight.
          </p>

          <ul className="mt-6 flex flex-col gap-3">
            <DangerFact>
              Counterfeit products frequently contain undisclosed ingredients
              including mercury, industrial bleaching agents, undeclared steroids,
              and carcinogenic compounds.
            </DangerFact>
            <DangerFact>
              Prolonged exposure to mercury in fake skin-lightening products can
              cause permanent kidney damage, neurological harm, and organ failure.
            </DangerFact>
            <DangerFact>
              Steroids added to counterfeit creams can thin the skin, cause
              hormonal imbalances, and lead to steroid-dependency syndrome.
            </DangerFact>
            <DangerFact>
              Counterfeit sunscreens often provide little to no UV protection,
              significantly increasing the risk of sun damage and skin cancer.
            </DangerFact>
            <DangerFact>
              The World Health Organization estimates that up to 1 in 10 medical
              products in low- and middle-income countries is substandard or
              falsified — with cosmetics and skincare following similar patterns
              in unregulated markets.
            </DangerFact>
          </ul>

          <div
            className="mt-8 rounded-xl border-l-4 px-5 py-4"
            style={{ borderLeftColor: "#1A3C2E", backgroundColor: "rgba(26,60,46,0.05)" }}
          >
            <p className="font-rethink text-sm leading-relaxed text-text-primary">
              Always purchase skincare from authorised retailers, pharmacies, and
              brand-owned stores. When in doubt, scan before you apply.
            </p>
          </div>
        </div>
      </section>

      {/* ── Brand partnership ── */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <h2 className="font-fraunces text-2xl font-semibold text-primary">
              Are you a brand?
            </h2>
            <p className="mt-2 font-rethink text-sm leading-relaxed text-text-secondary">
              Partner with VerifySkn to list your products in our verified
              database. Give your customers confidence and reduce the impact of
              counterfeiting on your brand. Brand partners get access to a
              dedicated portal with scan analytics, counterfeit reports for
              their products, and a Verified Partner badge.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="mailto:dikethelmak@gmail.com?subject=Brand%20Partnership%20Application&body=Hi%20VerifySkn%20team%2C%0A%0AI%27d%20like%20to%20apply%20for%20a%20brand%20partnership.%0A%0ABrand%20name%3A%0AWebsite%3A%0AContact%20name%3A%0A"
                className="rounded-xl bg-primary px-6 py-2.5 font-rethink text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Apply for Brand Partnership
              </a>
              <Link
                href="/scan"
                className="rounded-xl border border-border px-6 py-2.5 font-rethink text-sm font-medium text-text-secondary transition-colors hover:bg-background"
              >
                Try the Scanner
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="border-t border-border bg-surface py-12">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="font-rethink text-sm text-text-secondary">
            Questions, press enquiries, or data removal requests?
          </p>
          <a
            href="mailto:dikethelmak@gmail.com"
            className="mt-2 inline-block font-mono text-sm text-primary hover:underline"
          >
            dikethelmak@gmail.com
          </a>
        </div>
      </section>
    </main>
  );
}
