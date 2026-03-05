// Auto-generated shape — keep in sync with supabase/migrations/
// Regenerate with: npx supabase gen types typescript --linked > lib/database.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          barcode: string;
          name: string;
          brand: string;
          category: string;
          size_ml: number | null;
          country_of_manufacture: string;
          authenticated_retailers: string[];
          packaging_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          barcode: string;
          name: string;
          brand: string;
          category: string;
          size_ml?: number | null;
          country_of_manufacture: string;
          authenticated_retailers?: string[];
          packaging_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          barcode?: string;
          name?: string;
          brand?: string;
          category?: string;
          size_ml?: number | null;
          country_of_manufacture?: string;
          authenticated_retailers?: string[];
          packaging_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      scan_logs: {
        Row: {
          id: string;
          barcode_scanned: string;
          product_id: string | null;
          result: ScanVerdict;
          confidence_score: number;
          user_agent: string | null;
          scanned_at: string;
        };
        Insert: {
          id?: string;
          barcode_scanned: string;
          product_id?: string | null;
          result: ScanVerdict;
          confidence_score: number;
          user_agent?: string | null;
          scanned_at?: string;
        };
        Update: {
          id?: string;
          barcode_scanned?: string;
          product_id?: string | null;
          result?: ScanVerdict;
          confidence_score?: number;
          user_agent?: string | null;
          scanned_at?: string;
        };
      };
      brands: {
        Row: {
          id: string;
          name: string;
          verified: boolean;
          website: string | null;
          logo_url: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          verified?: boolean;
          website?: string | null;
          logo_url?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          verified?: boolean;
          website?: string | null;
          logo_url?: string | null;
        };
      };
      image_analyses: {
        Row: {
          id: string;
          scan_log_id: string | null;
          image_url: string | null;
          result: ScanVerdict;
          confidence: number;
          flags: string[];
          summary: string;
          font_quality: string;
          logo_accuracy: string;
          print_quality: string;
          label_alignment: string;
          spelling_check: string;
          hologram_check: string;
          analysed_at: string;
        };
        Insert: {
          id?: string;
          scan_log_id?: string | null;
          image_url?: string | null;
          result: ScanVerdict;
          confidence: number;
          flags?: string[];
          summary?: string;
          font_quality?: string;
          logo_accuracy?: string;
          print_quality?: string;
          label_alignment?: string;
          spelling_check?: string;
          hologram_check?: string;
          analysed_at?: string;
        };
        Update: {
          id?: string;
          scan_log_id?: string | null;
          image_url?: string | null;
          result?: ScanVerdict;
          confidence?: number;
          flags?: string[];
          summary?: string;
          font_quality?: string;
          logo_accuracy?: string;
          print_quality?: string;
          label_alignment?: string;
          spelling_check?: string;
          hologram_check?: string;
          analysed_at?: string;
        };
      };
      combined_results: {
        Row: {
          id: string;
          session_id: string;
          barcode_result: ScanVerdict | null;
          barcode_confidence: number | null;
          image_result: ScanVerdict | null;
          image_confidence: number | null;
          final_result: ScanVerdict;
          final_confidence: number;
          product_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          barcode_result?: ScanVerdict | null;
          barcode_confidence?: number | null;
          image_result?: ScanVerdict | null;
          image_confidence?: number | null;
          final_result: ScanVerdict;
          final_confidence: number;
          product_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          barcode_result?: ScanVerdict | null;
          barcode_confidence?: number | null;
          image_result?: ScanVerdict | null;
          image_confidence?: number | null;
          final_result?: ScanVerdict;
          final_confidence?: number;
          product_id?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

// ── Convenience aliases ──────────────────────────────────────
export type ScanVerdict = "authentic" | "suspicious" | "unverified";

export type Product    = Database["public"]["Tables"]["products"]["Row"];
export type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];

export type ScanLog       = Database["public"]["Tables"]["scan_logs"]["Row"];
export type ScanLogInsert = Database["public"]["Tables"]["scan_logs"]["Insert"];

export type Brand = Database["public"]["Tables"]["brands"]["Row"];

export type ImageAnalysis =
  Database["public"]["Tables"]["image_analyses"]["Row"];
export type ImageAnalysisInsert =
  Database["public"]["Tables"]["image_analyses"]["Insert"];

export type CombinedResult =
  Database["public"]["Tables"]["combined_results"]["Row"];
export type CombinedResultInsert =
  Database["public"]["Tables"]["combined_results"]["Insert"];

export interface DashboardStats {
  totalProducts: number;
  totalScans: number;
  todayScans: number;
  totalImageAnalyses: number;
  breakdown: {
    authentic: number;
    suspicious: number;
    unverified: number;
  };
}
