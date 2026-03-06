import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase";
import AdminShell from "@/components/admin/AdminShell";
import type { Product, BrandSubmission, Report, Brand } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export interface AdminUser {
  id: string;
  full_name: string | null;
  role: string;
  verified_brand_id: string | null;
  scan_count: number;
  created_at: string;
  email: string;
  report_count: number;
}

export interface ActivityItem {
  type: "scan" | "report" | "signup" | "submission";
  description: string;
  timestamp: string;
}

export interface AdminStats {
  totalScans: number;
  todayScans: number;
  pendingReports: number;
  confirmedCounterfeits: number;
  totalUsers: number;
  verifiedBrands: number;
}

export default async function AdminPage() {
  const supabase = createSupabaseServerClient();

  // ── Auth + role check ─────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin");

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as { role: string } | null;

  if (!profile || profile.role !== "admin") redirect("/dashboard");

  // ── Data fetch (parallel) ─────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    totalScansRes,
    todayScansRes,
    pendingReportsRes,
    confirmedRes,
    totalUsersRes,
    verifiedBrandsRes,
    productsRes,
    reportsRes,
    brandsRes,
    submissionsRes,
    recentScansRes,
    recentReportsRes,
    recentSignupsRes,
    recentSubsRes,
    brandProductsRes,
  ] = await Promise.all([
    supabase.from("scan_logs").select("id", { count: "exact", head: true }),
    supabase
      .from("scan_logs")
      .select("id", { count: "exact", head: true })
      .gte("scanned_at", todayStart.toISOString()),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("brands")
      .select("id", { count: "exact", head: true })
      .eq("verified", true),
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("brands").select("*").order("name"),
    supabase
      .from("brand_submissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    // Activity feed sources
    supabase
      .from("scan_logs")
      .select("barcode_scanned, result, scanned_at")
      .order("scanned_at", { ascending: false })
      .limit(15),
    supabase
      .from("reports")
      .select("barcode, report_type, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("profiles")
      .select("full_name, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("brand_submissions")
      .select("product_name, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("products").select("brand"),
  ]);

  // ── Admin users via RPC ──────────────────────────────────
  const { data: adminUsersRaw } = await supabase.rpc("get_admin_users");
  const adminUsers = (adminUsersRaw ?? []) as AdminUser[];

  // ── Stats ────────────────────────────────────────────────
  const stats: AdminStats = {
    totalScans:            totalScansRes.count    ?? 0,
    todayScans:            todayScansRes.count    ?? 0,
    pendingReports:        pendingReportsRes.count ?? 0,
    confirmedCounterfeits: confirmedRes.count     ?? 0,
    totalUsers:            totalUsersRes.count    ?? 0,
    verifiedBrands:        verifiedBrandsRes.count ?? 0,
  };

  // ── Activity feed ────────────────────────────────────────
  type RawScan   = { barcode_scanned: string; result: string; scanned_at: string };
  type RawReport = { barcode: string; report_type: string; created_at: string };
  type RawProfile = { full_name: string | null; created_at: string };
  type RawSub    = { product_name: string; created_at: string };

  const activity: ActivityItem[] = [
    ...(recentScansRes.data as unknown as RawScan[] ?? []).map((s) => ({
      type: "scan" as const,
      description: `Barcode ${s.barcode_scanned} scanned — ${s.result}`,
      timestamp: s.scanned_at,
    })),
    ...(recentReportsRes.data as unknown as RawReport[] ?? []).map((r) => ({
      type: "report" as const,
      description: `${r.report_type} report filed for ${r.barcode}`,
      timestamp: r.created_at,
    })),
    ...(recentSignupsRes.data as unknown as RawProfile[] ?? []).map((p) => ({
      type: "signup" as const,
      description: `New user registered: ${p.full_name ?? "Anonymous"}`,
      timestamp: p.created_at,
    })),
    ...(recentSubsRes.data as unknown as RawSub[] ?? []).map((s) => ({
      type: "submission" as const,
      description: `Product submission: ${s.product_name}`,
      timestamp: s.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 30);

  // ── Brand→product counts ─────────────────────────────────
  const brandProductCounts: Record<string, number> = {};
  for (const p of (brandProductsRes.data as unknown as { brand: string }[] ?? [])) {
    brandProductCounts[p.brand] = (brandProductCounts[p.brand] ?? 0) + 1;
  }

  return (
    <AdminShell
      stats={stats}
      activity={activity}
      products={(productsRes.data ?? []) as unknown as Product[]}
      reports={(reportsRes.data ?? []) as unknown as Report[]}
      brands={(brandsRes.data ?? []) as unknown as Brand[]}
      brandProductCounts={brandProductCounts}
      submissions={(submissionsRes.data ?? []) as unknown as BrandSubmission[]}
      users={adminUsers}
    />
  );
}
