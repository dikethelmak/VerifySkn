import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1A3C2E",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        {/* Logo mark */}
        <svg width="80" height="80" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="7" fill="rgba(255,255,255,0.12)" />
          <polyline
            points="6,7 16,25 26,7"
            fill="none"
            stroke="#C9A84C"
            stroke-width="4.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>

        {/* Brand name */}
        <div
          style={{
            color: "#ffffff",
            fontSize: 88,
            fontWeight: 600,
            letterSpacing: "-2px",
            marginTop: 28,
            lineHeight: 1,
          }}
        >
          VerifySkn
        </div>

        {/* Gold divider */}
        <div
          style={{
            width: 48,
            height: 3,
            background: "#C9A84C",
            borderRadius: 9999,
            marginTop: 28,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 30,
            fontWeight: 400,
            marginTop: 24,
            letterSpacing: "0.01em",
          }}
        >
          Know What&apos;s Going On Your Skin
        </div>
      </div>
    ),
    { ...size }
  );
}
