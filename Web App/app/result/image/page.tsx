"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { ResultHero } from "@/components/ResultHero";
import { cn } from "@/lib/utils";
import {
  IMAGE_SESSION_KEY,
  type ImageAnalysisSession,
} from "@/lib/imageSession";
import type { ScanVerdict } from "@/lib/database.types";

// ── Badge helpers ─────────────────────────────────────────────

type CheckBadge = "pass" | "fail" | "uncertain" | "na";

const BADGE_CONFIG: Record<
  CheckBadge,
  { label: string; bg: string; color: string }
> = {
  pass:      { label: "Pass",      bg: "#2D7A4F", color: "#FFFFFF" },
  fail:      { label: "Fail",      bg: "#C0392B", color: "#FFFFFF" },
  uncertain: { label: "Uncertain", bg: "#E07B2A", color: "#FFFFFF" },
  na:        { label: "N/A",       bg: "#E5E2DD", color: "#6B6B6B" },
};

const VERDICT_COLOR: Record<ScanVerdict, string> = {
  authentic:  "#2D7A4F",
  unverified: "#E07B2A",
  suspicious: "#C0392B",
};

function normalizeCheck(value: string | undefined | null): CheckBadge {
  if (!value || value.trim() === "" || /^n\/?a$/i.test(value.trim())) {
    return "na";
  }
  const lower = value.toLowerCase();
  if (
    /\b(good|excellent|pass|clear|correct|verified|present|accurate|aligned|consistent|authentic|no error|no issue|legitimate|standard|proper|high|sharp)\b/.test(
      lower
    )
  ) {
    return "pass";
  }
  if (
    /\b(poor|bad|fail|missing|incorrect|blurry|misaligned|error|suspicious|counterfeit|tampered|inconsistent|absent|wrong|invalid|not present|low quality|smudged)\b/.test(
      lower
    )
  ) {
    return "fail";
  }
  return "uncertain";
}

// ── Packaging checks data ─────────────────────────────────────

interface CheckItem {
  key: keyof Pick<
    ImageAnalysisSession,
    | "font_quality"
    | "logo_accuracy"
    | "print_quality"
    | "label_alignment"
    | "spelling_check"
    | "hologram_check"
  >;
  label: string;
}

const CHECKS: CheckItem[] = [
  { key: "font_quality",    label: "Font Quality"    },
  { key: "logo_accuracy",   label: "Logo Accuracy"   },
  { key: "print_quality",   label: "Print Quality"   },
  { key: "label_alignment", label: "Label Alignment" },
  { key: "spelling_check",  label: "Spelling"        },
  { key: "hologram_check",  label: "Hologram"        },
];

// ── Sub-components ────────────────────────────────────────────

function CheckCard({
  label,
  badge,
}: {
  label: string;
  badge: CheckBadge;
}) {
  const { label: badgeLabel, bg, color } = BADGE_CONFIG[badge];

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm"
      style={{ borderRadius: 14 }}
    >
      <p className="font-rethink text-sm font-semibold text-text-primary">
        {label}
      </p>
      <span
        className="w-fit rounded-full px-2.5 py-0.5 font-rethink text-xs font-medium"
        style={{ backgroundColor: bg, color }}
      >
        {badgeLabel}
      </span>
    </div>
  );
}

