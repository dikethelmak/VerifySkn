"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
import { Scanner } from "@/components/Scanner";
import { ReportForm, type ReportIssue, type ReportImage } from "@/components/ReportForm";
import {
  IMAGE_SESSION_KEY,
  type ImageAnalysisSession,
} from "@/lib/imageSession";
import { mapFlagLabel } from "@/lib/flagLabels";
import { verdictLabel, confidenceTier } from "@/lib/verdictUtils";

type Tab   = "serial" | "deep";
type Phase = "idle" | "scanning" | "loading" | "result" | "not-found";
type UploadPhase = "idle" | "analyzing" | "error";
// Dynamic imports (browser-only)
const ImageUploader = dynamic(
  () => import("@/components/ImageUploader").then((m) => ({ default: m.ImageUploader })),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(238,236,234,0.3)", fontSize: "13px" }}>
        Loading…
      </div>
    ),
  }
);

const AnalysisLoader = dynamic(
  () => import("@/components/AnalysisLoader").then((m) => ({ default: m.AnalysisLoader })),
  { ssr: false }
);

// ── Palette ───────────────────────────────────────────────────
const C = {
  forestDeep:  "#0b1e0f",
  forest:      "#0b1e0f",
  forestMid:   "#0f2614",
  forestLight: "#162d1c",
  lime:        "#7dc98a",
  limeDim:     "rgba(125,201,138,0.12)",
  limeBorder:  "rgba(125,201,138,0.25)",
  border:      "rgba(255,255,255,0.07)",
  w60:         "rgba(255,255,255,0.6)",
  w40:         "rgba(255,255,255,0.4)",
  w25:         "rgba(255,255,255,0.25)",
  w15:         "rgba(255,255,255,0.15)",
  w08:         "rgba(255,255,255,0.08)",
  w04:         "rgba(255,255,255,0.04)",
  amber:       "rgba(255,193,7,0.85)",
  amberBg:     "rgba(255,193,7,0.06)",
  amberBorder: "rgba(255,193,7,0.18)",
  red:         "rgba(255,90,80,0.85)",
  redBg:       "rgba(255,90,80,0.06)",
  redBorder:   "rgba(255,90,80,0.2)",
} as const;

const UI   = "var(--font-syne,   var(--font-rethink))";
const MONO = "var(--font-dm-mono, var(--font-mono))";

// ── Decorative barcode bars ───────────────────────────────────
const BARS = [2,1,3,1,2,4,1,2,1,3,2,1,4,1,2,3,1,2,1,3,2,1,4,1,2,3,1,1,2,4,1,3,2,1,1,2]
  .map((w, i) => ({ w, op: +(0.10 + ((i * 7) % 5) * 0.04).toFixed(2) }));

// ── Serial code formatter ─────────────────────────────────────
function fmt(raw: string): string {
  const v = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  // Pure numeric → barcode (EAN-8/12/13), no dashes, up to 13 digits
  if (/^\d+$/.test(v)) return v.slice(0, 13);
  // Alphanumeric → serial code XXX-XXX-XXXX, up to 10 chars
  const s = v.slice(0, 10);
  if (s.length > 6) return `${s.slice(0,3)}-${s.slice(3,6)}-${s.slice(6)}`;
  if (s.length > 3) return `${s.slice(0,3)}-${s.slice(3)}`;
  return s;
}

// ── Types ─────────────────────────────────────────────────────
interface ProductData {
  name?:                  string;
  product_name?:          string;
  brand?:                 string;
  barcode?:               string;
  category?:              string;
  categories?:            string;
  source:                 "database" | "open_beauty_facts" | "not_found";
  how_to_use?:            string | null;
  skin_type_suitability?: string | null;
  key_ingredients?:       string[] | null;
}

interface DeepResult {
  result:          string;
  confidence:      number;
  summary:         string;
  flags:           string[];
  font_quality:    string;
  logo_accuracy:   string;
  print_quality:   string;
  label_alignment: string;
  spelling_check:  string;
  hologram_check:  string;
  sessionId:       string;
  finalResult?:     string;
  finalConfidence?: number;
}

// ── Deep analysis check helpers ───────────────────────────────
type CheckBadge = "pass" | "fail" | "uncertain" | "na";

function normalizeCheck(value: string): CheckBadge {
  if (!value || value.trim() === "" || /^n\/?a$/i.test(value.trim())) return "na";
  const lower = value.toLowerCase();
  if (/\b(good|excellent|pass|clear|correct|verified|present|accurate|aligned|consistent|authentic|no error|no issue|legitimate|standard|proper|high|sharp)\b/.test(lower)) return "pass";
  if (/\b(poor|bad|fail|missing|incorrect|blurry|misaligned|error|suspicious|counterfeit|tampered|inconsistent|absent|wrong|invalid|not present|low quality|smudged)\b/.test(lower)) return "fail";
  return "uncertain";
}

const BADGE_CFG: Record<CheckBadge, { label: string; bg: string; color: string }> = {
  pass:      { label: "Pass",      bg: "rgba(125,201,138,0.15)", color: "#7dc98a" },
  fail:      { label: "Fail",      bg: "rgba(255,90,80,0.15)",   color: "rgba(255,90,80,0.9)" },
  uncertain: { label: "Uncertain", bg: "rgba(255,193,7,0.12)",   color: "rgba(255,193,7,0.8)" },
  na:        { label: "N/A",       bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)" },
};

const DEEP_CHECKS: { key: keyof Pick<DeepResult, "font_quality"|"logo_accuracy"|"print_quality"|"label_alignment"|"spelling_check"|"hologram_check">; label: string }[] = [
  { key: "font_quality",    label: "Font Quality"    },
  { key: "logo_accuracy",   label: "Logo Accuracy"   },
  { key: "print_quality",   label: "Print Quality"   },
  { key: "label_alignment", label: "Label Alignment" },
  { key: "spelling_check",  label: "Spelling"        },
  { key: "hologram_check",  label: "Hologram"        },
];

