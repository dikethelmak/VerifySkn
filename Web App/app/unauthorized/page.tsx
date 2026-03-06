import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access Denied",
};

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 py-20 text-center">
      {/* Lock icon */}
      <svg
        width="56"
        height="56"
        viewBox="0 0 56 56"
        fill="none"
        aria-hidden
      >
        <circle cx="28" cy="28" r="27" stroke="#C0392B" strokeWidth="2" strokeOpacity="0.4" />
        <rect
          x="18"
          y="26"
          width="20"
          height="14"
          rx="3"
          stroke="#C0392B"
          strokeWidth="2"
          strokeOpacity="0.5"
        />
        <path
          d="M22 26v-4a6 6 0 0 1 12 0v4"
          stroke="#C0392B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.5"
        />
        <circle cx="28" cy="33" r="2" fill="#C0392B" fillOpacity="0.5" />
      </svg>

      <h1 className="mt-6 font-fraunces text-3xl font-semibold text-text-primary">
        Access Denied
      </h1>
      <p className="mt-2 max-w-sm font-rethink text-sm text-text-secondary">
        You don&apos;t have permission to view this page. If you believe this is
        an error, please contact support.
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/dashboard"
          className="rounded-xl bg-primary px-8 py-3 font-rethink text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-border px-8 py-3 font-rethink text-sm font-medium text-text-secondary transition-colors hover:bg-background"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
