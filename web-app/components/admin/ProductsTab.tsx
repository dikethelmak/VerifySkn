"use client";

import {
  useState,
  useTransition,
  useMemo,
  KeyboardEvent,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Pencil, Trash2, Check, X, Search, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  updateProductAction,
  deleteProductAction,
  insertProductAction,
} from "@/app/admin/actions";
import type { Product } from "@/lib/database.types";

// ── Constants ──────────────────────────────────────────────────

const CATEGORIES = [
  "Cleanser", "Exfoliant", "Eye Cream", "Lip Care", "Mask",
  "Moisturiser", "Oil", "Serum", "Sunscreen", "Toner", "Other",
];

const CELL_INPUT =
  "w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-rethink text-sm text-text-primary focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20";

// ── Edit state ─────────────────────────────────────────────────

interface EditState {
  name: string;
  barcode: string;
  brand: string;
  category: string;
  size_ml: string;
  country_of_manufacture: string;
  packaging_notes: string;
}

function toEditState(p: Product): EditState {
  return {
    name: p.name,
    barcode: p.barcode,
    brand: p.brand,
    category: p.category,
    size_ml: p.size_ml?.toString() ?? "",
    country_of_manufacture: p.country_of_manufacture,
    packaging_notes: p.packaging_notes ?? "",
  };
}

// ── Main component ─────────────────────────────────────────────

