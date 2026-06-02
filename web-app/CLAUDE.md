# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Behaviour

### 1. Think before coding
- State assumptions explicitly before starting. If uncertain, ask — don't silently pick an interpretation.
- If multiple approaches exist, surface the tradeoff and confirm before implementing.
- If something is unclear, stop and name what's confusing. Never hide confusion.

### 2. Simplicity first
- Write the minimum code that solves the problem. Nothing speculative.
- No features, abstractions, or configurability beyond what was asked.
- No error handling for impossible scenarios.
- If a solution could be half the size, rewrite it. Ask: "Would a senior engineer say this is overcomplicated?"

### 3. Surgical changes
- Touch only what the request requires. Do not improve adjacent code, comments, or formatting.
- Match existing style even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.
- When your changes create orphans (unused imports, variables, functions), remove them. Don't remove pre-existing dead code unless asked.
- Every changed line must trace directly to the user's request.

### 4. Verify before finishing
- After any edit, confirm the build passes (`npm run build`) before declaring done.
- For multi-step tasks, state a brief plan with a verifiable check per step.
- Clarifying questions come **before** implementation, not after mistakes.

## Git Rules
- **Always commit as**: `dikethelma55@gmail.com` / `dikethelmak`
- **Never add Co-Authored-By trailers** to commit messages

## Commands

```bash
npm run dev      # Start dev server (Next.js, default port 3000)
npm run build    # Production build
npm run lint     # ESLint via next lint
```

