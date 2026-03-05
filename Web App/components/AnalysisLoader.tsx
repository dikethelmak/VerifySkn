"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────

const STEPS = [
  "Reading packaging structure…",
  "Checking font and print quality…",
  "Verifying logo accuracy…",
  "Cross-referencing brand standards…",
  "Generating authenticity verdict…",
] as const;

const STEP_DELAY_MS = 1500;
const COMPLETE_DELAY_MS = 8000; // safety-net timeout

// ── Scanning graphic ──────────────────────────────────────────

function ScanningGraphic() {
  return (
    <div className="mx-auto flex items-center justify-center py-2">
      <div className="relative" style={{ width: 80, height: 110 }}>
        <svg
          width="80"
          height="110"
          viewBox="0 0 80 110"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Package body */}
          <rect
            x="9" y="6" width="62" height="98" rx="6"
            stroke="#1A3C2E" strokeWidth="1.5" fill="none"
          />
          {/* Cap */}
          <rect
            x="29" y="2" width="22" height="8" rx="3"
            stroke="#1A3C2E" strokeWidth="1.5" fill="none"
          />
          {/* Label background */}
          <rect x="17" y="30" width="46" height="52" rx="3" fill="#F7F5F2" />
          {/* Brand name bar (accent gold) */}
          <rect x="23" y="38" width="34" height="5" rx="2.5" fill="#C9A84C" opacity="0.55" />
          {/* Simulated text lines */}
          <rect x="23" y="49" width="30" height="2.5" rx="1.5" fill="#1A3C2E" opacity="0.22" />
          <rect x="23" y="56" width="26" height="2.5" rx="1.5" fill="#1A3C2E" opacity="0.18" />
          <rect x="23" y="63" width="28" height="2.5" rx="1.5" fill="#1A3C2E" opacity="0.18" />
          <rect x="25" y="70" width="18" height="2.5" rx="1.5" fill="#1A3C2E" opacity="0.14" />
        </svg>

        {/* Animated scan line */}
        <motion.div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 9,
            width: 62,
            height: 2,
            borderRadius: 1,
            backgroundColor: "rgba(26, 60, 46, 0.6)",
            boxShadow: "0 0 8px rgba(26, 60, 46, 0.4)",
          }}
          animate={{ top: [6, 102, 6] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    </div>
  );
}

// ── Step row ──────────────────────────────────────────────────

interface StepRowProps {
  label: string;
  isActive: boolean;
  isCompleted: boolean;
  isVisible: boolean;
}

function StepRow({ label, isActive, isCompleted, isVisible }: StepRowProps) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -6 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Left indicator */}
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        <AnimatePresence mode="wait">
          {isCompleted ? (
            <motion.div
              key="check"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              <Check size={14} strokeWidth={2.5} className="text-success" />
            </motion.div>
          ) : isActive ? (
            <motion.div
              key="dot"
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.45, 1], opacity: [1, 0.55, 1] }}
              transition={{
                scale: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
                opacity: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
              }}
              className="h-2 w-2 rounded-full bg-primary"
            />
          ) : (
            <motion.div
              key="idle"
              className="h-1.5 w-1.5 rounded-full bg-border"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Label — framer-motion animates the color value directly */}
      <motion.span
        className="font-rethink text-sm"
        animate={{
          color: isActive ? "#141414" : "#6B6B6B",
        }}
        style={{ fontWeight: isActive ? 500 : 400 }}
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.span>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────

interface AnalysisLoaderProps {
  onComplete?: () => void;
}

export function AnalysisLoader({ onComplete }: AnalysisLoaderProps) {
  // activeStep: which step is currently highlighted
  // visibleUpTo: how many steps have faded in (steps 0..visibleUpTo-1 are shown)
  const [activeStep, setActiveStep] = useState(0);
  const [visibleUpTo, setVisibleUpTo] = useState(1); // step 0 visible immediately

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    STEPS.forEach((_, i) => {
      if (i === 0) return;
      const delay = i * STEP_DELAY_MS;
      // Fade in this step
      timers.push(setTimeout(() => setVisibleUpTo(i + 1), delay));
      // Make it active
      timers.push(setTimeout(() => setActiveStep(i), delay));
    });

    // Safety-net: call onComplete after all steps have displayed
    if (onComplete) {
      timers.push(setTimeout(onComplete, COMPLETE_DELAY_MS));
    }

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="mx-auto w-full max-w-[480px]">
      <div
        style={{
          borderRadius: 16,
          padding: 24,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
        }}
        className="flex flex-col gap-6"
      >
        <ScanningGraphic />

        {/* Progress steps */}
        <div className="flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <StepRow
              key={step}
              label={step}
              isActive={i === activeStep}
              isCompleted={i < activeStep}
              isVisible={i < visibleUpTo}
            />
          ))}
        </div>

        {/* Footer */}
        <p className="text-center font-mono text-[11px] text-text-secondary">
          Powered by Claude AI
        </p>
      </div>
    </div>
  );
}
