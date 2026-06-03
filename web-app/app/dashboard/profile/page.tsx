"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const supabase = createClient();
  const router   = useRouter();

  const [email,    setEmail]    = useState("");
  const [fullName, setFullName] = useState("");
  const [role,     setRole]     = useState("");
  const [loading,  setLoading]  = useState(true);

  // Password change state
  const [newPassword,    setNewPassword]    = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError,  setPwError]  = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved,  setPwSaved]  = useState(false);

  // Profile save state
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/auth/login"); return; }

      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      setFullName(profile?.full_name ?? user.user_metadata?.full_name ?? "");
      setRole(profile?.role ?? "user");
      setLoading(false);
    }
    load();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);

    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    setSaved(true);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSaved(false);

    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }

    setPwSaving(true);
    const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);

    if (authErr) { setPwError(authErr.message); return; }
    setNewPassword("");
    setConfirmPassword("");
    setPwSaved(true);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12">
        <p className="text-sm text-text-secondary">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12 space-y-10">

      {/* Header */}
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">Account</p>
        <h1 className="font-syne text-2xl font-semibold text-text-primary">Edit Profile</h1>
        <p className="text-sm text-text-secondary">
          <span className="font-mono text-xs">{email}</span>
          {" · "}
          <span className="capitalize">{role.replace("_", " ")}</span>
        </p>
      </div>

      {/* Profile form */}
      <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
        <h2 className="font-syne text-base font-semibold text-text-primary">Display name</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-widest text-text-secondary">
              Full name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setSaved(false); }}
              placeholder="Your full name"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}
          {saved  && <p className="text-xs text-success">Saved.</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save name"}
          </button>
        </form>
      </section>

      {/* Password form */}
      <section className="rounded-2xl border border-border bg-surface p-6 space-y-4">
        <h2 className="font-syne text-base font-semibold text-text-primary">Change password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-widest text-text-secondary">
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwSaved(false); setPwError(null); }}
              placeholder="Min. 8 characters"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-widest text-text-secondary">
              Confirm password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPwSaved(false); setPwError(null); }}
              placeholder="Repeat new password"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary outline-none focus:border-primary transition-colors"
            />
          </div>

          {pwError && <p className="text-xs text-danger">{pwError}</p>}
          {pwSaved  && <p className="text-xs text-success">Password updated.</p>}

          <button
            type="submit"
            disabled={pwSaving || !newPassword}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {pwSaving ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      <Link
        href="/dashboard"
        className="block text-center text-sm text-text-secondary underline-offset-2 hover:text-text-primary hover:underline transition-colors"
      >
        ← Back to dashboard
      </Link>
    </main>
  );
}
