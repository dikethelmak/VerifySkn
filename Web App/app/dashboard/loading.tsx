// Skeleton shown while DashboardPage (server component) is fetching data.
// Mirrors the 2-column layout of the actual dashboard.

function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`rounded-lg bg-border ${className ?? ""}`} style={style} />;
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-5 py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">

        {/* ── Left column ── */}
        <div className="flex flex-col gap-8">
          {/* Greeting */}
          <div>
            <Bone className="h-9 w-56" />
            <Bone className="mt-2 h-4 w-40" />
          </div>

          {/* Stats 2×4 */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
              >
                <Bone className="h-8 w-14" />
                <Bone className="mt-2 h-4 w-24" />
              </div>
            ))}
          </div>

          {/* Scan history table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex gap-6 border-b border-border px-4 py-3.5">
              {[48, 64, 80, 40, 36].map((w, i) => (
                <Bone key={i} className="h-3" style={{ width: w }} />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-6 border-b border-border px-4 py-3.5 last:border-0"
              >
                <Bone className="h-4 w-20" />
                <Bone className="h-4 w-28" />
                <Bone className="h-4 w-24" />
                <Bone className="h-5 w-16 rounded-full" />
                <Bone className="h-4 w-10" />
              </div>
            ))}
          </div>

          {/* Reports table */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
            <div className="flex gap-6 border-b border-border px-4 py-3.5">
              {[48, 60, 40, 44, 28].map((w, i) => (
                <Bone key={i} className="h-3" style={{ width: w }} />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-6 border-b border-border px-4 py-3.5 last:border-0"
              >
                <Bone className="h-4 w-20" />
                <Bone className="h-4 w-28" />
                <Bone className="h-5 w-20 rounded-full" />
                <Bone className="h-5 w-20 rounded-full" />
                <Bone className="h-4 w-8" />
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <Bone className="h-14 w-14 rounded-full" />
            <Bone className="mt-4 h-5 w-32" />
            <Bone className="mt-2 h-4 w-44" />
            <Bone className="mt-3 h-6 w-20 rounded-full" />
            <Bone className="mt-4 h-4 w-28" />
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <Bone className="h-4 w-36" />
            <div className="mt-4 flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Bone className="h-3 w-20" />
                  <Bone className="h-3 w-28" />
                </div>
              ))}
            </div>
          </div>
          <Bone className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
