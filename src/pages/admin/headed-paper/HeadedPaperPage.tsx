import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, FileText, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";
import AdminPageWrapper, { adminCardClass } from "@/components/layout/AdminPageWrapper";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function darkenHex(hex: string, amt: number): string {
  let col = hex.replace("#", "");
  if (col.length === 3) col = col.split("").map((c) => c + c).join("");
  let r = parseInt(col.substring(0, 2), 16);
  let g = parseInt(col.substring(2, 4), 16);
  let b = parseInt(col.substring(4, 6), 16);
  r = Math.max(0, Math.min(255, r - amt));
  g = Math.max(0, Math.min(255, g - amt));
  b = Math.max(0, Math.min(255, b - amt));
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

export type SchoolInfo = {
  name: string;
  motto: string;
  logo_url: string | null;
  contact_email: string;
  contact_phone: string;
  location: string;
  website: string;
};

async function fetchSchoolForHeadedPaper(): Promise<SchoolInfo | null> {
  let schoolId = useAuthStore.getState().schoolId;
  if (!schoolId) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
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
    name: school.name || "Your school",
    motto: school.motto || "Motto",
    logo_url: school.logo_url || null,
    contact_email: school.contact_email || "",
    contact_phone: school.contact_phone || "",
    location: school.location || "",
    website: school.website || "",
  };
}

