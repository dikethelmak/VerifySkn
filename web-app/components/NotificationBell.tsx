"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Flag,
  ThumbsUp,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { AppNotification } from "@/lib/database.types";

// ── Icon config by notification type ──────────────────────────

const TYPE_META: Record<
  AppNotification["type"],
  { Icon: React.ElementType; color: string; bg: string }
> = {
  report_update:       { Icon: Flag,         color: "text-amber-600",  bg: "bg-amber-50"  },
  upvote:              { Icon: ThumbsUp,      color: "text-blue-600",   bg: "bg-blue-50"   },
  product_verified:    { Icon: AlertTriangle, color: "text-red-600",    bg: "bg-red-50"    },
  submission_approved: { Icon: CheckCircle,   color: "text-emerald-600",bg: "bg-emerald-50"},
  admin_alert:         { Icon: ShieldAlert,   color: "text-purple-600", bg: "bg-purple-50" },
};

// ── Relative time helper ──────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60)           return "just now";
  const mins  = Math.floor(seconds / 60);
  if (mins < 60)              return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)             return `${hours}h ago`;
  const days  = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Component ─────────────────────────────────────────────────

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen]                     = useState(false);
  const [notifications, setNotifications]   = useState<AppNotification[]>([]);
  const [userId, setUserId]                 = useState<string | null>(null);
  const panelRef                            = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Auth check + initial fetch ─────────────────────────────
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);

      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
        .then(({ data }) => {
          if (data) setNotifications(data as unknown as AppNotification[]);
        });
    });
  }, []);

  // ── Supabase Realtime subscription ────────────────────────
  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as AppNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // ── Close on outside click ────────────────────────────────
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  // ── Actions ───────────────────────────────────────────────

  async function markRead(id: string) {
    const supabase = createSupabaseBrowserClient();
    await supabase.from("notifications").update({ read: true }).eq("id", id);
  }

  async function markAllRead() {
    if (!userId) return;
    const supabase = createSupabaseBrowserClient();
    // Optimistic
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  }

  async function handleClick(n: AppNotification) {
    setOpen(false);
    if (!n.read) {
      // Optimistic
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      await markRead(n.id);
    }
    if (n.link) router.push(n.link);
  }

  // Don't render anything until we know the user is logged in
  if (!userId) return null;

  return (
    <div ref={panelRef} className="relative">
      {/* ── Bell button ── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-background hover:text-text-primary"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 font-fraunces text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown panel ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: -6,  scale: 0.97 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className="absolute right-0 top-11 z-50 w-[380px] overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="font-rethink text-sm font-semibold text-text-primary">
                Notifications
              </p>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="font-rethink text-xs text-primary hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-5 py-12 text-center font-rethink text-sm italic text-text-secondary">
                  You&apos;re all caught up
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {notifications.map((n) => {
                    const meta = TYPE_META[n.type];
                    const Icon = meta.Icon;

                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => handleClick(n)}
                          className={cn(
                            "flex w-full items-start gap-3 border-l-[3px] px-4 py-3.5 text-left transition-colors hover:bg-background/60",
                            n.read
                              ? "border-transparent"
                              : "border-primary bg-primary/[0.035]"
                          )}
                        >
                          {/* Icon badge */}
                          <div
                            className={cn(
                              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                              meta.bg
                            )}
                          >
                            <Icon size={13} className={meta.color} strokeWidth={2} />
                          </div>

                          {/* Text */}
                          <div className="min-w-0 flex-1">
                            <p className="font-rethink text-[14px] font-semibold leading-snug text-text-primary">
                              {n.title}
                            </p>
                            <p className="mt-0.5 font-rethink text-[13px] leading-snug text-text-secondary">
                              {n.message}
                            </p>
                            <p className="mt-1.5 font-mono text-[11px] text-text-secondary/60">
                              {timeAgo(n.created_at)}
                            </p>
                          </div>

                          {/* Unread dot */}
                          {!n.read && (
                            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
