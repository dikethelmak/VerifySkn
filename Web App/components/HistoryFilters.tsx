"use client";

import Link from "next/link";
import { Barcode, Camera } from "lucide-react";
import {
  useHistoryFilters,
  type ResultFilter,
  type ScanTypeFilter,
} from "@/hooks/useHistoryFilters";
import type { ScanVerdict } from "@/lib/database.types";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────

export interface HistoryRow {
  id: string;
  barcode_scanned: string;
  product_id: string | null;
  result: ScanVerdict;
  confidence_score: number;
  scanned_at: string;
  product: { name: string; brand: string } | null;
  hasCombined: boolean;
}

interface Props {
  logs: HistoryRow[];
  totalCount: number;
  page: number;
  totalPages: number;
}

// ── Filter pill ───────────────────────────────────────────────

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 font-rethink text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        active
          ? "bg-primary text-white"
          : "bg-surface text-text-secondary border border-border hover:border-primary/40 hover:text-text-primary"
      )}
    >
      {children}
    </button>
  );
}

// ── Verdict badge ─────────────────────────────────────────────

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

// ── Pagination button ─────────────────────────────────────────

function PaginationButton({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <span className="cursor-not-allowed rounded-lg border border-border px-4 py-2 font-rethink text-sm text-text-secondary opacity-40">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-lg border border-border px-4 py-2 font-rethink text-sm font-medium text-text-primary transition-colors hover:bg-background"
    >
      {label}
    </Link>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Main component ────────────────────────────────────────────

export function HistoryFilters({ logs, totalCount, page, totalPages }: Props) {
  const { resultFilter, scanType, setResultFilter, setScanType } =
    useHistoryFilters();

  // Client-side filter on the current page's rows
  const filtered = logs.filter((log) => {
    if (resultFilter !== "all" && log.result !== resultFilter) return false;
    if (scanType === "barcode"  && log.hasCombined) return false;
    if (scanType === "combined" && !log.hasCombined) return false;
    if (scanType === "image")   return false; // image-only scans not in scan_logs yet
    return true;
  });

  const RESULT_FILTERS: { id: ResultFilter; label: string }[] = [
    { id: "all",        label: "All"        },
    { id: "authentic",  label: "Authentic"  },
    { id: "unverified", label: "Unverified" },
    { id: "suspicious", label: "Suspicious" },
  ];

  const SCAN_TYPE_FILTERS: { id: ScanTypeFilter; label: string }[] = [
    { id: "all",      label: "All"      },
    { id: "barcode",  label: "Barcode"  },
    { id: "image",    label: "Image"    },
    { id: "combined", label: "Combined" },
  ];

  return (
    <>
      {/* ── Filter row ── */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
        {/* Result filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-rethink text-xs font-medium uppercase tracking-widest text-text-secondary">
            Result
          </span>
          {RESULT_FILTERS.map((f) => (
            <Pill
              key={f.id}
              active={resultFilter === f.id}
              onClick={() => setResultFilter(f.id)}
            >
              {f.label}
            </Pill>
          ))}
        </div>

        {/* Divider */}
        <div className="hidden h-5 w-px bg-border sm:block" />

        {/* Scan type filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-rethink text-xs font-medium uppercase tracking-widest text-text-secondary">
            Type
          </span>
          {SCAN_TYPE_FILTERS.map((f) => (
            <Pill
              key={f.id}
              active={scanType === f.id}
              onClick={() => setScanType(f.id)}
            >
              {f.label}
            </Pill>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        {filtered.length > 0 ? (
          <table className="w-full min-w-[600px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                {["Date", "Barcode", "Product", "Result", "Type", "Confidence"].map((h) => (
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
              {filtered.map((log, i) => {
                const isLast = i === filtered.length - 1;
                return (
                  <tr
                    key={log.id}
                    className={cn(
                      "transition-colors hover:bg-background",
                      !isLast && "border-b border-border"
                    )}
                  >
                    <td className="whitespace-nowrap px-5 py-4 font-rethink text-sm text-text-secondary">
                      {formatDate(log.scanned_at)}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/result/${encodeURIComponent(log.barcode_scanned)}`}
                        className="font-mono text-sm text-primary underline-offset-2 hover:underline"
                      >
                        {log.barcode_scanned}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      {log.product ? (
                        <div>
                          <p className="font-rethink text-sm font-medium text-text-primary">
                            {log.product.name}
                          </p>
                          <p className="font-rethink text-xs text-text-secondary">
                            {log.product.brand}
                          </p>
                        </div>
                      ) : (
                        <span className="font-rethink text-sm text-text-secondary">
                          Unknown
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <VerdictBadge verdict={log.result} />
                    </td>
                    <td className="px-5 py-4">
                      {log.hasCombined ? (
                        <Camera
                          size={15}
                          strokeWidth={1.8}
                          className="text-primary"
                          aria-label="Barcode + Image"
                        />
                      ) : (
                        <Barcode
                          size={15}
                          strokeWidth={1.8}
                          className="text-text-secondary"
                          aria-label="Barcode only"
                        />
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono text-sm text-text-secondary">
                      {log.confidence_score}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <p className="font-fraunces text-lg text-text-secondary">No matching scans</p>
            <p className="mt-1 font-rethink text-sm text-text-secondary">
              Try adjusting the filters above.
            </p>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <PaginationButton
            href={page > 1 ? `/history?page=${page - 1}` : null}
            label="← Previous"
          />
          <p className="font-rethink text-sm text-text-secondary">
            Page {page} of {totalPages}
          </p>
          <PaginationButton
            href={page < totalPages ? `/history?page=${page + 1}` : null}
            label="Next →"
          />
        </div>
      )}
    </>
  );
}
