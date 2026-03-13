"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { ImageUploader } from "@/components/ImageUploader";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import type { ScanVerdict } from "@/lib/database.types";

// ── Types ─────────────────────────────────────────────────────

type Phase = "idle" | "analyzing" | "result" | "error";

type CheckBadge = "pass" | "fail" | "uncertain" | "na";

interface InlineResult {
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
  finalResult?: ScanVerdict;
  finalConfidence?: number;
}

interface Props {
  barcode: string;
  sessionId?: string;
}

// ── Badge helpers ─────────────────────────────────────────────

const BADGE_CONFIG: Record<CheckBadge, { label: string; bg: string; color: string }> = {
  pass:      { label: "Pass",      bg: "#2D7A4F", color: "#FFFFFF" },
  fail:      { label: "Fail",      bg: "#C0392B", color: "#FFFFFF" },
  uncertain: { label: "Uncertain", bg: "#E07B2A", color: "#FFFFFF" },
  na:        { label: "N/A",       bg: "#E5E2DD", color: "#6B6B6B" },
};

const VERDICT_CONFIG: Record<ScanVerdict, { label: string; bg: string }> = {
  authentic:  { label: "Authentic",  bg: "#2D7A4F" },
  unverified: { label: "Unverified", bg: "#E07B2A" },
  suspicious: { label: "Suspicious", bg: "#C0392B" },
};

const CHECKS = [
  { key: "font_quality"    as const, label: "Font Quality"    },
  { key: "logo_accuracy"   as const, label: "Logo Accuracy"   },
  { key: "print_quality"   as const, label: "Print Quality"   },
  { key: "label_alignment" as const, label: "Label Alignment" },
  { key: "spelling_check"  as const, label: "Spelling"        },
  { key: "hologram_check"  as const, label: "Hologram"        },
];

function normalizeCheck(value: string | undefined | null): CheckBadge {
  if (!value || value.trim() === "" || /^n\/?a$/i.test(value.trim())) return "na";
  const lower = value.toLowerCase();
  if (/\b(good|excellent|pass|clear|correct|verified|present|accurate|aligned|consistent|authentic|no error|no issue|legitimate|standard|proper|high|sharp)\b/.test(lower)) return "pass";
  if (/\b(poor|bad|fail|missing|incorrect|blurry|misaligned|error|suspicious|counterfeit|tampered|inconsistent|absent|wrong|invalid|not present|low quality|smudged)\b/.test(lower)) return "fail";
  return "uncertain";
}

// ── Sub-components ────────────────────────────────────────────

