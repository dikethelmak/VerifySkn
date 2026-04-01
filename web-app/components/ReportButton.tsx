"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { X } from "lucide-react";

type ReportIssue = "counterfeit" | "mislabelled" | "wrong_info" | "other";

const REPORT_ISSUES: { value: ReportIssue; label: string }[] = [
  { value: "counterfeit", label: "Counterfeit / Fake"    },
  { value: "mislabelled", label: "Mislabelled Packaging" },
  { value: "wrong_info",  label: "Wrong Information"     },
  { value: "other",       label: "Other"                 },
];

interface ImageFile {
  preview:  string;
  base64:   string;
  mimeType: string;
  name:     string;
}

const C = {
  forestMid:  "#0f2614",
  lime:       "#7dc98a",
  limeDim:    "rgba(125,201,138,0.12)",
  limeBorder: "rgba(125,201,138,0.25)",
  border:     "rgba(255,255,255,0.07)",
  w60:        "rgba(255,255,255,0.6)",
  w40:        "rgba(255,255,255,0.4)",
  w25:        "rgba(255,255,255,0.25)",
  w15:        "rgba(255,255,255,0.15)",
  w04:        "rgba(255,255,255,0.04)",
  red:        "rgba(255,90,80,0.85)",
  forestDeep: "#0b1e0f",
} as const;

const UI   = "var(--font-syne, var(--font-rethink))";
const MONO = "var(--font-dm-mono, var(--font-mono))";

// ── Modal ─────────────────────────────────────────────────────

interface ModalProps {
  barcode?:        string;
  prefillIssues?:  ReportIssue[];
  prefillDesc?:    string;
  onClose:         () => void;
}

function ReportModal({ barcode: initialBarcode = "", onClose, prefillIssues = [], prefillDesc = "" }: ModalProps) {
  const [barcode,     setBarcode]     = useState(initialBarcode);
  const [images,      setImages]      = useState<ImageFile[]>([]);
  const [issues,      setIssues]      = useState<ReportIssue[]>(prefillIssues);
  const [description, setDescription] = useState(prefillDesc);
  const [submitting,  setSubmitting]  = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImages((prev) => [
        ...prev,
        { preview: dataUrl, base64: dataUrl.split(",")[1], mimeType: file.type, name: file.name },
      ]);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   { "image/jpeg": [], "image/png": [], "image/webp": [] },
    maxFiles: 1,
    disabled: images.length >= 3,
  });

  function toggleIssue(issue: ReportIssue) {
    setIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || issues.length === 0) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/report", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ barcode: barcode.trim(), images, issues, description: description.trim() }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to submit — please try again.");
      return;
    }
    setSuccess(true);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "48px 16px 32px", overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.forestMid, border: `0.5px solid ${C.border}`,
          borderRadius: "16px", padding: "28px",
          width: "100%", maxWidth: "480px", fontFamily: UI, color: "#fff",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            {success ? "Report submitted" : "Report a product"}
          </h2>
          <button onClick={onClose} aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: C.w40, padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ color: C.lime, fontSize: "14px", marginBottom: "16px" }}>
              ✓ Thank you — your report has been received.
            </p>
            <button onClick={onClose}
              style={{
                background: C.limeDim, border: `0.5px solid ${C.limeBorder}`,
                color: C.lime, borderRadius: "8px", padding: "8px 20px",
                fontSize: "13px", cursor: "pointer", fontFamily: UI,
              }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Barcode */}
            <div>
              <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.w25, fontFamily: MONO, marginBottom: "6px" }}>
                Barcode
              </label>
              <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 5000167227218"
                style={{
                  width: "100%", background: C.w04, border: `0.5px solid ${C.w15}`,
                  borderRadius: "8px", padding: "10px 14px", fontSize: "13px",
                  color: C.w60, fontFamily: MONO, outline: "none", boxSizing: "border-box",
                }} />
            </div>

            {/* Photos */}
            <div>
              <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.w25, fontFamily: MONO, marginBottom: "6px" }}>
                Photos (optional)
              </label>
              {images.length > 0 && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                  {images.map((img, i) => (
                    <div key={i} style={{ position: "relative" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.preview} alt={img.name}
                        style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "8px", border: `0.5px solid ${C.w15}` }} />
                      <button type="button" onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                        aria-label="Remove image"
                        style={{
                          position: "absolute", top: "-6px", right: "-6px",
                          width: "18px", height: "18px", borderRadius: "50%",
                          background: C.red, border: "none", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                        <X size={10} color="#fff" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {images.length < 3 && (
                <div {...getRootProps()}
                  style={{
                    border: `0.5px dashed ${isDragActive ? C.lime : C.w15}`,
                    borderRadius: "8px", padding: "16px", textAlign: "center",
                    cursor: "pointer", background: isDragActive ? C.limeDim : C.w04,
                  }}>
                  <input {...getInputProps()} />
                  <p style={{ fontSize: "12px", color: C.w40 }}>
                    {isDragActive ? "Drop here…" : "Drag an image or click to upload"}
                  </p>
                  <p style={{ fontSize: "11px", color: C.w25, fontFamily: MONO, marginTop: "4px" }}>
                    JPEG · PNG · WebP · up to 3 photos
                  </p>
                </div>
              )}
            </div>

            {/* Issues */}
            <div>
              <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.w25, fontFamily: MONO, marginBottom: "8px" }}>
                Issues
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {REPORT_ISSUES.map((issue) => (
                  <button key={issue.value} type="button" onClick={() => toggleIssue(issue.value)}
                    style={{
                      borderRadius: "999px", padding: "6px 14px", fontSize: "12px",
                      cursor: "pointer", fontFamily: UI,
                      border: `0.5px solid ${issues.includes(issue.value) ? C.limeBorder : C.w15}`,
                      background: issues.includes(issue.value) ? C.limeDim : "transparent",
                      color: issues.includes(issue.value) ? C.lime : C.w40,
                    }}>
                    {issue.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: "block", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", color: C.w25, fontFamily: MONO, marginBottom: "6px" }}>
                Description (optional)
              </label>
              <textarea rows={3} placeholder="Describe what made this product suspicious…"
                value={description} onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: "100%", background: C.w04, border: `0.5px solid ${C.w15}`,
                  borderRadius: "8px", padding: "10px 14px", fontSize: "13px",
                  color: C.w60, fontFamily: UI, resize: "none", outline: "none",
                  boxSizing: "border-box",
                }} />
            </div>

            {error && <p style={{ fontSize: "12px", color: C.red, fontFamily: MONO }}>{error}</p>}

            <button type="submit" disabled={issues.length === 0 || submitting}
              style={{
                width: "100%", background: C.lime, color: C.forestDeep,
                border: "none", borderRadius: "8px", padding: "11px",
                fontSize: "13px", fontWeight: 600,
                cursor: issues.length === 0 || submitting ? "default" : "pointer",
                opacity: issues.length === 0 || submitting ? 0.45 : 1,
                fontFamily: UI,
              }}>
              {submitting ? "Submitting…" : "Submit report"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── ReportButton — drop-in for any page ───────────────────────

interface ReportButtonProps {
  barcode?:   string;
  label?:     string;
  className?: string;
  style?:     React.CSSProperties;
}

export function ReportButton({ barcode = "", label = "Report This Product", className, style }: ReportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} style={style}>
        {label}
      </button>
      {open && <ReportModal barcode={barcode} onClose={() => setOpen(false)} />}
    </>
  );
}
