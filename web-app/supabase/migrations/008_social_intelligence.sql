-- 008_social_intelligence.sql
-- Learned visual patterns from crowdsourced social media intelligence

-- Learned visual markers extracted from social posts about fake products.
-- Each row is one reproducible tell (e.g. "font weight on 'CeraVe' logo is thinner
-- than authentic") discovered by AI analysis of community posts/images.
CREATE TABLE IF NOT EXISTS fake_visual_patterns (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand            text        NOT NULL,
  product_id       uuid        REFERENCES products(id) ON DELETE SET NULL,
  marker_type      text        NOT NULL
                               CHECK (marker_type IN
                                 ('font','logo','color','hologram','seal',
                                  'text','packaging','barcode','other')),
  description      text        NOT NULL,
  source_post_url  text,
  source_platform  text,
  ai_confidence    integer     DEFAULT 50 CHECK (ai_confidence BETWEEN 0 AND 100),
  occurrence_count integer     DEFAULT 1,
  last_seen        timestamptz DEFAULT now(),
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX fake_visual_patterns_brand_idx
  ON fake_visual_patterns(brand);
CREATE INDEX fake_visual_patterns_product_idx
  ON fake_visual_patterns(product_id)
  WHERE product_id IS NOT NULL;
-- Most common query: top patterns for a brand, ordered by frequency
CREATE INDEX fake_visual_patterns_brand_occ_idx
  ON fake_visual_patterns(brand, occurrence_count DESC);

-- Rolling fake-report counts per brand (and optionally per product).
-- Updated by the process-social cron job.
CREATE TABLE IF NOT EXISTS social_signal_summary (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  brand            text        NOT NULL,
  product_id       uuid        REFERENCES products(id) ON DELETE SET NULL,
  fake_reports_7d  integer     DEFAULT 0,
  fake_reports_30d integer     DEFAULT 0,
  fake_reports_90d integer     DEFAULT 0,
  total_reports    integer     DEFAULT 0,
  trending         boolean     DEFAULT false,
  last_updated     timestamptz DEFAULT now(),
  UNIQUE (brand, product_id)
);

CREATE INDEX social_signal_summary_brand_idx
  ON social_signal_summary(brand);
CREATE INDEX social_signal_summary_trending_idx
  ON social_signal_summary(trending)
  WHERE trending = true;
