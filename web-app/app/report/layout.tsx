import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report a Counterfeit Skincare Product",
  description:
    "Help protect your community. Report counterfeit, mislabelled, or suspicious skincare products. Our team reviews every report.",
  openGraph: {
    title: "Report a Counterfeit Skincare Product — VerifySkn",
    description:
      "Help protect your community. Report counterfeit, mislabelled, or suspicious skincare products. Our team reviews every report.",
  },
};

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
