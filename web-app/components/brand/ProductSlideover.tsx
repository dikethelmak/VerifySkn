"use client";

import { useState, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

// ── Barcode validation ────────────────────────────────────────

function isValidEAN13(code: string) {
  if (!/^\d{13}$/.test(code)) return false;
  const d = code.split("").map(Number);
  const sum = d.slice(0, 12).reduce((a, n, i) => a + n * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === d[12];
}

function isValidUPCA(code: string) {
  if (!/^\d{12}$/.test(code)) return false;
  const d = code.split("").map(Number);
  const sum = d.slice(0, 11).reduce((a, n, i) => a + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === d[11];
}

function isValidBarcode(code: string) {
  return isValidEAN13(code) || isValidUPCA(code);
}

// ── Constants ─────────────────────────────────────────────────

const CATEGORIES = [
  "Cleanser", "Exfoliant", "Eye Cream", "Lip Care", "Mask",
  "Moisturiser", "Oil", "Serum", "Sunscreen", "Toner", "Other",
];

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20";

// ── Props ─────────────────────────────────────────────────────

interface Props {
  isOpen:    boolean;
  onClose:   () => void;
  brandId:   string;
  userId:    string;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────

export function ProductSlideover({ isOpen, onClose, brandId, userId, onSuccess }: Props) {
  const [name,            setName]            = useState("");
  const [barcode,         setBarcode]         = useState("");
  const [category,        setCategory]        = useState("");
  const [sizeMl,          setSizeMl]          = useState("");
  const [retailers,       setRetailers]       = useState<string[]>([]);
  const [retailerInput,   setRetailerInput]   = useState("");
  const [packagingNotes,  setPackagingNotes]  = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [success,         setSuccess]         = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setName(""); setBarcode(""); setCategory(""); setSizeMl("");
    setRetailers([]); setRetailerInput(""); setPackagingNotes("");
    setErrors({}); setSuccess(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function addRetailer() {
    const v = retailerInput.trim();
    if (v && !retailers.includes(v)) {
      setRetailers((prev) => [...prev, v]);
    }
    setRetailerInput("");
  }

  function handleRetailerKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); addRetailer(); }
  }

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!name.trim())     errs.name     = "Product name is required";
    if (!barcode.trim())  errs.barcode  = "Barcode is required";
    else if (!isValidBarcode(barcode.trim()))
      errs.barcode = "Must be a valid EAN-13 or UPC-A barcode";
    if (!category)        errs.category = "Please select a category";
    if (sizeMl && (isNaN(Number(sizeMl)) || Number(sizeMl) <= 0))
      errs.sizeMl = "Must be a positive number";
    if (!packagingNotes.trim())
      errs.packagingNotes = "Packaging notes are required — they improve image analysis";
    return errs;
  }, [name, barcode, category, sizeMl, packagingNotes]);

  async function handleSubmit() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.from("brand_submissions").insert({
      submitted_by:            userId,
      brand_id:                brandId,
      product_name:            name.trim(),
      barcode:                 barcode.trim(),
      category,
      size_ml:                 sizeMl ? Number(sizeMl) : null,
      authenticated_retailers: retailers,
      packaging_notes:         packagingNotes.trim(),
    });

    setSubmitting(false);

    if (error) {
      setErrors({ general: "Submission failed — please try again." });
      return;
    }

    setSuccess(true);
    onSuccess();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={handleClose}
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
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {success ? (
                /* Success state */
                <div className="flex flex-col items-center py-12 text-center">
                  <CheckCircle2 size={48} strokeWidth={1.5} className="text-primary" />
                  <p className="mt-5 font-fraunces text-2xl font-semibold text-primary">
                    Submitted for Review
                  </p>
                  <p className="mt-2 font-rethink text-sm text-text-secondary">
                    Typically approved within 24 hours. We&apos;ll notify you once it goes live.
                  </p>
                  <button
                    onClick={() => { resetForm(); }}
                    className="mt-8 rounded-xl border border-primary px-6 py-2.5 font-rethink text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                  >
                    Submit Another
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {errors.general && (
                    <div
                      className="rounded-xl px-4 py-3"
                      style={{ backgroundColor: "rgba(192,57,43,0.07)" }}
                    >
                      <p className="font-rethink text-[13px]" style={{ color: "#C0392B" }}>
                        {errors.general}
                      </p>
                    </div>
                  )}

                  {/* Product Name */}
                  <FormField label="Product Name" error={errors.name}>
                    <input
                      type="text"
                      placeholder="e.g. Hydrating Cleanser 250ml"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={INPUT_CLASS}
                      style={errors.name ? { borderColor: "#C0392B" } : {}}
                    />
                  </FormField>

                  {/* Barcode */}
                  <FormField label="Barcode" error={errors.barcode}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="EAN-13 or UPC-A"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className={cn(INPUT_CLASS, "font-mono tracking-widest")}
                      style={errors.barcode ? { borderColor: "#C0392B" } : {}}
                    />
                    {barcode && !errors.barcode && isValidBarcode(barcode) && (
                      <p className="mt-1 font-rethink text-[12px]" style={{ color: "#2D7A4F" }}>
                        ✓ Valid {barcode.length === 13 ? "EAN-13" : "UPC-A"}
                      </p>
                    )}
                  </FormField>

                  {/* Category */}
                  <FormField label="Category" error={errors.category}>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={cn(INPUT_CLASS, "cursor-pointer")}
                      style={errors.category ? { borderColor: "#C0392B" } : {}}
                    >
                      <option value="">Select a category…</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </FormField>

                  {/* Size (ml) */}
                  <FormField label="Size (ml) — optional" error={errors.sizeMl}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      placeholder="e.g. 250"
                      value={sizeMl}
                      onChange={(e) => setSizeMl(e.target.value)}
                      className={INPUT_CLASS}
                      style={errors.sizeMl ? { borderColor: "#C0392B" } : {}}
                    />
                  </FormField>

                  {/* Authenticated Retailers */}
                  <FormField label="Authenticated Retailers — optional">
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
                              onClick={() => setRetailers((prev) => prev.filter((x) => x !== r))}
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
                      placeholder="Type a retailer name and press Enter"
                      value={retailerInput}
                      onChange={(e) => setRetailerInput(e.target.value)}
                      onKeyDown={handleRetailerKeyDown}
                      onBlur={addRetailer}
                      className={INPUT_CLASS}
                    />
                    <p className="mt-1 font-rethink text-[12px] text-text-secondary">
                      Press Enter to add each retailer
                    </p>
                  </FormField>

                  {/* Packaging Notes */}
                  <FormField label="Packaging Notes" error={errors.packagingNotes}>
                    <textarea
                      rows={4}
                      placeholder="Describe authentic packaging details — e.g. hologram placement, font characteristics, seal type, batch code format. This improves AI image analysis accuracy."
                      value={packagingNotes}
                      onChange={(e) => setPackagingNotes(e.target.value)}
                      className={cn(INPUT_CLASS, "resize-none")}
                      style={errors.packagingNotes ? { borderColor: "#C0392B" } : {}}
                    />
                  </FormField>
                </div>
              )}
            </div>

            {/* Footer */}
            {!success && (
              <div className="border-t border-border px-6 py-4">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-rethink text-base font-medium text-white transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
                >
                  {submitting ? "Submitting…" : "Submit for Review"}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function FormField({
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
