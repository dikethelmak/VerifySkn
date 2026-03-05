"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { ImageUp, X } from "lucide-react";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────

interface ImageUploaderProps {
  onImageReady: (base64: string, mimeType: string) => void;
  className?: string;
}

interface FileState {
  file: File;
  preview: string; // object URL for <img>
  base64: string;
}

// ── Helpers ───────────────────────────────────────────────────

const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data-URL prefix ("data:image/jpeg;base64,") → pure base64
      resolve(result.split(",")[1]);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// ── Component ─────────────────────────────────────────────────

export function ImageUploader({ onImageReady, className }: ImageUploaderProps) {
  const [fileState, setFileState] = useState<FileState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(async (accepted: File[]) => {
    setError(null);
    const file = accepted[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);

    try {
      const base64 = await readAsBase64(file);
      setFileState({ file, preview, base64 });
    } catch {
      setError("Failed to read file. Please try again.");
    }
  }, []);

  const handleRejection = useCallback(
    (rejections: { errors: { code: string }[] }[]) => {
      const code = rejections[0]?.errors[0]?.code;
      if (code === "file-too-large") {
        setError("File exceeds the 10 MB limit.");
      } else if (code === "file-invalid-type") {
        setError("Only JPEG, PNG, and WebP files are accepted.");
      } else {
        setError("Could not accept that file.");
      }
    },
    []
  );

  const handleRemove = useCallback(() => {
    if (fileState?.preview) URL.revokeObjectURL(fileState.preview);
    setFileState(null);
    setError(null);
  }, [fileState]);

  const handleAnalyse = useCallback(() => {
    if (!fileState) return;
    onImageReady(fileState.base64, fileState.file.type);
  }, [fileState, onImageReady]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDropAccepted: handleDrop,
    onDropRejected: handleRejection,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    multiple: false,
    disabled: !!fileState,
  });

  return (
    <div className={cn("w-full", className)}>
      <AnimatePresence mode="wait">
        {/* ── Idle / drag-over drop zone ──────────────────────── */}
        {!fileState && (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              {...getRootProps()}
              animate={{
                borderColor: isDragActive ? "#1A3C2E" : "#E5E2DD",
                backgroundColor: isDragActive ? "#F0F7F4" : "#FFFFFF",
              }}
              transition={{ duration: 0.15 }}
              style={{ borderRadius: 12, borderWidth: 2, borderStyle: "dashed" }}
              className="flex cursor-pointer flex-col items-center justify-center gap-3 px-6 py-12 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <input {...getInputProps()} />

              {/* Icon */}
              <motion.div
                animate={{ scale: isDragActive ? 1.12 : 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <ImageUp
                  size={36}
                  strokeWidth={1.5}
                  className={cn(
                    "transition-colors",
                    isDragActive ? "text-primary" : "text-text-secondary"
                  )}
                />
              </motion.div>

              {/* Primary label */}
              <p className="font-rethink text-base font-medium text-text-primary">
                {isDragActive ? "Drop your photo here" : "Drag your product photo here"}
              </p>

              {/* Secondary label */}
              <p className="font-rethink text-sm font-normal text-text-secondary">
                or click to browse
              </p>

              {/* Format hint */}
              <p className="font-mono text-xs text-text-secondary">
                JPEG · PNG · WebP · max 10 MB
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* ── Preview state ───────────────────────────────────── */}
        {fileState && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col gap-4"
          >
            {/* Image preview */}
            <div
              style={{ borderRadius: 12, borderWidth: 1, borderStyle: "solid", borderColor: "#E5E2DD" }}
              className="relative overflow-hidden bg-[#F7F5F2]"
            >
              {/* Remove button */}
              <button
                onClick={handleRemove}
                aria-label="Remove image"
                className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-text-secondary shadow-sm transition-colors hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X size={14} strokeWidth={2} />
              </button>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileState.preview}
                alt="Product packaging preview"
                className="h-64 w-full object-contain"
              />
            </div>

            {/* File meta + actions */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-text-primary">
                  {fileState.file.name}
                </p>
                <p className="font-mono text-xs text-text-secondary">
                  {formatBytes(fileState.file.size)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-4">
                <button
                  onClick={handleRemove}
                  className="font-rethink text-sm font-medium text-danger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-1"
                >
                  Remove
                </button>
                <Button variant="primary" size="md" onClick={handleAnalyse}>
                  Analyse Packaging
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error message ──────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-2 font-rethink text-sm text-danger"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