const VERDICT_COLORS: Record<string, string> = {
  authentic:  "#7dc98a",
  unverified: "rgba(255,193,7,0.85)",
  suspicious: "rgba(255,90,80,0.9)",
};

// Detect "no packaging found" state: all checks uncertain/na + very low confidence
function isNoPackagingResult(r: DeepResult): boolean {
  const allNonPass = DEEP_CHECKS.every(({ key }) => {
    const badge = normalizeCheck(r[key] as string);
    return badge === "uncertain" || badge === "na";
  });
  return allNonPass && r.confidence <= 10;
}

// ── Report Modal ──────────────────────────────────────────────

function ReportModal({
  barcode,
  onClose,
  prefillIssues  = [],
  prefillDesc    = "",
  prefillImages  = [],
}: {
  barcode:         string;
  onClose:         () => void;
  prefillIssues?:  ReportIssue[];
  prefillDesc?:    string;
  prefillImages?:  ReportImage[];
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            Report a product
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: "none", border: "none", cursor: "pointer", color: C.w40, padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>
        <ReportForm
          barcode={barcode}
          onClose={onClose}
          prefillIssues={prefillIssues}
          prefillDesc={prefillDesc}
          prefillImages={prefillImages}
        />
      </div>
    </div>
  );
}

// ── PDF report generator ─────────────────────────────────────

