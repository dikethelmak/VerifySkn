"use client";

import { create } from "zustand";
import type { ScanVerdict } from "@/lib/database.types";

export type ResultFilter = "all" | ScanVerdict;
export type ScanTypeFilter = "all" | "barcode" | "image" | "combined";

interface HistoryFiltersState {
  resultFilter: ResultFilter;
  scanType: ScanTypeFilter;
  setResultFilter: (f: ResultFilter) => void;
  setScanType: (t: ScanTypeFilter) => void;
  reset: () => void;
}

export const useHistoryFilters = create<HistoryFiltersState>((set) => ({
  resultFilter: "all",
  scanType: "all",
  setResultFilter: (resultFilter) => set({ resultFilter }),
  setScanType: (scanType) => set({ scanType }),
  reset: () => set({ resultFilter: "all", scanType: "all" }),
}));
