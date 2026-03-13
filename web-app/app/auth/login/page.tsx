"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signInWithGoogle } from "@/lib/auth";

// ── Input component ───────────────────────────────────────────

function Field({
  id,
  label,
  type,
  autoComplete,
  placeholder,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block font-rethink text-sm font-medium text-text-primary"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        style={error ? { borderColor: "#C0392B" } : {}}
      />
      {error && (
        <p className="mt-1 font-rethink text-[13px]" style={{ color: "#C0392B" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Google icon ───────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function LoginPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [errors,   setErrors]   = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Surface OAuth errors passed back via ?error= param
  useEffect(() => {
    if (searchParams.get("error") === "oauth_failed") {
      setErrors({ general: "Google sign-in failed — please try again." });
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const next: typeof errors = {};
    if (!email)    next.email    = "Email is required";
    if (!password) next.password = "Password is required";
    if (Object.keys(next).length) { setErrors(next); return; }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid") || msg.includes("credentials")) {
        setErrors({ general: "Incorrect email or password." });
      } else {
        setErrors({ general: error.message });
      }
      return;
    }

    const raw   = searchParams.get("next") ?? "";
    // Only allow same-origin relative paths — reject absolute URLs and protocol-relative URLs
    const next_ = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
    router.push(next_);
    router.refresh();
  }

  async function handleGoogle() {
    setErrors({});
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setErrors({ general: error.message });
      setGoogleLoading(false);
    }
    // On success Supabase handles the redirect to /auth/callback
  }

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">

        {/* Wordmark */}
        <Link href="/" className="mb-7 flex items-center justify-center gap-2.5">
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none" aria-hidden>
            <rect width="32" height="32" rx="7" fill="#1A3C2E" />
            <polyline
              points="6,7 16,25 26,7"
              fill="none"
              stroke="#C9A84C"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-fraunces text-[30px] font-semibold leading-none text-primary">
            VerifySkn
          </span>
        </Link>

        <p className="mb-6 text-center font-rethink text-sm text-text-secondary">
          Sign in to your account
        </p>

        {/* General error */}
        {errors.general && (
          <div
            className="mb-5 rounded-xl px-4 py-3"
            style={{ backgroundColor: "rgba(192,57,43,0.07)" }}
          >
            <p className="font-rethink text-[13px]" style={{ color: "#C0392B" }}>
              {errors.general}
            </p>
          </div>
        )}

        {/* Email / password form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={setEmail}
            error={errors.email}
          />
          <Field
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={setPassword}
            error={errors.password}
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-rethink text-base font-medium text-white transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="font-rethink text-xs text-text-secondary">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-2.5 font-rethink text-sm font-medium text-text-primary transition-colors hover:bg-background active:scale-[0.98] disabled:opacity-60"
        >
          <GoogleIcon />
          {googleLoading ? "Redirecting…" : "Sign in with Google"}
        </button>

        {/* Sign up link */}
        <p className="mt-7 text-center font-rethink text-sm text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
