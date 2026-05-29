-- ============================================================
-- Migration 010 — Product details columns
-- ============================================================

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS how_to_use            text,
  ADD COLUMN IF NOT EXISTS skin_type_suitability text,
  ADD COLUMN IF NOT EXISTS key_ingredients       text[];
