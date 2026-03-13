"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Plus, Loader2 } from "lucide-react";
import { ProductSlideover } from "./ProductSlideover";
import type { Product, BrandSubmission, Report } from "@/lib/database.types";

// ── Recharts loaded client-side only ──────────────────────────
const AnalyticsTab = dynamic(() => import("./AnalyticsTab"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-primary/40" />
    </div>
  ),
});

// ── Types ─────────────────────────────────────────────────────

type Tab = "Products" | "Reports" | "Analytics";

const REPORT_TYPE_LABELS: Record<string, string> = {
  counterfeit:  "Counterfeit",
  mislabelled:  "Mislabelled",
  wrong_info:   "Wrong Info",
  other:        "Other",
};

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  reviewed:  "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-stone-100 text-stone-500",
};

const VERDICT_STYLES: Record<string, string> = {
  authentic:   "bg-emerald-100 text-emerald-700",
  suspicious:  "bg-red-100 text-red-700",
  unverified:  "bg-stone-100 text-stone-500",
};

interface Props {
  brandId:            string;
  userId:             string;
  products:           Product[];
  submissions:        BrandSubmission[];
  reports:            Report[];
  dailyScanData:      Array<{ date: string; count: number }>;
  resultDistribution: Array<{ name: string; value: number }>;
  topProducts:        Array<{ name: string; count: number }>;
}

// ── Component ─────────────────────────────────────────────────

