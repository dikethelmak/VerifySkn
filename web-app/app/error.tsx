"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 py-20 text-center">
      {/* Warning icon */}
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        aria-hidden
      >
        <circle cx="28" cy="28" r="27" stroke="#E07B2A" strokeWidth="2" />
        <path
          d="M28 17v14"
          stroke="#E07B2A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="28" cy="38" r="2" fill="#E07B2A" />
      </svg>

      <h1 className="mt-6 font-fraunces text-3xl font-semibold text-text-primary">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-sm font-rethink text-sm text-text-secondary">
        An unexpected error occurred. We&apos;ve been notified and are looking
        into it.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-xs text-text-secondary/60">
          Error ID: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <button
          onClick={reset}
          className="rounded-xl bg-primary px-8 py-3 font-rethink text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-border px-8 py-3 font-rethink text-sm font-medium text-text-secondary transition-colors hover:bg-background"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
