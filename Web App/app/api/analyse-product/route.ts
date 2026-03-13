import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  createSupabaseServerClient,
  saveImageAnalysis,
  saveCombinedResult,
  getProductByBarcode,
} from "@/lib/supabase";
import { computeCombinedResult } from "@/lib/scoring";
import type { ScanVerdict } from "@/lib/database.types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type SupportedMime = (typeof VALID_MIME_TYPES)[number];

// ~4 MB image cap (base64 is ~33% larger than raw bytes, so this ≈ 3 MB image)
const MAX_BASE64_BYTES = 4 * 1024 * 1024;

interface RequestBody {
  base64: string;
  mimeType: string;
  sessionId?: string;
  barcode?: string;
}

function toVerdict(raw: unknown): ScanVerdict {
  if (raw === "authentic" || raw === "suspicious" || raw === "unverified") {
    return raw;
  }
  return "unverified";
}

function clampInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
}

export async function POST(req: NextRequest) {
  // ── Auth gate ─────────────────────────────────────────────
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  let body: RequestBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { base64, mimeType, sessionId, barcode } = body;

  if (!base64 || !mimeType) {
    return NextResponse.json({ error: "Missing base64 or mimeType" }, { status: 400 });
  }

  if (base64.length > MAX_BASE64_BYTES) {
    return NextResponse.json({ error: "Image too large. Maximum size is 4 MB." }, { status: 413 });
  }

  if (!VALID_MIME_TYPES.includes(mimeType as SupportedMime)) {
    return NextResponse.json(
      { error: "Unsupported image format. Use JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }

  try {
    // ── Claude Vision call ────────────────────────────────────
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as SupportedMime,
                data: base64,
              },
            },
            {
              type: "text",
              text: `You are an expert skincare product authenticator for VerifySkn. Analyse this product packaging image for authenticity.

Return ONLY valid JSON with no markdown, no code fences, no other text:
{
  "result": "authentic" | "suspicious" | "unverified",
  "confidence": 0-100,
  "summary": "1-2 sentence plain-English visual assessment",
  "flags": ["specific observable concern 1", "specific observable concern 2"],
  "font_quality": "brief assessment of font sharpness and consistency",
  "logo_accuracy": "brief assessment of logo placement, colour and detail accuracy",
  "print_quality": "brief assessment of print resolution and colour consistency",
  "label_alignment": "brief assessment of label placement and straightness",
  "spelling_check": "note any spelling or text errors, or 'No errors found'",
  "hologram_check": "assessment of hologram or security seal if visible, or 'Not visible'"
}

Rules:
- result must be exactly one of: authentic, suspicious, unverified
- confidence is a 0–100 integer
- Keep each text field under 20 words
- flags: 0–4 items, each describing a specific visual concern; empty array if none
- If you cannot clearly see relevant features, use 'unverified' and note limitations`,
            },
          ],
        },
      ],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Strip markdown code fences defensively
    const clean = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(clean);

    const imageResult = toVerdict(parsed.result);
    const imageConfidence = clampInt(parsed.confidence, 50);

    const analysisFields = {
      result: imageResult,
      confidence: imageConfidence,
      summary: String(parsed.summary ?? ""),
      flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 4).map(String) : [],
      font_quality: String(parsed.font_quality ?? ""),
      logo_accuracy: String(parsed.logo_accuracy ?? ""),
      print_quality: String(parsed.print_quality ?? ""),
      label_alignment: String(parsed.label_alignment ?? ""),
      spelling_check: String(parsed.spelling_check ?? ""),
      hologram_check: String(parsed.hologram_check ?? ""),
    };

    // ── Persist image analysis ────────────────────────────────
    await saveImageAnalysis(analysisFields);

    // ── Optional combined result (when barcode was scanned) ───
    let combinedPayload: {
      barcodeResult: ScanVerdict;
      barcodeConfidence: number;
      finalResult: ScanVerdict;
      finalConfidence: number;
    } | null = null;

    if (sessionId && barcode) {
      const product = await getProductByBarcode(barcode);
      const barcodeResult: ScanVerdict = product ? "authentic" : "unverified";
      const barcodeConfidence = product ? 92 : 50;

      const { finalResult, finalConfidence } = computeCombinedResult({
        barcodeResult,
        barcodeConfidence,
        imageResult,
        imageConfidence,
      });

      await saveCombinedResult({
        session_id: sessionId,
        barcode_result: barcodeResult,
        barcode_confidence: barcodeConfidence,
        image_result: imageResult,
        image_confidence: imageConfidence,
        final_result: finalResult,
        final_confidence: finalConfidence,
        product_id: product?.id ?? null,
      });

      combinedPayload = { barcodeResult, barcodeConfidence, finalResult, finalConfidence };
    }

    return NextResponse.json({
      ...analysisFields,
      ...(combinedPayload ?? {}),
    });
  } catch (err) {
    console.error("[api/analyse-product]", err);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
