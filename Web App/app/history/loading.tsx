function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`rounded-lg bg-border ${className ?? ""}`} style={style} />;
}

export default function HistoryLoading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse px-5 py-12">
      <Bone className="h-10 w-44" />
      <Bone className="mt-1 h-4 w-24" />

      {/* Filters row */}
      <div className="mt-6 flex gap-2">
        {[56, 72, 72, 60].map((w, i) => (
          <Bone key={i} className="h-8 rounded-full" style={{ width: w }} />
        ))}
      </div>

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {/* Header */}
        <div className="flex gap-6 border-b border-border px-5 py-3.5">
          {[60, 80, 72, 44, 40, 36].map((w, i) => (
            <Bone key={i} className="h-3" style={{ width: w }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-b border-border px-5 py-4 last:border-0"
          >
            <Bone className="h-4 w-24" />
            <Bone className="h-4 w-28" />
            <Bone className="h-4 w-24" />
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="h-4 w-10" />
            <Bone className="h-4 w-8" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-5 flex items-center justify-between">
        <Bone className="h-4 w-28" />
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Bone key={i} className="h-8 w-8 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
