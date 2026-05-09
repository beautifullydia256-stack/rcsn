import { useLocation } from "react-router-dom";
import Footer from "@/components/Footer";

export default function FooterGate() {
  const { pathname } = useLocation();
  const show = pathname === "/" || pathname?.startsWith("/library") || pathname?.startsWith("/jobs");
  if (!show) return null;
  return <Footer />;
}


