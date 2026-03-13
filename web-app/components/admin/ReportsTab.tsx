"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateReportAction } from "@/app/admin/actions";
import type { Report } from "@/lib/database.types";

// ── Constants ─────────────────────────────────────────────────

const STATUS_FILTERS = ["all", "pending", "reviewed", "confirmed", "dismissed"] as const;

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-700",
  reviewed:  "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  dismissed: "bg-stone-100 text-stone-500",
};

const TYPE_LABELS: Record<string, string> = {
  counterfeit: "Counterfeit",
  mislabelled: "Mislabelled",
  wrong_info:  "Wrong Info",
  other:       "Other",
};

// ── Component ─────────────────────────────────────────────────

export default function ReportsTab({
  initialReports,
}: {
  initialReports: Report[];
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [expanded, setExpanded]     = useState<Set<string>>(new Set());
  const [noteTexts, setNoteTexts]   = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const filtered = statusFilter === "all"
    ? initialReports
    : initialReports.filter((r) => r.status === statusFilter);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleStatus(
    id: string,
    status: Report["status"],
    note?: string
  ) {
    setError(null);
    start(async () => {
      try {
        await updateReportAction(id, status, note);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function handleSaveNote(report: Report) {
    const note = noteTexts[report.id] ?? report.admin_notes ?? "";
    setSavingNote(report.id);
    start(async () => {
      try {
        await updateReportAction(report.id, report.status, note);
        setSavingNote(null);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
        setSavingNote(null);
      }
    });
  }

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div>
        <h1 className="font-fraunces text-2xl font-semibold text-text-primary">
          Reports
        </h1>
        <p className="mt-0.5 font-rethink text-sm text-text-secondary">
          {initialReports.length} total community report{initialReports.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(192,57,43,0.08)" }}>
          <p className="font-rethink text-sm" style={{ color: "#C0392B" }}>{error}</p>
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => {
          const count = s === "all"
            ? initialReports.length
            : initialReports.filter((r) => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full px-3.5 py-1.5 font-rethink text-xs font-medium capitalize transition-colors",
                statusFilter === s
                  ? "bg-primary text-white"
                  : "border border-border text-text-secondary hover:border-primary/40 hover:text-text-primary"
              )}
            >
              {s === "all" ? "All" : s}{" "}
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center font-rethink text-sm text-text-secondary">
            No reports with status &quot;{statusFilter}&quot;
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                {["", "Reporter", "Barcode", "Type", "Location", "Status", "Date", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const isExpanded = expanded.has(r.id);
                const isLast = i === filtered.length - 1;
                const noteValue = noteTexts[r.id] ?? r.admin_notes ?? "";

                return (
                  <>
                    <tr
                      key={r.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-background/40",
                        !isExpanded && !isLast && "border-b border-border",
                        isExpanded && "bg-background/40"
                      )}
                      onClick={() => toggleExpand(r.id)}
                    >
                      {/* Expand chevron */}
                      <td className="w-8 pl-3 pr-0 py-3 text-text-secondary">
                        {isExpanded
                          ? <ChevronDown size={14} />
                          : <ChevronRight size={14} />
                        }
                      </td>
                      {/* Reporter */}
                      <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                        {r.reporter_id ? r.reporter_id.slice(0, 8) + "…" : "Anon"}
                      </td>
                      {/* Barcode */}
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-secondary">
                        {r.barcode}
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-border px-2.5 py-0.5 font-rethink text-xs text-text-secondary">
                          {TYPE_LABELS[r.report_type] ?? r.report_type}
                        </span>
                      </td>
                      {/* Location */}
                      <td className="px-4 py-3 font-rethink text-sm text-text-secondary">
                        {r.purchase_location}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 font-rethink text-xs font-medium capitalize",
                            STATUS_STYLES[r.status] ?? ""
                          )}
                        >
                          {r.status}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="whitespace-nowrap px-4 py-3 font-rethink text-xs text-text-secondary">
                        {new Date(r.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {r.status !== "confirmed" && (
                            <button
                              onClick={() => handleStatus(r.id, "confirmed")}
                              disabled={isPending}
                              className="whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-rethink text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                            >
                              Confirm
                            </button>
                          )}
                          {r.status !== "dismissed" && (
                            <button
                              onClick={() => handleStatus(r.id, "dismissed")}
                              disabled={isPending}
                              className="whitespace-nowrap rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 font-rethink text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-50"
                            >
                              Dismiss
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {isExpanded && (
                      <tr
                        key={`${r.id}-expanded`}
                        className={cn(!isLast && "border-b border-border")}
                      >
                        <td colSpan={8} className="bg-background/40 px-6 py-5">
                          <div className="flex flex-col gap-4">
                            {/* Description */}
                            <div>
                              <p className="mb-1 font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                Description
                              </p>
                              <p className="font-rethink text-sm text-text-primary">
                                {r.description}
                              </p>
                            </div>

                            {/* Purchase country */}
                            <div>
                              <p className="mb-1 font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                Purchase Country
                              </p>
                              <p className="font-rethink text-sm text-text-primary">
                                {r.purchase_country}
                              </p>
                            </div>

                            {/* Images */}
                            {r.image_urls && r.image_urls.length > 0 && (
                              <div>
                                <p className="mb-2 font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                  Images ({r.image_urls.length})
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {r.image_urls.map((url, j) => (
                                    <a
                                      key={j}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block h-20 w-20 overflow-hidden rounded-lg border border-border"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={url}
                                        alt={`Evidence ${j + 1}`}
                                        className="h-full w-full object-cover"
                                      />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Admin notes */}
                            <div>
                              <p className="mb-1.5 font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                Admin Note
                              </p>
                              <textarea
                                rows={3}
                                placeholder="Add an internal note…"
                                value={noteValue}
                                onChange={(e) =>
                                  setNoteTexts((prev) => ({
                                    ...prev,
                                    [r.id]: e.target.value,
                                  }))
                                }
                                className="w-full max-w-lg resize-none rounded-xl border border-border bg-background px-4 py-2.5 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                              />
                              <button
                                onClick={() => handleSaveNote(r)}
                                disabled={isPending || savingNote === r.id}
                                className="mt-2 flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-rethink text-xs font-medium text-text-secondary transition-colors hover:bg-background disabled:opacity-50"
                              >
                                {savingNote === r.id && (
                                  <Loader2 size={12} className="animate-spin" />
                                )}
                                Save Note
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
