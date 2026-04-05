import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/authStore";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type SchoolInfo = {
  name: string;
  motto: string;
  logo_url: string | null;
  contact_email: string;
  contact_phone: string;
  location: string;
  website: string;
};

export default function HeadedPaperPage() {
  const user = useAuthStore((s) => s.user);
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);

  useEffect(() => {
    const fetchSchoolInfo = async () => {
      try {
        if (!user?.id) return;

        const { data: userData } = await supabase
          .from("users")
          .select("school_id")
          .eq("user_id", user.id)
          .single();

        if (!userData?.school_id) return;

        const { data: school } = await supabase
          .from("schools")
          .select("name, motto, logo_url, contact_email, contact_phone, location, website")
          .eq("school_id", userData.school_id)
          .single();

        if (school) {
          setSchoolInfo({
            name: school.name || "Sunrise Junior School",
            motto: school.motto || "Excellence Through Discipline",
            logo_url: school.logo_url || null,
            contact_email: school.contact_email || "info@school.ac.ug",
            contact_phone: school.contact_phone || "+256 700 123456",
            location: school.location || "Kampala",
            website: school.website || "www.school.ac.ug",
          });
        }
      } catch (error) {
        console.error("Error fetching school info:", error);
      }
    };

    fetchSchoolInfo();
  }, [user?.id]);

  useEffect(() => {
    if (!schoolInfo) return;

    const name = escapeHtml(schoolInfo.name);
    const motto = escapeHtml(schoolInfo.motto);
    const logoSrc = schoolInfo.logo_url ? escapeHtml(schoolInfo.logo_url) : "";
    const footerLine = escapeHtml(
      `${schoolInfo.name} • ${schoolInfo.website} • Tel: ${schoolInfo.contact_phone} • Email: ${schoolInfo.contact_email} • ${schoolInfo.location}`
    );

    const template = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>School Headed Paper — Template</title>
  <style>
    :root{
      --accent:#b71c1c;
      --accent-dark:#7f1212;
      --paper-width:210mm;
      --paper-height:297mm;
      --margin:20mm;
      --footer-height:36mm;
      --header-height:48mm;
      --font-sans: "Inter", "Segoe UI", Roboto, Arial, sans-serif;
    }
    @page { size: A4; margin: 0; }
    html,body{height:100%;margin:0;background:#f0f0f0;font-family:var(--font-sans);}

    .sheet-wrap{display:flex;align-items:center;justify-content:center;padding:24px}
    .sheet{
      width:var(--paper-width);
      min-height:var(--paper-height);
      background:white;
      box-shadow:0 8px 30px rgba(0,0,0,0.12);
      position:relative;overflow:hidden;
    }

    .header{display:flex;align-items:center;gap:18px;padding:16px 24px;height:var(--header-height)}
    .logo{width:84px;height:84px;background:#eee;display:flex;align-items:center;justify-content:center;border-radius:6px;flex:0 0 84px;overflow:hidden}
    .logo img{max-width:100%;max-height:100%;object-fit:contain}
    .head-right{flex:1;display:flex;flex-direction:column;align-items:flex-start}
    .school-name{font-size:22px;font-weight:700;color:#111}
    .school-tag{font-size:12px;color:#666;margin-top:4px}

    .hr{height:1px;background:linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.06));margin:0 0 6px 0}

    .footer-strip{position:absolute;left:0;right:0;bottom:0;height:var(--footer-height);background:linear-gradient(90deg,var(--accent),var(--accent-dark));}
    .footer-info{position:absolute;left:0;right:0;bottom:0;height:var(--footer-height);display:flex;align-items:center;justify-content:center;color:white;padding:6mm 12mm;box-sizing:border-box}
    .footer-info .contacts{font-size:12px;opacity:0.98}

    @media print{
      body{background:white}
      .sheet{box-shadow:none;margin:0}
      .sheet-wrap{padding:0}
      .no-print{display:none !important}
      .controls{display:none !important}
    }

    .controls{position:fixed;right:18px;top:18px;display:flex;flex-direction:column;gap:8px;z-index:999}
    .controls button{background:var(--accent);color:white;border:none;padding:10px 12px;border-radius:6px;cursor:pointer}
    .controls .secondary{background:#444}
    input[type=color]{width:100%;cursor:pointer}

  </style>
</head>
<body>

  <div class="controls no-print">
    <div style="display:flex;gap:8px;align-items:center">
      <button id="downloadBtn">Download PDF</button>
      <button id="printBtn" class="secondary">Print</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;padding-top:6px">
      <label style="font-size:12px;color:#222">Accent Color</label>
      <input id="accent" type="color" value="#b71c1c" />
    </div>
  </div>

  <div class="sheet-wrap">
    <article class="sheet" id="sheet">

      <header class="header">
        <div class="logo" id="logo">
          ${
            schoolInfo.logo_url
              ? `<img id="logoImg" src="${logoSrc}" alt="School Badge" style="display:block"/>`
              : `<div id="logoText" style="font-weight:700;color:var(--accent);font-size:11px;text-align:center">NO BADGE<br/><span style="font-size:9px;font-weight:400">Upload in<br/>School Branding</span></div>`
          }
        </div>

        <div class="head-right">
          <div style="display:flex;width:100%">
            <div>
              <div contenteditable id="schoolName" class="school-name">${name}</div>
              <div contenteditable id="schoolTag" class="school-tag">${motto}</div>
            </div>
          </div>
        </div>

      </header>

      <div class="hr"></div>

      <main class="body">
      </main>

      <div class="footer-strip" aria-hidden="true"></div>
      <div class="footer-info">
        <div class="contacts" contenteditable id="footerContacts">${footerLine}</div>
      </div>

    </article>
  </div>

  <script>
    const accentInput = document.getElementById('accent');
    accentInput.addEventListener('input', (e)=>{
      document.documentElement.style.setProperty('--accent', e.target.value);
      const color = e.target.value;
      function darken(hex, amt){
        let col = hex.replace('#','');
        if (col.length===3) col = col.split('').map(c=>c+c).join('');
        let r = parseInt(col.substring(0,2),16);
        let g = parseInt(col.substring(2,4),16);
        let b = parseInt(col.substring(4,6),16);
        r = Math.max(0,Math.min(255, r-amt));
        g = Math.max(0,Math.min(255, g-amt));
        b = Math.max(0,Math.min(255, b-amt));
        return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
      }
      document.documentElement.style.setProperty('--accent-dark', darken(color,80));
    });

    document.getElementById('printBtn').addEventListener('click', ()=>{
      window.print();
    });

    document.getElementById('downloadBtn').addEventListener('click', ()=>{
      window.print();
    });
  </script>
</body>
</html>`;
    setHtml(template);
  }, [schoolInfo]);

  const handleDownload = async () => {
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

  if (!schoolInfo || !html) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
            <p>Loading school information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-white text-2xl font-semibold">Headed paper</h1>
            <p className="text-white/70 text-sm">
              Preview and download school letterhead (editable fields; logo from School Branding).
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
            >
              {busy ? "Generating…" : "Download PDF"}
            </button>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-white/10 bg-white w-full">
          <iframe title="Headed paper preview" srcDoc={html || ""} className="w-full" style={{ minHeight: "80vh" }} />
        </div>
      </div>
    </div>
  );
}
