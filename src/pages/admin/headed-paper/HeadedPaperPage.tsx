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

function contactLine(s: SchoolInfo): string {
  return [
    s.location,
    s.contact_phone ? `Tel: ${s.contact_phone}` : "",
    s.contact_email ? `Email: ${s.contact_email}` : "",
    s.website,
  ].filter(Boolean).join("   ·   ");
}

// ─── HTML preview ─────────────────────────────────────────────────────────────
// Blank letterhead: header (big name + logo + contacts) + empty body + footer (motto).
// Schools print this, then feed the sheets through the printer for their Word document.

function buildPreviewHtml(school: SchoolInfo, accent: string): string {
  const contacts = contactLine(school);

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

  /* ── Top accent bar ── */
  .top-bar{height:5px;background:${accent};width:100%}

  /* ── Header ── */
  .header{
    display:flex;align-items:center;gap:22px;
    padding:20px 22mm 18px;
  }
  .logo-box{
    flex:0 0 80px;width:80px;height:80px;
    display:flex;align-items:center;justify-content:center;
    overflow:hidden;
  }
  .logo-box img{max-width:100%;max-height:100%;object-fit:contain;display:block}
  .logo-placeholder{
    width:80px;height:80px;border:2px dashed #cbd5e1;
    display:flex;align-items:center;justify-content:center;
    font-size:10px;color:#94a3b8;text-align:center;line-height:1.4;
    padding:6px;
  }
  .school-info{flex:1;min-width:0}
  .school-name{
    font-size:30px;font-weight:800;letter-spacing:-0.025em;
    line-height:1.1;color:#0f172a;text-transform:uppercase;
  }
  .school-location{
    font-size:11px;color:#64748b;margin-top:6px;font-weight:400;
  }
  .school-contacts{
    font-size:10px;color:#475569;margin-top:5px;line-height:1.6;
  }

  /* ── Separator ── */
  .sep{height:2px;background:${accent};margin:0 22mm}

  /* ── Body: completely empty ── */
  .body{min-height:175mm}

  /* ── Footer ── */
  .footer-sep{height:1px;background:${accent};margin:0 22mm}
  .footer{padding:10px 22mm 14px;text-align:center}
  .motto{
    font-size:11.5px;font-style:italic;color:#1e293b;
    margin-bottom:5px;letter-spacing:0.01em;
  }
  .footer-contacts{font-size:9px;color:#64748b;line-height:1.6}

  @media print{
    html,body{background:#fff}
    .wrap{padding:0;min-height:auto}
    .sheet{box-shadow:none}
  }
</style>
</head><body>
<div class="wrap"><div class="sheet">

  <div class="top-bar"></div>

  <div class="header">
    <div class="logo-box">
      ${school.logo_url
        ? `<img src="${esc(school.logo_url)}" alt="${esc(school.name)} logo"/>`
        : `<div class="logo-placeholder">School<br/>Logo</div>`}
    </div>
    <div class="school-info">
      <div class="school-name">${esc(school.name)}</div>
      ${school.location ? `<div class="school-location">${esc(school.location)}</div>` : ""}
      ${contacts ? `<div class="school-contacts">${esc(contacts)}</div>` : ""}
    </div>
  </div>

  <div class="sep"></div>

  <div class="body"></div>

  <div class="footer-sep"></div>
  <div class="footer">
    ${school.motto ? `<div class="motto">"${esc(school.motto)}"</div>` : ""}
    ${contacts ? `<div class="footer-contacts">${esc(contacts)}</div>` : ""}
  </div>

</div></div>
</body></html>`;
}

// ─── jsPDF generator ──────────────────────────────────────────────────────────

async function generateLetterheadPdf(school: SchoolInfo, accent: string): Promise<void> {
  const [ar, ag, ab] = hexToRgb(accent);
  const logoData = school.logo_url ? await loadImgDataUrl(school.logo_url) : null;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;        // page width
  const ML = 22;         // left margin
  const CW = PW - ML * 2; // content width = 166mm

  // ── Top accent bar (5mm) ──
  doc.setFillColor(ar, ag, ab);
  doc.rect(0, 0, PW, 5, "F");

  // ── Logo ──
  const LOGO_SIZE = 28; // mm
  const logoX = ML;
  const logoY = 10;

  if (logoData) {
    doc.addImage(logoData, imgFmt(logoData), logoX, logoY, LOGO_SIZE, LOGO_SIZE);
  } else {
    doc.setDrawColor(180, 195, 215);
    doc.setLineWidth(0.5);
    doc.rect(logoX, logoY, LOGO_SIZE, LOGO_SIZE);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(160, 175, 200);
    doc.text("LOGO", logoX + LOGO_SIZE / 2, logoY + LOGO_SIZE / 2 + 2, { align: "center" });
  }

  // ── School name (very large) ──
  const textX = logoX + LOGO_SIZE + 8; // 8mm gap after logo
  const nameMaxW = CW - LOGO_SIZE - 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  const nameLines = doc.splitTextToSize(school.name.toUpperCase(), nameMaxW) as string[];
  const lineH = 8;
  nameLines.slice(0, 2).forEach((line, i) => {
    doc.text(line, textX, logoY + 9 + i * lineH);
  });

  // ── Location ──
  let infoY = logoY + 9 + Math.min(nameLines.length, 2) * lineH + 2;
  if (school.location) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(school.location, textX, infoY);
    infoY += 5;
  }

  // ── Contact line ──
  const contacts = [
    school.contact_phone ? `Tel: ${school.contact_phone}` : "",
    school.contact_email ? `Email: ${school.contact_email}` : "",
    school.website,
  ].filter(Boolean).join("   ·   ");

  if (contacts) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const contactLines = doc.splitTextToSize(contacts, nameMaxW) as string[];
    contactLines.forEach((line, i) => {
      doc.text(line, textX, infoY + i * 4.5);
    });
  }

  // ── Header separator (accent, 1.5mm below logo bottom) ──
  const sepY = logoY + LOGO_SIZE + 5;
  doc.setFillColor(ar, ag, ab);
  doc.rect(ML, sepY, CW, 1.5, "F");

  // ── Body: completely empty ──
  // (nothing drawn here — this is where Word prints its content)

  // ── Footer separator ──
  const footerSepY = 265;
  doc.setFillColor(ar, ag, ab);
  doc.rect(ML, footerSepY, CW, 0.8, "F");

  // ── Motto ──
  let footerY = footerSepY + 7;
  if (school.motto) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`"${school.motto}"`, PW / 2, footerY, { align: "center", maxWidth: CW });
    footerY += 6;
  }

  // ── Footer contacts ──
  if (contacts) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(contacts, PW / 2, footerY, { align: "center", maxWidth: CW });
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
