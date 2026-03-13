-- ============================================================
-- VerifySkn — Seed Data (Phase 1)
-- 12 brands · 28 products across 6 categories
-- EAN-13 barcodes sourced from open product databases.
-- Cross-reference at: https://www.barcodelookup.com
-- ============================================================

-- ── brands ──────────────────────────────────────────────────
INSERT INTO brands (name, verified, website) VALUES
  ('CeraVe',          true,  'https://www.cerave.com'),
  ('The Ordinary',    true,  'https://theordinary.com'),
  ('La Roche-Posay',  true,  'https://www.laroche-posay.co.uk'),
  ('Neutrogena',      true,  'https://www.neutrogena.co.uk'),
  ('Cetaphil',        true,  'https://www.cetaphil.co.uk'),
  ('Paula''s Choice', true,  'https://www.paulaschoice.co.uk'),
  ('The INKEY List',  true,  'https://www.theinkeylist.com'),
  ('Kiehl''s',        true,  'https://www.kiehls.co.uk'),
  ('Eucerin',         true,  'https://www.eucerin.co.uk'),
  ('Bioderma',        true,  'https://uk.bioderma.com'),
  ('Vichy',           true,  'https://www.vichy.co.uk'),
  ('COSRX',           true,  'https://www.cosrx.com')
ON CONFLICT (name) DO NOTHING;

-- ── products ─────────────────────────────────────────────────
INSERT INTO products (
  barcode, name, brand, category,
  size_ml, country_of_manufacture,
  authenticated_retailers, packaging_notes
) VALUES

-- ── CeraVe ──────────────────────────────────────────────────
(
  '3606000534032',
  'CeraVe Moisturising Cream',
  'CeraVe', 'moisturiser', 250, 'United States',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'LOOKFANTASTIC', 'Cult Beauty'],
  'White tub with blue lid. Batch code embossed on base. Holographic seal under lid on genuine products.'
),
(
  '3606000534179',
  'CeraVe Hydrating Facial Cleanser',
  'CeraVe', 'cleanser', 236, 'United States',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'LOOKFANTASTIC'],
  'Pump-top bottle. Batch code printed on bottom label. Font should be crisp and evenly spaced.'
),
(
  '3606000534223',
  'CeraVe Foaming Facial Cleanser',
  'CeraVe', 'cleanser', 355, 'United States',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'LOOKFANTASTIC', 'Walmart'],
  'Teal pump bottle. Batch code on base. Genuine has matte-finish label — glossy finish indicates fake.'
),
(
  '3606000534346',
  'CeraVe AM Facial Moisturising Lotion SPF 25',
  'CeraVe', 'SPF', 52, 'United States',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'iHerb'],
  'White pump bottle with yellow SPF band. Check SPF rating print clarity — blurring is a red flag.'
),

-- ── The Ordinary ────────────────────────────────────────────
(
  '769915190082',
  'The Ordinary Niacinamide 10% + Zinc 1%',
  'The Ordinary', 'serum', 30, 'Canada',
  ARRAY['ASOS', 'Cult Beauty', 'LOOKFANTASTIC', 'Amazon UK', 'Boots'],
  'Minimalist dropper bottle. Batch code on base. Deciem hologram sticker on box — peel test advised.'
),
(
  '769915190136',
  'The Ordinary Hyaluronic Acid 2% + B5',
  'The Ordinary', 'serum', 30, 'Canada',
  ARRAY['ASOS', 'Cult Beauty', 'LOOKFANTASTIC', 'Amazon UK', 'Boots'],
  'Clear dropper bottle. Identical font weight throughout label — weight variation indicates counterfeit.'
),
(
  '769915190228',
  'The Ordinary Retinol 0.5% in Squalane',
  'The Ordinary', 'serum', 30, 'Canada',
  ARRAY['ASOS', 'Cult Beauty', 'LOOKFANTASTIC', 'Sephora'],
  'Dark amber dropper. Light-sensitive product — box should show no light exposure damage on genuine.'
),
(
  '769915190310',
  'The Ordinary AHA 30% + BHA 2% Peeling Solution',
  'The Ordinary', 'treatment', 30, 'Canada',
  ARRAY['Cult Beauty', 'LOOKFANTASTIC', 'Sephora', 'Ulta'],
  'Red liquid, clear bottle. Safety seal on cap must be intact. Heavily counterfeited — buy from authorised only.'
),

