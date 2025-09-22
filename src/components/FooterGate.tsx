"use client";

import { usePathname } from "next/navigation";
import Footer from "@/src/components/Footer";

export default function FooterGate() {
  const pathname = usePathname();
  const show = pathname === "/" || pathname?.startsWith("/library") || pathname?.startsWith("/jobs");
  if (!show) return null;
  return <Footer />;
}


