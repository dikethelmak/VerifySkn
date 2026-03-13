import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VerifySkn — Scan Skincare Products for Authenticity",
  description:
    "Instantly verify skincare product authenticity. Scan any barcode and our AI cross-references it against our verified database in seconds.",
  openGraph: {
    title: "VerifySkn — Scan Skincare Products for Authenticity",
    description:
      "Instantly verify skincare product authenticity. Scan any barcode and our AI cross-references it against our verified database in seconds.",
  },
};

export default async function HomePage() {

  return (
    <main>
      {/* ── Hero ── */}
      <section className="bg-primary px-6 py-24 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-fraunces text-5xl font-semibold leading-tight">
            Know What&apos;s Going On Your Skin
          </h1>
          <p className="mt-5 font-rethink text-lg leading-relaxed text-white/75">
            Instantly verify skincare product authenticity. Scan any barcode —
            we cross-reference it against our database and AI-verify the result
            in seconds.
          </p>
          <Link
            href="/scan"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 font-rethink text-base font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#C9A84C", color: "#1A3C2E" }}
          >
            <ScanIcon className="h-5 w-5" />
            Scan a Product
          </Link>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-fraunces text-3xl font-semibold text-text-primary">
            How It Works
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Step
              number="01"
              title="Scan the Barcode"
              description="Point your camera at the EAN-13 or UPC barcode on the product packaging — or type it manually."
            />
            <Step
              number="02"
              title="AI Verification"
              description="We cross-reference against our database of verified products, then run an AI authenticity analysis."
            />
            <Step
              number="03"
              title="Get Your Result"
              description="Receive an instant verdict — Authentic, Unverified, or Suspicious — with packaging tips and confidence score."
            />
          </div>
        </div>
      </section>

    </main>
  );
}

// ── Sub-components ───────────────────────────────────────────

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
    <div className="rounded-2xl border border-border bg-surface p-6">
      <p className="font-mono text-xs tracking-widest text-text-secondary">{number}</p>
      <h3 className="mt-3 font-fraunces text-xl font-semibold text-primary">{title}</h3>
      <p className="mt-2 font-rethink text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}


function ScanIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5ZM6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z"
      />
    </svg>
  );
}
