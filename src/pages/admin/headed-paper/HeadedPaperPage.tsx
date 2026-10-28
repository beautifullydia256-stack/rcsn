import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileText, RefreshCw, Palette, Building2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import { jsPDF } from "jspdf";
import { GovPageLoader, GovRollingBox } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SchoolInfo = {
  name: string;
  subtitle: string;
  motto: string;
  logo_url: string | null;
  contact_email: string;
  contact_phone: string;
  address: string;
  pobox: string;
  website: string;
  schoolId: string;
};

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function fetchSchoolForHeadedPaper(): Promise<SchoolInfo | null> {
  let schoolId = useAuthStore.getState().schoolId;
  if (!schoolId) {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return null;
    const { data: urow } = await supabase
      .from("users").select("school_id").eq("user_id", uid).single();
    schoolId = urow?.school_id ?? null;
  }
  if (!schoolId) return null;

  const { data: school, error } = await supabase
    .from("schools")
    .select("name, subtitle, motto, logo_url, contact_email, contact_phone, address, pobox, location, website")
    .eq("school_id", schoolId)
    .single();

  if (error || !school) return null;

  return {
    name: school.name || "Rakai Community School of Nursing",
    subtitle: school.subtitle || "",
    motto: school.motto || "",
    logo_url: school.logo_url || null,
    contact_email: school.contact_email || "",
    contact_phone: school.contact_phone || "",
    address: school.address || school.location || "",
    pobox: school.pobox || "",
    website: school.website || "",
    schoolId,
  };
}

// ─── Colour persistence ───────────────────────────────────────────────────────

