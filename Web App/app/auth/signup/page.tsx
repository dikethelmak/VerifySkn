"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp, signInWithGoogle } from "@/lib/auth";

// ── Password strength ─────────────────────────────────────────

type Strength = 0 | 1 | 2 | 3;

function getStrength(password: string): Strength {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8)            score++;
  if (/[A-Z]/.test(password))          score++;
  if (/[0-9]/.test(password))          score++;
  if (/[^A-Za-z0-9]/.test(password))   score++;
  return Math.min(score, 3) as Strength;
}

const STRENGTH_CONFIG: Record<
  Strength,
  { label: string; color: string; width: string } | null
> = {
  0: null,
  1: { label: "Weak",   color: "#C0392B", width: "33%"  },
  2: { label: "Fair",   color: "#E07B2A", width: "66%"  },
  3: { label: "Strong", color: "#2D7A4F", width: "100%" },
};

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = getStrength(password);
  const config   = STRENGTH_CONFIG[strength];

  if (!password) return null;

  return (
    <div className="mt-2">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "#E5E2DD" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: config?.width ?? "0%",
            backgroundColor: config?.color ?? "transparent",
          }}
        />
      </div>
      {config && (
        <p
          className="mt-1 font-rethink text-[12px] font-medium"
          style={{ color: config.color }}
        >
          {config.label}
        </p>
      )}
    </div>
  );
}

// ── Field component ───────────────────────────────────────────

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  value,
  onChange,
  error,
  children,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  children?: React.ReactNode;
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
      {children}
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

export default function SignupPage() {
  const router = useRouter();

  const [fullName,        setFullName]        = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const [loading,       setLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const next: typeof errors = {};
    if (!fullName.trim())               next.fullName = "Full name is required";
    if (!email)                         next.email    = "Email is required";
    if (!password)                      next.password = "Password is required";
    else if (getStrength(password) < 2) next.password = "Password is too weak — use 8+ chars, a number, and a capital letter";
    if (password !== confirmPassword)   next.confirmPassword = "Passwords do not match";
    if (Object.keys(next).length) { setErrors(next); return; }

    setLoading(true);
    const { error } = await signUp(email, password, fullName.trim());
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        setErrors({ email: "An account with this email already exists." });
      } else {
        setErrors({ general: error.message });
      }
      return;
    }

    router.push("/dashboard");
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
          Create your account
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field
            id="fullName"
            label="Full Name"
            autoComplete="name"
            placeholder="Jane Smith"
            value={fullName}
            onChange={setFullName}
            error={errors.fullName}
          />
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

          {/* Password + strength bar */}
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block font-rethink text-sm font-medium text-text-primary"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 font-rethink text-sm text-text-primary placeholder:text-text-secondary/60 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={errors.password ? { borderColor: "#C0392B" } : {}}
            />
            <PasswordStrengthBar password={password} />
            {errors.password && (
              <p className="mt-1 font-rethink text-[13px]" style={{ color: "#C0392B" }}>
                {errors.password}
              </p>
            )}
          </div>

          <Field
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={errors.confirmPassword}
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 font-rethink text-base font-medium text-white transition-colors hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
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
          {googleLoading ? "Redirecting…" : "Sign up with Google"}
        </button>

        {/* Sign in link */}
        <p className="mt-7 text-center font-rethink text-sm text-text-secondary">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