function FlagsSection({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: "#FDF2F2", borderRadius: 12 }}
    >
      <p className="mb-3 font-rethink text-sm font-semibold" style={{ color: "#C0392B" }}>
        Issues Detected
      </p>
      <ul className="flex flex-col gap-2">
        {flags.map((flag, i) => (
          <li key={i} className="flex items-start gap-2">
            <TriangleAlert
              size={14}
              strokeWidth={2}
              className="mt-0.5 shrink-0"
              style={{ color: "#C0392B" }}
            />
            <span className="font-rethink text-sm font-normal text-text-primary">
              {flag}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfidenceBar({
  label,
  value,
  delay,
}: {
  label: string;
  value: number;
  delay: number;
}) {
  return (
    <div className="flex-1">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-rethink text-xs text-text-secondary">{label}</span>
        <span className="font-mono text-xs text-text-primary">{value}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full"
        style={{ backgroundColor: "#E5E2DD" }}
      >
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function CombinedSection({
  barcodeConfidence,
  imageConfidence,
  finalResult,
  finalConfidence,
}: {
  barcodeConfidence: number;
  imageConfidence: number;
  finalResult: ScanVerdict;
  finalConfidence: number;
}) {
  return (
    <div
      className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
      style={{ borderRadius: 16 }}
    >
      <p className="mb-4 font-rethink text-sm font-semibold text-text-primary">
        Combined Analysis
      </p>

      {/* Side-by-side progress bars */}
      <div className="flex gap-5">
        <ConfidenceBar label="Barcode" value={barcodeConfidence} delay={0.1} />
        <ConfidenceBar label="Image"   value={imageConfidence}   delay={0.25} />
      </div>

      {/* Final combined score */}
      <div className="mt-5 flex items-end gap-2">
        <motion.span
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          className="font-fraunces font-semibold leading-none"
          style={{ fontSize: 40, color: VERDICT_COLOR[finalResult] }}
        >
          {finalConfidence}%
        </motion.span>
        <span className="mb-1 font-rethink text-sm capitalize text-text-secondary">
          {finalResult}
        </span>
      </div>
      <p className="mt-1.5 font-rethink text-[13px] text-text-secondary">
        Based on barcode verification and packaging analysis
      </p>
    </div>
  );
}

function ActionButtons() {
  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
      <Link
        href="/scan"
        className={cn(
          "flex flex-1 items-center justify-center rounded-xl px-6 py-3",
          "bg-primary font-rethink text-base font-medium text-white",
          "transition-colors hover:bg-primary/90 active:scale-[0.98]"
        )}
      >
        Scan Another Product
      </Link>
      <Link
        href="/report"
        className={cn(
          "flex flex-1 items-center justify-center rounded-xl border px-6 py-3",
          "border-primary font-rethink text-base font-medium text-primary",
          "transition-colors hover:bg-primary/5 active:scale-[0.98]"
        )}
      >
        Report This Product
      </Link>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function ImageResultPage() {
  const router = useRouter();
  const [data, setData] = useState<ImageAnalysisSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(IMAGE_SESSION_KEY);

    if (!raw) {
      router.replace("/scan");
      return;
    }

    try {
      setData(JSON.parse(raw) as ImageAnalysisSession);
      setReady(true);
    } catch {
      router.replace("/scan");
    }
  }, [router]);

  // Server render / initial client render before sessionStorage is read
  if (!ready || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary border-t-transparent"
          aria-label="Loading…"
        />
      </div>
    );
  }

  const hasCombined =
    data.sessionId !== undefined &&
    data.barcodeConfidence !== undefined &&
    data.finalResult !== undefined &&
    data.finalConfidence !== undefined;

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <ResultHero
        verdict={data.result}
        confidence={data.confidence}
        summary={data.summary || undefined}
      />

      {/* ── Content ── */}
      <div className="mx-auto max-w-lg space-y-4 px-5 py-8">
        {/* Packaging checks — 2 × 3 staggered grid */}
        <section>
          <h2 className="mb-3 font-rethink text-sm font-semibold uppercase tracking-widest text-text-secondary">
            Packaging Checks
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CHECKS.map((check, i) => (
              <motion.div
                key={check.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.08, ease: "easeOut" }}
              >
                <CheckCard
                  label={check.label}
                  badge={normalizeCheck(data[check.key])}
                />
              </motion.div>
            ))}
          </div>
        </section>

        {/* Flags */}
        {data.flags && data.flags.length > 0 && (
          <FlagsSection flags={data.flags} />
        )}

        {/* Combined confidence — only when barcode was also scanned */}
        {hasCombined && (
          <CombinedSection
            barcodeConfidence={data.barcodeConfidence!}
            imageConfidence={data.confidence}
            finalResult={data.finalResult!}
            finalConfidence={data.finalConfidence!}
          />
        )}

        {/* Actions */}
        <ActionButtons />
      </div>
    </main>
  );
}
