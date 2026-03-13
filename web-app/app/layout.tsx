import type { Metadata } from "next";
import { Fraunces, Rethink_Sans, Space_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { PageTransition } from "@/components/PageTransition";
import "./globals.css";

const rethinkSans = Rethink_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rethink",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://verifyskn.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VerifySkn — Scan Skincare for Authenticity",
    template: "%s — VerifySkn",
  },
  description:
    "Instantly verify skincare product authenticity. Scan any barcode — we cross-reference it against our verified database and AI-analyse the result in seconds.",
  openGraph: {
    siteName: "VerifySkn",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "VerifySkn" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${rethinkSans.variable} ${fraunces.variable} ${spaceMono.variable}`}
    >
      <body className="min-h-screen bg-background font-rethink text-text-primary antialiased">
        <Navbar />
        {/* pt-16 offsets the fixed 64px navbar */}
        <div className="pt-16">
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
