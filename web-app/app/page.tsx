import type { Metadata } from "next";
import { HomeClient } from "@/components/HomeClient";

export const metadata: Metadata = {
  title: "VerifySkn — Product Authentication",
  description:
    "Verify skincare product authenticity via serial code, barcode scan, or image analysis.",
};

export default function HomePage() {
  return <HomeClient />;
}
