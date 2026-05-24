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
    const { data: urow } = await supabase.from("users").select("school_id").eq("user_id", uid).single();
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

// ─── Colour persistence (localStorage per school) ─────────────────────────────

function loadAccent(schoolId: string): string {
  try { return localStorage.getItem(`hp_accent_${schoolId}`) || "#1e3a5f"; } catch { return "#1e3a5f"; }
}
function saveAccent(schoolId: string, hex: string) {
  try { localStorage.setItem(`hp_accent_${schoolId}`, hex); } catch { /* ignore */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return [r, g, b];
}

async function loadImgDataUrl(url: string): Promise<string | null> {
  if (!url?.trim()) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function imgFormat(dataUrl: string): "PNG" | "JPEG" {
  return dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
}

// ─── HTML preview ─────────────────────────────────────────────────────────────

function buildPreviewHtml(school: SchoolInfo, accent: string): string {
  const name = escapeHtml(school.name);
  const motto = escapeHtml(school.motto);
  const contacts = [
    school.contact_phone ? `Tel: ${school.contact_phone}` : "",
    school.contact_email ? `Email: ${school.contact_email}` : "",
    school.location,
    school.website,
  ].filter(Boolean).map(escapeHtml).join("&ensp;·&ensp;");

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<title>Headed paper</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#d1d5db;font-family:"Segoe UI",system-ui,sans-serif;font-size:14px;color:#0f172a}
  .wrap{display:flex;align-items:flex-start;justify-content:center;padding:28px}
  .sheet{
    width:210mm;min-height:297mm;background:#fff;
    box-shadow:0 2px 8px rgba(0,0,0,0.12),0 16px 40px rgba(0,0,0,0.14);
    position:relative;
  }

  /* ── Header ── */
  .header{display:flex;align-items:flex-start;gap:18px;padding:20px 20mm 16px}
  .logo-wrap{width:70px;height:70px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
  .logo-wrap img{max-width:100%;max-height:100%;object-fit:contain;display:block}
  .logo-placeholder{width:70px;height:70px;border:1.5px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:10px;color:#94a3b8;text-align:center;line-height:1.3}
  .info{flex:1;min-width:0}
  .school-name{font-size:20px;font-weight:700;letter-spacing:-0.02em;line-height:1.15;color:#0f172a}
  .motto{font-size:11px;color:#64748b;margin-top:5px;font-style:italic}
  .header-contacts{font-size:9.5px;color:#475569;margin-top:10px;line-height:1.7}

  /* ── Rules (accent only here) ── */
  .rule-accent{height:1.5px;background:${accent};margin:0 20mm}
  .rule-light{height:0.5px;background:#e2e8f0;margin:12px 20mm}

  /* ── Body area ── */
  .body{padding:14px 20mm}
  .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin-bottom:14px}
  .meta-field{padding-bottom:4px;border-bottom:0.75px solid #94a3b8;margin-bottom:8px}
  .meta-label{font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#94a3b8;margin-bottom:6px}
  .to-field{border-bottom:0.75px solid #94a3b8;padding-bottom:4px;margin-bottom:8px}
  .dear-field{border-bottom:0.75px solid #94a3b8;padding-bottom:4px;margin-bottom:16px;width:60%}
  .lines{display:flex;flex-direction:column;gap:0}
  .line{height:9.5mm;border-bottom:0.5px solid #e2e8f0}
  .sign-section{margin-top:14px}
  .sign-label{font-size:10px;color:#334155;margin-bottom:24px}
  .sign-line{border-bottom:0.75px solid #94a3b8;width:65mm;margin-bottom:4px}
  .sign-sub{font-size:8.5px;color:#64748b}

  /* ── Footer ── */
  .footer{padding:8px 20mm 14px}
  .footer-text{font-size:9px;color:#475569;text-align:center;line-height:1.6}

  @media print{
    html,body{background:#fff}
    .wrap{padding:0}
    .sheet{box-shadow:none}
  }
</style>
</head><body>
<div class="wrap"><div class="sheet">

  <div class="header">
    <div class="logo-wrap">
      ${school.logo_url
        ? `<img src="${escapeHtml(school.logo_url)}" alt="" />`
        : `<div class="logo-placeholder">School<br/>Logo</div>`}
    </div>
    <div class="info">
      <div class="school-name">${name}</div>
      ${motto ? `<div class="motto">${motto}</div>` : ""}
      ${contacts ? `<div class="header-contacts">${contacts}</div>` : ""}
    </div>
  </div>

  <div class="rule-accent"></div>

  <div class="body">
    <div class="meta-grid">
      <div>
        <div class="meta-label">Reference</div>
        <div class="meta-field"></div>
      </div>
      <div>
        <div class="meta-label">Date</div>
        <div class="meta-field"></div>
      </div>
    </div>
    <div>
      <div class="meta-label">To</div>
      <div class="to-field"></div>
    </div>
    <div class="rule-light"></div>
    <div>
      <div class="meta-label">Dear</div>
      <div class="dear-field"></div>
    </div>

    <div class="lines">
      ${Array.from({ length: 18 }, () => `<div class="line"></div>`).join("")}
    </div>

    <div class="sign-section">
      <div class="sign-label">Yours faithfully / sincerely,</div>
      <div class="sign-line"></div>
      <div class="sign-sub">Name &amp; Signature&ensp;/&ensp;Designation</div>
    </div>
  </div>

  <div class="rule-accent"></div>
  <div class="footer">
    <div class="footer-text">${contacts || escapeHtml(school.name)}</div>
  </div>

</div></div>
</body></html>`;
}

// ─── jsPDF generator ──────────────────────────────────────────────────────────

async function generateLetterheadPdf(school: SchoolInfo, accent: string): Promise<void> {
  const [ar, ag, ab] = hexToRgb(accent);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const ML = 20; // left margin
  const MR = 20; // right margin
  const CW = PW - ML - MR; // content width = 170mm

  // ── Load logo ──
  const logoData = school.logo_url ? await loadImgDataUrl(school.logo_url) : null;

  // ── Header ──
  let headerY = 18;

  if (logoData) {
    doc.addImage(logoData, imgFormat(logoData), ML, headerY, 18, 18);
  } else {
    doc.setDrawColor(180, 190, 210);
    doc.setLineWidth(0.4);
    doc.rect(ML, headerY, 18, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(160, 170, 190);
    doc.text("LOGO", ML + 9, headerY + 10, { align: "center" });
  }

  const textX = ML + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(school.name.toUpperCase(), textX, headerY + 6);

  if (school.motto) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(school.motto, textX, headerY + 11.5);
  }

  const contactParts = [
    school.contact_phone ? `Tel: ${school.contact_phone}` : "",
    school.contact_email ? `Email: ${school.contact_email}` : "",
    school.location,
    school.website,
  ].filter(Boolean).join("   ·   ");

  if (contactParts) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(contactParts, textX, headerY + 17, { maxWidth: CW - 22 });
  }

  const ruleY = headerY + 24;

  // ── Top accent rule ──
  doc.setFillColor(ar, ag, ab);
  doc.rect(ML, ruleY, CW, 0.6, "F");

  // ── Reference / Date ──
  let bodyY = ruleY + 10;

  const halfW = (CW - 8) / 2;
  const fields: [string, number, number][] = [
    ["Reference", ML, bodyY],
    ["Date", ML + halfW + 8, bodyY],
  ];

  for (const [label, fx, fy] of fields) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(label.toUpperCase(), fx, fy);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.4);
    doc.line(fx, fy + 7, fx + halfW, fy + 7);
  }

  bodyY += 14;

  // ── To ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("TO", ML, bodyY);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(ML, bodyY + 7, ML + CW, bodyY + 7);

  bodyY += 14;

  // ── Thin separator ──
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(ML, bodyY, ML + CW, bodyY);

  bodyY += 6;

  // ── Dear ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("DEAR", ML, bodyY);
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(ML, bodyY + 7, ML + CW * 0.55, bodyY + 7);

  bodyY += 14;

  // ── Body lines ──
  const lineSpacing = 9;
  const lineCount = 18;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.25);
  for (let i = 0; i < lineCount; i++) {
    const ly = bodyY + i * lineSpacing;
    if (ly > 265) break;
    doc.line(ML, ly, ML + CW, ly);
  }

  const afterLines = Math.min(bodyY + lineCount * lineSpacing, 265);

  // ── Yours faithfully ──
  const signY = afterLines + 6;
  if (signY < 275) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text("Yours faithfully / sincerely,", ML, signY);

    const sigLineY = signY + 14;
    if (sigLineY < 278) {
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.4);
      doc.line(ML, sigLineY, ML + 60, sigLineY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("Name & Signature  /  Designation", ML, sigLineY + 4);
    }
  }

  // ── Bottom accent rule ──
  const footerRuleY = 280;
  doc.setFillColor(ar, ag, ab);
  doc.rect(ML, footerRuleY, CW, 0.6, "F");

  // ── Footer contact line ──
  const footerText = contactParts || school.name;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(footerText, PW / 2, footerRuleY + 6, { align: "center", maxWidth: CW });

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

  const {
    data: schoolInfo,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin", "headed-paper", schoolIdSnapshot ?? userIdSnapshot ?? "resolve"],
    queryFn: fetchSchoolForHeadedPaper,
    staleTime: STALE_MS,
  });

  // Load persisted accent colour once school is known
  useEffect(() => {
    if (schoolInfo?.schoolId) {
      setAccent(loadAccent(schoolInfo.schoolId));
    }
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
      subtitle="Professional school letterhead. Pick an accent colour for the two thin rules, then download a print-ready PDF."
    >
      <div className={`${adminCardClass} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-400/15 dark:text-blue-300">
            <FileText className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium ac-text-primary">Print-ready letterhead</p>
            <p className="mt-1 text-sm ac-text-secondary">
              Logo and school details come from <span className="font-medium">Settings → School Branding</span>.
              The accent colour is used only on the two thin horizontal rules — prints well in black &amp; white too.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm ac-text-secondary cursor-pointer">
            <Palette className="h-4 w-4 ac-text-muted" aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide opacity-70">Accent</span>
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
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileDown className="h-4 w-4" aria-hidden />}
            {busy ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>

      {(error || downloadError) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          {downloadError ?? "Could not load school details."}{" "}
          {!downloadError && (
            <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
              Try again
            </button>
          )}
        </div>
      )}

      <div className={`overflow-hidden rounded-2xl border border-black/[0.06] shadow-lg dark:border-white/10 ${!previewHtml ? "min-h-[520px]" : ""}`}>
        {!previewHtml ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 px-6 py-16 bg-slate-100 dark:bg-zinc-900">
            {isLoading ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 dark:text-blue-400" aria-hidden />
                <p className="text-center text-sm font-medium ac-text-primary">Loading letterhead…</p>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 opacity-30 ac-text-secondary" aria-hidden />
                <p className="text-center text-sm ac-text-secondary">No school data found for your account.</p>
              </>
            )}
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            title="Headed paper preview"
            srcDoc={previewHtml}
            className="block w-full border-0 bg-gray-200"
            style={{ minHeight: "86vh" }}
          />
        )}
      </div>
    </AdminPageWrapper>
  );
}
