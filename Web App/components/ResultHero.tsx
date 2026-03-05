"use client";

import { motion } from "framer-motion";
import type { ScanVerdict } from "@/lib/database.types";

// ── Config per verdict ───────────────────────────────────────

const VERDICT_CONFIG = {
  authentic: {
    bg: "#2D7A4F",
    label: "Authentic",
    Icon: CheckCircleIcon,
  },
  unverified: {
    bg: "#E07B2A",
    label: "Unverified",
    Icon: QuestionCircleIcon,
  },
  suspicious: {
    bg: "#C0392B",
    label: "Suspicious",
    Icon: ExclamationIcon,
  },
} as const;

// ── Component ────────────────────────────────────────────────

interface ResultHeroProps {
  verdict: ScanVerdict;
  confidence: number;
  /** Optional summary line shown below confidence — used on the image result page. */
  summary?: string;
}

export function ResultHero({ verdict, confidence, summary }: ResultHeroProps) {
  const { bg, label, Icon } = VERDICT_CONFIG[verdict];

  return (
    <section
      className="flex w-full flex-col items-center justify-center px-6 py-16 text-white"
      style={{ backgroundColor: bg }}
    >
      {/* Status icon — scale up + fade in */}
      <motion.div
        initial={{ scale: 0.35, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className="mb-6"
      >
        <Icon className="h-20 w-20 drop-shadow-md" />
      </motion.div>

      {/* Result label — Fraunces 600 48px */}
      <motion.h1
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35, ease: "easeOut" }}
        className="font-fraunces text-5xl font-semibold leading-none"
      >
        {label}
      </motion.h1>

      {/* Confidence — Space Mono */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.82 }}
        transition={{ delay: 0.34, duration: 0.35 }}
        className="mt-3 font-mono text-base tracking-wide"
      >
        {confidence}% match confidence
      </motion.p>

      {/* Optional summary — Rethink Sans 400 16px, white 85% */}
      {summary && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 0.85, y: 0 }}
          transition={{ delay: 0.48, duration: 0.35, ease: "easeOut" }}
          className="mt-4 max-w-sm text-center font-rethink text-base font-normal leading-relaxed"
        >
          {summary}
        </motion.p>
      )}
    </section>
  );
}

// ── Icons ────────────────────────────────────────────────────

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function QuestionCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
      />
    </svg>
  );
}

function ExclamationIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}
