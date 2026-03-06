import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 py-20 text-center">
      {/* Illustration */}
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        aria-hidden
        className="text-border"
      >
        <circle cx="36" cy="36" r="35" stroke="currentColor" strokeWidth="2" />
        {/* Magnifying glass */}
        <circle
          cx="32"
          cy="32"
          r="12"
          stroke="#1A3C2E"
          strokeWidth="2.5"
          strokeOpacity="0.3"
        />
        <path
          d="M41 41L50 50"
          stroke="#1A3C2E"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.3"
        />
        {/* Question mark inside */}
        <text
          x="32"
          y="37"
          textAnchor="middle"
          fontSize="14"
          fontFamily="serif"
          fill="#1A3C2E"
          fillOpacity="0.4"
        >
          ?
        </text>
      </svg>

      {/* Wordmark */}
      <div className="mt-8 flex items-center gap-2">
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" aria-hidden>
          <rect width="32" height="32" rx="7" fill="#1A3C2E" />
          <polyline
            points="6,7 16,25 26,7"
            fill="none"
            stroke="#C9A84C"
            strokeWidth="4.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="font-fraunces text-lg font-semibold text-primary">
          VerifySkn
        </span>
      </div>

      <h1 className="mt-5 font-fraunces text-4xl font-semibold text-text-primary">
        Page not found
      </h1>
      <p className="mt-3 max-w-sm font-rethink text-base text-text-secondary">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        moved.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="rounded-xl bg-primary px-8 py-3 font-rethink text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Back to Home
        </Link>
        <Link
          href="/scan"
          className="rounded-xl border border-primary px-8 py-3 font-rethink text-sm font-medium text-primary transition-colors hover:bg-primary/5"
        >
          Scan a Product
        </Link>
      </div>
    </div>
  );
}
