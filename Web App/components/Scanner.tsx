"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────

type ScanState =
  | "permission-pending"
  | "permission-denied"
  | "scanning"
  | "detected";

export interface ScannerProps {
  onScan: (barcode: string) => void;
  className?: string;
}

// ── Constants ────────────────────────────────────────────────

const PRIMARY = "#1A3C2E";
const SUCCESS = "#2D7A4F";

// ── Scanner ──────────────────────────────────────────────────

export function Scanner({ onScan, className }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<{ reset: () => void } | null>(null);
  // Stable ref so the zxing callback always calls the latest onScan
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const hasDetectedRef = useRef(false);
  const [scanState, setScanState] = useState<ScanState>("permission-pending");
  const [manualInput, setManualInput] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!videoRef.current) return;

      try {
        const { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } =
          await import("@zxing/library");

        if (cancelled) return;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.UPC_A,
        ]);

        const reader = new BrowserMultiFormatReader(hints);
        readerRef.current = reader;

        // decodeFromVideoDevice resolves once the video stream starts playing.
        // The callback fires on every decoded frame thereafter.
        await reader.decodeFromVideoDevice(
          undefined, // null → use default camera
          videoRef.current,
          (result) => {
            if (result && !hasDetectedRef.current) {
              hasDetectedRef.current = true;
              setScanState("detected");
              reader.reset();
              // Brief green-flash window before handing off
              setTimeout(() => onScanRef.current(result.getText()), 700);
            }
          }
        );

        if (!cancelled) setScanState("scanning");
      } catch (err: unknown) {
        if (cancelled) return;
        const error = err as Error;
        if (
          error.name === "NotAllowedError" ||
          error.name === "NotFoundError" ||
          error.name === "OverconstrainedError"
        ) {
          setScanState("permission-denied");
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      readerRef.current?.reset();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualInput.trim();
    if (trimmed) {
      onScanRef.current(trimmed);
      setManualInput("");
    }
  };

  return (
    <div className={cn("flex w-full flex-col items-center gap-5", className)}>
      {/* ── Camera viewport ── */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-neutral-950 aspect-[4/3]">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          playsInline
          muted
        />

        <AnimatePresence mode="wait">
          {scanState === "permission-pending" && (
            <PermissionPending key="pending" />
          )}
          {scanState === "permission-denied" && (
            <PermissionDenied key="denied" />
          )}
          {(scanState === "scanning" || scanState === "detected") && (
            <ScanOverlay key="overlay" state={scanState} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Status label (Space Mono) ── */}
      <AnimatePresence mode="wait">
        {scanState === "permission-pending" && (
          <StatusLabel key="s-pending" color="text-text-secondary">
            Requesting camera access…
          </StatusLabel>
        )}
        {scanState === "scanning" && (
          <StatusLabel key="s-scanning" color="text-text-secondary">
            Scanning for products…
          </StatusLabel>
        )}
        {scanState === "detected" && (
          <StatusLabel key="s-detected" color="text-[#2D7A4F]">
            Barcode detected ✓
          </StatusLabel>
        )}
      </AnimatePresence>

      {/* ── Manual entry fallback ── */}
      <ManualEntry
        value={manualInput}
        onChange={setManualInput}
        onSubmit={handleManualSubmit}
      />
    </div>
  );
}

// ── ScanOverlay ──────────────────────────────────────────────

function ScanOverlay({ state }: { state: "scanning" | "detected" }) {
  const detected = state === "detected";
  const frameColor = detected ? SUCCESS : PRIMARY;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center"
    >
      {/* Top + bottom vignette bars */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 28%, transparent 72%, rgba(0,0,0,0.45) 100%)",
        }}
      />

      {/* Scan frame — pulses while scanning */}
      <motion.div
        className="relative h-52 w-52"
        animate={!detected ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
        transition={
          !detected
            ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.25 }
        }
      >
        {/* Corner brackets */}
        {(["tl", "tr", "bl", "br"] as const).map((pos) => (
          <motion.div
            key={pos}
            className="absolute h-9 w-9"
            animate={{ borderColor: frameColor }}
            transition={{ duration: 0.3 }}
            style={cornerStyle(pos, frameColor)}
          />
        ))}

        {/* Animated scan line — hidden once detected */}
        {!detected && (
          <motion.div
            aria-hidden
            className="absolute left-3 right-3 h-px"
            style={{ backgroundColor: PRIMARY, opacity: 0.65 }}
            animate={{ top: ["8%", "92%", "8%"] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Green success flash */}
        <AnimatePresence>
          {detected && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-sm"
              style={{ backgroundColor: `${SUCCESS}2E` }} // ~18% alpha
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

type Corner = "tl" | "tr" | "bl" | "br";

function cornerStyle(pos: Corner, color: string): React.CSSProperties {
  const base: React.CSSProperties = {
    borderStyle: "solid",
    borderColor: color,
    borderWidth: 0,
    position: "absolute",
  };
  switch (pos) {
    case "tl":
      return {
        ...base,
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderRadius: "5px 0 0 0",
      };
    case "tr":
      return {
        ...base,
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderRadius: "0 5px 0 0",
      };
    case "bl":
      return {
        ...base,
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderRadius: "0 0 0 5px",
      };
    case "br":
      return {
        ...base,
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderRadius: "0 0 5px 0",
      };
  }
}

// ── Permission overlays ──────────────────────────────────────

function PermissionPending() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-neutral-950/80 px-8 text-center"
    >
      <CameraIcon className="h-12 w-12 text-primary/70" />
      <p className="font-rethink text-sm leading-relaxed text-white/70">
        Allow camera access to start scanning
      </p>
    </motion.div>
  );
}

function PermissionDenied() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-neutral-950/90 px-8 text-center"
    >
      <CameraBlockedIcon className="h-12 w-12 text-danger/80" />
      <p className="font-rethink text-sm leading-relaxed text-white/75">
        Camera access is needed to scan products. Please allow access in your
        browser settings.
      </p>
    </motion.div>
  );
}

// ── Status label ─────────────────────────────────────────────

function StatusLabel({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2 }}
      className={cn("font-mono text-xs tracking-widest", color)}
    >
      {children}
    </motion.p>
  );
}

// ── Manual entry ─────────────────────────────────────────────

interface ManualEntryProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

function ManualEntry({ value, onChange, onSubmit }: ManualEntryProps) {
  return (
    <div className="w-full max-w-sm">
      <p className="mb-2.5 font-rethink text-sm text-text-secondary">
        Or enter barcode manually
      </p>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 3606000534032"
          className={cn(
            "flex-1 rounded-lg border bg-surface px-4 py-2.5",
            "font-mono text-sm text-text-primary",
            "placeholder:text-text-secondary/40",
            "outline-none transition-all duration-150",
            "border-border focus:border-primary focus:ring-2 focus:ring-primary/20"
          )}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className={cn(
            "rounded-lg bg-primary px-5 py-2.5",
            "font-rethink text-sm font-medium text-white",
            "transition-colors hover:bg-primary/90 active:scale-[0.97]",
            "disabled:pointer-events-none disabled:opacity-40"
          )}
        >
          Submit
        </button>
      </form>
    </div>
  );
}

// ── Icons (inline SVG — no icon library needed) ──────────────

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
      />
    </svg>
  );
}

function CameraBlockedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18"
      />
    </svg>
  );
}
