"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  updateBrandVerifiedAction,
  insertBrandAction,
} from "@/app/admin/actions";
import type { Brand } from "@/lib/database.types";

// ── Component ─────────────────────────────────────────────────

export default function BrandsTab({
  initialBrands,
  brandProductCounts,
}: {
  initialBrands: Brand[];
  brandProductCounts: Record<string, number>;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  // Add-brand form state
  const [newName, setNewName]       = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newLogo, setNewLogo]       = useState("");
  const [adding, setAdding]         = useState(false);

  function handleToggleVerified(id: string, current: boolean) {
    setError(null);
    start(async () => {
      try {
        await updateBrandVerifiedAction(id, !current);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function handleAddBrand() {
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    start(async () => {
      try {
        await insertBrandAction({
          name: newName.trim(),
          website: newWebsite.trim() || null,
          logo_url: newLogo.trim() || null,
        });
        setNewName("");
        setNewWebsite("");
        setNewLogo("");
        setShowAdd(false);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setAdding(false);
      }
    });
  }

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-fraunces text-2xl font-semibold text-text-primary">
            Brands
          </h1>
          <p className="mt-0.5 font-rethink text-sm text-text-secondary">
            {initialBrands.length} brand{initialBrands.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-rethink text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          <Plus size={15} />
          Add Brand
        </button>
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

      {/* Add brand form */}
      {showAdd && (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <p className="mb-4 font-rethink text-sm font-semibold text-text-primary">
            New Brand
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="font-rethink text-xs font-medium text-text-secondary">
                Brand Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. CeraVe"
                className="rounded-xl border border-border bg-background px-3 py-2 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-rethink text-xs font-medium text-text-secondary">
                Website
              </label>
              <input
                type="url"
                value={newWebsite}
                onChange={(e) => setNewWebsite(e.target.value)}
                placeholder="https://cerave.com"
                className="rounded-xl border border-border bg-background px-3 py-2 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-rethink text-xs font-medium text-text-secondary">
                Logo URL
              </label>
              <input
                type="url"
                value={newLogo}
                onChange={(e) => setNewLogo(e.target.value)}
                placeholder="https://…/logo.png"
                className="rounded-xl border border-border bg-background px-3 py-2 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleAddBrand}
              disabled={!newName.trim() || adding || isPending}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 font-rethink text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {adding && <Loader2 size={13} className="animate-spin" />}
              Create Brand
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-xl border border-border px-4 py-2 font-rethink text-sm font-medium text-text-secondary hover:bg-background transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {initialBrands.length === 0 ? (
          <p className="px-5 py-10 text-center font-rethink text-sm text-text-secondary">
            No brands yet
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                {["Brand", "Website", "Products", "Verified", ""].map((h) => (
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
              {initialBrands.map((brand, i) => {
                const isLast = i === initialBrands.length - 1;
                const count  = brandProductCounts[brand.name] ?? 0;

                return (
                  <tr
                    key={brand.id}
                    className={cn(
                      "transition-colors hover:bg-background/40",
                      !isLast && "border-b border-border"
                    )}
                  >
                    {/* Brand */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {brand.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={brand.logo_url}
                            alt={brand.name}
                            className="h-7 w-7 rounded-full object-contain border border-border bg-background"
                          />
                        ) : (
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-fraunces text-xs font-semibold text-primary">
                            {brand.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-rethink text-sm font-medium text-text-primary">
                          {brand.name}
                        </span>
                      </div>
                    </td>
                    {/* Website */}
                    <td className="px-4 py-3">
                      {brand.website ? (
                        <a
                          href={brand.website}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 font-rethink text-xs text-primary hover:underline"
                        >
                          <ExternalLink size={11} />
                          {brand.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      ) : (
                        <span className="font-rethink text-xs text-text-secondary">—</span>
                      )}
                    </td>
                    {/* Products */}
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-border px-2.5 py-0.5 font-rethink text-xs text-text-secondary">
                        {count} product{count !== 1 ? "s" : ""}
                      </span>
                    </td>
                    {/* Verified toggle */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleVerified(brand.id, brand.verified)}
                        disabled={isPending}
                        className={cn(
                          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50",
                          brand.verified ? "bg-emerald-500" : "bg-stone-300"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                            brand.verified ? "translate-x-4" : "translate-x-0"
                          )}
                        />
                      </button>
                    </td>
                    {/* Verified label */}
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 font-rethink text-xs font-medium",
                          brand.verified
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-stone-100 text-stone-500"
                        )}
                      >
                        {brand.verified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
