/**
 * lib/supabase-browser.ts — browser-only Supabase client.
 *
 * Safe to import in Client Components ("use client").
 * Does NOT import next/headers — that stays in lib/supabase.ts (server-only).
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