function InlineResultDisplay({ result }: { result: InlineResult }) {
  const { label, bg } = VERDICT_CONFIG[result.result];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      {/* Compact verdict banner */}
      <div
        className="flex items-center gap-4 rounded-2xl px-6 py-5 text-white"
        style={{ backgroundColor: bg, borderRadius: 16 }}
      >
        <div>
          <p className="font-fraunces text-2xl font-semibold leading-none">{label}</p>
          <p className="mt-1 font-mono text-sm opacity-80">{result.confidence}% confidence</p>
          {result.summary && (
            <p className="mt-2 font-rethink text-sm leading-relaxed opacity-85">
              {result.summary}
            </p>
          )}
        </div>
      </div>

      {/* Packaging checks — responsive grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CHECKS.map((check, i) => {
          const badge = normalizeCheck(result[check.key]);
          const { label: badgeLabel, bg: badgeBg, color } = BADGE_CONFIG[badge];
          return (
            <motion.div
              key={check.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.06 }}
              className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 shadow-sm"
            >
              <p className="font-rethink text-xs font-semibold text-text-primary">
                {check.label}
              </p>
              <span
                className="w-fit rounded-full px-2 py-0.5 font-rethink text-xs font-medium"
                style={{ backgroundColor: badgeBg, color }}
              >
                {badgeLabel}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Flags */}
      {result.flags.length > 0 && (
        <div
          className="w-full rounded-xl p-4"
          style={{ backgroundColor: "#FDF2F2", borderRadius: 12 }}
        >
          <p className="mb-2 font-rethink text-sm font-semibold" style={{ color: "#C0392B" }}>
            Issues Detected
          </p>
          <ul className="flex flex-col gap-1.5">
            {result.flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-2">
                <TriangleAlert
                  size={13}
                  strokeWidth={2}
                  className="mt-0.5 shrink-0"
                  style={{ color: "#C0392B" }}
                />
                <span className="font-rethink text-sm text-text-primary">{flag}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Combined final score (when barcode + image both ran) */}
      {result.finalResult && result.finalConfidence !== undefined && (
        <div
          className="rounded-xl border border-border bg-surface px-5 py-4"
          style={{ borderRadius: 14 }}
        >
          <p className="font-rethink text-xs font-medium uppercase tracking-widest text-text-secondary">
            Combined verdict
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className="font-fraunces font-semibold leading-none"
              style={{
                fontSize: 32,
                color: VERDICT_CONFIG[result.finalResult].bg,
              }}
            >
              {result.finalConfidence}%
            </span>
            <span className="font-rethink text-sm capitalize text-text-secondary">
              {result.finalResult}
            </span>
          </div>
          <p className="mt-1 font-rethink text-xs text-text-secondary">
            Based on barcode + packaging image analysis
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────

export function InlineImageAnalysis({ barcode, sessionId }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<InlineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use provided sessionId or generate a stable one for this mount
  const sessionIdRef = useRef(sessionId ?? crypto.randomUUID());

  const handleImageReady = useCallback(
    async (base64: string, mimeType: string) => {
      setPhase("analyzing");
      setError(null);

      try {
        const res = await fetch("/api/analyse-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64,
            mimeType,
            sessionId: sessionIdRef.current,
            barcode,
          }),
        });

        if (!res.ok) throw new Error(`Server error ${res.status}`);

        const data = await res.json();

        setResult({
          result: data.result,
          confidence: data.confidence,
          summary: data.summary ?? "",
          flags: data.flags ?? [],
          font_quality: data.font_quality ?? "",
          logo_accuracy: data.logo_accuracy ?? "",
          print_quality: data.print_quality ?? "",
          label_alignment: data.label_alignment ?? "",
          spelling_check: data.spelling_check ?? "",
          hologram_check: data.hologram_check ?? "",
          finalResult: data.finalResult,
          finalConfidence: data.finalConfidence,
        });
        setPhase("result");
      } catch {
        setPhase("error");
        setError("Analysis failed — please try again with a clearer photo.");
      }
    },
    [barcode]
  );

  const handleRetry = useCallback(() => {
    setPhase("idle");
    setError(null);
    setResult(null);
  }, []);

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-sm">
      {/* Header — always visible */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.div
            key="header"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-5"
          >
            <p className="font-fraunces text-xl font-semibold text-text-primary">
              Help the community
            </p>
            <p className="mt-1 font-rethink text-sm text-text-secondary">
              Upload a photo to get a deeper analysis of this product's packaging.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* Idle — uploader */}
        {phase === "idle" && (
          <motion.div
            key="uploader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <ImageUploader onImageReady={handleImageReady} />
          </motion.div>
        )}

        {/* Analyzing */}
        {phase === "analyzing" && (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <AnalysisLoader onComplete={() => {}} />
          </motion.div>
        )}

        {/* Result */}
        {phase === "result" && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <InlineResultDisplay result={result} />
          </motion.div>
        )}

        {/* Error */}
        {phase === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            <div
              className="w-full rounded-xl px-5 py-4"
              style={{ backgroundColor: "#FDF2F2", borderRadius: 12 }}
            >
              <p className="font-rethink text-sm font-medium" style={{ color: "#C0392B" }}>
                {error}
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="self-start rounded-xl border border-primary px-5 py-2.5 font-rethink text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Try Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
