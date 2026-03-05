"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { X, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

// ── Constants ─────────────────────────────────────────────────

type ReportType = "counterfeit" | "mislabelled" | "wrong_info" | "other";

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "counterfeit",  label: "Counterfeit"   },
  { value: "mislabelled",  label: "Mislabelled"   },
  { value: "wrong_info",   label: "Wrong Info"    },
  { value: "other",        label: "Other"         },
];

const COUNTRIES = [
  "United Kingdom", "United States", "Nigeria", "Ghana", "South Africa",
  "Kenya", "Uganda", "Tanzania", "Zimbabwe", "Zambia", "Cameroon",
  "Senegal", "Ivory Coast", "Ethiopia", "Egypt", "Morocco", "Algeria",
  "France", "Germany", "Italy", "Spain", "Netherlands", "Belgium",
  "Sweden", "Switzerland", "UAE", "Saudi Arabia", "Canada", "Australia",
  "India", "China", "Japan", "Singapore", "Malaysia", "Philippines",
  "Indonesia", "Pakistan", "Bangladesh", "Brazil", "Mexico", "Other",
].sort();

// ── Types ─────────────────────────────────────────────────────

interface ProductInfo {
  found: boolean;
  name?: string;
  brand?: string;
  productId?: string;
}

interface ImageFile {
  preview: string;
  base64: string;
  mimeType: string;
  name: string;
}

// ── Step indicator ────────────────────────────────────────────

const STEPS = ["Product Info", "Details", "Review & Submit"] as const;

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const stepNum = (i + 1) as 1 | 2 | 3;
        const isActive    = stepNum === current;
        const isCompleted = stepNum < current;

        return (
          <div key={label} className="flex items-center">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 font-rethink text-sm font-semibold transition-colors",
                  isCompleted
                    ? "border-primary bg-primary text-white"
                    : isActive
                    ? "border-primary bg-primary text-white"
                    : "border-border bg-surface text-text-secondary"
                )}
              >
                {isCompleted ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 whitespace-nowrap font-rethink text-xs font-medium",
                  isActive ? "text-primary" : "text-text-secondary"
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector */}
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-2 mb-5 h-[2px] w-10 rounded-full sm:w-16",
                  stepNum < current ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Field wrapper ─────────────────────────────────────────────

