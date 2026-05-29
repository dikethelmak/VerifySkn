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
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
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
          how_to_use: string | null;
          skin_type_suitability: string | null;
          key_ingredients: string[] | null;
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
          how_to_use?: string | null;
          skin_type_suitability?: string | null;
          key_ingredients?: string[] | null;
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
          how_to_use?: string | null;
          skin_type_suitability?: string | null;
          key_ingredients?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scan_logs: {
        Row: {
          id: string;
          barcode_scanned: string;
          product_id: string | null;
          user_id: string | null;
          result: ScanVerdict;
          confidence_score: number;
          user_agent: string | null;
          scanned_at: string;
        };
        Insert: {
          id?: string;
          barcode_scanned: string;
          product_id?: string | null;
          user_id?: string | null;
          result: ScanVerdict;
          confidence_score: number;
          user_agent?: string | null;
          scanned_at?: string;
        };
        Update: {
          id?: string;
          barcode_scanned?: string;
          product_id?: string | null;
          user_id?: string | null;
          result?: ScanVerdict;
          confidence_score?: number;
          user_agent?: string | null;
          scanned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scan_logs_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
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
        Relationships: [];
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
          // Added by risk_mitigation_tables.sql
          session_id: string | null;
          cache_key: string | null;
          provider: string | null;
          packaging_checks: Json | null;
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
          session_id?: string | null;
          cache_key?: string | null;
          provider?: string | null;
          packaging_checks?: Json | null;
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
          session_id?: string | null;
          cache_key?: string | null;
          provider?: string | null;
          packaging_checks?: Json | null;
        };
        Relationships: [];
      };
      brand_submissions: {
        Row: {
          id: string;
          submitted_by: string;
          brand_id: string;
          product_name: string;
          barcode: string;
          category: string;
          size_ml: number | null;
          authenticated_retailers: string[];
          packaging_notes: string;
          status: "pending" | "approved" | "rejected";
          admin_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          submitted_by: string;
          brand_id: string;
          product_name: string;
          barcode: string;
          category: string;
          size_ml?: number | null;
          authenticated_retailers?: string[];
          packaging_notes?: string;
          status?: "pending" | "approved" | "rejected";
          admin_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          submitted_by?: string;
          brand_id?: string;
          product_name?: string;
          barcode?: string;
          category?: string;
          size_ml?: number | null;
          authenticated_retailers?: string[];
          packaging_notes?: string;
          status?: "pending" | "approved" | "rejected";
          admin_notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string | null;
          barcode: string;
          product_id: string | null;
          report_type: "counterfeit" | "mislabelled" | "wrong_info" | "other";
          purchase_location: string;
          purchase_country: string;
          description: string;
          image_urls: string[];
          status: "pending" | "reviewed" | "confirmed" | "dismissed";
          admin_notes: string | null;
          upvotes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id?: string | null;
          barcode: string;
          product_id?: string | null;
          report_type: "counterfeit" | "mislabelled" | "wrong_info" | "other";
          purchase_location: string;
          purchase_country: string;
          description: string;
          image_urls?: string[];
          status?: "pending" | "reviewed" | "confirmed" | "dismissed";
          admin_notes?: string | null;
          upvotes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string | null;
          barcode?: string;
          product_id?: string | null;
          report_type?: "counterfeit" | "mislabelled" | "wrong_info" | "other";
          purchase_location?: string;
          purchase_country?: string;
          description?: string;
          image_urls?: string[];
          status?: "pending" | "reviewed" | "confirmed" | "dismissed";
          admin_notes?: string | null;
          upvotes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      report_upvotes: {
        Row: {
          id: string;
          report_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          report_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_upvotes_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: "user" | "brand_rep" | "admin";
          verified_brand_id: string | null;
          scan_count: number;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: "user" | "brand_rep" | "admin";
          verified_brand_id?: string | null;
          scan_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: "user" | "brand_rep" | "admin";
          verified_brand_id?: string | null;
          scan_count?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id:         string;
          user_id:    string;
          type:       "report_update" | "upvote" | "product_verified" | "submission_approved" | "admin_alert";
          title:      string;
          message:    string;
          read:       boolean;
          link:       string | null;
          created_at: string;
        };
        Insert: {
          id?:         string;
          user_id:     string;
          type:        "report_update" | "upvote" | "product_verified" | "submission_approved" | "admin_alert";
          title:       string;
          message:     string;
          read?:       boolean;
          link?:       string | null;
          created_at?: string;
        };
        Update: {
          id?:         string;
          user_id?:    string;
          type?:       "report_update" | "upvote" | "product_verified" | "submission_approved" | "admin_alert";
          title?:      string;
          message?:    string;
          read?:       boolean;
          link?:       string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      scan_logs_archive: {
        Row: {
          id: string;
          barcode_scanned: string;
          product_id: string | null;
          user_id: string | null;
          result: ScanVerdict;
          confidence_score: number;
          user_agent: string | null;
          scanned_at: string;
          archived_at: string;
        };
        Insert: {
          id?: string;
          barcode_scanned: string;
          product_id?: string | null;
          user_id?: string | null;
          result: ScanVerdict;
          confidence_score: number;
          user_agent?: string | null;
          scanned_at?: string;
          archived_at: string;
        };
        Update: {
          id?: string;
          barcode_scanned?: string;
          product_id?: string | null;
          user_id?: string | null;
          result?: ScanVerdict;
          confidence_score?: number;
          user_agent?: string | null;
          scanned_at?: string;
          archived_at?: string;
        };
        Relationships: [];
      };
      scrape_jobs: {
        Row: {
          id: string;
          job_type: string;
          status: string;
          started_at: string;
          completed_at: string | null;
          metadata: Json;
        };
        Insert: {
          id: string;
          job_type: string;
          status: string;
          started_at: string;
          completed_at?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          job_type?: string;
          status?: string;
          started_at?: string;
          completed_at?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      scrape_job_checkpoints: {
        Row: {
          job_id: string;
          completed_brands: string[];
        };
        Insert: {
          job_id: string;
          completed_brands?: string[];
        };
        Update: {
          job_id?: string;
          completed_brands?: string[];
        };
        Relationships: [];
      };
      social_intelligence_cache: {
        Row: {
          id: string;
          brand: string;
          platform: string;
          post_url: string;
          content: string;
          image_urls: string[];
          engagement_score: number | null;
          posted_at: string | null;
          processed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          brand: string;
          platform: string;
          post_url: string;
          content: string;
          image_urls?: string[];
          engagement_score?: number | null;
          posted_at?: string | null;
          processed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          brand?: string;
          platform?: string;
          post_url?: string;
          content?: string;
          image_urls?: string[];
          engagement_score?: number | null;
          posted_at?: string | null;
          processed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      fake_visual_patterns: {
        Row: {
          id:               string;
          brand:            string;
          product_id:       string | null;
          marker_type:      'font' | 'logo' | 'color' | 'hologram' | 'seal' | 'text' | 'packaging' | 'barcode' | 'other';
          description:      string;
          source_post_url:  string | null;
          source_platform:  string | null;
          ai_confidence:    number;
          occurrence_count: number;
          last_seen:        string;
          created_at:       string;
        };
        Insert: {
          id?:              string;
          brand:            string;
          product_id?:      string | null;
          marker_type:      'font' | 'logo' | 'color' | 'hologram' | 'seal' | 'text' | 'packaging' | 'barcode' | 'other';
          description:      string;
          source_post_url?: string | null;
          source_platform?: string | null;
          ai_confidence?:   number;
          occurrence_count?: number;
          last_seen?:       string;
          created_at?:      string;
        };
        Update: {
          id?:              string;
          brand?:           string;
          product_id?:      string | null;
          marker_type?:     'font' | 'logo' | 'color' | 'hologram' | 'seal' | 'text' | 'packaging' | 'barcode' | 'other';
          description?:     string;
          source_post_url?: string | null;
          source_platform?: string | null;
          ai_confidence?:   number;
          occurrence_count?: number;
          last_seen?:       string;
          created_at?:      string;
        };
        Relationships: [];
      };
      social_signal_summary: {
        Row: {
          id:               string;
          brand:            string;
          product_id:       string | null;
          fake_reports_7d:  number;
          fake_reports_30d: number;
          fake_reports_90d: number;
          total_reports:    number;
          trending:         boolean;
          last_updated:     string;
        };
        Insert: {
          id?:               string;
          brand:             string;
          product_id?:       string | null;
          fake_reports_7d?:  number;
          fake_reports_30d?: number;
          fake_reports_90d?: number;
          total_reports?:    number;
          trending?:         boolean;
          last_updated?:     string;
        };
        Update: {
          id?:               string;
          brand?:            string;
          product_id?:       string | null;
          fake_reports_7d?:  number;
          fake_reports_30d?: number;
          fake_reports_90d?: number;
          total_reports?:    number;
          trending?:         boolean;
          last_updated?:     string;
        };
        Relationships: [];
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
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_vision_counter: {
        Args: { p_date: string };
        Returns: number;
      };
      increment_api_counter: {
        Args: { p_service: string; p_date: string };
        Returns: number;
      };
      get_admin_users: {
        Args: Record<string, never>;
        Returns: { id: string; email: string; full_name: string | null; role: string }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
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

export type BrandSubmission       = Database["public"]["Tables"]["brand_submissions"]["Row"];
export type BrandSubmissionInsert = Database["public"]["Tables"]["brand_submissions"]["Insert"];

export type Report         = Database["public"]["Tables"]["reports"]["Row"];
export type ReportInsert   = Database["public"]["Tables"]["reports"]["Insert"];
export type ReportUpvote   = Database["public"]["Tables"]["report_upvotes"]["Row"];

export type Profile       = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type AppNotification = Database["public"]["Tables"]["notifications"]["Row"];

export type FakeVisualPattern =
  Database["public"]["Tables"]["fake_visual_patterns"]["Row"];
export type FakeVisualPatternInsert =
  Database["public"]["Tables"]["fake_visual_patterns"]["Insert"];

export type SocialSignalSummary =
  Database["public"]["Tables"]["social_signal_summary"]["Row"];
export type SocialSignalSummaryInsert =
  Database["public"]["Tables"]["social_signal_summary"]["Insert"];

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
