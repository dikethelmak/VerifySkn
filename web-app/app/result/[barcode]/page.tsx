import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase";
import { verdictLabel, confidenceTier } from "@/lib/verdictUtils";
import type { ScanVerdict } from "@/lib/database.types";

interface PageProps {
  params: { barcode: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const barcode = decodeURIComponent(params.barcode);
  return { title: `Result for ${barcode}` };
}

const VERDICT_STYLE: Record<ScanVerdict, { card: string; text: string }> = {
  authentic:  { card: "rgba(45,122,79,0.1)",  text: "#2D7A4F" },
  unverified: { card: "rgba(224,123,42,0.1)", text: "#E07B2A" },
  suspicious: { card: "rgba(192,57,43,0.1)",  text: "#C0392B" },
};

const BOOKING_URL = "https://calendar.app.google/sLinchWrpXCdTcPt6";

type Row = {
  id: string;
  barcode_scanned: string;
  result: ScanVerdict;
  confidence_score: number;
  scanned_at: string;
  product: {
    name: string;
    brand: string;
    category: string;
    how_to_use: string | null;
    skin_type_suitability: string | null;
    key_ingredients: string[] | null;
  } | null;
};

export default async function ResultPage({ params }: PageProps) {
  const barcode = decodeURIComponent(params.barcode);
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("scan_logs")
    .select("id, barcode_scanned, result, confidence_score, scanned_at, product:products(name, brand, category, how_to_use, skin_type_suitability, key_ingredients)")
    .eq("barcode_scanned", barcode)
    .order("scanned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = data as Row | null;

  if (!row) {
    return (
      <main className="mx-auto max-w-lg px-4 py-12 space-y-4">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">Result</p>
        <h1 className="font-syne text-2xl font-semibold text-text-primary">No result found</h1>
        <p className="text-sm text-text-secondary">
          No scan on record for barcode{" "}
          <span className="font-mono">{barcode}</span>.
        </p>
        <Link
          href="/"
          className="inline-block rounded-xl px-5 py-2.5 text-sm font-medium text-background transition-colors"
          style={{ backgroundColor: "#7dc98a" }}
        >
          Scan this barcode
        </Link>
      </main>
    );
  }

  const { card, text } = VERDICT_STYLE[row.result];
  const scannedAt = new Date(row.scanned_at).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <main className="mx-auto max-w-lg px-4 py-12 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">Result</p>
        <h1 className="font-syne text-2xl font-semibold text-text-primary">
          {row.product?.name ?? "Unknown product"}
        </h1>
        {row.product && (
          <p className="text-sm text-text-secondary">
            {row.product.brand} · {row.product.category}
          </p>
        )}
      </div>

      {/* Verdict card */}
      <div
        className="rounded-2xl border px-6 py-5 space-y-1"
        style={{ background: card, borderColor: text + "40" }}
      >
        <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">Verdict</p>
        <p className="font-syne text-2xl font-semibold" style={{ color: text }}>
          {verdictLabel(row.result)}
        </p>
        <p className="text-sm text-text-secondary">
          {confidenceTier(row.confidence_score)} · {row.confidence_score}%
        </p>
      </div>

      {/* Meta */}
      <div className="rounded-xl border border-border bg-surface px-4 py-3 space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs uppercase tracking-widest text-text-secondary">Barcode</span>
          <span className="font-mono text-xs text-text-primary">{row.barcode_scanned}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs uppercase tracking-widest text-text-secondary">Scanned</span>
          <span className="font-mono text-xs text-text-primary">{scannedAt}</span>
        </div>
      </div>

      {/* Product usage */}
      {row.product && (row.product.skin_type_suitability || row.product.how_to_use || row.product.key_ingredients?.length) && (
        <div className="rounded-xl border border-border bg-surface px-4 py-4 space-y-4">
          <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">How to use</p>

          {row.product.skin_type_suitability && (
            <div className="space-y-1.5">
              <p className="text-xs text-text-secondary">Best for</p>
              <div className="flex flex-wrap gap-2">
                {row.product.skin_type_suitability.split(",").map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-border px-3 py-1 text-xs text-text-primary"
                  >
                    {s.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {row.product.how_to_use && (
            <div className="space-y-1.5">
              <p className="text-xs text-text-secondary">Usage</p>
              <p className="text-sm leading-relaxed text-text-primary">{row.product.how_to_use}</p>
            </div>
          )}

          {row.product.key_ingredients && row.product.key_ingredients.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-text-secondary">Key ingredients</p>
              <div className="flex flex-wrap gap-2">
                {row.product.key_ingredients.map((ing) => (
                  <span
                    key={ing}
                    className="rounded-full bg-primary px-3 py-1 text-xs text-text-primary"
                  >
                    {ing}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Consultation */}
      <Link
        href={BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors"
        style={{ background: "#C9A84C", color: "#0b1e0f" }}
      >
        Book a consultation
      </Link>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/"
          className="flex-1 rounded-xl border border-border px-4 py-2.5 text-center text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Scan again
        </Link>
        <Link
          href={`/report?barcode=${encodeURIComponent(barcode)}`}
          className="flex-1 rounded-xl border border-border px-4 py-2.5 text-center text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Report this product
        </Link>
      </div>
    </main>
  );
}
