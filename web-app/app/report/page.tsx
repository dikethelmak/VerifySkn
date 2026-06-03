import type { Metadata } from "next";
import Link from "next/link";
import { ReportForm } from "@/components/ReportForm";

export const metadata: Metadata = {
  title: "Report a Product",
};

interface PageProps {
  searchParams: { barcode?: string };
}

export default function ReportPage({ searchParams }: PageProps) {
  const barcode = searchParams.barcode ?? "";
  return (
    <main className="min-h-screen bg-background px-4 py-12 flex flex-col items-center">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <p className="font-mono text-xs uppercase tracking-widest text-text-secondary">
            Report
          </p>
          <h1 className="font-syne text-2xl font-semibold text-text-primary">
            Report a product
          </h1>
          <p className="text-sm text-text-secondary">
            Spotted a counterfeit or incorrect listing? Let us know and we&apos;ll investigate.
          </p>
        </div>
        <ReportForm barcode={barcode} />
        <p className="text-center text-xs text-text-secondary">
          <Link href="/" className="underline underline-offset-2 hover:text-text-primary transition-colors">
            Back to scanner
          </Link>
        </p>
      </div>
    </main>
  );
}