function loadAccent(schoolId: string): string {
  try { return localStorage.getItem(`hp_accent_${schoolId}`) || "#1e3a5f"; }
  catch { return "#1e3a5f"; }
}
function saveAccent(schoolId: string, hex: string) {
  try { localStorage.setItem(`hp_accent_${schoolId}`, hex); } catch { /* */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

async function loadImgDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function imgFmt(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

// ─── HTML Preview Builder ─────────────────────────────────────────────────────

function buildPreviewHtml(school: SchoolInfo, accent: string): string {
  const addressLine = [school.address, school.pobox].filter(Boolean).join(" · ");
  const contactParts = [
    school.contact_email ? `Email: ${esc(school.contact_email)}` : null,
    school.contact_phone ? `Tel: ${esc(school.contact_phone)}` : null,
    school.website ? `Web: ${esc(school.website)}` : null,
  ].filter(Boolean);
  const contactLine = contactParts.join(" &nbsp;|&nbsp; ");
  const footerLine = [school.contact_email, school.contact_phone, school.website].filter(Boolean).join("   |   ");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#e2e8f0;font-family:'Times New Roman',Georgia,serif;display:flex;justify-content:center;padding:24px 0}
  .sheet{width:210mm;min-height:297mm;background:#fff;border:1px solid #cbd5e1;box-shadow:0 4px 12px rgba(0,0,0,0.1);display:flex;flex-direction:column;justify-content:space-between;padding:12mm 14mm}
  .header{display:flex;align-items:center;gap:18px;border-bottom:2px solid ${accent};padding-bottom:12px;margin-bottom:16px}
  .logo-wrap{width:70px;height:70px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
  .logo-wrap img{max-width:100%;max-height:100%;object-fit:contain}
  .logo-placeholder{width:70px;height:70px;border:1px dashed #94a3b8;display:flex;align-items:center;justify-content:center;font-size:9px;color:#94a3b8;text-align:center}
  .school-info{flex:1;min-width:0}
  .school-name{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:18pt;font-weight:900;color:${accent};letter-spacing:-0.02em;line-height:1.1;text-transform:uppercase}
  .school-address{font-size:9.5pt;font-weight:bold;color:#334155;margin-top:4px}
  .school-contact{font-size:9pt;font-weight:bold;color:#475569;margin-top:2px}
  .body{flex:1;min-height:180mm;padding:20px 0}
  .watermark{display:flex;align-items:center;justify-content:center;height:100%;opacity:0.04;font-size:32pt;font-family:sans-serif;font-weight:900;text-transform:uppercase;letter-spacing:0.1em}
  .footer{border-top:1px solid #374151;padding-top:8px;text-align:center}
  .footer-motto{font-size:9.5pt;font-style:italic;font-weight:bold;color:#1e293b;margin-bottom:3px}
  .footer-contacts{font-size:8.5pt;color:#64748b}
  @media print{
    body{background:#fff;padding:0}
    .sheet{border:none;box-shadow:none;width:100%;height:100%}
  }
</style>
</head><body>
<div class="sheet">
  <div class="header">
    <div class="logo-wrap">
      ${school.logo_url
        ? `<img src="${esc(school.logo_url)}" alt="${esc(school.name)} logo"/>`
        : `<div class="logo-placeholder">OFFICIAL<br/>EMBLEM</div>`}
    </div>
    <div class="school-info">
      <div class="school-name">${esc(school.name)}</div>
      ${addressLine ? `<div class="school-address">${esc(addressLine)}</div>` : ""}
      ${contactLine ? `<div class="school-contact">${contactLine}</div>` : ""}
    </div>
  </div>

  <div class="body">
    <div class="watermark">${esc(school.name)}</div>
  </div>

  <div class="footer">
    ${school.motto ? `<div class="footer-motto">&quot;${esc(school.motto)}&quot;</div>` : ""}
    ${footerLine ? `<div class="footer-contacts">${esc(footerLine)}</div>` : ""}
  </div>
</div>
</body></html>`;
}

// ─── jsPDF generator ──────────────────────────────────────────────────────────

async function generateLetterheadPdf(school: SchoolInfo, accent: string): Promise<void> {
  const [ar, ag, ab] = hexToRgb(accent);
  const logoData = school.logo_url ? await loadImgDataUrl(school.logo_url) : null;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;

  // Logo
  const LOGO_SIZE = 26;
  const logoX = 14;
  const logoY = 12;

  if (logoData) {
    doc.addImage(logoData, imgFmt(logoData), logoX, logoY, LOGO_SIZE, LOGO_SIZE);
  } else {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.rect(logoX, logoY, LOGO_SIZE, LOGO_SIZE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("EMBLEM", logoX + LOGO_SIZE / 2, logoY + LOGO_SIZE / 2 + 2, { align: "center" });
  }

  // ── School text ──
  const textX = logoX + LOGO_SIZE + 6;
  const nameMaxW = PW - textX - 14;
  let textY = logoY + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(ar, ag, ab);
  const nameLines = doc.splitTextToSize(school.name.toUpperCase(), nameMaxW) as string[];
  nameLines.forEach((line, i) => {
    doc.text(line, textX, textY + i * 8);
  });
  textY += nameLines.length * 8 + 2;

  const addressLine = [school.address, school.pobox].filter(Boolean).join("  ·  ");
  if (addressLine) {
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const aLines = doc.splitTextToSize(addressLine, nameMaxW) as string[];
    aLines.forEach((line, i) => doc.text(line, textX, textY + i * 4.5));
    textY += aLines.length * 4.5 + 1;
  }

  const contactParts = [school.contact_email, school.contact_phone].filter(Boolean);
  if (contactParts.length > 0) {
    doc.setFont("times", "bold");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const cLine = contactParts.join("   |   ");
    const cLines = doc.splitTextToSize(cLine, nameMaxW) as string[];
    cLines.forEach((line, i) => doc.text(line, textX, textY + i * 4.5));
    textY += cLines.length * 4.5 + 1;
  }

  // ── Header Separator ──
  const logoBottom = logoY + LOGO_SIZE;
  const headerSepY = Math.max(textY + 3, logoBottom + 4);
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(0.6);
  doc.line(14, headerSepY, PW - 14, headerSepY);

  // ── Footer Separator ──
  const footerSepY = 282;
  doc.setDrawColor(55, 65, 81);
  doc.setLineWidth(0.35);
  doc.line(14, footerSepY, PW - 14, footerSepY);

  let footerY = footerSepY + 4.5;
  if (school.motto) {
    doc.setFont("times", "bolditalic");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(`"${school.motto}"`, PW / 2, footerY, { align: "center", maxWidth: PW - 40 });
    footerY += 4.5;
  }

  const footerContacts = [school.contact_email, school.contact_phone, school.website].filter(Boolean).join("   |   ");
  if (footerContacts) {
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(footerContacts, PW / 2, footerY, { align: "center", maxWidth: PW - 40 });
  }

  const safeName = school.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-").toLowerCase();
  doc.save(`letterhead-${safeName}.pdf`);
}

// ─── Component ────────────────────────────────────────────────────────────────

const STALE_MS = 5 * 60 * 1000;

export default function HeadedPaperPage() {
  const schoolIdSnapshot = useAuthStore((s) => s.schoolId);
  const userIdSnapshot = useAuthStore((s) => s.user?.id);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [accent, setAccent] = useState("#1e3a5f");
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const { data: schoolInfo, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["admin", "headed-paper", schoolIdSnapshot ?? userIdSnapshot ?? "resolve"],
    queryFn: fetchSchoolForHeadedPaper,
    staleTime: STALE_MS,
  });

  useEffect(() => {
    if (schoolInfo?.schoolId) setAccent(loadAccent(schoolInfo.schoolId));
  }, [schoolInfo?.schoolId]);

  const handleAccentChange = useCallback((hex: string) => {
    setAccent(hex);
    if (schoolInfo?.schoolId) saveAccent(schoolInfo.schoolId, hex);
  }, [schoolInfo?.schoolId]);

  const previewHtml = useMemo(() => {
    if (!schoolInfo) return "";
    return buildPreviewHtml(schoolInfo, accent);
  }, [schoolInfo, accent]);

  const handleDownload = async () => {
    if (!schoolInfo) return;
    setDownloadError(null);
    setBusy(true);
    try {
      await generateLetterheadPdf(schoolInfo, accent);
    } catch (e: unknown) {
      setDownloadError(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading && !schoolInfo) {
    return (
      <div className="admin-terminal-page space-y-5 p-4">
        <GovPageLoader message="LOADING OFFICIAL INSTITUTIONAL LETTERHEAD SPECIFICATION..." minHeight="min-h-[40vh]" />
      </div>
    );
  }

  return (
    <div className="admin-terminal-page space-y-5 p-4">
      {/* ── 1. OFFICIAL INSTITUTIONAL MASTHEAD ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111111] uppercase font-mono">
            OFFICIAL HEADED PAPER &amp; LETTERHEAD DESK
          </h1>
          <p className="text-xs text-[#555555] font-mono tracking-wider uppercase mt-0.5">
            STANDARDIZED ACCREDITED INSTITUTIONAL STATIONERY • REPUBLIC OF UGANDA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gov-btn gov-btn-secondary gov-btn-sm flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <button
            type="button"
            disabled={busy || !schoolInfo}
            onClick={() => void handleDownload()}
            className="gov-btn gov-btn-primary gov-btn-sm flex items-center gap-1.5"
          >
            {busy ? <GovRollingBox size="xs" /> : <FileDown className="w-3.5 h-3.5" />}
            <span>{busy ? 'GENERATING...' : 'DOWNLOAD OFFICIAL PDF'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. MONOCHROME KPI SUMMARY METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            INSTITUTION NAME
          </div>
          <div className="text-sm font-bold font-mono text-[#111111] mt-1 truncate uppercase">
            {schoolInfo?.name || 'RAKAI COMMUNITY SCHOOL OF NURSING'}
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            OFFICIAL REGISTERED TITLE
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            ACCENT RULE SPEC
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="w-4 h-4 border border-[#000000] inline-block shrink-0"
              style={{ backgroundColor: accent }}
            />
            <span className="text-sm font-bold font-mono text-[#111111] uppercase">
              {accent}
            </span>
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            HEADER DIVIDER STRIPE
          </div>
        </div>

        <div className="gov-card p-3">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#555555]">
            PAGE SPECIFICATION
          </div>
          <div className="text-sm font-bold font-mono text-[#111111] mt-1 uppercase">
            ISO 216 A4 (210 × 297 MM)
          </div>
          <div className="text-[10px] font-mono text-[#777777] mt-1 uppercase">
            PORTRAIT CORRESPONDENCE STANDARD
          </div>
        </div>
      </div>

      {/* ── 3. CONTROL & COLOR BAR ── */}
      <div className="gov-control-bar flex flex-wrap items-center justify-between gap-3 p-3 bg-white border border-[#CCCCCC]">
        <div className="flex items-center gap-3">
          <Palette className="w-4 h-4 text-[#555555]" />
          <span className="text-xs font-mono uppercase text-[#111111] font-bold">
            RULE ACCENT COLOR:
          </span>
          <input
            type="color"
            value={accent}
            onChange={(e) => handleAccentChange(e.target.value)}
            className="w-8 h-7 cursor-pointer border border-[#CCCCCC] p-0.5 bg-white"
            aria-label="Accent colour for ruled lines"
          />
          <span className="text-[11px] font-mono text-[#777777]">
            (Safe for both color &amp; grayscale administrative reproduction)
          </span>
        </div>

        <span className="text-[11px] font-mono text-[#555555] uppercase">
          PRE-PRINTED CORRESPONDENCE READY
        </span>
      </div>

      {(error || downloadError) && (
        <div className="gov-card p-3 border-l-4 border-l-rose-600 bg-rose-50 text-xs font-mono text-rose-800 flex items-center justify-between">
          <span>{downloadError ?? "Could not load institutional branding details."}</span>
          <button
            type="button"
            onClick={() => setDownloadError(null)}
            className="font-bold underline"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* ── 4. OFFICIAL HIGH-DENSITY PREVIEW CONTAINER ── */}
      <div className="gov-card p-0 border border-[#CCCCCC] overflow-hidden bg-[#E2E8F0]">
        {!previewHtml ? (
          <div className="p-16 text-center font-mono text-xs text-[#777777]">
            NO INSTITUTIONAL DATA FOUND.
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="Official letterhead preview"
            srcDoc={previewHtml}
            className="block w-full border-0"
            style={{ minHeight: "85vh" }}
          />
        )}
      </div>
    </div>
  );
}
