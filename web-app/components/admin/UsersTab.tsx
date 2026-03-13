"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateUserRoleAction } from "@/app/admin/actions";
import type { AdminUser } from "@/app/admin/page";

// ── Constants ─────────────────────────────────────────────────

const ROLE_STYLES: Record<string, string> = {
  admin:     "bg-purple-100 text-purple-700",
  brand_rep: "bg-blue-100 text-blue-700",
  user:      "bg-stone-100 text-stone-500",
};

const ROLES = ["user", "brand_rep", "admin"] as const;
type Role = (typeof ROLES)[number];

// ── Component ─────────────────────────────────────────────────

export default function UsersTab({
  initialUsers,
}: {
  initialUsers: AdminUser[];
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [search, setSearch]   = useState("");
  const [error, setError]     = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const filtered = initialUsers.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (u.full_name ?? "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  function handleRoleChange(userId: string, role: Role) {
    setError(null);
    setSavingRole(userId);
    start(async () => {
      try {
        await updateUserRoleAction(userId, role);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSavingRole(null);
      }
    });
  }

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div>
        <h1 className="font-fraunces text-2xl font-semibold text-text-primary">
          Users
        </h1>
        <p className="mt-0.5 font-rethink text-sm text-text-secondary">
          {initialUsers.length} registered user{initialUsers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {error && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ backgroundColor: "rgba(192,57,43,0.08)" }}
        >
          <p className="font-rethink text-sm" style={{ color: "#C0392B" }}>
            {error}
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          type="text"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-4 font-rethink text-sm text-text-primary placeholder:text-text-secondary/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center font-rethink text-sm text-text-secondary">
            {search ? `No users matching "${search}"` : "No users yet"}
          </p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                {["Name", "Email", "Role", "Scans", "Reports", "Joined"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-rethink text-xs font-semibold uppercase tracking-wide text-text-secondary"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => {
                const isLast   = i === filtered.length - 1;
                const isSaving = savingRole === user.id;

                return (
                  <tr
                    key={user.id}
                    className={cn(
                      "transition-colors hover:bg-background/40",
                      !isLast && "border-b border-border"
                    )}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-fraunces text-xs font-semibold text-primary">
                          {(user.full_name ?? user.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-rethink text-sm text-text-primary">
                          {user.full_name ?? (
                            <span className="text-text-secondary italic">No name</span>
                          )}
                        </span>
                      </div>
                    </td>
                    {/* Email */}
                    <td className="px-4 py-3 font-rethink text-sm text-text-secondary">
                      {user.email}
                    </td>
                    {/* Role dropdown */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="relative">
                          <select
                            value={user.role}
                            disabled={isPending || isSaving}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value as Role)
                            }
                            className={cn(
                              "appearance-none rounded-full py-0.5 pl-2.5 pr-6 font-rethink text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 cursor-pointer",
                              ROLE_STYLES[user.role] ?? "bg-stone-100 text-stone-500"
                            )}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r === "brand_rep" ? "Brand Rep" : r.charAt(0).toUpperCase() + r.slice(1)}
                              </option>
                            ))}
                          </select>
                          {/* Dropdown arrow */}
                          <svg
                            className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-50"
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            fill="currentColor"
                          >
                            <path d="M5 7L1 3h8L5 7z" />
                          </svg>
                        </div>
                        {isSaving && (
                          <Loader2 size={12} className="animate-spin text-text-secondary" />
                        )}
                      </div>
                    </td>
                    {/* Scans */}
                    <td className="px-4 py-3 font-rethink text-sm text-text-secondary">
                      {user.scan_count.toLocaleString()}
                    </td>
                    {/* Reports */}
                    <td className="px-4 py-3 font-rethink text-sm text-text-secondary">
                      {Number(user.report_count).toLocaleString()}
                    </td>
                    {/* Joined */}
                    <td className="whitespace-nowrap px-4 py-3 font-rethink text-xs text-text-secondary">
                      {new Date(user.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
