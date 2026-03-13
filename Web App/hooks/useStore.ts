import { create } from "zustand";

interface AppState {
  lastBarcode: string | null;
  setLastBarcode: (barcode: string) => void;
  clearLastBarcode: () => void;
}

export const useStore = create<AppState>((set) => ({
  lastBarcode: null,
  setLastBarcode: (barcode) => set({ lastBarcode: barcode }),
  clearLastBarcode: () => set({ lastBarcode: null }),
}));
