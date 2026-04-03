"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ReportButton } from "@/components/ReportButton";
import { motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { ResultHero } from "@/components/ResultHero";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { ScanVerdict } from "@/lib/database.types";
import { IMAGE_SESSION_KEY, type ImageAnalysisSession } from "@/lib/imageSession";

// ── Types ─────────────────────────────────────────────────────

interface ImageResult {
  result: ScanVerdict;
  confidence: number;
  summary: string;
  flags: string[];
  font_quality: string;
  logo_accuracy: string;
  print_quality: string;
  label_alignment: string;
  spelling_check: string;
  hologram_check: string;
  // combined — present when barcode was also scanned
  barcodeConfidence?: number;
  finalResult?: ScanVerdict;
  finalConfidence?: number;
}

// ── Badge helpers ─────────────────────────────────────────────

type CheckBadge = "pass" | "fail" | "uncertain" | "na";

const BADGE_CONFIG: Record<
  CheckBadge,
  { label: string; bg: string; color: string }
> = {
  pass:      { label: "Pass",      bg: "#7dc98a",              color: "#0b1e0f" },
  fail:      { label: "Fail",      bg: "#C0392B",              color: "#FFFFFF" },
  uncertain: { label: "Uncertain", bg: "#E07B2A",              color: "#FFFFFF" },
  na:        { label: "N/A",       bg: "rgba(255,255,255,0.09)", color: "rgba(238,236,234,0.5)" },
};

const VERDICT_COLOR: Record<ScanVerdict, string> = {
  authentic:  "#7dc98a",
  unverified: "#E07B2A",
  suspicious: "#C0392B",
};

function normalizeCheck(value: string | undefined | null): CheckBadge {
  if (!value || value.trim() === "" || /^n\/?a$/i.test(value.trim())) return "na";
  const lower = value.toLowerCase();
  if (/\b(good|excellent|pass|clear|correct|verified|present|accurate|aligned|consistent|authentic|no error|no issue|legitimate|standard|proper|high|sharp)\b/.test(lower)) return "pass";
  if (/\b(poor|bad|fail|missing|incorrect|blurry|misaligned|error|suspicious|counterfeit|tampered|inconsistent|absent|wrong|invalid|not present|low quality|smudged)\b/.test(lower)) return "fail";
  return "uncertain";
}

// ── Sub-components ────────────────────────────────────────────

const CHECKS: { key: keyof Pick<ImageResult, "font_quality" | "logo_accuracy" | "print_quality" | "label_alignment" | "spelling_check" | "hologram_check">; label: string }[] = [
  { key: "font_quality",    label: "Font Quality"    },
  { key: "logo_accuracy",   label: "Logo Accuracy"   },
  { key: "print_quality",   label: "Print Quality"   },
  { key: "label_alignment", label: "Label Alignment" },
  { key: "spelling_check",  label: "Spelling"        },
  { key: "hologram_check",  label: "Hologram"        },
];

function CheckCard({ label, badge }: { label: string; badge: CheckBadge }) {
  const { label: badgeLabel, bg, color } = BADGE_CONFIG[badge];
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm" style={{ borderRadius: 14 }}>
      <p className="font-syne text-sm font-semibold text-text-primary">{label}</p>
      <span className="w-fit rounded-full px-2.5 py-0.5 font-syne text-xs font-medium" style={{ backgroundColor: bg, color }}>
        {badgeLabel}
      </span>
    </div>
  );
}