-- ── La Roche-Posay ──────────────────────────────────────────
(
  '3337875520528',
  'La Roche-Posay Effaclar Duo+',
  'La Roche-Posay', 'moisturiser', 40, 'France',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'LRP Official Site'],
  'Pump tube. Made in France stamped on crimp. Batch code on base — 6 alphanumeric chars.'
),
(
  '3337872413422',
  'La Roche-Posay Toleriane Hydrating Gentle Cleanser',
  'La Roche-Posay', 'cleanser', 400, 'France',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'Dermalogica'],
  'White pump bottle. LRP logo embossed on pump head. Check bottom seam — genuine seam is clean.'
),
(
  '3337875595891',
  'La Roche-Posay Anthelios UVMune 400 SPF 50+',
  'La Roche-Posay', 'SPF', 50, 'France',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'LRP Official Site', 'Lookfantastic'],
  'Fluid texture, white tube. EU SPF 50+ certification mark must be present. Heavily checked at retail.'
),

-- ── Neutrogena ──────────────────────────────────────────────
(
  '0070501117032',
  'Neutrogena Hydro Boost Water Gel',
  'Neutrogena', 'moisturiser', 50, 'United States',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'Walmart', 'Target'],
  'Blue tub. Gel texture visible through clear lid. Batch code on tub base embossed — not printed.'
),
(
  '0070501040421',
  'Neutrogena Ultra Sheer Dry-Touch SPF 50+',
  'Neutrogena', 'SPF', 88, 'United States',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'iHerb', 'Walmart'],
  'Yellow flip-top tube. Active ingredients list must include Helioplex. Check crimp seal integrity.'
),

-- ── Cetaphil ────────────────────────────────────────────────
(
  '0302993934051',
  'Cetaphil Gentle Skin Cleanser',
  'Cetaphil', 'cleanser', 500, 'Canada',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'Costco', 'LOOKFANTASTIC'],
  'Pump bottle. Galderma branding under label. Batch code + expiry printed on base label.'
),
(
  '0302993935058',
  'Cetaphil Moisturising Cream',
  'Cetaphil', 'moisturiser', 250, 'Canada',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'Costco'],
  'White tub. Galderma logo embossed on underside. Net weight must match stated 250g — lightweight tub is a flag.'
),

-- ── Paula's Choice ──────────────────────────────────────────
(
  '0670367008386',
  'Paula''s Choice 2% BHA Liquid Exfoliant',
  'Paula''s Choice', 'treatment', 118, 'United States',
  ARRAY['Paula''s Choice Official', 'Cult Beauty', 'LOOKFANTASTIC', 'Sephora'],
  'Clear bottle with flip-top. Sold almost exclusively direct — third-party sellers often flagged. Check batch at checkfresh.com.'
),
(
  '0670367935972',
  'Paula''s Choice 10% Niacinamide Booster',
  'Paula''s Choice', 'serum', 20, 'United States',
  ARRAY['Paula''s Choice Official', 'Cult Beauty', 'LOOKFANTASTIC'],
  'Frosted dropper bottle. Pipette should be firm — soft pipette indicates age or heat damage.'
),

-- ── The INKEY List ──────────────────────────────────────────
(
  '5060540370069',
  'The INKEY List Retinol Serum',
  'The INKEY List', 'serum', 30, 'United Kingdom',
  ARRAY['Sephora', 'ASOS', 'Cult Beauty', 'LOOKFANTASTIC', 'Boots'],
  'White tube with minimalist label. UK brand — Made in UK mark expected. Batch on tube crimp.'
),
(
  '5060540370458',
  'The INKEY List Hyaluronic Acid Serum',
  'The INKEY List', 'serum', 30, 'United Kingdom',
  ARRAY['Sephora', 'ASOS', 'Cult Beauty', 'LOOKFANTASTIC', 'Boots'],
  'Clear serum, simple pump bottle. INKEY List stamp on pump base. Full ingredient list should be legible.'
),

