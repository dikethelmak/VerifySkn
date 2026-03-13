"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  approveSubmissionAction,
  rejectSubmissionAction,
} from "@/app/admin/actions";
import type { BrandSubmission, Brand } from "@/lib/database.types";

// ── Component ─────────────────────────────────────────────────

export default function SubmissionsTab({
  initialSubmissions,
  brands,
}: {
  initialSubmissions: BrandSubmission[];
  brands: Brand[];
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Expand/collapse rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Two-step approve: confirmingId = the id that's been clicked once
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [approving, setApproving]       = useState<string | null>(null);

  // Reject state per submission
  const [rejectingId, setRejectingId]   = useState<string | null>(null);
  const [rejectNote, setRejectNote]     = useState("");
  const [rejecting, setRejecting]       = useState<string | null>(null);

  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleApproveFirst(id: string) {
    setConfirmingId(id);
  }

  function handleApproveConfirm(id: string) {
    setError(null);
    setApproving(id);
    setConfirmingId(null);
    start(async () => {
      try {
        await approveSubmissionAction(id);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setApproving(null);
      }
    });
  }

  function handleRejectSubmit(id: string) {
    if (!rejectNote.trim()) return;
    setError(null);
    setRejecting(id);
    start(async () => {
      try {
        await rejectSubmissionAction(id, rejectNote.trim());
        setRejectingId(null);
        setRejectNote("");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setRejecting(null);
      }
    });
  }

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div>
        <h1 className="font-fraunces text-2xl font-semibold text-text-primary">
          Submissions
        </h1>
        <p className="mt-0.5 font-rethink text-sm text-text-secondary">
          {initialSubmissions.length} pending brand submission{initialSubmissions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ backgroundColor: "rgba(192,57,43,0.08)" }}
        >
          <p className="font-rethink text-sm" style={{ color: "#C0392B" }}>
            {error}
          </p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {initialSubmissions.length === 0 ? (
          <p className="px-5 py-10 text-center font-rethink text-sm text-text-secondary">
            No pending submissions
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                {[
                  "",
                  "Brand",
                  "Product",
                  "Barcode",
                  "Category",
                  "Date",
                  "Actions",
                ].map((h) => (
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
              {initialSubmissions.map((sub, i) => {
                const isExpanded  = expanded.has(sub.id);
                const isLast      = i === initialSubmissions.length - 1;
                const brandName   = brandMap[sub.brand_id] ?? "Unknown Brand";
                const isConfirming = confirmingId === sub.id;
                const isApproving  = approving === sub.id;
                const isRejecting  = rejectingId === sub.id;

                return (
                  <>
                    <tr
                      key={sub.id}
                      className={cn(
                        "cursor-pointer transition-colors hover:bg-background/40",
                        !isExpanded && !isLast && "border-b border-border",
                        isExpanded && "bg-background/40"
                      )}
                      onClick={() => toggleExpand(sub.id)}
                    >
                      {/* Expand chevron */}
                      <td className="w-8 pl-3 pr-0 py-3 text-text-secondary">
                        {isExpanded
                          ? <ChevronDown size={14} />
                          : <ChevronRight size={14} />
                        }
                      </td>
                      {/* Brand */}
                      <td className="px-4 py-3 font-rethink text-sm font-medium text-text-primary">
                        {brandName}
                      </td>
                      {/* Product */}
                      <td className="px-4 py-3 font-rethink text-sm text-text-primary">
                        {sub.product_name}
                      </td>
                      {/* Barcode */}
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-secondary">
                        {sub.barcode}
                      </td>
                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-border px-2.5 py-0.5 font-rethink text-xs text-text-secondary">
                          {sub.category}
                        </span>
                      </td>
                      {/* Date */}
                      <td className="whitespace-nowrap px-4 py-3 font-rethink text-xs text-text-secondary">
                        {new Date(sub.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      {/* Actions */}
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5">
                          {/* Approve: two-step */}
                          {isConfirming ? (
                            <>
                              <button
                                onClick={() => handleApproveConfirm(sub.id)}
                                disabled={isPending || isApproving}
                                className="whitespace-nowrap rounded-lg border border-emerald-300 bg-emerald-500 px-2.5 py-1 font-rethink text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
                              >
                                {isApproving ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : (
                                  "Confirm Approve"
                                )}
                              </button>
                              <button
                                onClick={() => setConfirmingId(null)}
                                className="rounded-lg border border-border px-2.5 py-1 font-rethink text-xs font-medium text-text-secondary hover:bg-background transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleApproveFirst(sub.id)}
                              disabled={isPending || isApproving}
                              className="whitespace-nowrap rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-rethink text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {isApproving ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                "Approve"
                              )}
                            </button>
                          )}
                          {/* Reject */}
                          {!isRejecting && !isConfirming && (
                            <button
                              onClick={() => {
                                setRejectingId(sub.id);
                                setRejectNote("");
                              }}
                              disabled={isPending}
                              className="whitespace-nowrap rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 font-rethink text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Reject note inline (only when rejecting this row) */}
                    {isRejecting && !isExpanded && (
                      <tr
                        key={`${sub.id}-reject`}
                        className={cn(!isLast && "border-b border-border")}
                      >
                        <td
                          colSpan={7}
                          className="bg-red-50/60 px-6 py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <p className="mb-2 font-rethink text-xs font-semibold uppercase tracking-wide text-red-600">
                            Rejection Note (required)
                          </p>
                          <textarea
                            rows={2}
                            autoFocus
                            placeholder="Explain why this submission is being rejected…"
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            className="w-full max-w-lg resize-none rounded-xl border border-red-200 bg-white px-4 py-2.5 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => handleRejectSubmit(sub.id)}
                              disabled={!rejectNote.trim() || isPending || rejecting === sub.id}
                              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 font-rethink text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                            >
                              {rejecting === sub.id && (
                                <Loader2 size={11} className="animate-spin" />
                              )}
                              Reject Submission
                            </button>
                            <button
                              onClick={() => {
                                setRejectingId(null);
                                setRejectNote("");
                              }}
                              className="rounded-lg border border-border px-3 py-1.5 font-rethink text-xs font-medium text-text-secondary hover:bg-background transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Expanded details row */}
                    {isExpanded && (
                      <tr
                        key={`${sub.id}-expanded`}
                        className={cn(!isLast && "border-b border-border")}
                      >
                        <td colSpan={7} className="bg-background/40 px-6 py-5">
                          <div className="flex flex-col gap-4">
                            {/* Details grid */}
                            <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
                              {sub.size_ml && (
                                <div>
                                  <p className="mb-0.5 font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                    Size
                                  </p>
                                  <p className="font-rethink text-sm text-text-primary">
                                    {sub.size_ml} ml
                                  </p>
                                </div>
                              )}
                              {sub.authenticated_retailers &&
                                sub.authenticated_retailers.length > 0 && (
                                  <div className="col-span-2">
                                    <p className="mb-0.5 font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                      Authenticated Retailers
                                    </p>
                                    <p className="font-rethink text-sm text-text-primary">
                                      {sub.authenticated_retailers.join(", ")}
                                    </p>
                                  </div>
                                )}
                              {sub.packaging_notes && (
                                <div className="col-span-full">
                                  <p className="mb-0.5 font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                    Packaging Notes
                                  </p>
                                  <p className="font-rethink text-sm text-text-primary">
                                    {sub.packaging_notes}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Reject note input inside expanded view */}
                            {isRejecting && (
                              <div onClick={(e) => e.stopPropagation()}>
                                <p className="mb-1.5 font-rethink text-xs font-semibold uppercase tracking-wide text-red-600">
                                  Rejection Note (required)
                                </p>
                                <textarea
                                  rows={2}
                                  autoFocus
                                  placeholder="Explain why this submission is being rejected…"
                                  value={rejectNote}
                                  onChange={(e) => setRejectNote(e.target.value)}
                                  className="w-full max-w-lg resize-none rounded-xl border border-red-200 bg-background px-4 py-2.5 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                                />
                                <div className="mt-2 flex items-center gap-2">
                                  <button
                                    onClick={() => handleRejectSubmit(sub.id)}
                                    disabled={!rejectNote.trim() || isPending || rejecting === sub.id}
                                    className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 font-rethink text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                                  >
                                    {rejecting === sub.id && (
                                      <Loader2 size={11} className="animate-spin" />
                                    )}
                                    Reject Submission
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRejectingId(null);
                                      setRejectNote("");
                                    }}
                                    className="rounded-lg border border-border px-3 py-1.5 font-rethink text-xs font-medium text-text-secondary hover:bg-background transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
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