function buildPreviewHtml(schoolInfo: SchoolInfo, accent: string, accentDark: string): string {
  const name = escapeHtml(schoolInfo.name);
  const motto = escapeHtml(schoolInfo.motto);
  const logoSrc = schoolInfo.logo_url ? escapeHtml(schoolInfo.logo_url) : "";
  const footerBits = [
    schoolInfo.name,
    schoolInfo.website,
    schoolInfo.contact_phone ? `Tel: ${schoolInfo.contact_phone}` : "",
    schoolInfo.contact_email ? `Email: ${schoolInfo.contact_email}` : "",
    schoolInfo.location,
  ].filter(Boolean);
  const footerLine = escapeHtml(footerBits.join(" • "));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Headed paper preview</title>
  <style>
    :root{
      --accent:${accent};
      --accent-dark:${accentDark};
      --paper-width:210mm;
      --paper-height:297mm;
      --footer-height:36mm;
      --header-height:48mm;
      --font-sans: "Geist", "Segoe UI", system-ui, sans-serif;
    }
    @page { size: A4; margin: 0; }
    html,body{height:100%;margin:0;background:#e8eaef;font-family:var(--font-sans);}

    .sheet-wrap{display:flex;align-items:center;justify-content:center;padding:20px;min-height:100%;box-sizing:border-box}
    .sheet{
      width:var(--paper-width);
      min-height:var(--paper-height);
      background:#fff;
      box-shadow:0 4px 6px -1px rgba(0,0,0,0.08), 0 24px 48px -12px rgba(15,23,42,0.18);
      border-radius:2px;
      position:relative;overflow:hidden;
    }

    .header{display:flex;align-items:center;gap:20px;padding:20px 28px;min-height:var(--header-height);box-sizing:border-box}
    .logo{width:88px;height:88px;background:linear-gradient(145deg,#f1f5f9,#e2e8f0);display:flex;align-items:center;justify-content:center;border-radius:12px;flex:0 0 88px;overflow:hidden;border:1px solid rgba(0,0,0,0.06)}
    .logo img{max-width:100%;max-height:100%;object-fit:contain}
    .head-right{flex:1;min-width:0}
    .school-name{font-size:clamp(18px, 2.2vw, 24px);font-weight:700;color:#0f172a;letter-spacing:-0.02em;line-height:1.2}
    .school-tag{font-size:13px;color:#64748b;margin-top:6px;line-height:1.4}

    .hr{height:1px;background:linear-gradient(90deg,transparent,rgba(15,23,42,0.12),transparent);margin:0 28px}

    .body{min-height:120mm;padding:8px 28px 48mm;box-sizing:border-box}

    .footer-strip{position:absolute;left:0;right:0;bottom:0;height:var(--footer-height);background:linear-gradient(90deg,var(--accent),var(--accent-dark));}
    .footer-info{position:absolute;left:0;right:0;bottom:0;height:var(--footer-height);display:flex;align-items:center;justify-content:center;color:#fff;padding:8mm 14mm;box-sizing:border-box;text-align:center}
    .footer-info .contacts{font-size:11px;line-height:1.45;opacity:0.95;max-width:95%}

    @media print{
      html,body{background:#fff}
      .sheet{box-shadow:none;margin:0;border-radius:0}
      .sheet-wrap{padding:0;min-height:auto}
    }
  </style>
</head>
<body>
  <div class="sheet-wrap">
    <article class="sheet" id="sheet">
      <header class="header">
        <div class="logo" id="logo">
          ${
            schoolInfo.logo_url
              ? `<img id="logoImg" src="${logoSrc}" alt="" style="display:block"/>`
              : `<div id="logoText" style="font-weight:600;color:var(--accent);font-size:10px;text-align:center;line-height:1.35;padding:6px">Add logo<br/><span style="font-size:9px;font-weight:400;opacity:0.85">School Branding</span></div>`
          }
        </div>
        <div class="head-right">
          <div contenteditable="true" id="schoolName" class="school-name">${name}</div>
          <div contenteditable="true" id="schoolTag" class="school-tag">${motto}</div>
        </div>
      </header>
      <div class="hr"></div>
      <main class="body" contenteditable="true"></main>
      <div class="footer-strip" aria-hidden="true"></div>
      <div class="footer-info">
        <div class="contacts" contenteditable="true" id="footerContacts">${footerLine}</div>
      </div>
    </article>
  </div>
</body>
</html>`;
}

const STALE_MS = 5 * 60 * 1000;

export default function HeadedPaperPage() {
  const schoolIdSnapshot = useAuthStore((s) => s.schoolId);
  const userIdSnapshot = useAuthStore((s) => s.user?.id);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [accent, setAccent] = useState("#7c3aed");
  const accentDark = useMemo(() => darkenHex(accent, 72), [accent]);

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

  const previewHtml = useMemo(() => {
    if (!schoolInfo) return "";
    return buildPreviewHtml(schoolInfo, accent, accentDark);
  }, [schoolInfo, accent, accentDark]);

  const resolveHtmlForPdf = useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    const live = doc?.documentElement?.outerHTML;
    if (live?.includes("sheet")) {
      return `<!DOCTYPE html>\n${live}`;
    }
    return previewHtml;
  }, [previewHtml]);

  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    const html = resolveHtmlForPdf();
    if (!html) return;
    setBusy(true);
    try {
      const resp = await fetch("/api/headed-paper/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error || "Failed to generate PDF");
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "headed-paper.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to download PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminPageWrapper
      title="Headed paper"
      subtitle="Letterhead preview matches your school branding. Edit text in the preview, pick an accent for the footer stripe, then download PDF."
    >
      <div className={`${adminCardClass} flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300">
            <FileText className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium ac-text-primary">Live preview</p>
            <p className="mt-1 text-sm ac-text-secondary">
              Logo and defaults come from <span className="font-medium">System Settings → School Branding</span>. Refresh if you have just updated them.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm ac-text-secondary">
            <span className="text-xs font-medium uppercase tracking-wide ac-text-secondary opacity-80">Accent</span>
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded-lg border border-black/10 bg-white p-1 shadow-sm dark:border-white/15 dark:bg-zinc-900"
              aria-label="Footer accent color"
            />
          </label>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/15 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden />
            Refresh data
          </button>

          <button
            type="button"
            disabled={busy || !previewHtml}
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/25 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-400"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FileDown className="h-4 w-4" aria-hidden />}
            {busy ? "Generating…" : "Download PDF"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-200">
          Could not load school details.{" "}
          <button type="button" className="font-semibold underline" onClick={() => void refetch()}>
            Try again
          </button>
        </div>
      )}

      <div
        className={`ac-glass-card overflow-hidden rounded-2xl border border-black/[0.06] shadow-lg dark:border-white/10 ${!previewHtml ? "min-h-[480px]" : ""}`}
      >
        {!previewHtml ? (
          <div className="flex min-h-[480px] flex-col items-center justify-center gap-4 px-6 py-16">
            {isLoading ? (
              <>
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 animate-ping rounded-full bg-violet-400/30" />
                  <Loader2 className="relative h-14 w-14 animate-spin text-violet-600 dark:text-violet-400" aria-hidden />
                </div>
                <p className="text-center text-sm font-medium ac-text-primary">Loading letterhead…</p>
                <p className="max-w-sm text-center text-xs ac-text-secondary">
                  Pulling your school profile. This should only take a moment.
                </p>
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
            className="block w-full border-0 bg-slate-200/60 dark:bg-zinc-950/80"
            style={{ minHeight: "78vh" }}
          />
        )}
      </div>
    </AdminPageWrapper>
  );
}
