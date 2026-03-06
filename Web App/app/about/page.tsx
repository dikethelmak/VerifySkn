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
  icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          {icon}
        </div>
        <div>
          <p className="font-mono text-xs tracking-widest text-text-secondary">
            {number}
          </p>
          <h3 className="mt-0.5 font-fraunces text-xl font-semibold text-primary">
            {title}
          </h3>
        </div>
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
      <section className="bg-primary px-6 py-20 text-white">
        <div className="mx-auto max-w-2xl">
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
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <SectionHeading>How VerifySkn Works</SectionHeading>
          <p className="mt-2 font-rethink text-sm text-text-secondary">
            Three steps between you and a confident answer.
          </p>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Step
              number="01"
              title="Scan the Barcode"
              description="Use your camera to scan the EAN-13 or UPC barcode on the product packaging, or type it in manually."
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1A3C2E"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5Z"
                  />
                  <path d="M6.75 6.75h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75Z" />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z"
                  />
                  <path d="M6.75 16.5h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                </svg>
              }
            />
            <Step
              number="02"
              title="AI Verification"
              description="We cross-reference the barcode against our database of verified products, then apply an AI model trained on packaging authenticity signals."
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1A3C2E"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
                  />
                </svg>
              }
            />
            <Step
              number="03"
              title="Get Your Verdict"
              description="Receive an instant verdict — Authentic, Unverified, or Suspicious — along with a confidence score and specific packaging tips."
              icon={
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1A3C2E"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* ── Why dangerous ── */}
      <section className="border-t border-border bg-surface px-6 py-16">
        <div className="mx-auto max-w-3xl">
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
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <div
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(201,168,76,0.12)" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C9A84C"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21"
                />
              </svg>
            </div>

            <h2 className="mt-4 font-fraunces text-2xl font-semibold text-primary">
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
              <Link
                href="/auth/signup"
                className="rounded-xl bg-primary px-6 py-2.5 font-rethink text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Apply for Brand Partnership
              </Link>
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
      <section className="border-t border-border bg-surface px-6 py-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-rethink text-sm text-text-secondary">
            Questions, press enquiries, or data removal requests?
          </p>
          <a
            href="mailto:hello@verifyskn.com"
            className="mt-2 inline-block font-mono text-sm text-primary hover:underline"
          >
            hello@verifyskn.com
          </a>
        </div>
      </section>
    </main>
  );
}
