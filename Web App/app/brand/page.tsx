import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { Product, BrandSubmission, Report } from "@/lib/database.types";
import BrandPortal from "@/components/brand/BrandPortal";

// ── Analytics helpers ─────────────────────────────────────────

function buildDailyScanData(
  scans: Array<{ scanned_at: string }>
): Array<{ date: string; count: number }> {
  const today = new Date();
  const days: Array<{ date: string; count: number }> = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
      count: 0,
    });
  }

  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - 29);
  cutoff.setHours(0, 0, 0, 0);

  for (const scan of scans) {
    const d = new Date(scan.scanned_at);
    if (d < cutoff) continue;
    const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const slot = days.find((x) => x.date === label);
    if (slot) slot.count++;
  }

  return days;
}

function buildResultDistribution(
  scans: Array<{ result: string }>
): Array<{ name: string; value: number }> {
  const counts: Record<string, number> = {
    Authentic: 0,
    Suspicious: 0,
    Unverified: 0,
  };
  for (const s of scans) {
    if (s.result === "authentic")  counts.Authentic++;
    if (s.result === "suspicious") counts.Suspicious++;
    if (s.result === "unverified") counts.Unverified++;
  }
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function buildTopProducts(
  scans: Array<{ product_id: string | null }>,
  products: Product[]
): Array<{ name: string; count: number }> {
  const countMap: Record<string, number> = {};
  for (const s of scans) {
    if (s.product_id) countMap[s.product_id] = (countMap[s.product_id] ?? 0) + 1;
  }
  return products
    .map((p) => ({ name: p.name, count: countMap[p.id] ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

// ── Page ──────────────────────────────────────────────────────

export default async function BrandPage() {
  const supabase = createSupabaseServerClient();

  // ── Auth + role check ──────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/brand");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, verified_brand_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "brand_rep") {
    redirect("/dashboard");
  }

  if (!profile.verified_brand_id) {
    redirect("/dashboard");
  }

  // ── Brand info ────────────────────────────────────────────
  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, logo_url, verified")
    .eq("id", profile.verified_brand_id)
    .single();

  if (!brand) redirect("/dashboard");

  // ── Data fetch (parallel) ─────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    productsRes,
    submissionsRes,
    reportsRes,
    scansRes,
  ] = await Promise.all([
    // Products belonging to this brand
    supabase
      .from("products")
      .select("*")
      .eq("brand", brand.name)
      .order("name"),

    // This brand's pending/rejected submissions
    supabase
      .from("brand_submissions")
      .select("*")
      .eq("brand_id", brand.id)
      .order("created_at", { ascending: false }),

    // Community reports for this brand's barcodes
    supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false }),

    // Scans for analytics (last 30 days)
    supabase
      .from("scan_logs")
      .select("scanned_at, result, product_id")
      .gte("scanned_at", thirtyDaysAgo.toISOString()),
  ]);

  const products    = (productsRes.data ?? [])    as Product[];
  const submissions = (submissionsRes.data ?? []) as BrandSubmission[];
  const allReports  = (reportsRes.data ?? [])     as Report[];

  // Filter reports to only those related to this brand's barcodes
  const brandBarcodes = new Set(products.map((p) => p.barcode));
  const reports = allReports.filter((r) => brandBarcodes.has(r.barcode));

  const scans = scansRes.data ?? [];

  // Filter scans to only this brand's products
  const brandProductIds = new Set(products.map((p) => p.id));
  const brandScans = scans.filter(
    (s) => s.product_id && brandProductIds.has(s.product_id)
  );

  // ── Analytics computation ─────────────────────────────────
  const dailyScanData      = buildDailyScanData(brandScans);
  const resultDistribution = buildResultDistribution(brandScans);
  const topProducts        = buildTopProducts(brandScans, products);

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start gap-4">
          {/* Brand logo or initial */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-primary/10">
            {brand.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logo_url}
                alt={brand.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="font-fraunces text-2xl font-semibold text-primary">
                {brand.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-fraunces text-[28px] font-semibold leading-tight text-text-primary">
                {brand.name}
              </h1>
              {brand.verified && (
                <span
                  className="rounded-full px-3 py-0.5 font-rethink text-xs font-semibold"
                  style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#B8922C" }}
                >
                  Verified Brand Partner
                </span>
              )}
            </div>
            <p className="mt-1 font-rethink text-sm text-text-secondary">
              Welcome back{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </p>
          </div>
        </div>

        {/* ── Portal tabs + content ── */}
        <BrandPortal
          brandId={brand.id}
          userId={user.id}
          products={products}
          submissions={submissions}
          reports={reports}
          dailyScanData={dailyScanData}
          resultDistribution={resultDistribution}
          topProducts={topProducts}
        />
      </div>
    </div>
  );
}
