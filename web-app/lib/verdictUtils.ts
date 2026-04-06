// Shared display utilities for verdict and confidence labels.

export function verdictLabel(verdict: string): string {
  switch (verdict) {
    case 'authentic':  return 'Low Risk'
    case 'unverified': return 'Limited Data'
    case 'suspicious': return 'High Risk'
    default:           return verdict
  }
}

export function confidenceTier(confidence: number): string {
  if (confidence >= 75) return 'High Confidence'
  if (confidence >= 45) return 'Medium Confidence'
  return 'Low Confidence'
}

export function buyAuthenticUrl(brand: string | undefined | null, productName: string | undefined | null): string {
  const query = [brand, productName].filter(Boolean).join(' ')
  return `https://www.google.com/search?q=buy+authentic+${encodeURIComponent(query || 'skincare product')}`
}

export function buyAuthenticLabel(verdict: string): string {
  switch (verdict) {
    case 'authentic':  return 'Buy from authorised retailer'
    case 'suspicious': return 'Get the authentic version'
    default:           return 'Shop from a trusted source'
  }
}