-- ── Kiehl's ─────────────────────────────────────────────────
(
  '3605972701978',
  'Kiehl''s Ultra Facial Cream',
  'Kiehl''s', 'moisturiser', 50, 'United States',
  ARRAY['Kiehl''s Official', 'John Lewis', 'Selfridges', 'Harvey Nichols', 'Amazon UK'],
  'White pot with black lid. L''Oréal owned — check L''Oréal batch validator. Embossed "Kiehl''s Since 1851" on lid.'
),
(
  '3605972260161',
  'Kiehl''s Clearly Corrective Dark Spot Solution',
  'Kiehl''s', 'serum', 30, 'United States',
  ARRAY['Kiehl''s Official', 'John Lewis', 'Selfridges', 'Sephora'],
  'White dropper bottle. Dropper tip should be glass — plastic tip indicates counterfeit.'
),

-- ── Eucerin ─────────────────────────────────────────────────
(
  '4005800198472',
  'Eucerin Q10 Anti-Wrinkle Face Cream',
  'Eucerin', 'moisturiser', 50, 'Germany',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'Eucerin Official'],
  'Blue and white pot. Beiersdorf AG manufacture. "Made in Germany" on base. Batch code 6–8 chars.'
),
(
  '4005800025952',
  'Eucerin UltraSENSITIVE Cleansing Lotion',
  'Eucerin', 'cleanser', 200, 'Germany',
  ARRAY['Boots', 'Amazon UK', 'Eucerin Official'],
  'White pump bottle. Batch and expiry on base. Beiersdorf lot codes begin with two letters.'
),

-- ── Bioderma ────────────────────────────────────────────────
(
  '3401399642457',
  'Bioderma Sensibio H2O Micellar Water',
  'Bioderma', 'cleanser', 500, 'France',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'LOOKFANTASTIC', 'Sephora'],
  'Pink cap bottle. Most counterfeited Bioderma product. Check inside cap — genuine has a raised cross mould mark.'
),
(
  '3401360222134',
  'Bioderma Sebium Pore Refiner',
  'Bioderma', 'treatment', 30, 'France',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'Bioderma Official'],
  'White tube. "Laboratoires NAOS" on crimp. Batch code stamped not printed.'
),

-- ── Vichy ───────────────────────────────────────────────────
(
  '3337875542117',
  'Vichy Minéral 89 Hyaluronic Acid Serum',
  'Vichy', 'serum', 50, 'France',
  ARRAY['Boots', 'Amazon UK', 'LOOKFANTASTIC', 'Vichy Official', 'Superdrug'],
  'Blue bottle with white dropper. L''Oréal batch validator applies. "Thermal Water" text should not smear.'
),
(
  '3337875642087',
  'Vichy LiftActiv Supreme Anti-Ageing Cream',
  'Vichy', 'moisturiser', 50, 'France',
  ARRAY['Boots', 'Superdrug', 'Amazon UK', 'Vichy Official'],
  'White jar with blue lid. Seal sticker on base of jar must be intact on first open.'
),

-- ── COSRX ───────────────────────────────────────────────────
(
  '8809416470818',
  'COSRX Advanced Snail 96 Mucin Power Essence',
  'COSRX', 'serum', 100, 'South Korea',
  ARRAY['Amazon UK', 'YesStyle', 'Stylevana', 'COSRX Official', 'Cult Beauty'],
  'Clear bottle. Korean manufacturing codes on base. Heavily faked on Amazon — check seller ratings and origin carefully.'
),
(
  '8809416470047',
  'COSRX Low pH Good Morning Gel Cleanser',
  'COSRX', 'cleanser', 150, 'South Korea',
  ARRAY['Amazon UK', 'YesStyle', 'COSRX Official', 'Cult Beauty'],
  'White tube with green text. Korean Hangul characters on back should be sharp. pH strips sold separately for verification.'
)

ON CONFLICT (barcode) DO NOTHING;
