// Maps raw/snake_case flag names (sometimes returned by the AI) to plain English.
// Flags that are already human-readable pass through unchanged.

const FLAG_MAP: Record<string, string> = {
  no_product_packaging_found:
    "No product packaging detected — try a clearer photo of the front or back of the packaging",
  no_product_packaging_detected:
    "No product packaging detected — try a clearer photo of the front or back of the packaging",
  packaging_not_found:
    "No product packaging detected — try a clearer photo of the front or back of the packaging",
  no_packaging_detected:
    "No product packaging detected — try a clearer photo of the front or back of the packaging",
  image_too_blurry:
    "Image too blurry — move closer and ensure good lighting before retaking",
  low_resolution:
    "Low-resolution image — use your device's main camera for best results",
  no_text_visible:
    "No text visible on packaging — ensure the product label is facing the camera",
  image_not_product:
    "No skincare product detected — take a photo of the product packaging",
  not_a_product_image:
    "No skincare product detected — take a photo of the product packaging",
  unable_to_verify:
    "Unable to verify — image may be obscured, overexposed, or too dark",
  low_confidence:
    "Low confidence result — a clearer, well-lit photo will improve accuracy",
}

export function mapFlagLabel(flag: string): string {
  if (!flag) return flag
  const direct = FLAG_MAP[flag]
  if (direct) return direct
  // Normalise (spaces/hyphens → underscores) and retry
  const normalized = flag.toLowerCase().replace(/[\s\-]+/g, '_')
  return FLAG_MAP[normalized] ?? flag
}
