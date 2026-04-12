/**
 * Shared print header for secondary O/A-Level cards — matches primary "Report for Lower Section"
 * (Template3KyoteraReport) layout: 132×132 logo flush left, centered school block, gradient divider, chip + meta.
 */

import { lightenColor } from '../components/reports/templates/helpers';
import { REPORT_HEADER_DEFAULTS } from '../lib/reportHeaderBrandingDefaults';

/** Match primary `Template3KyoteraReport` print block in `primaryReportTemplates.tsx`. */
export const SECONDARY_LOWER_HEADER_PRINT_CSS = `
          @media print {
            .print-header-container {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-top: 0.28cm !important;
              margin-bottom: 0.18cm !important;
            }
          }
`;

/**
 * A4 shell: body padding matches primary on-screen `Template3KyoteraReport` wrapper (`px-[0.2cm] py-[0.25cm]` +
 * `paddingTop: 0.08cm` override).
 */
export const SECONDARY_A4_PAGE_SHELL_CSS = `
        @page {
          size: A4;
          margin: 0;
        }
        * {
          box-sizing: border-box;
        }
        html {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        body {
          margin: 0 auto;
          width: 100%;
          max-width: 210mm;
          min-height: 297mm;
          padding: 0.08cm 0.2cm 0.25cm 0.2cm;
          font-family: 'Times New Roman', 'Times', serif;
          font-size: 10.2pt;
          line-height: 1.3;
          background: #ffffff;
          color: #0f172a;
          overflow-x: hidden;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        table {
          width: 100%;
          max-width: 100%;
          table-layout: fixed;
        }
        th, td {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
`;

/**
 * Passport photo — matches primary Lower Section inline styles in `Template3KyoteraReport`.
 */
export const SECONDARY_LOWER_SECTION_STUDENT_PHOTO_CSS = `
        .student-photo {
          width: 2.1cm;
          height: 2.9cm;
          border: 1px solid #bfdbfe;
          border-radius: 4px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
`;

