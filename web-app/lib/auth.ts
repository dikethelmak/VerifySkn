/**
 * lib/auth.ts — Supabase Auth helpers.
 *
 * Client-side only — import from Client Components or event handlers.
 * For server-side session checks, use the server client in lib/supabase/server.ts.
 */

import { createClient } from "@/lib/supabase/client";

/** Sign up a new user and set full_name in user_metadata. */
export async function signUp(email: string, password: string, fullName: string) {
  const supabase = createClient();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
}

/** Sign in with email + password. */
export async function signIn(email: string, password: string) {
  const supabase = createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

/** Initiate Google OAuth — redirects to /auth/callback on success. */
export async function signInWithGoogle() {
  const supabase = createClient();
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

/** Sign out the current user. */
export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}

/** Get the current session (client-side). */
export async function getSession() {
  const supabase = createClient();
  return supabase.auth.getSession();
}

/** Get the authenticated user object, or null if unauthenticated. */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
