import type { ScanVerdict } from "./database.types";

// ── Types ────────────────────────────────────────────────────

export interface ScoringInput {
  barcodeResult: ScanVerdict | null;
  barcodeConfidence: number | null;
  imageResult: ScanVerdict | null;
  imageConfidence: number | null;
}

export interface ScoringOutput {
  finalResult: ScanVerdict;
  finalConfidence: number;
  reasoning: string;
}

// ── Weights ──────────────────────────────────────────────────

const BARCODE_WEIGHT = 0.4;
const IMAGE_WEIGHT = 0.6;

// ── Helpers ──────────────────────────────────────────────────

/**
 * Weighted confidence when both signals are present.
 * Barcode contributes 40%, image contributes 60%.
 */
function weightedConfidence(
  barcodeConfidence: number,
  imageConfidence: number
): number {
  return Math.round(
    barcodeConfidence * BARCODE_WEIGHT + imageConfidence * IMAGE_WEIGHT
  );
}

// ── Main scoring function ────────────────────────────────────

/**
 * Combine barcode and image analysis signals into a final verdict.
 *
 * Rules (in priority order):
 *  1. Either signal is 'suspicious'  → final: 'suspicious'  (hard veto)
 *  2. Both signals are 'authentic'   → final: 'authentic'
 *  3. One 'authentic', one 'unverified' → final: 'unverified' (soft flag, rescan note)
 *  4. Both 'unverified'              → final: 'unverified'
 *  5. Only one signal present        → use that signal directly
 *
 * Confidence:
 *  - Both present: barcode × 40% + image × 60%
 *  - Only one present: use that signal's confidence directly
 */
export function computeCombinedResult(input: ScoringInput): ScoringOutput {
  const { barcodeResult, barcodeConfidence, imageResult, imageConfidence } =
    input;

  const hasBarcode = barcodeResult !== null && barcodeConfidence !== null;
  const hasImage = imageResult !== null && imageConfidence !== null;

  // ── Single-signal path ───────────────────────────────────
  if (!hasBarcode && hasImage) {
    return {
      finalResult: imageResult!,
      finalConfidence: imageConfidence!,
      reasoning: "Result based on image analysis only — no barcode signal present.",
    };
  }

  if (!hasImage && hasBarcode) {
    return {
      finalResult: barcodeResult!,
      finalConfidence: barcodeConfidence!,
      reasoning: "Result based on barcode lookup only — no image signal present.",
    };
  }

  // ── Neither signal present (edge case) ───────────────────
  if (!hasBarcode && !hasImage) {
    return {
      finalResult: "unverified",
      finalConfidence: 0,
      reasoning: "No verification signals available.",
    };
  }

  // ── Both signals present ─────────────────────────────────
  const bc = barcodeConfidence!;
  const ic = imageConfidence!;
  const br = barcodeResult!;
  const ir = imageResult!;

  // Rule 1 — Suspicious veto (either channel flags suspicious)
  if (br === "suspicious" || ir === "suspicious") {
    return {
      finalResult: "suspicious",
      finalConfidence: weightedConfidence(bc, ic),
      reasoning:
        br === "suspicious" && ir === "suspicious"
          ? "Both barcode and image analysis flagged this product as suspicious."
          : br === "suspicious"
          ? "Barcode lookup flagged this product as suspicious."
          : "Image analysis flagged this product as suspicious.",
    };
  }

  // Rule 2 — Both authentic
  if (br === "authentic" && ir === "authentic") {
    return {
      finalResult: "authentic",
      finalConfidence: weightedConfidence(bc, ic),
      reasoning:
        "Both barcode lookup and image analysis confirm product authenticity.",
    };
  }

  // Rule 3 — One authentic, one unverified
  if (
    (br === "authentic" && ir === "unverified") ||
    (br === "unverified" && ir === "authentic")
  ) {
    return {
      finalResult: "unverified",
      finalConfidence: weightedConfidence(bc, ic),
      reasoning:
        "Partial verification — one signal is inconclusive. Rescan with a clearer image for a definitive result.",
    };
  }

  // Rule 4 — Both unverified
  return {
    finalResult: "unverified",
    finalConfidence: weightedConfidence(bc, ic),
    reasoning:
      "Neither signal could confirm authenticity. Try rescanning with better lighting and a clearer image.",
  };
}
