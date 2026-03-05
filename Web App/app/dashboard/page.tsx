import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ScanVerdict } from "@/lib/database.types";

export const metadata: Metadata = { title: "Dashboard — VerifySkn" };

// ── Helpers ───────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function getInitials(fullName: string | null, email: string): string {
  if (fullName) {
    return fullName.trim().split(/\s+/).slice(0, 2).map((n) => n[0].toUpperCase()).join("");
  }
  return (email[0] ?? "?").toUpperCase();
}

function getFirstName(fullName: string | null, email: string): string {
  if (fullName) return fullName.trim().split(/\s+/)[0];
  return email.split("@")[0];
}

// ── Sub-components ────────────────────────────────────────────

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <p className="font-fraunces text-3xl font-semibold text-primary">{value}</p>
      <p className="mt-1 font-rethink text-sm text-text-secondary">{label}</p>
    </div>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-fraunces text-xl font-semibold text-text-primary">{title}</h2>
      {action}
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: ScanVerdict }) {
  const map: Record<ScanVerdict, { bg: string; text: string }> = {
    authentic:  { bg: "rgba(45,122,79,0.1)",  text: "#2D7A4F" },
    unverified: { bg: "rgba(224,123,42,0.1)", text: "#E07B2A" },
    suspicious: { bg: "rgba(192,57,43,0.1)",  text: "#C0392B" },
  };
  const { bg, text } = map[verdict];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-rethink text-xs font-medium capitalize"
      style={{ backgroundColor: bg, color: text }}
    >
      {verdict}
    </span>
  );
}

type ReportStatus = "pending" | "reviewed" | "confirmed" | "dismissed";
type ReportType   = "counterfeit" | "mislabelled" | "wrong_info" | "other";

function StatusBadge({ status }: { status: ReportStatus }) {
  const map: Record<ReportStatus, { bg: string; text: string; label: string }> = {
    pending:   { bg: "rgba(224,123,42,0.1)",  text: "#E07B2A", label: "Pending"   },
    reviewed:  { bg: "rgba(59,130,246,0.1)",  text: "#3B82F6", label: "Reviewed"  },
    confirmed: { bg: "rgba(45,122,79,0.1)",   text: "#2D7A4F", label: "Confirmed" },
    dismissed: { bg: "rgba(107,107,107,0.1)", text: "#6B6B6B", label: "Dismissed" },
  };
  const { bg, text, label } = map[status];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 font-rethink text-xs font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}

