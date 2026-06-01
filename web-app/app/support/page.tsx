import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — VerifySkn",
  description:
    "Book a consultation with the VerifySkn team, report a counterfeit product, or get in touch with us directly.",
};

const BOOKING_URL = "https://calendar.app.google/sLinchWrpXCdTcPt6";

// ── Card ──────────────────────────────────────────────────────

function SupportCard({
  eyebrow,
  title,
  description,
  cta,
  href,
  external,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  external?: boolean;
}) {
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-6">
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">
          {eyebrow}
        </p>
        <h2 className="font-syne text-xl font-semibold text-text-primary">
          {title}
        </h2>
      </div>
      <p className="flex-1 text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
      <Link
        href={href}
        {...linkProps}
        className="self-start rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        {cta}
      </Link>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12 md:px-8 sm:space-y-12">

      {/* ── Hero ── */}
      <section className="space-y-4">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">
          Support
        </p>
        <h1 className="font-syne text-2xl font-semibold leading-tight text-text-primary sm:text-3xl md:text-4xl">
          How can we help?
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-text-secondary">
          Whether you need a second opinion on a product, want to report a fake,
          or just have a question — we&apos;re here.
        </p>
      </section>

      <div className="border-t border-border" />

      {/* ── Cards ── */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SupportCard
          eyebrow="01 — Consultancy"
          title="Book a consultation"
          description="Speak directly with our team. We'll walk you through a product check, answer questions about our verification process, or help you assess a suspicious purchase."
          cta="Book a call"
          href={BOOKING_URL}
          external
        />
        <SupportCard
          eyebrow="02 — Contact"
          title="Get in touch"
          description="General questions, press enquiries, brand partnerships, or anything else — reach us directly by email and we'll get back to you."
          cta="Email us"
          href="mailto:dikethelmak@gmail.com"
          external
        />
      </section>

      <div className="border-t border-border" />

      {/* ── Response time note ── */}
      <section className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">
          Response times
        </p>
        <p className="text-sm leading-relaxed text-text-secondary">
          Consultation bookings are confirmed within 24 hours. Email responses
          within 2 business days.
        </p>
      </section>

    </main>
  );
}