function escText(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function examSetNameNorm(examSet: { name?: string } | null | undefined): string {
  return String(examSet?.name ?? '').trim().toLowerCase();
}

/**
 * Standard O-Level (template1) blue chip: wording follows `exam_set.name` (BoT / Mid / EOT),
 * so we do not show "end of term" when the selected set is Beginning of term.
 */
export function secondaryOlevelStandardReportChipTitle(
  examSet: { name?: string; term?: number; year?: number } | null | undefined,
): string {
  const term = examSet?.term ?? 1;
  const year = examSet?.year ?? new Date().getFullYear();
  const n = examSetNameNorm(examSet);
  if (/beginning|(^|\s)bot(\s|$)|b\.?\s*o\.?\s*t\b/.test(n)) {
    return `Learner's beginning of term report card for term ${term}, ${year}`;
  }
  if (/mid\s*term|midterm|mid-term/.test(n) || /\bmid\b/.test(n)) {
    return `Learner's mid term report card for term ${term}, ${year}`;
  }
  if (/\bend\s+of\s+term\b|\beot\b/.test(n) || (/\bend\b/.test(n) && /\bterm\b/.test(n))) {
    return `Learner's end of term report card for term ${term}, ${year}`;
  }
  const name = String(examSet?.name ?? '').trim();
  if (name) {
    return `Learner's report card — ${name} (term ${term}, ${year})`;
  }
  return `Learner's report card for term ${term}, ${year}`;
}

function progressiveTermWord(term: unknown): string {
  const num = parseInt(String(term), 10);
  if (num === 1) return 'One';
  if (num === 2) return 'Two';
  if (num === 3) return 'Three';
  const s = String(term ?? '').trim();
  return s || '—';
}

/**
 * Progressive (template3) chip: exam phase from `exam_set.name` (not always "End of Term").
 */
export function secondaryOlevelProgressiveReportChipTitle(
  examSet: { name?: string; term?: number } | null | undefined,
): string {
  const n = examSetNameNorm(examSet);
  let phase: string;
  if (/beginning|(^|\s)bot(\s|$)|b\.?\s*o\.?\s*t\b/.test(n)) phase = 'Beginning of term';
  else if (/mid\s*term|midterm|mid-term/.test(n) || /\bmid\b/.test(n)) phase = 'Mid term';
  else if (/\bend\s+of\s+term\b|\beot\b/.test(n) || (/\bend\b/.test(n) && /\bterm\b/.test(n)))
    phase = 'End of term';
  else if (String(examSet?.name ?? '').trim()) phase = String(examSet?.name).trim();
  else phase = 'Term report';

  const tw = progressiveTermWord(examSet?.term);
  return `${phase} Term ${tw} Student's Progressive Report`;
}

export type SecondaryLowerHeaderBanner = {
  chipTitle: string;
  metaLine?: string;
};

function logoInnerHtml(school: any, schoolLogoBase64: string | null | undefined): string {
  if (schoolLogoBase64 != null && String(schoolLogoBase64).trim() !== '') {
    const raw = String(schoolLogoBase64);
    const src = raw.startsWith('data:') ? raw : raw;
    return `<img src="${escAttr(src)}" alt="School Logo" style="max-width:100%;max-height:100%;object-fit:contain;" />`;
  }
  const url = school?.logo_url || school?.logo;
  if (url) {
    return `<img src="${escAttr(String(url))}" alt="School Logo" style="max-width:100%;max-height:100%;object-fit:contain;" />`;
  }
  return `<div style="width:100%;height:100%;border:1px solid #d1d5db;border-radius:4px;display:flex;align-items:center;justify-content:center;background:#f9fafb;"><span style="font-size:9pt;color:#9ca3af;text-align:center;padding:8px;">School<br/>Logo</span></div>`;
}

/**
 * Inline HTML fragment — must match primary on-screen **Report for Lower Section** header:
 * `Template3KyoteraReport` → "PRINT-READY PROFESSIONAL HEADER" in `primaryReportTemplates.tsx`
 * (same sizes/colours as React so secondary built-in previews match).
 */
export function buildSecondaryLowerSectionHeaderHtml(
  school: any,
  schoolLogoBase64: string | null | undefined,
  banner: SecondaryLowerHeaderBanner
): string {
  const schoolNameColor = school?.header_school_name_color || REPORT_HEADER_DEFAULTS.schoolName;
  const subtitleColor = school?.header_subtitle_color || REPORT_HEADER_DEFAULTS.subtitle;
  const addressColor = school?.header_address_color || REPORT_HEADER_DEFAULTS.address;
  const contactColor = school?.header_contact_color || REPORT_HEADER_DEFAULTS.contact;
  const mottoColor = school?.header_motto_color || REPORT_HEADER_DEFAULTS.motto;
  const dividerColor = school?.header_divider_color || REPORT_HEADER_DEFAULTS.divider;
  const dividerMid = lightenColor(String(dividerColor).replace(/\s/g, '') || REPORT_HEADER_DEFAULTS.divider);
  const dividerGradient = `linear-gradient(to right, ${escAttr(String(dividerColor))} 0%, ${escAttr(String(dividerMid))} 50%, ${escAttr(String(dividerColor))} 100%)`;
  const chipText = school?.header_chip_text_color || REPORT_HEADER_DEFAULTS.chipText;
  const chipBg = school?.header_chip_background_color || REPORT_HEADER_DEFAULTS.chipBackground;
  const chipBorder = school?.header_chip_border_color || REPORT_HEADER_DEFAULTS.chipBorder;
  const metaLineColor = school?.header_meta_line_color || REPORT_HEADER_DEFAULTS.metaLine;
  const contactSep = school?.header_contact_separator_color || REPORT_HEADER_DEFAULTS.contactSeparator;

  const contactEmail = school?.contact_email ?? school?.email ?? '';
  const contactPhone = school?.contact_phone ?? school?.phone ?? '';
  const addressLine = [school?.address, school?.pobox].filter(Boolean).join(' ').trim();

  const chip = escText(String(banner.chipTitle ?? '').toUpperCase());
  const meta = banner.metaLine ? escText(banner.metaLine) : '';

  let centerHtml = '';
  if (school?.name) {
    centerHtml += `<h1 style="font-size:16.5pt;font-weight:700;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.04em;line-height:1.06;margin:0 0 0.22cm 0;color:${escAttr(String(schoolNameColor))};white-space:nowrap;">${escText(school.name)}</h1>`;
  }
  if (school?.subtitle) {
    centerHtml += `<div style="font-size:11pt;font-family:'Times New Roman',Georgia,serif;font-weight:400;color:${escAttr(String(subtitleColor))};margin-bottom:0.18cm;line-height:1.32;">${escText(school.subtitle)}</div>`;
  }
  if (addressLine) {
    centerHtml += `<div style="font-size:11pt;font-family:'Times New Roman',Georgia,serif;font-weight:600;color:${escAttr(String(addressColor))};margin-bottom:0.16cm;line-height:1.32;">${escText(addressLine)}</div>`;
  }
  if (contactEmail || contactPhone) {
    centerHtml += `<div style="font-size:11pt;font-family:'Times New Roman',Georgia,serif;font-weight:600;color:${escAttr(String(contactColor))};margin-bottom:0.16cm;line-height:1.32;">`;
    if (contactEmail) centerHtml += `<span>${escText(contactEmail)}</span>`;
    if (contactEmail && contactPhone) centerHtml += `<span style="margin:0 8px;color:${escAttr(String(contactSep))};">|</span>`;
    if (contactPhone) centerHtml += `<span>${escText(contactPhone)}</span>`;
    centerHtml += `</div>`;
  }
  if (school?.motto) {
    centerHtml += `<div style="font-size:9.8pt;font-family:'Times New Roman',Georgia,serif;font-style:italic;font-weight:600;color:${escAttr(String(mottoColor))};margin-bottom:0.22cm;line-height:1.32;letter-spacing:0.02em;">&quot;${escText(school.motto)}&quot;</div>`;
  }

  return `
    <div class="print-header-container" style="padding-top:0.28cm;padding-bottom:0.05cm;padding-left:0;padding-right:0.32cm;background:transparent;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-inside:avoid;break-inside:avoid;">
      <div style="display:flex;align-items:center;min-height:2.1cm;position:relative;">
        <div style="width:132px;height:132px;display:flex;align-items:center;justify-content:center;position:absolute;left:0;margin-left:0;">
          ${logoInnerHtml(school, schoolLogoBase64)}
        </div>
        <div style="flex:1;text-align:center;font-family:'Times New Roman',serif;margin-left:132px;padding-left:0.3cm;">
          ${centerHtml}
        </div>
      </div>
      <div style="height:1px;background:${dividerGradient};margin-top:0.22cm;margin-bottom:0.12cm;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
      <div style="text-align:center;margin-bottom:0.2cm;">
        <div style="display:inline-block;padding:6px 20px;border-radius:18px;font-size:9pt;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:${escAttr(String(chipText))};background:${escAttr(String(chipBg))};border:1px solid ${escAttr(String(chipBorder))};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          ${chip}
        </div>
        ${meta ? `<div style="font-size:7.4pt;color:${escAttr(String(metaLineColor))};margin-top:0.14cm;font-weight:400;">${meta}</div>` : ''}
      </div>
    </div>`;
}
