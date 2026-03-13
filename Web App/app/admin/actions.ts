"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase";

const ADMIN_PATH = "/admin";

// ── Auth helper ───────────────────────────────────────────────

async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if ((profile as { role: string } | null)?.role !== "admin")
    throw new Error("Forbidden");

  return supabase;
}

// ── Product actions ───────────────────────────────────────────

export async function updateProductAction(
  id: string,
  fields: {
    name?: string;
    barcode?: string;
    brand?: string;
    category?: string;
    size_ml?: number | null;
    country_of_manufacture?: string;
    packaging_notes?: string | null;
    authenticated_retailers?: string[];
  }
) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("products").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

export async function deleteProductAction(id: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

export async function insertProductAction(fields: {
  name: string;
  barcode: string;
  brand: string;
  category: string;
  size_ml?: number | null;
  country_of_manufacture: string;
  packaging_notes?: string | null;
  authenticated_retailers?: string[];
}) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("products").insert(fields);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

// ── Report actions ────────────────────────────────────────────

export async function updateReportAction(
  id: string,
  status: "pending" | "reviewed" | "confirmed" | "dismissed",
  adminNotes?: string
) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("reports")
    .update({ status, admin_notes: adminNotes ?? null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

// ── Brand actions ─────────────────────────────────────────────

export async function updateBrandVerifiedAction(
  id: string,
  verified: boolean
) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("brands")
    .update({ verified })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

export async function insertBrandAction(fields: {
  name: string;
  website?: string | null;
  logo_url?: string | null;
}) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("brands")
    .insert({ ...fields, verified: false });
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

// ── Submission actions ────────────────────────────────────────

export async function approveSubmissionAction(submissionId: string) {
  const supabase = await requireAdmin();

  // Fetch submission details
  const { data: rawSub, error: subErr } = await supabase
    .from("brand_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();
  if (subErr || !rawSub) throw new Error("Submission not found");
  const sub = rawSub as {
    brand_id: string;
    product_name: string;
    barcode: string;
    category: string;
    size_ml: number | null;
    authenticated_retailers: string[];
    packaging_notes: string;
  };

  // Look up brand name
  const { data: rawBrand } = await supabase
    .from("brands")
    .select("name")
    .eq("id", sub.brand_id)
    .single();
  const brandName = (rawBrand as { name: string } | null)?.name ?? "Unknown Brand";

  // Insert into products
  const { error: insertErr } = await supabase.from("products").insert({
    name: sub.product_name,
    barcode: sub.barcode,
    brand: brandName,
    category: sub.category,
    size_ml: sub.size_ml,
    country_of_manufacture: "Unknown",
    authenticated_retailers: sub.authenticated_retailers,
    packaging_notes: sub.packaging_notes,
  });
  if (insertErr) throw new Error(insertErr.message);

  // Mark approved
  const { error: updateErr } = await supabase
    .from("brand_submissions")
    .update({ status: "approved" })
    .eq("id", submissionId);
  if (updateErr) throw new Error(updateErr.message);

  revalidatePath(ADMIN_PATH);
}

export async function rejectSubmissionAction(
  submissionId: string,
  note: string
) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("brand_submissions")
    .update({ status: "rejected", admin_notes: note })
    .eq("id", submissionId);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}

// ── User actions ──────────────────────────────────────────────

export async function updateUserRoleAction(
  userId: string,
  role: "user" | "brand_rep" | "admin"
) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath(ADMIN_PATH);
}
