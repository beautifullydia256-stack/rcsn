import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileText, Loader2, RefreshCw, Palette } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import AdminPageWrapper, { adminCardClass } from "@/components/layout/AdminPageWrapper";
import { jsPDF } from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SchoolInfo = {
  name: string;
  motto: string;
  logo_url: string | null;
  contact_email: string;
  contact_phone: string;
  location: string;
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
    .select("name, motto, logo_url, contact_email, contact_phone, location, website")
    .eq("school_id", schoolId)
    .single();

  if (error || !school) return null;

  return {
    name: school.name || "Your School",
    motto: school.motto || "",
    logo_url: school.logo_url || null,
    contact_email: school.contact_email || "",
    contact_phone: school.contact_phone || "",
    location: school.location || "",
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
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

async function loadImgDataUrl(url: string): Promise<string | null> {
  if (!url?.trim()) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

function imgFmt(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

// ─── HTML preview ─────────────────────────────────────────────────────────────
// Full-width colored header (edge-to-edge) — no side gaps.
// Logo in white box on the left; large school name + organized contacts on the right.
// Completely empty body; footer has motto + thin accent rule spanning the full width.

function buildPreviewHtml(school: SchoolInfo, accent: string): string {
  const phoneLine = school.contact_phone ? `Tel: ${esc(school.contact_phone)}` : "";
  const emailLine = school.contact_email ? `Email: ${esc(school.contact_email)}` : "";
  const webLine   = school.website ? esc(school.website) : "";
  const contactItems = [phoneLine, emailLine, webLine].filter(Boolean).join("  &nbsp;·&nbsp;  ");
  const footerContacts = [phoneLine, emailLine, webLine].filter(Boolean).join("   ·   ");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>Headed paper — ${esc(school.name)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#c8cdd6;font-family:"Segoe UI",Arial,sans-serif;color:#0f172a}
  .wrap{display:flex;justify-content:center;padding:32px 24px;min-height:100vh}
  .sheet{
    width:210mm;min-height:297mm;background:#fff;position:relative;
    box-shadow:0 4px 12px rgba(0,0,0,0.15),0 20px 50px rgba(0,0,0,0.18);
  }

  /* ── Full-width white header with accent bottom border ── */
  .header{
    background:#fff;
    display:flex;align-items:center;gap:20px;
    padding:20px 24px 16px;
    width:100%;
    border-bottom:4px solid ${accent};
  }

  /* Logo — no background box, just the image big and clean */
  .logo-wrap{
    flex:0 0 92px;width:92px;height:92px;
    display:flex;align-items:center;justify-content:center;
    overflow:hidden;
  }
  .logo-wrap img{max-width:100%;max-height:100%;object-fit:contain;display:block}
  .logo-placeholder{
    width:92px;height:92px;border:2px dashed #cbd5e1;border-radius:8px;
    display:flex;align-items:center;justify-content:center;
    font-size:10px;color:#94a3b8;text-align:center;line-height:1.5;
  }

  .school-info{flex:1;min-width:0}
  .school-name{
    font-size:26px;font-weight:800;letter-spacing:-0.02em;
    line-height:1.1;color:${accent};text-transform:uppercase;
  }
  .school-location{
    font-size:11px;color:#475569;margin-top:6px;font-weight:500;
  }
  .school-contacts{
    font-size:10px;color:#64748b;margin-top:4px;line-height:1.7;
  }

  /* ── Body: completely empty ── */
  .body{min-height:175mm}

  /* ── Footer ── */
  .footer-sep{height:1.5px;background:${accent};width:100%}
  .footer{padding:10px 20px 14px;text-align:center}
  .motto{
    font-size:11.5px;font-style:italic;color:#1e293b;
    margin-bottom:4px;letter-spacing:0.01em;
  }
  .footer-contacts{font-size:9px;color:#64748b}

  @media print{
    html,body{background:#fff}
    .wrap{padding:0;min-height:auto}
    .sheet{box-shadow:none}
  }
</style>
</head><body>
<div class="wrap"><div class="sheet">

  <div class="header">
    <div class="logo-wrap">
      ${school.logo_url
        ? `<img src="${esc(school.logo_url)}" alt="${esc(school.name)} logo"/>`
        : `<div class="logo-placeholder">School<br/>Logo</div>`}
    </div>
    <div class="school-info">
      <div class="school-name">${esc(school.name)}</div>
      ${school.location ? `<div class="school-location">${esc(school.location)}</div>` : ""}
      ${contactItems ? `<div class="school-contacts">${contactItems}</div>` : ""}
    </div>
  </div>

  <div class="body"></div>

  <div class="footer-sep"></div>
  <div class="footer">
    ${school.motto ? `<div class="motto">"${esc(school.motto)}"</div>` : ""}
    ${footerContacts ? `<div class="footer-contacts">${footerContacts}</div>` : ""}
  </div>

</div></div>
</body></html>`;
}

// ─── jsPDF generator ──────────────────────────────────────────────────────────

async function generateLetterheadPdf(school: SchoolInfo, accent: string): Promise<void> {
  const [ar, ag, ab] = hexToRgb(accent);
  const logoData = school.logo_url ? await loadImgDataUrl(school.logo_url) : null;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;

  // ── Full-width white header with accent bottom border ──
  const HEADER_H = 50; // mm — taller for bigger logo
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PW, HEADER_H, "F");

  // Accent bottom border rule
  doc.setFillColor(ar, ag, ab);
  doc.rect(0, HEADER_H - 1.5, PW, 1.5, "F");

  // Logo — no white box, just the image directly
  const LOGO_SIZE = 34;
  const logoX = 10;
  const logoY = (HEADER_H - 1.5 - LOGO_SIZE) / 2;

  if (logoData) {
    doc.addImage(logoData, imgFmt(logoData), logoX, logoY, LOGO_SIZE, LOGO_SIZE);
  } else {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(logoX, logoY, LOGO_SIZE, LOGO_SIZE, 2, 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("LOGO", logoX + LOGO_SIZE / 2, logoY + LOGO_SIZE / 2 + 2, { align: "center" });
  }

  // ── School name — accent colour, large, uppercase ──
  const textX = logoX + LOGO_SIZE + 7;
  const nameMaxW = PW - textX - 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(ar, ag, ab); // accent colour
  const nameLines = doc.splitTextToSize(school.name.toUpperCase(), nameMaxW) as string[];
  const lineH = 9;
  let textY = 13;
  nameLines.slice(0, 2).forEach((line, i) => {
    doc.text(line, textX, textY + i * lineH);
  });
  textY += Math.min(nameLines.length, 2) * lineH + 2;

  // ── Location ──
  if (school.location) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(school.location, textX, textY);
    textY += 5;
  }

  // ── Contact line (phone · email · website) ──
  const contacts = [
    school.contact_phone ? `Tel: ${school.contact_phone}` : "",
    school.contact_email ? `Email: ${school.contact_email}` : "",
    school.website,
  ].filter(Boolean).join("   ·   ");

  if (contacts) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    const cLines = doc.splitTextToSize(contacts, nameMaxW) as string[];
    cLines.forEach((line, i) => doc.text(line, textX, textY + i * 4.5));
  }

  // ── Body: completely empty — Word content goes here when printing ──

  // ── Footer — full-width accent rule then motto ──
  const footerSepY = 265;
  doc.setFillColor(ar, ag, ab);
  doc.rect(0, footerSepY, PW, 1, "F"); // full-width, no side margins

  let footerY = footerSepY + 7;
  if (school.motto) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`"${school.motto}"`, PW / 2, footerY, { align: "center", maxWidth: PW - 40 });
    footerY += 6;
  }

  if (contacts) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(contacts, PW / 2, footerY, { align: "center", maxWidth: PW - 40 });
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

  return (
    <AdminPageWrapper
      eyebrow="Branding"
      title="Headed paper"
      subtitle="Print blank copies of this letterhead. Type your letters in Word with no header — then print on these pre-printed sheets."
    >
      <div className={`${adminCardClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
            <FileText className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium ac-text-primary">School letterhead</p>
            <p className="mt-1 text-sm ac-text-secondary">
              Logo and details come from <span className="font-medium">Settings → School Branding</span>.
              The accent colour appears only on the thin rules — safe for black &amp; white printing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Palette className="h-4 w-4 ac-text-muted" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide ac-text-secondary opacity-70">Accent</span>
            <input
              type="color"
              value={accent}
              onChange={(e) => handleAccentChange(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-black/10 bg-white p-0.5 shadow-sm dark:border-white/15 dark:bg-zinc-900"
              aria-label="Accent colour for ruled lines"
            />
          </label>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="ac-glass-btn-secondary inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium ac-text-primary disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>

          <button
            type="button"
            disabled={busy || !schoolInfo}
            onClick={() => void handleDownload()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {busy
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              : <FileDown className="h-4 w-4" aria-hidden />}
            {busy ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>

      {(error || downloadError) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200 flex items-center justify-between gap-3">
          <span>{downloadError ?? "Could not load school details."}</span>
          {downloadError
            ? <button onClick={() => setDownloadError(null)} className="font-bold text-lg leading-none opacity-60 hover:opacity-100">×</button>
            : <button className="font-semibold underline" onClick={() => void refetch()}>Try again</button>}
        </div>
      )}

      <div className={`overflow-hidden rounded-2xl border border-black/[0.06] shadow-lg dark:border-white/10 ${!previewHtml ? "min-h-[520px]" : ""}`}>
        {!previewHtml ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 bg-slate-100 dark:bg-zinc-900">
            {isLoading
              ? <><Loader2 className="h-10 w-10 animate-spin text-blue-600" /><p className="text-sm ac-text-secondary">Loading…</p></>
              : <><FileText className="h-12 w-12 opacity-25 ac-text-secondary" /><p className="text-sm ac-text-secondary">No school data found.</p></>}
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="Headed paper preview"
            srcDoc={previewHtml}
            className="block w-full border-0 bg-gray-300"
            style={{ minHeight: "90vh" }}
          />
        )}
      </div>
    </AdminPageWrapper>
  );
}
