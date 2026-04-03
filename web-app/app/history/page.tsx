import Link from "next/link";
import type { Metadata } from "next";
import {
  createSupabaseServerClient,
  getProductIdsWithCombinedResults,
} from "@/lib/supabase";
import { HistoryFilters, type HistoryRow } from "@/components/HistoryFilters";
import type { ScanLog, ScanVerdict } from "@/lib/database.types";

export const metadata: Metadata = {
  title: "Scan History — VerifySkn",
};

const PER_PAGE = 20;

interface PageProps {
  searchParams: { page?: string };
}

export default async function HistoryPage({ searchParams }: PageProps) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const offset = (page - 1) * PER_PAGE;

  const supabase = createSupabaseServerClient();

  type RawScanLog = ScanLog & { product: { name: string; brand: string } | null };
  const { data: rawData, count } = await supabase
    .from("scan_logs")
    .select("*, product:products(name, brand)", { count: "exact" })
    .order("scanned_at", { ascending: false })
    .range(offset, offset + PER_PAGE - 1);
  const rawLogs = rawData as RawScanLog[] | null;

  const totalPages = Math.ceil((count ?? 0) / PER_PAGE);

  // Determine which scans have a combined result (for type icon + filter)
  const productIds = (rawLogs ?? [])
    .map((l) => l.product_id as string | null)
    .filter((id): id is string => id !== null);
  const combinedProductIds = await getProductIdsWithCombinedResults(productIds);

  const logs: HistoryRow[] = (rawLogs ?? []).map((log) => ({
    id: log.id,
    barcode_scanned: log.barcode_scanned,
    product_id: log.product_id,
    result: log.result as ScanVerdict,
    confidence_score: log.confidence_score,
    scanned_at: log.scanned_at,
    product: log.product as { name: string; brand: string } | null,
    hasCombined:
      log.product_id !== null && combinedProductIds.has(log.product_id),
  }));

  const hasAnyLogs = (count ?? 0) > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-8 sm:py-12">
      {/* Heading */}
      <h1 className="font-syne text-2xl sm:text-3xl md:text-4xl font-semibold text-text-primary">
        Scan History
      </h1>
      <p className="mt-1 font-syne text-sm text-text-secondary">
        {count ?? 0} total scan{count !== 1 ? "s" : ""}
      </p>

      {hasAnyLogs ? (
        /* Client component handles filtering + table + pagination */
        <HistoryFilters
          logs={logs}
          totalCount={count ?? 0}
          page={page}
          totalPages={totalPages}
        />
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-4 sm:px-5 py-12 sm:py-20 text-center shadow-sm">
          <p className="font-syne text-xl text-text-secondary">No scans yet</p>
          <p className="mt-2 font-syne text-sm text-text-secondary">
            Head to the scan page to verify your first product.
          </p>
          <Link
            href="/"
            className="mt-6 rounded-xl px-6 py-2.5 font-syne text-sm font-medium text-[#0b1e0f] transition-colors"
            style={{ backgroundColor: "#7dc98a" }}
          >
            Scan a Product
          </Link>
        </div>
      )}
    </div>
  );
}
