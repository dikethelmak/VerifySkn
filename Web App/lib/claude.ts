import Anthropic from "@anthropic-ai/sdk";
import type { Product, ScanVerdict } from "./database.types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface VerificationAnalysis {
  summary: string;
  flags: string[];
  recommendation: string;
}

interface AnalysisParams {
  barcode: string;
  product: Product | null;
  verdict: ScanVerdict;
  confidence: number;
}

export async function analyzeProductAuthenticity({
  barcode,
  product,
  verdict,
  confidence,
}: AnalysisParams): Promise<VerificationAnalysis | null> {
  const productContext = product
    ? `Product found in database: ${product.name} by ${product.brand}
Category: ${product.category}
Country of manufacture: ${product.country_of_manufacture}
Size: ${product.size_ml ? `${product.size_ml}ml` : "unspecified"}
Authorised retailers: ${product.authenticated_retailers.join(", ")}
Packaging notes on file: ${product.packaging_notes ?? "none"}`
    : "No matching product found in the VerifySkn database for this barcode.";

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `You are an expert skincare product authenticator for VerifySkn, a consumer product verification service.

Barcode scanned: ${barcode}
Initial verdict: ${verdict} (${confidence}% confidence)
${productContext}

Provide a practical, specific authenticity analysis a consumer can act on immediately.

Return ONLY valid JSON with no markdown, no code fences, no other text:
{
  "summary": "1-2 sentence plain-English summary of this specific result",
  "flags": ["specific physical thing to check 1", "specific physical thing to check 2", "specific physical thing to check 3"],
  "recommendation": "one clear actionable sentence"
}

Rules:
- Keep each flag under 15 words and make it physical/observable
- If the product is authentic, flags should confirm genuine markers to look for
- If unverified or suspicious, flags should be warning signs to inspect
- Be specific to this product and brand where possible`,
        },
      ],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    // Strip markdown code fences if the model wraps the JSON
    const clean = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed: VerificationAnalysis = JSON.parse(clean);

    return {
      summary: String(parsed.summary ?? ""),
      flags: Array.isArray(parsed.flags)
        ? parsed.flags.slice(0, 3).map(String)
        : [],
      recommendation: String(parsed.recommendation ?? ""),
    };
  } catch (err) {
    console.error("[claude] analyzeProductAuthenticity failed:", err);
    return null;
  }
}
