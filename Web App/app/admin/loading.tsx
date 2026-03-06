function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`rounded-lg bg-border ${className ?? ""}`} style={style} />;
}

export default function AdminLoading() {
  return (
    <div className="flex min-h-screen animate-pulse bg-background">
      {/* Sidebar skeleton — md+ only */}
      <aside className="hidden w-16 flex-col border-r border-border bg-primary/10 md:flex lg:w-60">
        <div className="h-14 border-b border-border/30" />
        <div className="flex flex-1 flex-col gap-1 px-2 py-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-border/50" />
          ))}
        </div>
      </aside>

      {/* Content area */}
      <div className="flex flex-1 flex-col gap-5 p-6 md:p-8">
        <Bone className="h-8 w-36" />
        <Bone className="h-4 w-28" />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-border bg-surface shadow-sm"
            />
          ))}
        </div>

        {/* Activity list */}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-5 py-4">
            <Bone className="h-4 w-32" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0">
              <Bone className="h-6 w-6 rounded-full" />
              <Bone className="h-4 flex-1" />
              <Bone className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
