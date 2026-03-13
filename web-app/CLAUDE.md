# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js, default port 3000)
npm run build    # Production build
npm run lint     # ESLint via next lint
```

There is no test framework configured. Install packages with `npm install --legacy-peer-deps` due to a react-dom peer conflict in this dependency tree.

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

## Architecture

### Next.js 14 App Router

All pages live under `app/`. Server Components are the default; Client Components require `"use client"` and are used when browser APIs or interactivity is needed. The fixed 64px `<Navbar />` means every page content div needs `pt-16` (handled in `app/layout.tsx`).

### Supabase client split — critical boundary

**`lib/supabase.ts`** — server-only. Imports `next/headers` (cookies). Contains all typed query helpers (`getProductByBarcode`, `logScan`, `getRecentScans`, `getDashboardStats`, `saveImageAnalysis`, `saveCombinedResult`, `getCombinedResultBySession`). Use only in Server Components, Route Handlers, and Server Actions.

**`lib/supabase/client.ts`** — browser only (`"use client"`). Use in Client Components that need direct Supabase access.

Importing `lib/supabase.ts` in a Client Component will crash the build because `next/headers` is not available client-side.

### AI analysis — two modes

**Barcode text analysis** (`lib/claude.ts` → `analyzeProductAuthenticity`): Called inside `<ClaudeAnalysis />`, an async Server Component wrapped in `<Suspense>` on the result page. This enables streaming — the page renders immediately while the AI analysis loads behind a skeleton.

**Image analysis** (not yet wired up — `AnalysisLoader` and `ImageUploader` components exist but the Vision API call and scan page integration are still pending): When implemented, the scan page writes the result to `sessionStorage[IMAGE_SESSION_KEY]` and navigates to `/result/image`, where `ImageResultPage` reads it. The shared type `ImageAnalysisSession` and storage key live in `lib/imageSession.ts`.

### Scoring logic (`lib/scoring.ts`)

`computeCombinedResult()` merges a barcode verdict (40% weight) and image verdict (60% weight) into a final verdict. Rules in priority order: suspicious veto → both authentic → mixed authentic/unverified → both unverified. Used when both scan modes have run for the same session.

### Database schema

Three migrations must be run in order against Supabase (Dashboard → SQL Editor):
1. `supabase/migrations/001_initial_schema.sql` — `brands`, `products`, `scan_logs`
2. `supabase/seed.sql` — 28 products across 12 brands
3. `supabase/migrations/002_image_analysis.sql` — `image_analyses`, `combined_results`

`ScanVerdict = "authentic" | "suspicious" | "unverified"` is the core discriminated union used throughout. All result columns use a CHECK constraint enforcing these three values.

`lib/database.types.ts` is the hand-maintained type source (not auto-generated). Update it alongside any schema migrations. Re-export aliases (`Product`, `ScanLog`, `ImageAnalysis`, etc.) are all in this file and re-exported from `lib/supabase.ts`.

### `@zxing/library` — SSR constraint

`BrowserMultiFormatReader` must be dynamically `import()`-ed inside a `useEffect` (never at module level) because it references browser globals. See `components/Scanner.tsx` for the established pattern.

## Design System

Three Google fonts loaded as CSS variables in `app/layout.tsx`:
- `font-rethink` (`--font-rethink`) — Rethink Sans. Default body font, all UI text.
- `font-fraunces` (`--font-fraunces`) — Fraunces. Headings, hero labels, large numeric values.
- `font-mono` (`--font-mono`) — Space Mono. Barcodes, confidence scores, technical/monospace values.

Tailwind colour tokens (defined in `tailwind.config.ts`): `background` (#F7F5F2), `surface` (#FFF), `primary` (#1A3C2E), `accent` (#C9A84C), `success` (#2D7A4F), `warning` (#E07B2A), `danger` (#C0392B), `text-primary` (#141414), `text-secondary` (#6B6B6B), `border` (#E5E2DD).

`lib/utils.ts` exports `cn()` (clsx + tailwind-merge) — use for all conditional class strings.

## Route Map

| Route | Type | Purpose |
|---|---|---|
| `/` | Server | Home — stats + recent scans |
| `/scan` | Client | Barcode scanner (+ image uploader, pending) |
| `/result/[barcode]` | Server | Barcode verdict, optional `?sessionId=` for combined |
| `/result/image` | Client | Image analysis result, reads from sessionStorage |
| `/history` | Server | Paginated scan history |
