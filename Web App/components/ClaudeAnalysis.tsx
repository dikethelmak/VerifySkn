import { analyzeProductAuthenticity } from "@/lib/claude";
import type { Product, ScanVerdict } from "@/lib/database.types";

// ── Async Server Component ────────────────────────────────────
// Wrap in <Suspense fallback={<AnalysisSkeleton />}> in the result page.

interface Props {
  barcode: string;
  product: Product | null;
  verdict: ScanVerdict;
  confidence: number;
}

export async function ClaudeAnalysis({
  barcode,
  product,
  verdict,
  confidence,
}: Props) {
  const analysis = await analyzeProductAuthenticity({
    barcode,
    product,
    verdict,
    confidence,
  });

  if (!analysis) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <SparkleIcon className="h-4 w-4 text-accent" />
        <p className="font-rethink text-xs font-medium uppercase tracking-widest text-text-secondary">
          AI Analysis
        </p>
      </div>

      {/* Summary */}
      <p className="font-rethink text-[15px] leading-relaxed text-text-primary">
        {analysis.summary}
      </p>

      {/* Flags */}
      {analysis.flags.length > 0 && (
        <div className="mt-5">
          <p className="mb-3 font-rethink text-xs font-medium uppercase tracking-widest text-text-secondary">
            Check these on your packaging
          </p>
          <ul className="space-y-2.5">
            {analysis.flags.map((flag, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: "#C9A84C" }}
                />
                <span className="font-rethink text-sm leading-snug text-text-primary">
                  {flag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      {analysis.recommendation && (
        <p className="mt-5 border-t border-border pt-4 font-rethink text-sm italic text-text-secondary">
          {analysis.recommendation}
        </p>
      )}
    </div>
  );
}

// ── Skeleton (Suspense fallback) ─────────────────────────────

export function AnalysisSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="h-4 w-4 rounded-full bg-border" />
        <div className="h-3 w-20 rounded bg-border" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-border" />
        <div className="h-4 w-5/6 rounded bg-border" />
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-3 w-32 rounded bg-border" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border" />
            <div
              className="h-3.5 rounded bg-border"
              style={{ width: `${75 - i * 8}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-5 border-t border-border pt-4">
        <div className="h-3 w-3/4 rounded bg-border" />
      </div>
    </div>
  );
}

// ── Icon ─────────────────────────────────────────────────────

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}