export default function BrandPortal({
  brandId,
  userId,
  products: initialProducts,
  submissions: initialSubmissions,
  reports,
  dailyScanData,
  resultDistribution,
  topProducts,
}: Props) {
  const [activeTab, setActiveTab]   = useState<Tab>("Products");
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [products, setProducts]     = useState(initialProducts);
  const [submissions, setSubmissions] = useState(initialSubmissions);

  // Report filters
  const [typeFilter,   setTypeFilter]   = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleSubmissionSuccess = useCallback(() => {
    // We can't re-fetch server data from a client component,
    // so just re-open will show stale until page refresh.
    // A router.refresh() would re-run the server component.
  }, []);

  const TABS: Tab[] = ["Products", "Reports", "Analytics"];

  const filteredReports = reports.filter((r) => {
    if (typeFilter !== "all"   && r.report_type !== typeFilter)   return false;
    if (statusFilter !== "all" && r.status       !== statusFilter) return false;
    return true;
  });

  return (
    <>
      {/* ── Tab bar ── */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-5 py-3 font-rethink text-sm font-medium transition-colors ${
              activeTab === tab ? "text-primary" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="brand-tab"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="mt-6">
        {activeTab === "Products" && (
          <ProductsTab
            products={products}
            submissions={submissions}
            onAddProduct={() => setSlideoverOpen(true)}
          />
        )}
        {activeTab === "Reports" && (
          <ReportsTab
            reports={filteredReports}
            allReports={reports}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            onTypeFilter={setTypeFilter}
            onStatusFilter={setStatusFilter}
          />
        )}
        {activeTab === "Analytics" && (
          <AnalyticsTab
            dailyScanData={dailyScanData}
            resultDistribution={resultDistribution}
            topProducts={topProducts}
          />
        )}
      </div>

      {/* ── Product slideover ── */}
      <ProductSlideover
        isOpen={slideoverOpen}
        onClose={() => setSlideoverOpen(false)}
        brandId={brandId}
        userId={userId}
        onSuccess={handleSubmissionSuccess}
      />
    </>
  );
}

// ── Products tab ───────────────────────────────────────────────

function ProductsTab({
  products,
  submissions,
  onAddProduct,
}: {
  products:    Product[];
  submissions: BrandSubmission[];
  onAddProduct: () => void;
}) {
  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  return (
    <div className="flex flex-col gap-5">
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-rethink text-sm text-text-secondary">
            {products.length} product{products.length !== 1 ? "s" : ""} listed
            {pendingCount > 0 && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                {pendingCount} pending review
              </span>
            )}
          </p>
        </div>
        <button
          onClick={onAddProduct}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-rethink text-sm font-medium text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Product
        </button>
      </div>

      {/* Live products */}
      {products.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Product Name", "Barcode", "Category", "Retailers", "Updated"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`transition-colors hover:bg-background/50 ${
                      i !== products.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-rethink text-sm font-medium text-text-primary">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {p.barcode}
                    </td>
                    <td className="px-4 py-3 font-rethink text-sm text-text-secondary">
                      {p.category}
                    </td>
                    <td className="px-4 py-3 font-rethink text-sm text-text-secondary">
                      {p.authenticated_retailers.length > 0
                        ? p.authenticated_retailers.length
                        : <span className="text-text-secondary/40">—</span>}
                    </td>
                    <td className="px-4 py-3 font-rethink text-xs text-text-secondary">
                      {new Date(p.updated_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending submissions */}
      {submissions.length > 0 && (
        <div>
          <p className="mb-3 font-rethink text-sm font-semibold text-text-primary">
            Pending Submissions
          </p>
          <div className="rounded-2xl border border-border bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Product Name", "Barcode", "Category", "Submitted", "Status"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => (
                    <tr
                      key={s.id}
                      className={`transition-colors hover:bg-background/50 ${
                        i !== submissions.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-rethink text-sm font-medium text-text-primary">
                        {s.product_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                        {s.barcode}
                      </td>
                      <td className="px-4 py-3 font-rethink text-sm text-text-secondary">
                        {s.category}
                      </td>
                      <td className="px-4 py-3 font-rethink text-xs text-text-secondary">
                        {new Date(s.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-rethink text-xs font-medium capitalize ${STATUS_STYLES[s.status] ?? ""}`}
                        >
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {products.length === 0 && submissions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
          <p className="font-fraunces text-lg font-semibold text-text-primary">
            No products yet
          </p>
          <p className="mt-1 font-rethink text-sm text-text-secondary">
            Add your first product to start tracking scans and reports.
          </p>
          <button
            onClick={onAddProduct}
            className="mt-5 flex items-center gap-2 mx-auto rounded-xl bg-primary px-5 py-2.5 font-rethink text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <Plus size={15} strokeWidth={2.5} />
            Add Product
          </button>
        </div>
      )}
    </div>
  );
}

// ── Reports tab ────────────────────────────────────────────────

const REPORT_TYPES = ["all", "counterfeit", "mislabelled", "wrong_info", "other"];
const REPORT_STATUSES = ["all", "pending", "reviewed", "confirmed", "dismissed"];

function ReportsTab({
  reports,
  allReports,
  typeFilter,
  statusFilter,
  onTypeFilter,
  onStatusFilter,
}: {
  reports:        Report[];
  allReports:     Report[];
  typeFilter:     string;
  statusFilter:   string;
  onTypeFilter:   (v: string) => void;
  onStatusFilter: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Info banner */}
      <div className="rounded-xl border border-border bg-surface px-4 py-3">
        <p className="font-rethink text-sm italic text-text-secondary">
          Community reports help you monitor counterfeit activity for your products. Review
          confirmed reports promptly to protect your customers.
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-4">
        <div className="flex flex-wrap gap-1.5">
          <span className="self-center font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Type
          </span>
          {REPORT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => onTypeFilter(t)}
              className={`rounded-full px-3 py-1 font-rethink text-xs font-medium transition-colors ${
                typeFilter === t
                  ? "bg-primary text-white"
                  : "border border-border text-text-secondary hover:border-primary/40 hover:text-text-primary"
              }`}
            >
              {t === "all" ? "All" : REPORT_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="self-center font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Status
          </span>
          {REPORT_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onStatusFilter(s)}
              className={`rounded-full px-3 py-1 font-rethink text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-primary text-white"
                  : "border border-border text-text-secondary hover:border-primary/40 hover:text-text-primary"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Reports count */}
      <p className="font-rethink text-sm text-text-secondary">
        Showing {reports.length} of {allReports.length} report{allReports.length !== 1 ? "s" : ""}
      </p>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface py-14 text-center">
          <p className="font-rethink text-sm text-text-secondary">
            No reports match the selected filters
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Barcode", "Type", "Location", "Upvotes", "Date", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`transition-colors hover:bg-background/50 ${
                      i !== reports.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {r.barcode}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-border px-2.5 py-0.5 font-rethink text-xs text-text-secondary">
                        {REPORT_TYPE_LABELS[r.report_type] ?? r.report_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-rethink text-sm text-text-secondary">
                      {r.purchase_location}
                    </td>
                    <td className="px-4 py-3 font-rethink text-sm text-text-secondary">
                      {r.upvotes}
                    </td>
                    <td className="px-4 py-3 font-rethink text-xs text-text-secondary">
                      {new Date(r.created_at).toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-rethink text-xs font-medium capitalize ${STATUS_STYLES[r.status] ?? ""}`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
