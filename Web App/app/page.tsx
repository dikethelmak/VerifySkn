import Link from "next/link";
import type { Metadata } from "next";
import { Barcode, Camera } from "lucide-react";
import {
  getDashboardStats,
  getRecentScans,
  getProductIdsWithCombinedResults,
} from "@/lib/supabase";
import type { ScanVerdict } from "@/lib/database.types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "VerifySkn — Scan Skincare Products for Authenticity",
  description:
    "Instantly verify skincare product authenticity. Scan any barcode and our AI cross-references it against our verified database in seconds.",
  openGraph: {
    title: "VerifySkn — Scan Skincare Products for Authenticity",
    description:
      "Instantly verify skincare product authenticity. Scan any barcode and our AI cross-references it against our verified database in seconds.",
  },
};

// ISR — revalidate home-page stats every hour
export const revalidate = 3600;

export default async function HomePage() {
  const [stats, recentScans] = await Promise.all([
    getDashboardStats(),
    getRecentScans(5),
  ]);

  // Determine which recent scans have an associated image analysis
  const productIds = recentScans
    .map((s) => s.product_id)
    .filter((id): id is string => id !== null);
  const combinedProductIds = await getProductIdsWithCombinedResults(productIds);

  const authenticRate =
    stats.totalScans > 0
      ? Math.round((stats.breakdown.authentic / stats.totalScans) * 100)
      : 0;

  return (
    <main>
      {/* ── Hero ── */}
      <section className="bg-primary px-6 py-24 text-white">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-fraunces text-5xl font-semibold leading-tight">
            Know What&apos;s Going On Your Skin
          </h1>
          <p className="mt-5 font-rethink text-lg leading-relaxed text-white/75">
            Instantly verify skincare product authenticity. Scan any barcode —
            we cross-reference it against our database and AI-verify the result
            in seconds.
          </p>
          <Link
            href="/scan"
            className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-3.5 font-rethink text-base font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#C9A84C", color: "#1A3C2E" }}
          >
            <ScanIcon className="h-5 w-5" />
            Scan a Product
          </Link>
        </div>
      </section>

      {/* ── Stats — 2 × 2 on mobile, 4 columns on sm+ ── */}
      <section className="border-b border-border bg-surface px-6 py-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 sm:grid-cols-4">
          <StatCard value={stats.totalProducts}         label="Products in Database" />
          <StatCard value={stats.totalScans}            label="Total Scans" />
          <StatCard value={stats.totalImageAnalyses}    label="Images Analysed" />
          <StatCard value={`${authenticRate}%`}         label="Authentic Rate" />
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-fraunces text-3xl font-semibold text-text-primary">
            How It Works
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <Step
              number="01"
              title="Scan the Barcode"
              description="Point your camera at the EAN-13 or UPC barcode on the product packaging — or type it manually."
            />
            <Step
              number="02"
              title="AI Verification"
              description="We cross-reference against our database of verified products, then run an AI authenticity analysis."
            />
            <Step
              number="03"
              title="Get Your Result"
              description="Receive an instant verdict — Authentic, Unverified, or Suspicious — with packaging tips and confidence score."
            />
          </div>
        </div>
      </section>

      {/* ── Recent scans ── */}
      {recentScans.length > 0 && (
        <section className="border-t border-border px-6 py-12">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-fraunces text-2xl font-semibold text-text-primary">
                Recent Scans
              </h2>
              <Link
                href="/history"
                className="font-rethink text-sm text-primary underline-offset-2 hover:underline"
              >
                View all →
              </Link>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
              <table className="w-full min-w-[480px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border">
                    {["Barcode", "Product", "Result", "Type", "Date"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3.5 font-rethink text-xs font-medium uppercase tracking-widest text-text-secondary"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((scan, i) => {
                    const product = scan.product as
                      | { name: string; brand: string }
                      | null;
                    const isLast = i === recentScans.length - 1;
                    const hasCombined =
                      scan.product_id !== null &&
                      combinedProductIds.has(scan.product_id);

                    return (
                      <tr
                        key={scan.id}
                        className={cn(
                          "transition-colors hover:bg-background",
                          !isLast && "border-b border-border"
                        )}
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/result/${encodeURIComponent(scan.barcode_scanned)}`}
                            className="font-mono text-sm text-primary underline-offset-2 hover:underline"
                          >
                            {scan.barcode_scanned}
                          </Link>
                        </td>
                        <td className="px-5 py-4 font-rethink text-sm text-text-primary">
                          {product?.name ?? (
                            <span className="text-text-secondary">Unknown</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <VerdictBadge verdict={scan.result as ScanVerdict} />
                        </td>
                        {/* Scan type icon */}
                        <td className="px-5 py-4">
                          {hasCombined ? (
                            <span title="Barcode + Image">
                              <Camera
                                size={15}
                                strokeWidth={1.8}
                                className="text-primary"
                              />
                            </span>
                          ) : (
                            <span title="Barcode only">
                              <Barcode
                                size={15}
                                strokeWidth={1.8}
                                className="text-text-secondary"
                              />
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 font-rethink text-sm text-text-secondary">
                          {formatDate(scan.scanned_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

// ── Sub-components ───────────────────────────────────────────

function StatCard({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-fraunces text-4xl font-semibold text-primary">{value}</p>
      <p className="mt-1 font-rethink text-sm text-text-secondary">{label}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <p className="font-mono text-xs tracking-widest text-text-secondary">{number}</p>
      <h3 className="mt-3 font-fraunces text-xl font-semibold text-primary">{title}</h3>
      <p className="mt-2 font-rethink text-sm leading-relaxed text-text-secondary">
        {description}
      </p>
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: ScanVerdict }) {
  const styles: Record<ScanVerdict, { bg: string; text: string }> = {
    authentic:  { bg: "rgba(45,122,79,0.1)",  text: "#2D7A4F" },
    unverified: { bg: "rgba(224,123,42,0.1)", text: "#E07B2A" },
    suspicious: { bg: "rgba(192,57,43,0.1)",  text: "#C0392B" },
  };
  const { bg, text } = styles[verdict];
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 font-rethink text-xs font-medium capitalize"
      style={{ backgroundColor: bg, color: text }}
    >
      {verdict}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5ZM6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z"
      />
    </svg>
  );
}
