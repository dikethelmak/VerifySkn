"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, X } from "lucide-react";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import { cn } from "@/lib/utils";
import {
  BARCODE_SESSION_KEY,
  IMAGE_SESSION_KEY,
  type BarcodeSession,
  type ImageAnalysisSession,
} from "@/lib/imageSession";

// Lazy-load camera-heavy components
const Scanner = dynamic(
  () => import("@/components/Scanner").then((m) => ({ default: m.Scanner })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 animate-pulse items-center justify-center rounded-2xl border border-border bg-surface">
        <div className="h-12 w-12 rounded-full bg-border" />
      </div>
    ),
  }
);

const ImageUploader = dynamic(
  () =>
    import("@/components/ImageUploader").then((m) => ({
      default: m.ImageUploader,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-52 animate-pulse items-center justify-center rounded-2xl border-2 border-dashed border-border bg-surface">
        <div className="h-8 w-8 rounded-full bg-border" />
      </div>
    ),
  }
);

// ── Types ─────────────────────────────────────────────────────

type Tab = "barcode" | "image";
type UploadPhase = "idle" | "analyzing" | "error";

const TABS: { id: Tab; label: string }[] = [
  { id: "barcode", label: "Scan Barcode" },
  { id: "image",   label: "Analyse Packaging" },
];

// ── Page ─────────────────────────────────────────────────────

export default function ScanPage() {
  const router = useRouter();

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>("barcode");

  // Barcode tab
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Image tab
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingRef = useRef<{ base64: string; mimeType: string } | null>(null);

  // Barcode session banner
  const [barcodeSession, setBarcodeSession] = useState<BarcodeSession | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(BARCODE_SESSION_KEY);
      if (raw) setBarcodeSession(JSON.parse(raw));
    } catch {
      // ignore malformed entry
    }
  }, []);

  // ── Barcode tab ───────────────────────────────────────────

  const handleScan = useCallback(
    (barcode: string) => {
      const sessionId = crypto.randomUUID();
      const session: BarcodeSession = { sessionId, barcode };
      sessionStorage.setItem(BARCODE_SESSION_KEY, JSON.stringify(session));
      setIsLookingUp(true);
      router.push(`/result/${encodeURIComponent(barcode)}?sessionId=${sessionId}`);
    },
    [router]
  );

  // ── Image tab ─────────────────────────────────────────────

  const runAnalysis = useCallback(
    async (base64: string, mimeType: string) => {
      setUploadPhase("analyzing");
      setErrorMessage(null);

      try {
        const res = await fetch("/api/analyse-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image:     base64,
            mimeType,
            barcode:   barcodeSession?.barcode   ?? undefined,
            // Fix 3: pass the barcode sessionId so image + barcode results are linked
            sessionId: barcodeSession?.sessionId ?? undefined,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? `Server responded with ${res.status}`);
        }

        const data = await res.json();

        // Store result in sessionStorage as fallback for when Supabase is unavailable
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
        } catch {
          // sessionStorage unavailable — result page will rely on Supabase
        }

        // Navigate using the session_id returned by the API
        router.push(`/result/image?session=${data.sessionId}`);
      } catch (err) {
        console.error("[ScanPage] analyse-product failed:", err);
        setUploadPhase("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Analysis failed — please try again with a clearer photo."
        );
      }
    },
    [barcodeSession, router]
  );

  const handleImageReady = useCallback(
    (base64: string, mimeType: string) => {
      pendingRef.current = { base64, mimeType };
      runAnalysis(base64, mimeType);
    },
    [runAnalysis]
  );

  const handleRetry = useCallback(() => {
    setUploadPhase("idle");
    setErrorMessage(null);
    pendingRef.current = null;
  }, []);

  const handleLoaderComplete = useCallback(() => {}, []);

  const showBanner =
    barcodeSession !== null && !bannerDismissed && activeTab === "image";

  return (
    <div className="mx-auto max-w-[600px] px-5 py-12">
      {/* ── Heading ── */}
      <h1 className="font-fraunces text-4xl font-semibold text-text-primary">
        Verify a Product
      </h1>
      <p className="mt-2 font-rethink text-base text-text-secondary">
        Scan the barcode or upload a photo of your packaging
      </p>

      {/* ── Barcode session banner ── */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            key="barcode-banner"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 20 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div
              className="flex items-start justify-between gap-3 rounded-xl px-4 py-3"
              style={{ backgroundColor: "#F0F7F4" }}
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle
                  size={16}
                  strokeWidth={2}
                  style={{ color: "#2D7A4F", flexShrink: 0, marginTop: 1 }}
                />
                <p
                  className="font-rethink text-sm font-medium"
                  style={{ color: "#2D7A4F" }}
                >
                  Barcode scanned ✓ — Add a photo analysis for a more confident result
                </p>
              </div>
              <button
                onClick={() => setBannerDismissed(true)}
                aria-label="Dismiss banner"
                className="shrink-0 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab switcher ── */}
      <div className="mt-6">
        <div
          className="flex p-1"
          style={{ backgroundColor: "#E5E2DD", borderRadius: 4 }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex-1 py-2 px-4 font-rethink text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="scan-tab-indicator"
                  className="absolute inset-0 rounded-sm bg-white"
                  style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.10)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span
                className={cn(
                  "relative z-10 transition-colors",
                  activeTab === tab.id
                    ? "font-semibold text-primary"
                    : "font-medium text-text-secondary"
                )}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          {activeTab === "barcode" && (
            <motion.div
              key="barcode-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Scanner onScan={handleScan} />
            </motion.div>
          )}

          {activeTab === "image" && (
            <motion.div
              key="image-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex flex-col gap-4"
            >
              {uploadPhase === "idle" && (
                <ImageUploader onImageReady={handleImageReady} />
              )}

              {uploadPhase === "analyzing" && (
                <AnalysisLoader onComplete={handleLoaderComplete} />
              )}

              {uploadPhase === "error" && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col gap-4"
                >
                  <div
                    className="rounded-xl px-5 py-4"
                    style={{ backgroundColor: "#FDF2F2", borderRadius: 12 }}
                  >
                    <p
                      className="font-rethink text-sm font-medium"
                      style={{ color: "#C0392B" }}
                    >
                      {errorMessage}
                    </p>
                  </div>

                  <button
                    onClick={handleRetry}
                    className={cn(
                      "self-start rounded-xl border border-primary px-5 py-2.5",
                      "font-rethink text-sm font-medium text-primary",
                      "transition-colors hover:bg-primary/5",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    )}
                  >
                    Try Again
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Barcode lookup overlay ── */}
      <AnimatePresence>
        {isLookingUp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }}
                className="h-9 w-9 rounded-full border-[3px] border-primary border-t-transparent"
              />
              <p className="font-mono text-sm tracking-widest text-text-secondary">
                Looking up product…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
