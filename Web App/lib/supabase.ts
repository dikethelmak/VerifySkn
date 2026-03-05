/**
 * lib/supabase.ts — server-side Supabase client + typed query helpers.
 *
 * ⚠️  This file imports `next/headers` and is SERVER-ONLY.
 *     Use in Server Components, Route Handlers, and Server Actions.
 *     For Client Components, import from @/lib/supabase/client instead.
 */

import { createServerClient, createBrowserClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type {
  Database,
  Product,
  ScanLog,
  ScanLogInsert,
  ImageAnalysis,
  ImageAnalysisInsert,
  CombinedResult,
  CombinedResultInsert,
  DashboardStats,
} from "./database.types";

export type { Database } from "./database.types";
export type {
  Product,
  ProductInsert,
  ScanLog,
  ScanLogInsert,
  Brand,
  ScanVerdict,
  ImageAnalysis,
  ImageAnalysisInsert,
  CombinedResult,
  CombinedResultInsert,
  DashboardStats,
} from "./database.types";
export type { BarcodeSession, ImageAnalysisSession } from "./imageSession";

// ── Client factories ─────────────────────────────────────────

/**
 * Server-side Supabase client.
 * Call inside Server Components, Route Handlers, and Server Actions.
 */
export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — read-only context, safe to ignore.
          }
        },
      },
    }
  );
}

/**
 * Browser-side Supabase client.
 * Exported here for convenience — Client Components should use
 * @/lib/supabase/client directly to avoid bundling server code.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Typed query helpers ──────────────────────────────────────

/**
 * Look up a product by its EAN-13 barcode.
 * Returns null if the barcode is not in the database.
 */
export async function getProductByBarcode(
  barcode: string
): Promise<Product | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("barcode", barcode)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    console.error("[getProductByBarcode]", error.message);
    return null;
  }

  return data;
}

/**
 * Write a new scan event to scan_logs.
 */
export async function logScan(
  entry: ScanLogInsert
): Promise<ScanLog | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("scan_logs")
    .insert(entry)
    .select()
    .single();

  if (error) {
    console.error("[logScan]", error.message);
    return null;
  }

  return data;
}

/**
 * Fetch the most recent scan events, joined with product name and brand.
 */
export async function getRecentScans(limit = 10): Promise<
  (ScanLog & { product: Pick<Product, "name" | "brand"> | null })[]
> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("scan_logs")
    .select(
      `
      *,
      product:products ( name, brand )
    `
    )
    .order("scanned_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getRecentScans]", error.message);
    return [];
  }

  return (data ?? []) as (ScanLog & {
    product: Pick<Product, "name" | "brand"> | null;
  })[];
}

/**
 * Aggregate stats for the admin dashboard.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createSupabaseServerClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [productsRes, totalScansRes, todayScansRes, breakdownRes, imageAnalysesRes] =
    await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("scan_logs").select("id", { count: "exact", head: true }),
      supabase
        .from("scan_logs")
        .select("id", { count: "exact", head: true })
        .gte("scanned_at", todayStart.toISOString()),
      supabase.from("scan_logs").select("result"),
      supabase.from("image_analyses").select("id", { count: "exact", head: true }),
    ]);

  const breakdown = { authentic: 0, suspicious: 0, unverified: 0 };
  for (const row of breakdownRes.data ?? []) {
    const r = row.result as keyof typeof breakdown;
    if (r in breakdown) breakdown[r]++;
  }

  return {
    totalProducts: productsRes.count ?? 0,
    totalScans: totalScansRes.count ?? 0,
    todayScans: todayScansRes.count ?? 0,
    totalImageAnalyses: imageAnalysesRes.count ?? 0,
    breakdown,
  };
}

/**
 * Given a list of product IDs, return the subset that have at least one
 * combined_result entry — used to show the camera icon on scan history rows.
 */
export async function getProductIdsWithCombinedResults(
  productIds: string[]
): Promise<Set<string>> {
  if (productIds.length === 0) return new Set();

  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("combined_results")
    .select("product_id")
    .in("product_id", productIds)
    .not("product_id", "is", null);

  return new Set((data ?? []).map((r) => r.product_id as string));
}

/**
 * Persist an image analysis record to image_analyses.
 * Returns the inserted row, or null on failure.
 */
export async function saveImageAnalysis(
  entry: ImageAnalysisInsert
): Promise<ImageAnalysis | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("image_analyses")
    .insert(entry)
    .select()
    .single();

  if (error) {
    console.error("[saveImageAnalysis]", error.message);
    return null;
  }

  return data;
}

/**
 * Persist a combined (barcode + image) result to combined_results.
 * Returns the inserted row, or null on failure.
 */
export async function saveCombinedResult(
  entry: CombinedResultInsert
): Promise<CombinedResult | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("combined_results")
    .insert(entry)
    .select()
    .single();

  if (error) {
    console.error("[saveCombinedResult]", error.message);
    return null;
  }

  return data;
}

/**
 * Fetch the most recent combined result for a session ID.
 * Returns null when no record exists yet.
 */
export async function getCombinedResultBySession(
  sessionId: string
): Promise<CombinedResult | null> {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("combined_results")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // no rows
    console.error("[getCombinedResultBySession]", error.message);
    return null;
  }

  return data;
}
