/**
 * Shared types and storage key for passing image analysis results
 * between the scan page (writer) and the image result page (reader).
 *
 * Data is stored in sessionStorage so it survives the scan→result
 * navigation without requiring an extra database round-trip for display.
 */

import type { ScanVerdict } from "./database.types";

export const IMAGE_SESSION_KEY = "verifyskn_image_result";

/** Written to sessionStorage immediately after a barcode is scanned. */
export const BARCODE_SESSION_KEY = "verifyskn_barcode_session";

export interface BarcodeSession {
  sessionId: string;
  barcode: string;
}

export interface ImageAnalysisSession {
  // Core analysis fields (from Claude Vision response)
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
  // Optional — only present when barcode was also scanned in the same session
  sessionId?: string;
  barcodeResult?: ScanVerdict;
  barcodeConfidence?: number;
  finalResult?: ScanVerdict;
  finalConfidence?: number;
}