function ReportTypeBadge({ type }: { type: ReportType }) {
  const labels: Record<ReportType, string> = {
    counterfeit: "Counterfeit",
    mislabelled: "Mislabelled",
    wrong_info:  "Wrong Info",
    other:       "Other",
  };
  return (
    <span className="inline-block rounded-full border border-border bg-background px-2.5 py-0.5 font-rethink text-xs text-text-secondary">
      {labels[type]}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    admin:     { bg: "rgba(192,57,43,0.1)",  text: "#C0392B" },
    brand_rep: { bg: "rgba(59,130,246,0.1)", text: "#3B82F6" },
    user:      { bg: "rgba(26,60,46,0.08)",  text: "#1A3C2E" },
  };
  const { bg, text } = map[role] ?? map.user;
  return (
    <span
      className="inline-block rounded-full px-3 py-1 font-rethink text-xs font-medium capitalize"
      style={{ backgroundColor: bg, color: text }}
    >
      {role.replace("_", " ")}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-10 text-center">
      <p className="font-rethink text-sm text-text-secondary">{message}</p>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const userId = user.id;

  // Parallel data fetch
  const [
    profileRes,
    totalScansRes,
    authenticScansRes,
    myScansRes,
    myReportsRes,
    recentUpvotesRes,
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, role, scan_count").eq("id", userId).single(),
    supabase.from("scan_logs").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("scan_logs").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("result", "authentic"),
    supabase.from("scan_logs").select("id, barcode_scanned, result, confidence_score, scanned_at, product:products(name, brand)").eq("user_id", userId).order("scanned_at", { ascending: false }).limit(10),
    supabase.from("reports").select("id, barcode, report_type, status, upvotes, created_at").eq("reporter_id", userId).order("created_at", { ascending: false }),
    supabase.from("report_upvotes").select("report_id, created_at, reports(barcode, report_type, status)").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
  ]);

  const profile      = profileRes.data;
  const myScans      = (myScansRes.data ?? []) as Array<{
    id: string;
    barcode_scanned: string;
    result: ScanVerdict;
    confidence_score: number;
    scanned_at: string;
    product: { name: string; brand: string } | null;
  }>;
  const myReports    = (myReportsRes.data ?? []) as Array<{
    id: string;
    barcode: string;
    report_type: ReportType;
    status: ReportStatus;
    upvotes: number;
    created_at: string;
  }>;
  const recentUpvotes = (recentUpvotesRes.data ?? []) as Array<{
    report_id: string;
    created_at: string;
    reports: { barcode: string; report_type: string; status: string } | null;
  }>;

  // Computed stats
  const totalScans      = totalScansRes.count ?? 0;
  const authenticScans  = authenticScansRes.count ?? 0;
  const reportsCount    = myReports.length;
  const upvotesReceived = myReports.reduce((sum, r) => sum + r.upvotes, 0);
  const confirmedCount  = myReports.filter((r) => r.status === "confirmed").length;
  const isTopReporter   = confirmedCount >= 10;

  const fullName  = profile?.full_name ?? user.user_metadata?.full_name ?? null;
  const firstName = getFirstName(fullName, user.email ?? "");
  const initials  = getInitials(fullName, user.email ?? "?");

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      {/* Two-column grid */}
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">

        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-8">

          {/* Greeting */}
          <div>
            <h1 className="font-fraunces text-[32px] font-semibold leading-tight text-text-primary">
              Welcome back, {firstName}
            </h1>
            <p className="mt-1 font-rethink text-sm text-text-secondary">{today}</p>
          </div>

          {/* Personal stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard value={totalScans}      label="Total Scans"          />
            <StatCard value={authenticScans}  label="Authentic Results"    />
            <StatCard value={reportsCount}    label="Reports Submitted"    />
            <StatCard value={upvotesReceived} label="Community Upvotes"    />
          </div>

          {/* ── My Scan History ── */}
          <section>
            <SectionHeader
              title="My Scan History"
              action={
                <Link
                  href="/history"
                  className="font-rethink text-sm text-primary underline-offset-2 hover:underline"
                >
                  View all →
                </Link>
              }
            />

            {myScans.length === 0 ? (
              <EmptyState message="No scans yet. Head to the scanner to verify your first product." />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
                <table className="w-full min-w-[480px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border">
                      {["Date", "Barcode", "Product", "Result", "Confidence"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 font-rethink text-xs font-medium uppercase tracking-widest text-text-secondary"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myScans.map((scan, i) => (
                      <tr
                        key={scan.id}
                        className={cn(
                          "transition-colors hover:bg-background",
                          i < myScans.length - 1 && "border-b border-border"
                        )}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-rethink text-xs text-text-secondary">
                          {formatDate(scan.scanned_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/result/${encodeURIComponent(scan.barcode_scanned)}`}
                            className="font-mono text-sm text-primary underline-offset-2 hover:underline"
                          >
                            {scan.barcode_scanned}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-rethink text-sm text-text-primary">
                          {scan.product?.name ?? (
                            <span className="text-text-secondary">Unknown</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <VerdictBadge verdict={scan.result} />
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                          {scan.confidence_score}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── My Reports ── */}
          <section>
            <SectionHeader
              title="My Reports"
              action={
                <Link
                  href="/report"
                  className="rounded-xl bg-primary px-4 py-2 font-rethink text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  + Submit New Report
                </Link>
              }
            />

            {myReports.length === 0 ? (
              <EmptyState message="You haven't submitted any reports yet." />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
                <table className="w-full min-w-[480px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border">
                      {["Date", "Barcode", "Type", "Status", "Upvotes"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 font-rethink text-xs font-medium uppercase tracking-widest text-text-secondary"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myReports.map((report, i) => (
                      <tr
                        key={report.id}
                        className={cn(
                          "transition-colors hover:bg-background",
                          i < myReports.length - 1 && "border-b border-border"
                        )}
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-rethink text-xs text-text-secondary">
                          {formatDateShort(report.created_at)}
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-text-primary">
                          {report.barcode}
                        </td>
                        <td className="px-4 py-3">
                          <ReportTypeBadge type={report.report_type} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={report.status} />
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-text-secondary">
                          {report.upvotes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col gap-5">

          {/* Account card */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            {/* Avatar */}
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary"
            >
              <span className="font-fraunces text-xl font-semibold text-white">
                {initials}
              </span>
            </div>

            <p className="mt-4 font-rethink text-base font-semibold text-text-primary">
              {fullName ?? firstName}
            </p>
            <p className="font-rethink text-sm text-text-secondary">{user.email}</p>

            <div className="mt-3">
              <RoleBadge role={profile?.role ?? "user"} />
            </div>

            <Link
              href="/dashboard/profile"
              className="mt-4 inline-block font-rethink text-sm text-primary underline-offset-2 hover:underline"
            >
              Edit Profile →
            </Link>
          </div>

          {/* Community activity */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-rethink text-sm font-semibold text-text-primary">
                Community Activity
              </h3>
              {isTopReporter && (
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 font-fraunces text-xs font-semibold"
                  style={{ backgroundColor: "rgba(201,168,76,0.12)", color: "#C9A84C" }}
                >
                  ★ Top Reporter
                </span>
              )}
            </div>

            {recentUpvotes.length === 0 ? (
              <p className="font-rethink text-sm text-text-secondary">
                Reports you upvote will appear here.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {recentUpvotes.map((upvote) => (
                  <li key={upvote.report_id} className="flex flex-col gap-0.5">
                    <p className="font-mono text-xs text-text-primary">
                      {upvote.reports?.barcode ?? upvote.report_id.slice(0, 8)}
                    </p>
                    {upvote.reports && (
                      <p className="font-rethink text-xs capitalize text-text-secondary">
                        {upvote.reports.report_type.replace("_", " ")} ·{" "}
                        {upvote.reports.status}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick scan CTA */}
          <Link
            href="/scan"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-rethink text-base font-medium text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            <ScanIcon className="h-5 w-5" />
            Scan a Product
          </Link>
        </div>

      </div>
    </div>
  );
}

// ── Scan icon ─────────────────────────────────────────────────

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5ZM6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
    </svg>
  );
}
