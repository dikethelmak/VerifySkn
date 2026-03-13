"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────

type Issue = "counterfeit" | "mislabelled" | "wrong_info" | "other";

const ISSUES: { value: Issue; label: string }[] = [
  { value: "counterfeit", label: "Counterfeit / Fake"     },
  { value: "mislabelled", label: "Mislabelled Packaging"  },
  { value: "wrong_info",  label: "Wrong Information"      },
  { value: "other",       label: "Other"                  },
];

interface ImageFile {
  preview:  string;
  base64:   string;
  mimeType: string;
  name:     string;
}

// ── Shared input class ────────────────────────────────────────

const INPUT =
  "w-full rounded-xl border border-border bg-background px-4 py-2.5 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

// ── Page ─────────────────────────────────────────────────────

export default function ReportPage() {
  const searchParams = useSearchParams();

  const [barcode,     setBarcode]     = useState(searchParams.get("barcode") ?? "");
  const [images,      setImages]      = useState<ImageFile[]>([]);
  const [issues,      setIssues]      = useState<Issue[]>([]);
  const [description, setDescription] = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── Derived state ──────────────────────────────────────────

  const hasProduct = barcode.trim().length > 0 || images.length > 0;
  const canSubmit  = hasProduct && issues.length > 0 && !submitting;

  // ── Issue toggle ──────────────────────────────────────────

  function toggleIssue(issue: Issue) {
    setIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  }

  // ── Image drop ────────────────────────────────────────────

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file || images.length >= 3) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImages((prev) => [
          ...prev,
          { preview: dataUrl, base64: dataUrl.split(",")[1], mimeType: file.type, name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    },
    [images.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: images.length >= 3,
  });

  // ── Submit ────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barcode:     barcode.trim(),
        images,
        issues,
        description: description.trim(),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to submit — please try again.");
      return;
    }

    setSuccess(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Success ───────────────────────────────────────────────

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16">
        <div className="flex flex-col items-center rounded-2xl border border-border bg-surface p-10 text-center shadow-sm">
          <CheckCircle2 size={48} strokeWidth={1.5} className="text-primary" />
          <h1 className="mt-5 font-fraunces text-3xl font-semibold text-primary">
            Report Submitted
          </h1>
          <p className="mt-2 font-rethink text-sm text-text-secondary">
            Thank you — we&apos;ve received your report.
          </p>
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

  // ── Form ──────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      <h1 className="font-fraunces text-[36px] font-semibold leading-tight text-text-primary">
        Report a Product
      </h1>
      <p className="mt-2 font-rethink text-sm text-text-secondary">
        Provide a barcode, a photo, or both — then describe the issue.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">

        {/* ── Barcode ── */}
        <div>
          <label className="mb-1.5 block font-rethink text-sm font-medium text-text-primary">
            Barcode
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 5000167227218"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className={cn(INPUT, "font-mono tracking-wide")}
          />
        </div>

        {/* ── Photos ── */}
        <div>
          <label className="mb-1.5 block font-rethink text-sm font-medium text-text-primary">
            Photos
          </label>

          {images.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
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
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-text-primary text-white shadow"
                    aria-label="Remove image"
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length < 3 && (
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
                {isDragActive ? "Drop here…" : "Drag an image or click to upload"}
              </p>
              <p className="mt-0.5 font-rethink text-xs text-text-secondary/60">
                JPEG · PNG · WebP · up to 3 photos
              </p>
            </div>
          )}

          {!hasProduct && (
            <p className="mt-1.5 font-rethink text-[13px] text-warning">
              At least a barcode or photo is required
            </p>
          )}
        </div>

        {/* ── Issues ── */}
        <div>
          <label className="mb-1.5 block font-rethink text-sm font-medium text-text-primary">
            Issues{" "}
            <span className="font-normal text-text-secondary">(select all that apply)</span>
          </label>
          <div className="flex flex-wrap gap-2 pt-0.5">
            {ISSUES.map((issue) => (
              <button
                key={issue.value}
                type="button"
                onClick={() => toggleIssue(issue.value)}
                className={cn(
                  "rounded-full px-4 py-2 font-rethink text-sm font-medium transition-colors",
                  issues.includes(issue.value)
                    ? "bg-primary text-white"
                    : "border border-border text-text-secondary hover:border-primary/40 hover:text-text-primary"
                )}
              >
                {issue.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Description ── */}
        <div>
          <label className="mb-1.5 block font-rethink text-sm font-medium text-text-primary">
            Description{" "}
            <span className="font-normal text-text-secondary">(optional)</span>
          </label>
          <textarea
            rows={4}
            placeholder="Describe what made this product suspicious — packaging differences, unusual smell, texture, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={cn(INPUT, "resize-none")}
          />
        </div>

        {/* ── Error ── */}
        {error && (
          <div
            className="rounded-xl px-4 py-3"
            style={{ backgroundColor: "rgba(192,57,43,0.07)" }}
          >
            <p className="font-rethink text-[13px]" style={{ color: "#C0392B" }}>
              {error}
            </p>
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={cn(
            "w-full rounded-xl bg-primary px-6 py-3",
            "font-rethink text-base font-medium text-white",
            "transition-colors hover:bg-primary/90 active:scale-[0.98]",
            "disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {submitting ? "Submitting…" : "Submit Report"}
        </button>
      </form>
    </div>
  );
}