export default function ProductsTab({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [search,       setSearch]       = useState("");
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editState,    setEditState]    = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [slideoverOpen, setSlideoverOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const products = useMemo(() => {
    if (!search.trim()) return initialProducts;
    const q = search.toLowerCase();
    return initialProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.barcode.includes(q)
    );
  }, [initialProducts, search]);

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEditState(toEditState(p));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
  }

  function setField<K extends keyof EditState>(key: K, val: EditState[K]) {
    setEditState((prev) => (prev ? { ...prev, [key]: val } : prev));
  }

  function handleSave() {
    if (!editingId || !editState) return;
    start(async () => {
      try {
        await updateProductAction(editingId, {
          name: editState.name.trim(),
          barcode: editState.barcode.trim(),
          brand: editState.brand.trim(),
          category: editState.category,
          size_ml: editState.size_ml ? Number(editState.size_ml) : null,
          country_of_manufacture: editState.country_of_manufacture.trim(),
          packaging_notes: editState.packaging_notes.trim() || null,
        });
        setEditingId(null);
        setEditState(null);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    start(async () => {
      try {
        await deleteProductAction(deleteTarget.id);
        setDeleteTarget(null);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="flex max-w-[1200px] flex-col gap-5">
      <div>
        <h1 className="font-fraunces text-2xl font-semibold text-text-primary">
          Products
        </h1>
        <p className="mt-0.5 font-rethink text-sm text-text-secondary">
          {initialProducts.length} product{initialProducts.length !== 1 ? "s" : ""} in the verification database
        </p>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(192,57,43,0.08)" }}>
          <p className="font-rethink text-sm" style={{ color: "#C0392B" }}>
            {error}
          </p>
        </div>
      )}

      {/* Search + Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            placeholder="Search by name, brand, or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-4 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          onClick={() => setSlideoverOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 font-rethink text-sm font-medium text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Product
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              {["Name", "Barcode", "Brand", "Category", "Size", "Country", "Actions"].map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap px-4 py-3 font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center font-rethink text-sm text-text-secondary">
                  {search ? "No products match your search" : "No products yet"}
                </td>
              </tr>
            ) : (
              products.map((p, i) => {
                const isEditing = editingId === p.id;
                const isLast = i === products.length - 1;
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "transition-colors",
                      !isLast && "border-b border-border",
                      isEditing ? "bg-background/60" : "hover:bg-background/40"
                    )}
                  >
                    {isEditing && editState ? (
                      <>
                        <td className="px-3 py-2">
                          <input
                            value={editState.name}
                            onChange={(e) => setField("name", e.target.value)}
                            className={CELL_INPUT}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editState.barcode}
                            onChange={(e) => setField("barcode", e.target.value)}
                            className={cn(CELL_INPUT, "font-mono tracking-wider")}
                            style={{ width: 140 }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editState.brand}
                            onChange={(e) => setField("brand", e.target.value)}
                            className={CELL_INPUT}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={editState.category}
                            onChange={(e) => setField("category", e.target.value)}
                            className={CELL_INPUT}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            value={editState.size_ml}
                            onChange={(e) => setField("size_ml", e.target.value)}
                            className={CELL_INPUT}
                            style={{ width: 72 }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={editState.country_of_manufacture}
                            onChange={(e) => setField("country_of_manufacture", e.target.value)}
                            className={CELL_INPUT}
                            style={{ width: 110 }}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={handleSave}
                              disabled={isPending}
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                            >
                              {isPending ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Check size={13} />
                              )}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-background"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="max-w-[180px] px-4 py-3 font-rethink text-sm font-medium text-text-primary">
                          <span className="line-clamp-1">{p.name}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-text-secondary">
                          {p.barcode}
                        </td>
                        <td className="px-4 py-3 font-rethink text-sm text-text-secondary">
                          {p.brand}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-rethink text-sm text-text-secondary">
                          {p.category}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-rethink text-sm text-text-secondary">
                          {p.size_ml ? `${p.size_ml} ml` : "—"}
                        </td>
                        <td className="px-4 py-3 font-rethink text-sm text-text-secondary">
                          {p.country_of_manufacture || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => startEdit(p)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(p)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Delete confirmation modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={() => setDeleteTarget(null)}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-xl"
            >
              <h3 className="font-fraunces text-lg font-semibold text-text-primary">
                Delete Product
              </h3>
              <p className="mt-2 font-rethink text-sm text-text-secondary">
                This will remove{" "}
                <span className="font-medium text-text-primary">
                  {deleteTarget.name}
                </span>{" "}
                from the verification database. This cannot be undone.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 font-rethink text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: "#C0392B" }}
                >
                  {isPending && <Loader2 size={14} className="animate-spin" />}
                  Delete
                </button>
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 rounded-xl border border-border py-2.5 font-rethink text-sm font-medium text-text-secondary transition-colors hover:bg-background"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Add product slideover ── */}
      <AnimatePresence>
        {slideoverOpen && (
          <AddProductSlideover
            onClose={() => setSlideoverOpen(false)}
            onSuccess={() => {
              setSlideoverOpen(false);
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Add Product Slideover ──────────────────────────────────────

const FIELD_INPUT =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20";

function AddProductSlideover({
  onClose,
  onSuccess,
}: {
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const [isPending, start] = useTransition();
  const [name,            setName]            = useState("");
  const [barcode,         setBarcode]         = useState("");
  const [brand,           setBrand]           = useState("");
  const [category,        setCategory]        = useState("");
  const [sizeMl,          setSizeMl]          = useState("");
  const [country,         setCountry]         = useState("");
  const [retailers,       setRetailers]       = useState<string[]>([]);
  const [retailerInput,   setRetailerInput]   = useState("");
  const [packagingNotes,  setPackagingNotes]  = useState("");
  const [errors,          setErrors]          = useState<Record<string, string>>({});
  const [serverError,     setServerError]     = useState<string | null>(null);

  const addRetailer = useCallback(() => {
    const v = retailerInput.trim();
    if (v && !retailers.includes(v)) setRetailers((p) => [...p, v]);
    setRetailerInput("");
  }, [retailerInput, retailers]);

  function handleRetailerKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addRetailer(); }
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!name.trim())    errs.name    = "Required";
    if (!barcode.trim()) errs.barcode = "Required";
    if (!brand.trim())   errs.brand   = "Required";
    if (!category)       errs.category = "Required";
    if (!country.trim()) errs.country  = "Required";
    return errs;
  }

  function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setServerError(null);
    start(async () => {
      try {
        await insertProductAction({
          name:                   name.trim(),
          barcode:                barcode.trim(),
          brand:                  brand.trim(),
          category,
          size_ml:                sizeMl ? Number(sizeMl) : null,
          country_of_manufacture: country.trim(),
          packaging_notes:        packagingNotes.trim() || null,
          authenticated_retailers: retailers,
        });
        onSuccess();
      } catch (e) {
        setServerError((e as Error).message);
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        key="panel"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-fraunces text-lg font-semibold text-text-primary">
            Add New Product
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {serverError && (
            <div className="mb-5 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(192,57,43,0.08)" }}>
              <p className="font-rethink text-sm" style={{ color: "#C0392B" }}>{serverError}</p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Name */}
            <SlideField label="Product Name *" error={errors.name}>
              <input
                type="text"
                placeholder="e.g. Hydrating Cleanser 250ml"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={FIELD_INPUT}
                style={errors.name ? { borderColor: "#C0392B" } : {}}
              />
            </SlideField>

            {/* Barcode */}
            <SlideField label="Barcode *" error={errors.barcode}>
              <input
                type="text"
                inputMode="numeric"
                placeholder="EAN-13 or UPC-A"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className={cn(FIELD_INPUT, "font-mono tracking-widest")}
                style={errors.barcode ? { borderColor: "#C0392B" } : {}}
              />
            </SlideField>

            {/* Brand */}
            <SlideField label="Brand *" error={errors.brand}>
              <input
                type="text"
                placeholder="e.g. CeraVe"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className={FIELD_INPUT}
                style={errors.brand ? { borderColor: "#C0392B" } : {}}
              />
            </SlideField>

            {/* Category */}
            <SlideField label="Category *" error={errors.category}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={cn(FIELD_INPUT, "cursor-pointer")}
                style={errors.category ? { borderColor: "#C0392B" } : {}}
              >
                <option value="">Select a category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </SlideField>

            {/* Country */}
            <SlideField label="Country of Manufacture *" error={errors.country}>
              <input
                type="text"
                placeholder="e.g. South Korea"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={FIELD_INPUT}
                style={errors.country ? { borderColor: "#C0392B" } : {}}
              />
            </SlideField>

            {/* Size */}
            <SlideField label="Size (ml) — optional">
              <input
                type="number"
                min={1}
                placeholder="e.g. 250"
                value={sizeMl}
                onChange={(e) => setSizeMl(e.target.value)}
                className={FIELD_INPUT}
              />
            </SlideField>

            {/* Retailers */}
            <SlideField label="Authenticated Retailers — optional">
              {retailers.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {retailers.map((r) => (
                    <span
                      key={r}
                      className="flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 font-rethink text-xs text-text-primary"
                    >
                      {r}
                      <button
                        type="button"
                        onClick={() => setRetailers((p) => p.filter((x) => x !== r))}
                        className="ml-0.5 text-text-secondary hover:text-text-primary"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                type="text"
                placeholder="Type a retailer and press Enter"
                value={retailerInput}
                onChange={(e) => setRetailerInput(e.target.value)}
                onKeyDown={handleRetailerKey}
                onBlur={addRetailer}
                className={FIELD_INPUT}
              />
            </SlideField>

            {/* Packaging notes */}
            <SlideField label="Packaging Notes — optional">
              <textarea
                rows={3}
                placeholder="Describe authentic packaging details to improve AI analysis…"
                value={packagingNotes}
                onChange={(e) => setPackagingNotes(e.target.value)}
                className={cn(FIELD_INPUT, "resize-none")}
              />
            </SlideField>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4">
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-rethink text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {isPending && <Loader2 size={15} className="animate-spin" />}
            {isPending ? "Adding…" : "Add Product"}
          </button>
        </div>
      </motion.div>
    </>
  );
}

function SlideField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block font-rethink text-sm font-medium text-text-primary">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 font-rethink text-[13px]" style={{ color: "#C0392B" }}>
          {error}
        </p>
      )}
    </div>
  );
}