function Field({
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

const INPUT_CLASS =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20";

// ── Image picker (max 3) ──────────────────────────────────────

function ImagePicker({
  images,
  onAdd,
  onRemove,
}: {
  images: ImageFile[];
  onAdd: (img: ImageFile) => void;
  onRemove: (index: number) => void;
}) {
  const canAdd = images.length < 3;

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file || !canAdd) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onAdd({
          preview: dataUrl,
          base64: dataUrl.split(",")[1],
          mimeType: file.type,
          name: file.name,
        });
      };
      reader.readAsDataURL(file);
    },
    [canAdd, onAdd]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: !canAdd,
  });

  return (
    <div className="flex flex-col gap-3">
      {/* Previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.preview}
                alt={img.name}
                className="h-20 w-20 rounded-xl border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-text-primary text-white shadow"
                aria-label="Remove image"
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {canAdd && (
        <div
          {...getRootProps()}
          className={cn(
            "cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40 hover:bg-background"
          )}
        >
          <input {...getInputProps()} />
          <p className="font-rethink text-sm text-text-secondary">
            {isDragActive
              ? "Drop image here…"
              : "Drag an image or click to select"}
          </p>
          <p className="mt-0.5 font-rethink text-xs text-text-secondary/60">
            JPEG · PNG · WebP
          </p>
        </div>
      )}

      <p className="font-rethink text-xs text-text-secondary">
        {images.length}/3 images (optional)
      </p>
    </div>
  );
}

// ── Summary row ───────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border">
      <span className="font-rethink text-xs font-medium uppercase tracking-widest text-text-secondary">
        {label}
      </span>
      <span className="font-rethink text-sm text-text-primary">{value}</span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function ReportPage() {
  const searchParams = useSearchParams();

  const [user,    setUser]    = useState<User | null>(null);
  const [step,    setStep]    = useState<1 | 2 | 3>(1);
  const [success, setSuccess] = useState(false);
  const [refId,   setRefId]   = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1
  const [barcode,     setBarcode]     = useState(searchParams.get("barcode") ?? "");
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [lookingUp,   setLookingUp]   = useState(false);

  // Step 2
  const [reportType,       setReportType]       = useState<ReportType | null>(null);
  const [purchaseLocation, setPurchaseLocation] = useState("");
  const [purchaseCountry,  setPurchaseCountry]  = useState("");
  const [description,      setDescription]      = useState("");
  const [images,           setImages]           = useState<ImageFile[]>([]);

  // Errors
  const [e1, setE1] = useState<{ barcode?: string }>({});
  const [e2, setE2] = useState<{
    reportType?: string;
    purchaseLocation?: string;
    purchaseCountry?: string;
    description?: string;
  }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Load user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  // Auto-lookup if barcode pre-filled from URL
  useEffect(() => {
    const urlBarcode = searchParams.get("barcode");
    if (urlBarcode) lookupBarcode(urlBarcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookupBarcode(code: string) {
    if (!code.trim()) return;
    setLookingUp(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select("id, name, brand")
      .eq("barcode", code.trim())
      .single();
    setLookingUp(false);
    setProductInfo(
      data
        ? { found: true, name: data.name, brand: data.brand, productId: data.id }
        : { found: false }
    );
  }

  // ── Navigation ─────────────────────────────────────────────

  function goStep2() {
    const errs: typeof e1 = {};
    if (!barcode.trim()) errs.barcode = "Barcode is required";
    if (Object.keys(errs).length) { setE1(errs); return; }
    setE1({});
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goStep3() {
    const errs: typeof e2 = {};
    if (!reportType)                       errs.reportType       = "Please select a report type";
    if (!purchaseLocation.trim())          errs.purchaseLocation = "Purchase location is required";
    if (!purchaseCountry)                  errs.purchaseCountry  = "Please select a country";
    if (description.trim().length < 50)   errs.description      = `At least 50 characters required (${description.trim().length}/50)`;
    if (Object.keys(errs).length) { setE2(errs); return; }
    setE2({});
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    setGeneralError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("reports")
      .insert({
        reporter_id:      user?.id ?? null,
        barcode:          barcode.trim(),
        product_id:       productInfo?.found ? productInfo.productId ?? null : null,
        report_type:      reportType!,
        purchase_location: purchaseLocation.trim(),
        purchase_country:  purchaseCountry,
        description:      description.trim(),
        image_urls:       [], // Supabase Storage upload can be wired here
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (error) {
      setGeneralError("Failed to submit report — please try again.");
      return;
    }

    setRefId(data.id);
    setSuccess(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Success state ──────────────────────────────────────────

  if (success && refId) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
          <CheckCircle2 size={48} strokeWidth={1.5} className="text-primary" />
          <h1 className="mt-5 font-fraunces text-3xl font-semibold text-primary">
            Report Submitted
          </h1>
          <p className="mt-2 font-rethink text-sm text-text-secondary">
            Thank you — our team will review it shortly.
          </p>
          <div className="mt-6 rounded-xl border border-border bg-background px-5 py-3">
            <p className="font-rethink text-xs uppercase tracking-widest text-text-secondary">
              Reference ID
            </p>
            <p className="mt-1 font-mono text-sm text-text-primary">{refId}</p>
          </div>
          <a
            href="/scan"
            className="mt-8 rounded-xl bg-primary px-8 py-3 font-rethink text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Back to Scanner
          </a>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      {/* Heading */}
      <h1 className="font-fraunces text-[36px] font-semibold leading-tight text-text-primary">
        Report a Suspicious Product
      </h1>
      <p className="mt-2 font-rethink text-sm text-text-secondary">
        Help protect the community by flagging counterfeit or mislabelled products.
      </p>

      {/* Step indicator */}
      <div className="my-8 flex justify-center">
        <StepIndicator current={step} />
      </div>

      {/* ── Step 1: Product Info ── */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <Field label="Barcode" error={e1.barcode}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 5000167227218"
              value={barcode}
              onChange={(e) => {
                setBarcode(e.target.value);
                setProductInfo(null);
              }}
              onBlur={() => lookupBarcode(barcode)}
              className={cn(INPUT_CLASS, "font-mono tracking-wide")}
              style={e1.barcode ? { borderColor: "#C0392B" } : {}}
            />
          </Field>

          {/* Product lookup feedback */}
          {lookingUp && (
            <p className="font-rethink text-sm text-text-secondary">
              Looking up product…
            </p>
          )}

          {productInfo?.found && (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: "rgba(45,122,79,0.08)" }}
            >
              <CheckCircle2 size={18} strokeWidth={1.8} className="shrink-0 text-primary" />
              <div>
                <p className="font-rethink text-sm font-medium text-primary">
                  {productInfo.name}
                </p>
                <p className="font-rethink text-xs text-text-secondary">
                  {productInfo.brand}
                </p>
              </div>
            </div>
          )}

          {productInfo && !productInfo.found && (
            <p className="font-rethink text-sm text-text-secondary">
              Product not in our database — you can still submit a report.
            </p>
          )}

          <button
            onClick={goStep2}
            className="mt-2 flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-rethink text-base font-medium text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
          >
            Next: Report Details →
          </button>
        </div>
      )}

      {/* ── Step 2: Report Details ── */}
      {step === 2 && (
        <div className="flex flex-col gap-5">

          {/* Report type pills */}
          <Field label="Report Type" error={e2.reportType}>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {REPORT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setReportType(t.value)}
                  className={cn(
                    "rounded-full px-4 py-2 font-rethink text-sm font-medium transition-colors",
                    reportType === t.value
                      ? "bg-primary text-white"
                      : "border border-border text-text-secondary hover:border-primary/40 hover:text-text-primary"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          {/* Purchase location */}
          <Field label="Purchase Location" error={e2.purchaseLocation}>
            <input
              type="text"
              placeholder='e.g. "Amazon", "Boots", "local market"'
              value={purchaseLocation}
              onChange={(e) => setPurchaseLocation(e.target.value)}
              className={INPUT_CLASS}
              style={e2.purchaseLocation ? { borderColor: "#C0392B" } : {}}
            />
          </Field>

          {/* Purchase country */}
          <Field label="Purchase Country" error={e2.purchaseCountry}>
            <select
              value={purchaseCountry}
              onChange={(e) => setPurchaseCountry(e.target.value)}
              className={cn(INPUT_CLASS, "cursor-pointer")}
              style={e2.purchaseCountry ? { borderColor: "#C0392B" } : {}}
            >
              <option value="">Select a country…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          {/* Description + char counter */}
          <Field label="Description" error={e2.description}>
            <textarea
              rows={5}
              placeholder="Describe why you suspect this product is counterfeit or mislabelled. Include any packaging differences, unusual smells, textures, or other observations…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={cn(INPUT_CLASS, "resize-none")}
              style={e2.description ? { borderColor: "#C0392B" } : {}}
            />
            <p
              className="mt-1 text-right font-mono text-[12px]"
              style={{
                color: description.trim().length < 50 ? "#E07B2A" : "#6B6B6B",
              }}
            >
              {description.trim().length} chars
              {description.trim().length < 50 && " (50 min)"}
            </p>
          </Field>

          {/* Optional images */}
          <Field label="Photos (optional)">
            <div className="mt-1">
              <ImagePicker
                images={images}
                onAdd={(img) => setImages((prev) => [...prev, img])}
                onRemove={(i) => setImages((prev) => prev.filter((_, idx) => idx !== i))}
              />
            </div>
          </Field>

          <div className="flex gap-3 pt-1">
            <button
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-border px-6 py-3 font-rethink text-base font-medium text-text-primary transition-colors hover:bg-background"
            >
              ← Back
            </button>
            <button
              onClick={goStep3}
              className="flex-[2] rounded-xl bg-primary px-6 py-3 font-rethink text-base font-medium text-white transition-colors hover:bg-primary/90 active:scale-[0.98]"
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ── */}
      {step === 3 && (
        <div className="flex flex-col gap-5">
          {/* Summary card */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <p className="mb-1 font-rethink text-xs font-medium uppercase tracking-widest text-text-secondary">
              Your Report
            </p>
            <SummaryRow label="Barcode" value={barcode.trim()} />
            {productInfo?.found && (
              <SummaryRow
                label="Product"
                value={`${productInfo.name} · ${productInfo.brand}`}
              />
            )}
            <SummaryRow
              label="Type"
              value={REPORT_TYPES.find((t) => t.value === reportType)?.label ?? ""}
            />
            <SummaryRow
              label="Where bought"
              value={`${purchaseLocation.trim()}, ${purchaseCountry}`}
            />
            <SummaryRow label="Description" value={description.trim()} />
            {images.length > 0 && (
              <SummaryRow
                label="Photos"
                value={`${images.length} image${images.length > 1 ? "s" : ""} attached`}
              />
            )}
          </div>

          {/* General error */}
          {generalError && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: "rgba(192,57,43,0.07)" }}
            >
              <p className="font-rethink text-[13px]" style={{ color: "#C0392B" }}>
                {generalError}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 rounded-xl border border-border px-6 py-3 font-rethink text-base font-medium text-text-primary transition-colors hover:bg-background"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-[2] rounded-xl bg-primary px-6 py-3 font-rethink text-base font-medium text-white transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Report"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