Install packages with `npm install --legacy-peer-deps` (react-dom peer conflict in this dep tree).
No test framework configured.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
APIFY_API_TOKEN=
CRON_SECRET=
MAX_DAILY_VISION_CALLS=100
GMAIL_USER=
GMAIL_APP_PASSWORD=
GO_UPC_API_KEY=
# Optional — skip if not configured:
COSMETHICS_API_KEY=
```

## Architecture

### Next.js 14 App Router

All pages live under `app/`. Server Components are the default; Client Components require `"use client"`. The fixed 64px `<Navbar />` means every page content div needs `pt-16` (handled in `app/layout.tsx`).

### Supabase client split — critical boundary

**`lib/supabase.ts`** — server-only. Imports `next/headers` (cookies). Contains all typed query helpers. Use only in Server Components, Route Handlers, and Server Actions.

**`lib/supabase/client.ts`** — browser only (`"use client"`). Use in Client Components that need direct Supabase access.

Importing `lib/supabase.ts` in a Client Component will crash the build.

### Barcode lookup waterfall (`app/api/product/[barcode]/route.ts`)

When a barcode is entered on the home page, the API checks sources in order — stops at first hit:
1. **Supabase DB** — our verified products → verdict `authentic`
2. **UPCitemdb** — free trial, 100 req/day, no key → verdict `unverified`
3. **Go-UPC** — 150 total calls, capped at 5/day (`GO_UPC_API_KEY`) → verdict `unverified`
4. **Open Beauty Facts** — free, unlimited, best for beauty/EU brands → verdict `unverified`

Rate limiting for external APIs uses `lib/api-rate-limiter.ts` → `checkApiLimit(service, maxPerDay)` backed by `api_call_counters` table in Supabase (migration 009).

### Vision / image analysis (`app/api/analyse-product/route.ts`)

POST endpoint that accepts a base64 image. Provider waterfall:
1. **Gemini 2.5 Flash** — primary
2. **Groq (Llama 4 Scout)** — fallback if Gemini quota exceeded

Daily cap enforced via `lib/vision-rate-limiter.ts` → `checkDailyVisionLimit()` using `increment_vision_counter` RPC. Cache hits bypass the rate limit check (`lib/vision-cache.ts`).

### Scoring logic (`lib/scoring.ts`)

`computeCombinedResult()` merges barcode verdict (40%) + image verdict (60%) into a final verdict. Priority: suspicious veto → both authentic → mixed → both unverified.

### AI text analysis (`lib/claude.ts`)

`analyzeProductAuthenticity()` called inside `<ClaudeAnalysis />` — an async Server Component in `<Suspense>` on the result page. Streams in while the page renders.

### Barcode scanner (`components/Scanner.tsx`)

- Primary: native `BarcodeDetector` API (Chrome/Edge/Safari 17+) via `requestAnimationFrame` loop
- Fallback: `@zxing/library` dynamically imported inside `useEffect` (never at module level — browser globals)
- Always requests rear camera via `facingMode: { ideal: 'environment' }`
- `onDetect` prop fires immediately on detection; `onScan` fires after 400ms delay

### Social intelligence (`lib/social-intelligence.ts`)

`getSocialIntelligence(brand, productId)` fetches fake-report patterns from `fake_visual_patterns` and signal summaries from `social_signal_summary`. Results are injected into the AI vision prompt as context.

Scrapers (Apify-based, Instagram + TikTok only) run via cron → `app/api/jobs/scrape/route.ts`.
Processing runs via `app/api/jobs/process-social/route.ts` — classifies posts, extracts markers with Gemini Vision, upserts into `fake_visual_patterns`.

### Report system (`app/report/page.tsx` + `app/api/report/route.ts`)

Single-page form: image upload (max 3, optional) + barcode (optional, at least one required) + issue pills + description. On submit:
1. Validates inputs server-side (size, MIME type, barcode format, issues whitelist)
2. Sends email via Gmail SMTP (nodemailer) to `dikethelmak@gmail.com`
3. Fire-and-forget: calls `extractAndStorePatterns()` (`lib/pattern-extraction.ts`) for counterfeit reports with images — Gemini Vision extracts fake visual markers and upserts into `fake_visual_patterns`

### Cosmethics (`lib/cosmethics.ts`)

Stub for ingredient-level enrichment. Activates when `COSMETHICS_API_KEY` is set. Fill in the endpoint from their B2B docs when available.

### Database schema

Run migrations in order via Supabase Dashboard → SQL Editor:
1. `001_initial_schema.sql` — `brands`, `products`, `scan_logs`
2. `002_image_analysis.sql` — `image_analyses`, `combined_results`
3. `003_auth.sql` — auth tables
4. `004_reports.sql` — `reports`
5. `005_brand_portal.sql` — brand portal tables
6. `006_admin.sql` — admin tables
7. `007_notifications.sql` — notifications
8. `008_social_intelligence.sql` — `social_intelligence_cache`, `fake_visual_patterns`, `social_signal_summary`
9. `009_api_counters.sql` — `api_call_counters` + `increment_api_counter` RPC
- `risk_mitigation_tables.sql` — vision daily counts, scrape jobs
- `supabase/seed.sql` — 28 products across 12 brands

`ScanVerdict = "authentic" | "suspicious" | "unverified"` — core discriminated union used throughout.

`lib/database.types.ts` is hand-maintained (not auto-generated). Update it alongside any schema changes.

## Design System

Five Google fonts loaded as CSS variables in `app/layout.tsx`:
- `font-rethink` (`--font-rethink`) — Rethink Sans. Default body font. **Never set explicitly** — it applies via the `<body>` class. Remove it if you see it on paragraphs.
- `font-fraunces` (`--font-fraunces`) — Fraunces. Not currently used — do not add.
- `font-mono` (`--font-mono`) — Space Mono. Labels, barcodes, confidence scores, technical values (eyebrow text, `uppercase tracking-widest` patterns).
- `font-syne` (`--font-syne`) — **Headings on all pages** (`h1`, `h2`, `h3`) and the home page dark theme UI (HomeClient).
- `font-dm-mono` (`--font-dm-mono`) — Home page dark theme mono (HomeClient). Do not use on any other page.

### Typography rules — follow exactly, no exceptions
- `h1`, `h2`, `h3` → `font-syne`
- Body paragraphs, descriptions, UI text → no font class (defaults to `font-rethink`)
- Eyebrow labels, scores, barcodes, mono values → `font-mono`
- HomeClient / dark theme UI → `font-syne` + `font-dm-mono` only
- **Never use `replace_all` on font class names across a whole file.** Make surgical per-element edits.

Tailwind colour tokens (`tailwind.config.ts`): `background` (#0b1e0f), `surface` (#0f2614), `primary` (#1A3C2E), `accent` (#C9A84C), `lime` / `success` (#7dc98a), `warning` (#E07B2A), `danger` (#C0392B), `text-primary` (#eeecea), `text-secondary` (rgba(238,236,234,0.5)), `border` (rgba(255,255,255,0.09)).

`lib/utils.ts` exports `cn()` (clsx + tailwind-merge) — use for all conditional class strings.

## Route Map

| Route | Type | Purpose |
|---|---|---|
| `/` | Server | Home — barcode lookup + deep image analysis, all results inline |
| `/history` | Server | Paginated scan history |
| `/report` | Client | Report counterfeit product |
| `/about` | Server | About page |
| `/support` | Server | Support — book consultation + contact |
| `/api/analyse-product` | Route Handler | Vision analysis (POST) |
| `/api/report` | Route Handler | Submit report, send email, extract patterns (POST) |
| `/api/jobs/scrape` | Route Handler | Cron — scrape social platforms via Apify |
| `/api/jobs/process-social` | Route Handler | Cron — classify posts, extract fake markers |
| `/api/product/[barcode]` | Route Handler | Barcode lookup (GET) |
