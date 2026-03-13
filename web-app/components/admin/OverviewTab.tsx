import { Activity, Flag, UserPlus, FileText } from "lucide-react";
import type { AdminStats, ActivityItem } from "@/app/admin/page";

// ── Activity config ────────────────────────────────────────────

const ACTIVITY_META = {
  scan: {
    Icon: Activity,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  report: {
    Icon: Flag,
    color: "text-red-500",
    bg: "bg-red-50",
  },
  signup: {
    Icon: UserPlus,
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  submission: {
    Icon: FileText,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
} as const;

// ── Stat cards ─────────────────────────────────────────────────

function statCards(s: AdminStats) {
  return [
    { label: "Total Scans",            value: s.totalScans },
    { label: "Scans Today",            value: s.todayScans },
    { label: "Pending Reports",        value: s.pendingReports },
    { label: "Confirmed Counterfeits", value: s.confirmedCounterfeits },
    { label: "Registered Users",       value: s.totalUsers },
    { label: "Verified Brands",        value: s.verifiedBrands },
  ];
}

// ── Component ──────────────────────────────────────────────────

export default function OverviewTab({
  stats,
  activity,
}: {
  stats:    AdminStats;
  activity: ActivityItem[];
}) {
  const cards = statCards(stats);

  return (
    <div className="flex max-w-5xl flex-col gap-7">
      <div>
        <h1 className="font-fraunces text-2xl font-semibold text-text-primary">
          Overview
        </h1>
        <p className="mt-0.5 font-rethink text-sm text-text-secondary">
          Platform health at a glance
        </p>
      </div>

      {/* ── Stats 2×3 grid ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
          >
            <p className="font-fraunces text-[40px] font-semibold leading-none text-text-primary">
              {card.value.toLocaleString()}
            </p>
            <p className="mt-2.5 font-rethink text-sm font-normal text-text-secondary">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Recent activity feed ── */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <p className="font-rethink text-sm font-semibold text-text-primary">
            Recent Activity
          </p>
        </div>

        {activity.length === 0 ? (
          <p className="px-5 py-10 text-center font-rethink text-sm text-text-secondary">
            No recent activity
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {activity.map((item, i) => {
              const meta = ACTIVITY_META[item.type];
              const Icon = meta.Icon;
              const date = new Date(item.timestamp);

              return (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  {/* Icon badge */}
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${meta.bg}`}
                  >
                    <Icon size={13} className={meta.color} strokeWidth={2} />
                  </div>

                  {/* Description */}
                  <p className="flex-1 font-rethink text-sm text-text-primary line-clamp-1">
                    {item.description}
                  </p>

                  {/* Timestamp */}
                  <span className="ml-3 shrink-0 font-mono text-[11px] text-text-secondary">
                    {date.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}{" "}
                    {date.toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
