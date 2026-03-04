/** Verification result values stored in the DB */
export type VerificationResult = "authentic" | "suspicious" | "unverified";

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand: string;
  description: string | null;
  ingredients: string[] | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  country_of_origin: string | null;
  website: string | null;
  created_at: string;
}

export interface ScanLog {
  id: string;
  barcode: string;
  product_id: string | null;
  result: VerificationResult;
  confidence_score: number;
  notes: string | null;
  scanned_at: string;
}

/** Enriched scan result returned by the lookup API */
export interface ScanResult {
  product: Product | null;
  brand: Brand | null;
  result: VerificationResult;
  confidence_score: number;
  notes: string | null;
}
