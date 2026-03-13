export interface ValidationResult {
  valid: boolean
  reason?: string
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export function validateProductImage(base64: string, mimeType: string): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    // Fix 14: actionable message for HEIC (common on iPhone) and other unsupported formats
    const isHeic = mimeType === 'image/heic' || mimeType === 'image/heif'
    const reason = isHeic
      ? 'iPhone HEIC photos are not supported. In your Photos app, tap Share → Save as JPEG, then upload the JPEG.'
      : `Unsupported file type (${mimeType}). Please upload a JPEG, PNG, or WebP image.`
    return { valid: false, reason }
  }

  // base64 is ~4/3 the size of raw bytes
  const estimatedBytes = (base64.length * 3) / 4

  if (estimatedBytes < 15_000) {
    return { valid: false, reason: 'Image appears blank or too small (minimum 15 KB). Try taking a clearer photo.' }
  }

  if (estimatedBytes > 10_000_000) {
    return { valid: false, reason: 'Image exceeds the 10 MB limit. Please use a smaller or compressed photo.' }
  }

  return { valid: true }
}