function FlagsSection({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(192,57,43,0.1)", borderRadius: 12 }}>
      <p className="mb-3 font-syne text-sm font-semibold" style={{ color: "#C0392B" }}>Issues Detected</p>
      <ul className="flex flex-col gap-2">
        {flags.map((flag, i) => (
          <li key={i} className="flex items-start gap-2">
            <TriangleAlert size={14} strokeWidth={2} className="mt-0.5 shrink-0" style={{ color: "#C0392B" }} />
            <span className="font-syne text-sm font-normal text-text-primary">{flag}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConfidenceBar({ label, value, delay }: { label: string; value: number; delay: number }) {
  return (
    <div className="flex-1">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-syne text-xs text-text-secondary">{label}</span>
        <span className="font-mono text-xs text-text-primary">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
        <motion.div
          className="h-full rounded-full bg-lime"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.7, delay, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function CombinedSection({ barcodeConfidence, imageConfidence, finalResult, finalConfidence }: {
  barcodeConfidence: number;
  imageConfidence: number;
  finalResult: ScanVerdict;
  finalConfidence: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm" style={{ borderRadius: 16 }}>
      <p className="mb-4 font-syne text-sm font-semibold text-text-primary">Combined Analysis</p>
      <div className="flex gap-5">
        <ConfidenceBar label="Barcode" value={barcodeConfidence} delay={0.1} />
        <ConfidenceBar label="Image"   value={imageConfidence}   delay={0.25} />
      </div>
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
        <span className="mb-1 font-syne text-sm capitalize text-text-secondary">{finalResult}</span>
      </div>
      <p className="mt-1.5 font-syne text-[13px] text-text-secondary">
        Based on barcode verification and packaging analysis
      </p>
    </div>
  );
}

function ActionButtons() {
  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
      <Link
        href="/"
        className={cn("flex flex-1 items-center justify-center rounded-xl px-6 py-3", "font-syne text-base font-medium text-[#0b1e0f]", "transition-colors active:scale-[0.98]")}
        style={{ backgroundColor: "#7dc98a" }}
      >
        Scan Another Product
      </Link>
      <ReportButton
        label="Report This Product"
        className={cn("flex flex-1 items-center justify-center rounded-xl border px-6 py-3", "font-syne text-base font-medium text-lime", "transition-colors active:scale-[0.98]")}
        style={{ borderColor: "rgba(125,201,138,0.35)", background: "transparent", cursor: "pointer" }}
      />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-lime border-t-transparent" aria-label="Loading…" />
    </div>
  );
}

// ── Inner page (uses useSearchParams — must be inside Suspense) ───────────────

function ImageResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [data, setData] = useState<ImageResult | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      router.replace("/");
      return;
    }

    // TypeScript narrowing helper — sessionId is guaranteed non-null after guard above
    const sid: string = sessionId;
    const supabase = createClient();

    async function load() {
      // Try Supabase first; fall back to sessionStorage if DB is unavailable
      let analysis: {
        result: string; confidence: number; summary: string; flags: string[];
        font_quality: string; logo_accuracy: string; print_quality: string;
        label_alignment: string; spelling_check: string; hologram_check: string;
      } | null = null;

      try {
        const { data } = await supabase
          .from("image_analyses")
          .select("result, confidence, summary, flags, font_quality, logo_accuracy, print_quality, label_alignment, spelling_check, hologram_check")
          .eq("session_id", sid)
          .order("analysed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        analysis = data;
      } catch {
        // Supabase unavailable — will try sessionStorage
      }

      // Fallback: read from sessionStorage (written by scan page right after API call)
      if (!analysis) {
        try {
          const raw = sessionStorage.getItem(IMAGE_SESSION_KEY);
          if (raw) {
            const cached: ImageAnalysisSession = JSON.parse(raw);
            // Only use this cache entry if it matches the current session
            if (cached.sessionId === sid) {
              analysis = {
                result:          cached.result,
                confidence:      cached.confidence,
                summary:         cached.summary,
                flags:           cached.flags,
                font_quality:    cached.font_quality,
                logo_accuracy:   cached.logo_accuracy,
                print_quality:   cached.print_quality,
                label_alignment: cached.label_alignment,
                spelling_check:  cached.spelling_check,
                hologram_check:  cached.hologram_check,
              };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
      }

      if (!analysis) {
        router.replace("/");
        return;
      }

      // Try to get combined results (best-effort — not critical for display)
      let combined: { barcode_confidence: number | null; final_result: string; final_confidence: number } | null = null;
      try {
        const { data } = await supabase
          .from("combined_results")
          .select("barcode_confidence, final_result, final_confidence")
          .eq("session_id", sid)
          .limit(1)
          .maybeSingle();
        combined = data;
      } catch {
        // Combined results unavailable — show image-only result
      }

      setData({
        result:          analysis.result as ScanVerdict,
        confidence:      analysis.confidence,
        summary:         analysis.summary ?? "",
        flags:           analysis.flags ?? [],
        font_quality:    analysis.font_quality ?? "",
        logo_accuracy:   analysis.logo_accuracy ?? "",
        print_quality:   analysis.print_quality ?? "",
        label_alignment: analysis.label_alignment ?? "",
        spelling_check:  analysis.spelling_check ?? "",
        hologram_check:  analysis.hologram_check ?? "",
        ...(combined
          ? {
              barcodeConfidence: combined.barcode_confidence ?? undefined,
              finalResult:       combined.final_result as ScanVerdict,
              finalConfidence:   combined.final_confidence,
            }
          : {}),
      });
      setReady(true);
    }

    load().catch(() => router.replace("/"));
  }, [sessionId, router]);

  if (!ready || !data) return <LoadingSpinner />;

  const hasCombined =
    data.barcodeConfidence !== undefined &&
    data.finalResult !== undefined &&
    data.finalConfidence !== undefined;

  return (
    <main className="min-h-screen bg-background">
      <ResultHero verdict={data.result} confidence={data.confidence} summary={data.summary || undefined} />

      <div className="mx-auto max-w-lg space-y-4 px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        <section>
          <h2 className="mb-3 font-syne text-xs sm:text-sm font-semibold uppercase tracking-widest text-text-secondary">
            Packaging Checks
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3">
            {CHECKS.map((check, i) => (
              <motion.div
                key={check.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.08, ease: "easeOut" }}
              >
                <CheckCard label={check.label} badge={normalizeCheck(data[check.key])} />
              </motion.div>
            ))}
          </div>
        </section>

        {data.flags && data.flags.length > 0 && <FlagsSection flags={data.flags} />}

        {hasCombined && (
          <CombinedSection
            barcodeConfidence={data.barcodeConfidence!}
            imageConfidence={data.confidence}
            finalResult={data.finalResult!}
            finalConfidence={data.finalConfidence!}
          />
        )}

        <ActionButtons />
      </div>
    </main>
  );
}

// ── Page (wraps inner in Suspense for useSearchParams) ────────────────────────

export default function ImageResultPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ImageResultContent />
    </Suspense>
  );
}