async function downloadDeepReport(r: DeepResult) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  await document.fonts.ready;

  const verdictColor = VERDICT_COLORS[r.result] ?? "#7dc98a";

  const checksHtml = DEEP_CHECKS.map(({ key, label }) => {
    const badge = normalizeCheck(r[key] as string);
    const { label: badgeLabel, bg, color } = BADGE_CFG[badge];
    return `
      <div style="background:${bg};border-radius:8px;padding:14px 12px;min-width:0">
        <div style="font-size:10px;color:rgba(255,255,255,0.35);margin-bottom:6px;font-family:inherit">${label}</div>
        <div style="font-size:11px;font-weight:600;color:${color};font-family:inherit">${badgeLabel}</div>
      </div>`;
  }).join("");

  const flagsHtml = r.flags.length > 0 ? `
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.07)">
      <div style="font-size:10px;font-weight:600;letter-spacing:0.1em;color:rgba(255,255,255,0.25);margin-bottom:12px;text-transform:uppercase;font-family:'DM Mono','Space Mono',monospace">Issues Detected</div>
      ${r.flags.map(f => `
        <div style="display:flex;gap:8px;font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:7px;align-items:flex-start;font-family:inherit;line-height:1.5">
          <span style="color:rgba(255,90,80,0.9);flex-shrink:0;margin-top:1px">›</span><span>${mapFlagLabel(f)}</span>
        </div>`).join("")}
    </div>` : "";

  const el = document.createElement("div");
  el.style.cssText = `
    position:fixed;top:-99999px;left:0;
    width:794px;padding:48px;
    background:#0b1e0f;color:#fff;
    font-family:'Syne','Rethink Sans',sans-serif;
    box-sizing:border-box;line-height:1.5;
  `;
  el.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:36px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.08)">
      <span style="font-size:19px;font-weight:600;letter-spacing:-0.04em;font-family:inherit">.verify<span style="color:#7dc98a">skn</span></span>
      <span style="font-size:11px;color:rgba(255,255,255,0.35);font-family:'DM Mono','Space Mono',monospace">${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>
    </div>
    <div style="margin-bottom:28px">
      <div style="font-size:46px;font-weight:700;color:${verdictColor};letter-spacing:-0.03em;line-height:1;text-transform:capitalize;font-family:inherit">${r.result}</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.38);margin-top:8px;font-family:'DM Mono','Space Mono',monospace">${r.confidence}% confidence</div>
    </div>
    ${r.summary ? `<div style="font-size:13px;color:rgba(255,255,255,0.62);line-height:1.7;margin-bottom:28px;font-family:inherit">${r.summary}</div>` : ""}
    <div style="font-size:10px;font-weight:600;letter-spacing:0.1em;color:rgba(255,255,255,0.25);margin-bottom:12px;text-transform:uppercase;font-family:'DM Mono','Space Mono',monospace">Packaging Checks</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${checksHtml}</div>
    ${flagsHtml}
    <div style="margin-top:40px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.07);font-size:10px;color:rgba(255,255,255,0.2);font-family:'DM Mono','Space Mono',monospace">
      verifyskn.com · ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC
    </div>
  `;

  document.body.appendChild(el);
  try {
    const canvas = await html2canvas(el, {
      scale: 2, useCORS: true, logging: false, backgroundColor: "#0b1e0f",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = (canvas.height / canvas.width) * pdfW;
    pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
    pdf.save(`verifyskn-report-${Date.now()}.pdf`);
  } finally {
    document.body.removeChild(el);
  }
}

// ── HomeClient ────────────────────────────────────────────────

export function HomeClient() {
  const [tab,        setTab]        = useState<Tab>("deep");
  const [serial,     setSerial]     = useState("");
  const [phase,      setPhase]      = useState<Phase>("idle");
  const [showSerial, setShowSerial] = useState(false);
  const [result, setResult] = useState<ProductData | null>(null);
  const [showReport,    setShowReport]    = useState(false);
  const [reportPrefill, setReportPrefill] = useState<{ issues: ReportIssue[]; desc: string; images: ReportImage[] }>({ issues: [], desc: "", images: [] });

  // Deep analysis state
  const [deepPhase,  setDeepPhase]  = useState<UploadPhase>("idle");
  const [deepError,  setDeepError]  = useState<string | null>(null);
  const [deepResult, setDeepResult] = useState<DeepResult | null>(null);
  const [deepImage,  setDeepImage]  = useState<ReportImage | null>(null);

  // Serial tab image analysis state
  const [serialImgPhase,  setSerialImgPhase]  = useState<"idle" | "analyzing" | "result" | "error">("idle");
  const [serialImgResult, setSerialImgResult] = useState<DeepResult | null>(null);
  const [serialImgError,  setSerialImgError]  = useState<string | null>(null);
  const [serialImage,     setSerialImage]     = useState<ReportImage | null>(null);

  // Product details accordion
  const [showDetails, setShowDetails] = useState(false);

  // ── Lookup ──────────────────────────────────────────────────
  const lookup = useCallback(async (code: string) => {
    setPhase("loading");
    try {
      const res  = await fetch(`/api/product/${encodeURIComponent(code)}`);
      const data = await res.json() as ProductData;
      setResult(data);
      setPhase(data.source === "not_found" ? "not-found" : "result");
    } catch {
      setResult({ source: "not_found" });
      setPhase("not-found");
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = serial.trim();
    if (code) lookup(code);
  };

  const handleScan = useCallback((barcode: string) => {
    setSerial(barcode);
    lookup(barcode);
  }, [lookup]);

  const reset = () => {
    setPhase("idle");
    setResult(null);
    setSerial("");
    setDeepPhase("idle");
    setDeepError(null);
    setDeepResult(null);
    setDeepImage(null);
    setSerialImgPhase("idle");
    setSerialImgResult(null);
    setSerialImgError(null);
    setShowDetails(false);
  };

  // ── Deep analysis ───────────────────────────────────────────
  const handleDeepImageReady = useCallback(async (base64: string, mimeType: string, fileName?: string) => {
    setDeepPhase("analyzing");
    setDeepError(null);
    setDeepResult(null);
    setDeepImage({
      preview:  `data:${mimeType};base64,${base64}`,
      base64,
      mimeType,
      name:     fileName ?? "packaging.jpg",
    });
    try {
      const res = await fetch("/api/analyse-product", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image: base64, mimeType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Server responded with ${res.status}`);
      }
      const data = await res.json();
      try {
        const session: ImageAnalysisSession = {
          result:          data.result,
          confidence:      data.confidence,
          summary:         data.summary ?? "",
          flags:           data.flags ?? [],
          font_quality:    data.packaging_checks?.font_quality    ?? "",
          logo_accuracy:   data.packaging_checks?.logo_accuracy   ?? "",
          print_quality:   data.packaging_checks?.print_quality   ?? "",
          label_alignment: data.packaging_checks?.label_alignment ?? "",
          spelling_check:  data.packaging_checks?.spelling        ?? "",
          hologram_check:  data.packaging_checks?.hologram        ?? "",
          sessionId:       data.sessionId,
        };
        sessionStorage.setItem(IMAGE_SESSION_KEY, JSON.stringify(session));
      } catch { /* sessionStorage unavailable */ }

      setDeepResult({
        result:          data.result,
        confidence:      data.confidence,
        summary:         data.summary ?? "",
        flags:           data.flags ?? [],
        font_quality:    data.packaging_checks?.font_quality    ?? "",
        logo_accuracy:   data.packaging_checks?.logo_accuracy   ?? "",
        print_quality:   data.packaging_checks?.print_quality   ?? "",
        label_alignment: data.packaging_checks?.label_alignment ?? "",
        spelling_check:  data.packaging_checks?.spelling        ?? "",
        hologram_check:  data.packaging_checks?.hologram        ?? "",
        sessionId:       data.sessionId,
      });
      setDeepPhase("idle");
    } catch (err) {
      setDeepPhase("error");
      setDeepError(err instanceof Error ? err.message : "Analysis failed — please try again with a clearer photo.");
    }
  }, []);

  const handleSerialImageReady = useCallback(async (base64: string, mimeType: string) => {
    setSerialImgPhase("analyzing");
    setSerialImgError(null);
    setSerialImage({ preview: `data:${mimeType};base64,${base64}`, base64, mimeType, name: "packaging.jpg" });
    try {
      const res = await fetch("/api/analyse-product", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ image: base64, mimeType, barcode: result?.barcode || serial }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setSerialImgResult({
        result:          data.result,
        confidence:      data.confidence,
        summary:         data.summary ?? "",
        flags:           data.flags ?? [],
        font_quality:    data.packaging_checks?.font_quality    ?? "",
        logo_accuracy:   data.packaging_checks?.logo_accuracy   ?? "",
        print_quality:   data.packaging_checks?.print_quality   ?? "",
        label_alignment: data.packaging_checks?.label_alignment ?? "",
        spelling_check:  data.packaging_checks?.spelling        ?? "",
        hologram_check:  data.packaging_checks?.hologram        ?? "",
        sessionId:       data.sessionId ?? "",
        finalResult:     data.finalResult,
        finalConfidence: data.finalConfidence,
      });
      setSerialImgPhase("result");
    } catch {
      setSerialImgPhase("error");
      setSerialImgError("Analysis failed — please try again with a clearer photo.");
    }
  }, [result, serial]);

  // ── Derived ─────────────────────────────────────────────────
  const productName = result?.name || result?.product_name || "Unknown product";
  const brandName   = result?.brand || "Unknown brand";
  const isAuth      = result?.source === "database";

  return (
    <div
      className="-mt-14 flex min-h-screen flex-col overflow-auto lg:h-screen lg:overflow-hidden"
      style={{ background: C.forestDeep, color: "#fff", fontFamily: UI }}
    >
      {/* ── Navbar ── */}
      <nav
        className="flex flex-shrink-0 items-center justify-between px-4 sm:px-8"
        style={{ background: C.forest, borderBottom: `0.5px solid ${C.border}`, height: "56px" }}
      >
        <button
          onClick={reset}
          className="text-[17px] font-semibold leading-none text-white"
          style={{ letterSpacing: "-0.04em", background: "none", border: "none", cursor: "pointer", fontFamily: UI }}
        >
          .verify<span style={{ color: C.lime }}>skn</span>
        </button>
        <div className="flex items-center gap-7">
          <Link
            href="/about"
            className="text-xs transition-colors hover:text-white"
            style={{ color: C.w40, textDecoration: "none" }}
          >
            About
          </Link>
          <Link
            href="/support"
            className="text-xs transition-colors hover:text-white"
            style={{ color: C.w40, textDecoration: "none" }}
          >
            Support
          </Link>
        </div>
      </nav>

      {/* ── Main split ── */}
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-2 lg:overflow-hidden">

        {/* ════════ LEFT PANEL ════════ */}
        <div
          className="flex flex-col overflow-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:overflow-hidden"
          style={{ background: C.forest, borderRight: `0.5px solid ${C.border}` }}
        >
          <h1
            className="mb-3 font-semibold leading-[1.1]"
            style={{ fontSize: "clamp(22px, 2.8vw, 34px)", letterSpacing: "-0.03em" }}
          >
            Protect your skin.<br />Confirm your source.
          </h1>

          <p className="mb-6 text-sm leading-relaxed" style={{ color: C.w40, maxWidth: "360px" }}>
            Upload or scan any skincare product to instantly check if it&apos;s genuine.
          </p>

          {/* ── Tabs ── */}
          <div className="mb-7 flex flex-wrap gap-2">
            {([
              { id: "deep"   as Tab, label: "Deep analysis" },
              { id: "serial" as Tab, label: "Serial code" },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => { setTab(id); if (phase === "scanning") setPhase("idle"); }}
                className="rounded-full px-4 py-1.5 text-xs transition-all"
                style={{
                  fontFamily: MONO,
                  border:     `0.5px solid ${tab === id ? C.limeBorder : C.w15}`,
                  background: tab === id ? C.limeDim : "transparent",
                  color:      tab === id ? C.lime    : C.w25,
                  cursor:     "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Serial code tab ── */}
          {tab === "serial" && (
            phase !== "scanning" ? (
              <form onSubmit={handleSubmit} className="flex flex-col">
                {/* ── Barcode scan area (primary) ── */}
                <label className="mb-3 text-xs uppercase tracking-widest" style={{ color: C.w25, fontFamily: MONO }}>
                  Scan barcode
                </label>
                <button
                  type="button"
                  onClick={() => setPhase("scanning")}
                  className="mb-6 flex w-full flex-col items-center justify-center gap-4 rounded-xl px-5 py-10 transition-all hover:brightness-110"
                  style={{ background: C.w04, border: `0.5px solid ${C.limeBorder}`, cursor: "pointer" }}
                >
                  <div style={{ position: "relative", height: "40px", width: "68px", flexShrink: 0, overflow: "hidden" }}>
                    {([
                      { top: 0,    left:  0,    borderWidth: "1.5px 0 0 1.5px" },
                      { top: 0,    right: 0,    borderWidth: "1.5px 1.5px 0 0" },
                      { bottom: 0, left:  0,    borderWidth: "0 0 1.5px 1.5px" },
                      { bottom: 0, right: 0,    borderWidth: "0 1.5px 1.5px 0" },
                    ] as React.CSSProperties[]).map((s, i) => (
                      <div key={i} style={{ position: "absolute", width: "10px", height: "10px", borderColor: C.lime, borderStyle: "solid", ...s }} />
                    ))}
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", display: "flex", gap: "1.5px", alignItems: "stretch", height: "22px" }}>
                      {BARS.slice(0, 28).map(({ w, op }, i) => (
                        <div key={i} style={{ width: `${Math.max(w - 0.5, 0.5)}px`, opacity: op, background: C.w60, borderRadius: "1px", flexShrink: 0 }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium" style={{ color: C.w60, fontFamily: UI }}>Scan barcode</span>
                    <span className="text-xs" style={{ color: C.w25, fontFamily: MONO }}>Tap to activate camera</span>
                  </div>
                </button>

                {/* ── Serial number toggle link ── */}
                <button
                  type="button"
                  onClick={() => setShowSerial((v) => !v)}
                  className="mb-4 text-xs underline-offset-2 hover:opacity-80 transition-opacity"
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.w40, fontFamily: MONO, textDecoration: "underline", textAlign: "center" }}
                >
                  {showSerial ? "Hide serial number" : "Or enter serial number manually"}
                </button>

                {/* ── Serial number input (hidden by default) ── */}
                {showSerial && (
                  <>
                    <input
                      value={serial}
                      onChange={(e) => setSerial(fmt(e.target.value))}
                      placeholder="SKN-000-000"
                      maxLength={13}
                      autoComplete="off"
                      spellCheck={false}
                      disabled={phase === "loading"}
                      className="serial-input mb-2.5 w-full rounded-lg px-4 py-3 text-xl font-medium outline-none transition-all"
                      style={{
                        background:    C.w04,
                        border:        `0.5px solid ${C.w15}`,
                        color:         C.w60,
                        fontFamily:    MONO,
                        letterSpacing: "0.06em",
                        caretColor:    C.lime,
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = C.limeBorder;
                        e.currentTarget.style.background  = "rgba(125,201,138,0.04)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = C.w15;
                        e.currentTarget.style.background  = C.w04;
                      }}
                    />
                    <p className="mb-8 text-xs" style={{ color: "rgba(255,255,255,0.2)", fontFamily: MONO }}>
                      Find this on the base of your product packaging
                    </p>

                    <button
                      type="submit"
                      disabled={!serial.trim() || phase === "loading"}
                      className="w-full rounded-lg py-3.5 text-sm font-semibold transition-opacity hover:opacity-90"
                      style={{
                        background: C.lime,
                        color:      C.forestDeep,
                        border:     "none",
                        cursor:     (!serial.trim() || phase === "loading") ? "default" : "pointer",
                        opacity:    (!serial.trim() || phase === "loading") ? 0.45 : 1,
                        fontFamily: UI,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {phase === "loading" ? "Verifying…" : "Verify product"}
                    </button>
                  </>
                )}
              </form>
            ) : (
              /* ── Inline camera scanner ── */
              <div className="flex flex-col gap-4">
                <div
                  className="overflow-hidden rounded-xl"
                  style={{ border: `0.5px solid ${C.limeBorder}`, background: "#000" }}
                >
                  <Scanner
                    onScan={handleScan}
                    onDetect={() => {}}
                    showManualEntry={false}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPhase("idle")}
                  className="w-full rounded-lg py-2.5 text-sm transition-all hover:text-white"
                  style={{ background: "transparent", border: `0.5px solid ${C.w15}`, color: C.w40, cursor: "pointer", fontFamily: UI }}
                >
                  Cancel scanner
                </button>
              </div>
            )
          )}

          {/* ── Deep analysis tab ── */}
          {tab === "deep" && (
            <div className="flex flex-col gap-4">
              {deepPhase === "idle" && (
                <ImageUploader onImageReady={handleDeepImageReady} />
              )}
              {deepPhase === "analyzing" && (
                <AnalysisLoader />
              )}
              {deepPhase === "error" && (
                <div className="flex flex-col gap-4">
                  <div
                    className="rounded-xl px-4 py-3"
                    style={{ background: C.redBg, border: `0.5px solid ${C.redBorder}` }}
                  >
                    <p className="text-sm" style={{ color: C.red, fontFamily: MONO }}>{deepError}</p>
                  </div>
                  <button
                    onClick={() => { setDeepPhase("idle"); setDeepError(null); }}
                    className="self-start rounded-lg px-5 py-2.5 text-sm transition-all"
                    style={{ background: C.w04, border: `0.5px solid ${C.limeBorder}`, color: C.lime, cursor: "pointer", fontFamily: UI }}
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════════ RIGHT PANEL ════════ */}
        <div
          className="flex flex-col overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
          style={{ background: C.forestMid }}
        >

          {/* ── Serial tab states ── */}
          {tab === "serial" && (
            <>
              {/* Idle */}
              {phase === "idle" && (
                <div className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ background: C.limeDim, border: `0.5px solid ${C.limeBorder}` }}>
                    <ShieldIcon />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: C.w25, maxWidth: "220px" }}>
                    Enter a serial number or scan a barcode to verify your product
                  </p>
                </div>
              )}

              {/* Scanning */}
              {phase === "scanning" && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
                  <Spinner />
                  <p className="text-xs" style={{ color: C.w40, fontFamily: MONO }}>Scanner active…</p>
                </div>
              )}

              {/* Loading */}
              {phase === "loading" && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
                  <Spinner />
                  <p className="text-xs" style={{ color: C.w40, fontFamily: MONO }}>Looking up product…</p>
                </div>
              )}

              {/* Not found */}
              {phase === "not-found" && (
                <div className="flex flex-1 flex-col gap-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: C.red }} />
                    <span className="text-xs uppercase tracking-widest" style={{ color: C.w25, fontFamily: MONO }}>
                      Authentication status
                    </span>
                  </div>
                  <h2 className="font-semibold" style={{ fontSize: "clamp(22px,2.5vw,32px)", color: C.red, letterSpacing: "-0.025em" }}>
                    Not found
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: C.w40, maxWidth: "320px" }}>
                    We could not find this product in our database or any known source. It may be counterfeit or unregistered.
                  </p>
                  <a
                    href="https://calendar.app.google/sLinchWrpXCdTcPt6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-start rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: "#C9A84C", color: C.forestDeep, fontFamily: UI }}
                  >
                    Book a consultation
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowReport(true)}
                    className="self-start rounded-lg px-5 py-2.5 text-sm font-semibold"
                    style={{ background: C.redBg, border: `0.5px solid ${C.redBorder}`, color: C.red, cursor: "pointer" }}>
                    Report this product
                  </button>
                  <button onClick={reset} className="self-start text-xs"
                    style={{ color: C.w25, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                    Try another
                  </button>
                </div>
              )}

              {/* Result */}
              {phase === "result" && result && (
                <>
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: isAuth ? C.lime : C.amber, animation: "breathe 2.5s ease-in-out infinite" }} />
                    <span className="text-xs uppercase tracking-widest" style={{ color: C.w25, fontFamily: MONO }}>
                      Authentication status
                    </span>
                  </div>

                  <h2 className="mb-7 font-semibold"
                    style={{ fontSize: "clamp(22px,2.5vw,32px)", color: isAuth ? C.lime : C.amber, letterSpacing: "-0.025em" }}>
                    {isAuth ? "Genuine — verified" : "Unverified source"}
                  </h2>

                  {/* Product card */}
                  <div className="mb-6 grid rounded-xl p-4"
                    style={{ background: C.w04, border: `0.5px solid ${C.w08}`, gridTemplateColumns: "64px 1fr", gap: "16px", alignItems: "center" }}>
                    <div className="flex flex-col justify-end rounded-md p-2"
                      style={{ background: C.forestLight, border: `0.5px solid ${C.w08}`, height: "80px" }}>
                      <p className="text-xs leading-snug" style={{ color: C.w25, fontFamily: MONO }}>
                        {productName.slice(0, 18)}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 text-base font-semibold" style={{ letterSpacing: "-0.02em" }}>{productName}</p>
                      <p className="mb-2.5 text-xs" style={{ color: C.w40 }}>{brandName}</p>
                      <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                        style={{
                          background: isAuth ? C.limeDim : "rgba(255,193,7,0.1)",
                          border:     `0.5px solid ${isAuth ? C.limeBorder : "rgba(255,193,7,0.25)"}`,
                          color:      isAuth ? C.lime : C.amber,
                          fontFamily: MONO,
                        }}>
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: isAuth ? C.lime : C.amber }} />
                        {isAuth ? "Verified brand" : "Unverified source"}
                      </span>
                    </div>
                  </div>

                  <hr style={{ border: "none", borderTop: `0.5px solid ${C.border}`, marginBottom: "20px" }} />

                  {/* Meta grid */}
                  <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-4">
                    {[
                      { label: "Product name", value: productName },
                      { label: "Barcode",      value: result.barcode || serial },
                      { label: "Brand",        value: brandName },
                      { label: "Category",     value: result.category || result.categories?.split(",")[0]?.trim() || "Beauty" },
                      { label: "Source",       value: isAuth ? "Verified database" : "Public registry" },
                      { label: "Status",       value: isAuth ? "Authenticated" : "Unverified" },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: C.w25, fontFamily: MONO }}>{label}</p>
                        <p className="text-sm font-medium" style={{ letterSpacing: "-0.01em" }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Product details accordion */}
                  {(result.how_to_use || result.skin_type_suitability || (result.key_ingredients && result.key_ingredients.length > 0)) && (
                    <div className="mb-6">
                      <button
                        onClick={() => setShowDetails((v) => !v)}
                        className="flex w-full items-center justify-between text-xs uppercase tracking-widest"
                        style={{ color: C.w25, fontFamily: MONO, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                      >
                        <span>Product details</span>
                        <span style={{ color: C.w40, fontSize: "16px", lineHeight: 1 }}>{showDetails ? "−" : "+"}</span>
                      </button>

                      {showDetails && (
                        <div className="mt-3 flex flex-col gap-4">
                          {result.skin_type_suitability && (
                            <div className="rounded-lg p-3" style={{ background: C.w04, border: `0.5px solid ${C.w08}` }}>
                              <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: C.w25, fontFamily: MONO }}>Skin type</p>
                              <p className="text-sm" style={{ color: C.w60 }}>{result.skin_type_suitability}</p>
                            </div>
                          )}
                          {result.how_to_use && (
                            <div className="rounded-lg p-3" style={{ background: C.w04, border: `0.5px solid ${C.w08}` }}>
                              <p className="mb-1 text-xs uppercase tracking-wider" style={{ color: C.w25, fontFamily: MONO }}>How to use</p>
                              <p className="text-sm leading-relaxed" style={{ color: C.w60 }}>{result.how_to_use}</p>
                            </div>
                          )}
                          {result.key_ingredients && result.key_ingredients.length > 0 && (
                            <div className="rounded-lg p-3" style={{ background: C.w04, border: `0.5px solid ${C.w08}` }}>
                              <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: C.w25, fontFamily: MONO }}>Key ingredients</p>
                              <div className="flex flex-wrap gap-1.5">
                                {result.key_ingredients.map((ing) => (
                                  <span
                                    key={ing}
                                    className="rounded-full px-2.5 py-0.5 text-xs"
                                    style={{ background: C.limeDim, color: C.lime, border: `0.5px solid ${C.limeBorder}`, fontFamily: MONO }}
                                  >
                                    {ing}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Where to buy */}
                  {(() => {
                    const q = encodeURIComponent(`${productName} ${brandName}`);
                    const NECTAR_BRANDS = ["cosrx","medix","advanced clinicals","cerave","replenix","tiam"];
                    const isNectar = NECTAR_BRANDS.some((b) => brandName.toLowerCase().includes(b));
                    const ngStore = isNectar
                      ? { label: "Nectar Beauty Hub", url: `https://nectarbeautyhub.com/search?q=${q}` }
                      : { label: "Essentials Hub",    url: `https://essentialshub.com/?s=${q}` };
                    const globalRetailers = [
                      { label: "Amazon",        url: `https://www.amazon.com/s?k=${q}` },
                      { label: "Sephora",       url: `https://www.sephora.com/search?keyword=${q}` },
                      { label: "Lookfantastic", url: `https://www.lookfantastic.com/search?search=${q}` },
                    ];
                    const chipStyle = {
                      background: C.w04, border: `0.5px solid ${C.w15}`,
                      color: C.w60, fontFamily: MONO, textDecoration: "none",
                      borderRadius: "999px", padding: "5px 12px", fontSize: "12px",
                      display: "inline-block", lineHeight: "1.4",
                      transition: "opacity 0.15s",
                    } as const;
                    return (
                      <div className="mb-6">
                        <p className="mb-3 text-xs uppercase tracking-widest" style={{ color: C.w25, fontFamily: MONO }}>
                          Where to buy
                        </p>
                        <div className="mb-4 flex flex-wrap gap-2">
                          {globalRetailers.map(({ label, url }) => (
                            <a key={label} href={url} target="_blank" rel="noopener noreferrer" style={chipStyle}>
                              {label} ↗
                            </a>
                          ))}
                        </div>

                        <p className="mb-2 text-xs uppercase tracking-widest" style={{ color: C.w25, fontFamily: MONO }}>
                          Nigeria
                        </p>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <a href={ngStore.url} target="_blank" rel="noopener noreferrer" style={chipStyle}>
                            {ngStore.label} ↗
                          </a>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: C.w25 }}>
                          We have no affiliation with {ngStore.label}. Links are provided for convenience only.
                        </p>
                      </div>
                    );
                  })()}

                  {/* What we checked */}
                  <div className="mb-6">
                    <p className="mb-3 text-xs uppercase tracking-widest" style={{ color: C.w25, fontFamily: MONO }}>
                      What we checked
                    </p>
                    <ul className="flex flex-col gap-2.5">
                      {[
                        {
                          icon: "🔍",
                          text: isAuth
                            ? "Found in VerifySkn verified registry"
                            : "Found in a public barcode database — not independently verified",
                        },
                        {
                          icon: "🤖",
                          text: serialImgPhase === "result"
                            ? "Packaging image analysed by AI"
                            : "No image analysis — upload packaging below for a full check",
                        },
                      ].map(({ icon, text }, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="mt-px flex-shrink-0 text-sm leading-none">{icon}</span>
                          <span className="text-sm" style={{ color: C.w60 }}>{text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Inline image analysis — shown for non-verified results */}
                  {!isAuth && (
                    <div className="mb-6">
                      {serialImgPhase === "idle" && (
                        <>
                          <p className="mb-3 text-xs uppercase tracking-widest" style={{ color: C.w25, fontFamily: MONO }}>
                            Packaging scan
                          </p>
                          <ImageUploader onImageReady={handleSerialImageReady} />
                        </>
                      )}

                      {serialImgPhase === "analyzing" && (
                        <AnalysisLoader onComplete={() => {}} />
                      )}

                      {serialImgPhase === "error" && (
                        <div className="rounded-lg p-3" style={{ background: C.redBg, border: `0.5px solid ${C.redBorder}` }}>
                          <p className="text-xs" style={{ color: C.red }}>{serialImgError}</p>
                          <button
                            onClick={() => { setSerialImgPhase("idle"); setSerialImgError(null); }}
                            className="mt-2 text-xs"
                            style={{ color: C.w40, background: "none", border: "none", cursor: "pointer" }}
                          >
                            Try again
                          </button>
                        </div>
                      )}

                      {serialImgPhase === "result" && serialImgResult && (
                        <>
                          <p className="mb-3 text-xs uppercase tracking-widest" style={{ color: C.w25, fontFamily: MONO }}>
                            Packaging checks
                          </p>
                          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {DEEP_CHECKS.map(({ key, label }) => {
                              const badge = normalizeCheck(serialImgResult[key] as string);
                              const { label: badgeLabel, bg, color } = BADGE_CFG[badge];
                              return (
                                <div
                                  key={key}
                                  className="flex flex-col gap-2 rounded-lg p-3"
                                  style={{ background: C.w04, border: `0.5px solid ${C.w08}` }}
                                >
                                  <p className="text-xs" style={{ color: C.w40, fontFamily: MONO }}>{label}</p>
                                  <span
                                    className="self-start rounded-full px-2.5 py-0.5 text-xs"
                                    style={{ background: bg, color, fontFamily: MONO }}
                                  >
                                    {badgeLabel}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {serialImgResult.flags.length > 0 && (
                            <div className="mb-5 rounded-lg p-3" style={{ background: C.redBg, border: `0.5px solid ${C.redBorder}` }}>
                              <p className="mb-2 text-xs uppercase tracking-widest" style={{ color: C.red, fontFamily: MONO }}>
                                Issues detected
                              </p>
                              <ul className="flex flex-col gap-1.5">
                                {serialImgResult.flags.map((flag, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs" style={{ color: C.w60 }}>
                                    <span style={{ color: C.red, flexShrink: 0 }}>›</span>
                                    {mapFlagLabel(flag)}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {serialImgResult.finalResult && serialImgResult.finalConfidence !== undefined && (
                            <div className="mb-5 rounded-lg p-4" style={{ background: C.w04, border: `0.5px solid ${C.w08}` }}>
                              <p className="mb-1.5 text-xs uppercase tracking-widest" style={{ color: C.w25, fontFamily: MONO }}>
                                Combined verdict
                              </p>
                              <div className="flex items-baseline gap-2">
                                <span
                                  className="font-semibold leading-none"
                                  style={{ fontSize: 32, color: VERDICT_COLORS[serialImgResult.finalResult] ?? C.lime, letterSpacing: "-0.03em" }}
                                >
                                  {serialImgResult.finalConfidence}%
                                </span>
                                <span className="text-sm" style={{ color: C.w40 }}>
                                  {verdictLabel(serialImgResult.finalResult)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs" style={{ color: C.w25, fontFamily: MONO }}>
                                Barcode + packaging image analysis
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => {
                        const issues: ReportIssue[] = result?.source === "open_beauty_facts" ? ["wrong_info"] : [];
                        const flags = serialImgResult?.flags.length ? `Flags:\n${serialImgResult.flags.map(f => `• ${mapFlagLabel(f)}`).join("\n")}` : "";
                        const desc = [serialImgResult?.summary, flags].filter(Boolean).join("\n\n");
                        setReportPrefill({ issues, desc, images: serialImage ? [serialImage] : [] });
                        setShowReport(true);
                      }}
                      className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                      style={{ background: C.redBg, border: `0.5px solid ${C.redBorder}`, color: C.red, cursor: "pointer", fontFamily: UI }}
                    >
                      Report product
                    </button>
                    <button onClick={reset} className="text-sm transition-colors hover:text-white"
                      style={{ color: C.w25, background: "none", border: "none", cursor: "pointer" }}>
                      Scan another
                    </button>
                  </div>

                  {/* Booking nudge */}
                  <p className="mt-1 text-xs" style={{ color: C.w25 }}>
                    Not sure about this result?{" "}
                    <Link
                      href="/support"
                      className="transition-colors hover:text-white"
                      style={{ color: C.lime, textDecoration: "underline", textUnderlineOffset: "3px" }}
                    >
                      Book a consultation
                    </Link>
                  </p>
                </>
              )}
            </>
          )}

          {/* ── Deep tab — idle / analyzing ── */}
          {tab === "deep" && !deepResult && (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 py-16 text-center">
              {deepPhase === "analyzing" ? (
                <>
                  <Spinner />
                  <p className="text-xs" style={{ color: C.w40, fontFamily: MONO }}>Analysing packaging…</p>
                </>
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full"
                    style={{ background: C.limeDim, border: `0.5px solid ${C.limeBorder}` }}>
                    <ShieldIcon />
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: C.w25, maxWidth: "220px" }}>
                    Upload a product photo to run deep packaging analysis
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Deep tab — result ── */}
          {tab === "deep" && deepResult && isNoPackagingResult(deepResult) && (
            <div className="flex flex-col gap-5 py-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{ background: "rgba(255,193,7,0.08)", border: "0.5px solid rgba(255,193,7,0.2)" }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="rgba(255,193,7,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              <div>
                <h3 className="mb-1.5 font-semibold" style={{ fontSize: "clamp(16px,2vw,22px)", letterSpacing: "-0.02em" }}>
                  No packaging detected
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: C.w40, maxWidth: "320px" }}>
                  The image doesn&apos;t show product packaging clearly. For accurate results:
                </p>
              </div>
              <ul className="flex flex-col gap-2">
                {[
                  "Photo the front or back label directly",
                  "Ensure good lighting — no glare or shadows",
                  "Move close enough to fill the frame with the packaging",
                  "Avoid photographing a shelf or multiple products",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: C.w60 }}>
                    <span style={{ color: C.lime, flexShrink: 0 }}>›</span>
                    {tip}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setDeepResult(null); setDeepPhase("idle"); }}
                className="self-start rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: C.lime, color: C.forestDeep, border: "none", cursor: "pointer", fontFamily: UI }}
              >
                Try again
              </button>
            </div>
          )}

          {tab === "deep" && deepResult && !isNoPackagingResult(deepResult) && (
            <>
              {/* Header row */}
              <div className="mb-2.5 flex items-center gap-2">
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: VERDICT_COLORS[deepResult.result] ?? C.lime, animation: "breathe 2.5s ease-in-out infinite" }}
                />
                <span className="text-xs uppercase tracking-widest" style={{ color: C.w25, fontFamily: MONO }}>
                  Image analysis
                </span>
              </div>

              {/* Verdict + confidence */}
              <h2
                className="mb-1.5 font-semibold"
                style={{ fontSize: "clamp(22px,2.5vw,32px)", color: VERDICT_COLORS[deepResult.result] ?? C.lime, letterSpacing: "-0.025em" }}
              >
                {verdictLabel(deepResult.result)}
              </h2>
              <p className="mb-5 text-xs" style={{ color: C.w25, fontFamily: MONO }}>
                {deepResult.confidence}% · {confidenceTier(deepResult.confidence)}
              </p>

              {/* Summary */}
              {deepResult.summary && (
                <p className="mb-6 text-sm leading-relaxed" style={{ color: C.w60 }}>
                  {deepResult.summary}
                </p>
              )}

              {/* Packaging checks grid */}
              <p className="mb-3 text-xs uppercase tracking-widest" style={{ color: C.w25, fontFamily: MONO }}>
                Packaging checks
              </p>
              <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DEEP_CHECKS.map(({ key, label }) => {
                  const badge = normalizeCheck(deepResult[key] as string);
                  const { label: badgeLabel, bg, color } = BADGE_CFG[badge];
                  return (
                    <div
                      key={key}
                      className="flex flex-col gap-2 rounded-lg p-3"
                      style={{ background: C.w04, border: `0.5px solid ${C.w08}` }}
                    >
                      <p className="text-xs" style={{ color: C.w40, fontFamily: MONO }}>{label}</p>
                      <span
                        className="self-start rounded-full px-2.5 py-0.5 text-xs"
                        style={{ background: bg, color, fontFamily: MONO }}
                      >
                        {badgeLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Flags */}
              {deepResult.flags.length > 0 && (
                <div
                  className="mb-5 rounded-lg p-3"
                  style={{ background: C.redBg, border: `0.5px solid ${C.redBorder}` }}
                >
                  <p className="mb-2 text-xs uppercase tracking-widest" style={{ color: C.red, fontFamily: MONO }}>
                    Issues detected
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {deepResult.flags.map((flag, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color: C.w60 }}>
                        <span style={{ color: C.red, flexShrink: 0 }}>›</span>
                        {mapFlagLabel(flag)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {/* Primary CTA */}
                <a
                  href="https://calendar.app.google/sLinchWrpXCdTcPt6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-lg py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: "#C9A84C", color: C.forestDeep, fontFamily: UI }}
                >
                  Book a consultation
                </a>
                {/* Secondary actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => downloadDeepReport(deepResult)}
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                    style={{ background: "transparent", color: C.lime, border: `1px solid ${C.limeBorder}`, cursor: "pointer", fontFamily: UI }}
                  >
                    Download report
                  </button>
                  <button
                    onClick={() => {
                      const issues: ReportIssue[] = deepResult.result === "suspicious" ? ["counterfeit"] : deepResult.result === "unverified" ? ["wrong_info"] : [];
                      const flags = deepResult.flags.length > 0 ? `Flags:\n${deepResult.flags.map(f => `• ${mapFlagLabel(f)}`).join("\n")}` : "";
                      const desc = [deepResult.summary, flags].filter(Boolean).join("\n\n");
                      setReportPrefill({ issues, desc, images: deepImage ? [deepImage] : [] });
                      setShowReport(true);
                    }}
                    className="flex-1 rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ background: C.redBg, border: `0.5px solid ${C.redBorder}`, color: C.red, cursor: "pointer", fontFamily: UI }}
                  >
                    Report product
                  </button>
                </div>
                {/* Exit */}
                <button
                  onClick={() => { setDeepResult(null); setDeepPhase("idle"); setDeepImage(null); }}
                  className="w-full text-center text-sm transition-opacity hover:opacity-70"
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.w25, fontFamily: UI }}
                >
                  Clear result
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex flex-shrink-0 items-center justify-between px-4 sm:px-8 py-2.5"
        style={{ background: C.forestDeep, borderTop: `0.5px solid ${C.border}` }}>
        <span className="text-xs" style={{ color: C.w25, fontFamily: MONO }}>SkinCare Registry v2.4.0</span>
        <span className="text-xs" style={{ color: C.w25, fontFamily: MONO }}>© 2026 VerifySkn</span>
      </div>

      {/* ── Report modal ── */}
      {showReport && (
        <ReportModal
          barcode={result?.barcode || serial}
          prefillIssues={reportPrefill.issues}
          prefillDesc={reportPrefill.desc}
          prefillImages={reportPrefill.images}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="h-8 w-8 animate-spin rounded-full"
      style={{ border: "2px solid rgba(125,201,138,0.2)", borderTopColor: "#7dc98a" }} />
  );
}

function ShieldIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(125,201,138,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
