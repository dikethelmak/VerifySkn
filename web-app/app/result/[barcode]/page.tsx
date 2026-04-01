import { Suspense } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import type { Metadata } from "next";
import { Camera } from "lucide-react";
import {
  getProductByBarcode,
  getCombinedResultBySession,
  logScan,
} from "@/lib/supabase";
import type { Product, ScanVerdict } from "@/lib/database.types";
import {
  lookupExternalProduct,
  externalSourceLabel,
  type ExternalProduct,
} from "@/lib/external-product-lookup";
import { ResultHero } from "@/components/ResultHero";
import { ClaudeAnalysis, AnalysisSkeleton } from "@/components/ClaudeAnalysis";
import { InlineImageAnalysis } from "@/components/InlineImageAnalysis";
import { cn } from "@/lib/utils";
import { ReportButton } from "@/components/ReportButton";

// ── Barcode validation ───────────────────────────────────────

function isValidEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const d = code.split("").map(Number);
  const sum = d
    .slice(0, 12)
    .reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === d[12];
}

function isValidUPCA(code: string): boolean {
  if (!/^\d{12}$/.test(code)) return false;
  const d = code.split("").map(Number);
  const sum = d
    .slice(0, 11)
    .reduce((acc, n, i) => acc + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === d[11];
}

function isValidBarcodeFormat(code: string): boolean {
  return isValidEAN13(code) || isValidUPCA(code);
}

// ── Result logic ─────────────────────────────────────────────

function determineVerdict(
  product: Product | null,
  barcode: string
): { verdict: ScanVerdict; confidence: number } {
  if (product) return { verdict: "authentic", confidence: 92 };
  if (isValidBarcodeFormat(barcode)) return { verdict: "unverified", confidence: 50 };
  return { verdict: "suspicious", confidence: 20 };
}

// ── Page ─────────────────────────────────────────────────────

interface PageProps {
  params: { barcode: string };
  searchParams: { sessionId?: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const barcode = decodeURIComponent(params.barcode);
  const product = await getProductByBarcode(barcode);

  const title = product
    ? `${product.name} by ${product.brand}`
    : `Scan Result: ${barcode}`;

  const description = product
    ? `Verify the authenticity of ${product.name} by ${product.brand}. Check if your product is genuine with VerifySkn's AI-powered scanner.`
    : `Check the authenticity of barcode ${barcode} with VerifySkn's AI-powered skincare verification system.`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export default async function ResultPage({ params, searchParams }: PageProps) {
  const barcode = decodeURIComponent(params.barcode);
  const sessionId = searchParams.sessionId;

  // Parallel fetch — product lookup + optional combined result
  const [product, combinedResult] = await Promise.all([
    getProductByBarcode(barcode),
    sessionId ? getCombinedResultBySession(sessionId) : Promise.resolve(null),
  ]);

  // If not in our verified DB, try external sources (OBF → Barcode Lookup → UPCitemdb)
  const externalProduct = !product ? await lookupExternalProduct(barcode) : null;

  // Combined result takes priority over barcode-only verdict
  let verdict: ScanVerdict;
  let confidence: number;

  if (combinedResult) {
    verdict = combinedResult.final_result;
    confidence = combinedResult.final_confidence;
  } else {
    const barcodeVerdict = determineVerdict(product, barcode);
    verdict = barcodeVerdict.verdict;
    confidence = barcodeVerdict.confidence;
  }

  // Log scan — non-blocking
  const userAgent = headers().get("user-agent") ?? undefined;
  logScan({
    barcode_scanned: barcode,
    product_id: product?.id ?? null,
    result: verdict,
    confidence_score: confidence,
    user_agent: userAgent,
  }).catch((err) => console.error("[ResultPage] logScan failed:", err));

  const showAdvisory = verdict === "unverified" || verdict === "suspicious";

  return (
    <main className="min-h-screen bg-background">
      {/* ── Animated hero ── */}
      <ResultHero verdict={verdict} confidence={confidence} />

      {/* ── Content ── */}
      <div className="mx-auto max-w-lg space-y-4 px-8 py-8">
        {/* Combined-result badge — shown when sessionId resolved */}
        {combinedResult && (
          <CombinedBadge
            barcodeConfidence={combinedResult.barcode_confidence ?? null}
            imageConfidence={combinedResult.image_confidence ?? null}
          />
        )}

        {/* Product card — verified DB hit */}
        {product && <ProductCard product={product} barcode={barcode} />}

        {/* External product card — found via OBF / Barcode Lookup / UPCitemdb */}
        {!product && externalProduct && (
          <ExternalProductCard product={externalProduct} barcode={barcode} />
        )}

        {/* Advisory */}
        {showAdvisory && <AdvisoryBlock verdict={verdict as "unverified" | "suspicious"} />}

        {/* Inline image upload for unverified — hidden once combined result is present */}
        {!combinedResult && verdict === "unverified" && (
          <InlineImageAnalysis barcode={barcode} sessionId={sessionId} />
        )}

        {/* Photo upsell for suspicious / authentic — lightweight nudge */}
        {!combinedResult && verdict !== "unverified" && <PhotoUpsellBlock />}

        {/* AI text analysis — streams in via Suspense */}
        <Suspense fallback={<AnalysisSkeleton />}>
          <ClaudeAnalysis
            barcode={barcode}
            verdict={verdict}
            confidence={confidence}
            product={product}
          />
        </Suspense>

        {/* Action buttons */}
        <ActionButtons />
      </div>
    </main>
  );
}

// ── Combined result badge ─────────────────────────────────────

function CombinedBadge({
  barcodeConfidence,
  imageConfidence,
}: {
  barcodeConfidence: number | null;
  imageConfidence: number | null;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ backgroundColor: "rgba(125,201,138,0.08)", borderRadius: 12 }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(125,201,138,0.2)" }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M2.5 7L5.5 10L11.5 4" stroke="#7dc98a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="font-syne text-sm font-medium text-lime">
          Combined analysis complete
        </p>
        <p className="font-syne text-xs text-text-secondary">
          Barcode {barcodeConfidence ?? "—"}% · Image {imageConfidence ?? "—"}%
        </p>
      </div>
    </div>
  );
}

// ── Product card ─────────────────────────────────────────────

function ProductCard({ product, barcode }: { product: Product; barcode: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <p className="font-syne text-2xl font-semibold text-lime">
        {product.brand}
      </p>
      <h2 className="mt-1 font-syne text-lg font-semibold text-text-primary">
        {product.name}
      </h2>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="rounded-full px-3 py-1 font-syne text-xs font-medium capitalize text-lime" style={{ backgroundColor: "rgba(125,201,138,0.12)" }}>
          {product.category}
        </span>
        {product.country_of_manufacture && (
          <span className="font-syne text-xs text-text-secondary">
            Made in {product.country_of_manufacture}
          </span>
        )}
        {product.size_ml && (
          <span className="font-syne text-xs text-text-secondary">
            {product.size_ml} ml
          </span>
        )}
      </div>

      <p className="mt-5 font-mono text-sm tracking-wide text-text-secondary">
        {barcode}
      </p>

      {product.packaging_notes && (
        <div className="mt-4 rounded-lg bg-background px-4 py-3">
          <p className="mb-1 font-syne text-xs font-medium uppercase tracking-widest text-text-secondary">
            Packaging note
          </p>
          <p className="font-syne text-sm leading-relaxed text-text-primary">
            {product.packaging_notes}
          </p>
        </div>
      )}

      {product.authenticated_retailers.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 font-syne text-xs font-medium uppercase tracking-widest text-text-secondary">
            Authorised retailers
          </p>
          <div className="flex flex-wrap gap-2">
            {product.authenticated_retailers.map((retailer) => (
              <span
                key={retailer}
                className="rounded-md border border-border bg-background px-2.5 py-1 font-syne text-xs text-text-primary"
              >
                {retailer}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── External product card ─────────────────────────────────────

function ExternalProductCard({
  product,
  barcode,
}: {
  product: ExternalProduct;
  barcode: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      {/* Source badge */}
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 font-syne text-xs text-text-secondary">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
          <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M5 3v2.5l1.5 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        Found via {externalSourceLabel(product.source)}
      </span>

      {product.brand && (
        <p className="mt-3 font-syne text-2xl font-semibold text-lime">
          {product.brand}
        </p>
      )}
      <h2 className="mt-1 font-syne text-lg font-semibold text-text-primary">
        {product.name}
      </h2>

      {product.category && (
        <div className="mt-4">
          <span className="rounded-full px-3 py-1 font-syne text-xs font-medium capitalize text-lime" style={{ backgroundColor: "rgba(125,201,138,0.12)" }}>
            {product.category}
          </span>
        </div>
      )}

      <p className="mt-5 font-mono text-sm tracking-wide text-text-secondary">
        {barcode}
      </p>

      <p className="mt-4 font-syne text-xs leading-relaxed text-text-secondary">
        This product was identified in an external database but is not yet in our verified records. The barcode format is valid — this is likely a genuine product we have not assessed yet.
      </p>
    </div>
  );
}

// ── Advisory block ────────────────────────────────────────────

function AdvisoryBlock({ verdict }: { verdict: "unverified" | "suspicious" }) {
  const isSuspicious = verdict === "suspicious";

  return (
    <div
      className="rounded-lg border-l-4 px-5 py-4"
      style={{
        borderLeftColor: isSuspicious ? "#C0392B" : "#E07B2A",
        backgroundColor: isSuspicious
          ? "rgba(192, 57, 43, 0.07)"
          : "rgba(224, 123, 42, 0.07)",
      }}
    >
      <p className="font-syne text-[15px] leading-relaxed text-text-primary">
        {isSuspicious
          ? "This barcode does not match a recognised product format and may indicate a counterfeit or tampered label. Do not use this product until verified. Purchase only from authorised retailers."
          : "We couldn\u2019t verify this product in our database. It may be unlisted, a regional variant, or potentially counterfeit. Purchase only from authorised retailers."}
      </p>
    </div>
  );
}

// ── Photo upsell block ────────────────────────────────────────

function PhotoUpsellBlock() {
  return (
    <div
      className="flex items-start gap-4 rounded-xl border border-border bg-surface p-5 shadow-sm"
      style={{ borderRadius: 14 }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(125,201,138,0.12)" }}
      >
        <Camera size={18} strokeWidth={1.8} className="text-lime" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-syne text-sm font-medium text-text-primary">
          Want a more detailed analysis?
        </p>
        <p className="mt-0.5 font-syne text-sm text-text-secondary">
          Upload a photo of your packaging for an AI-powered visual check of
          fonts, print quality, and logo accuracy.
        </p>
        <Link
          href="/"
          className={cn(
            "mt-3 inline-flex items-center gap-1.5",
            "font-syne text-sm font-medium text-lime",
            "hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/50"
          )}
        >
          Upload packaging photo
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}

// ── Action buttons ────────────────────────────────────────────

function ActionButtons() {
  return (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
      <Link
        href="/"
        className={cn(
          "flex flex-1 items-center justify-center rounded-xl px-6 py-3",
          "font-syne text-base font-medium text-[#0b1e0f]",
          "transition-colors active:scale-[0.98]"
        )}
        style={{ backgroundColor: "#7dc98a" }}
      >
        Scan Another Product
      </Link>
      <ReportButton
        label="Report This Product"
        className={cn(
          "flex flex-1 items-center justify-center rounded-xl border px-6 py-3",
          "font-syne text-base font-medium text-lime",
          "transition-colors active:scale-[0.98]"
        )}
        style={{ borderColor: "rgba(125,201,138,0.35)", background: "transparent", cursor: "pointer" }}
      />
    </div>
  );
}
