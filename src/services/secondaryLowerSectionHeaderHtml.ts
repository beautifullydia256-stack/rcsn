/**
 * Shared print header for secondary O/A-Level cards — matches primary "Report for Lower Section"
 * (Template3KyoteraReport) layout: 132×132 logo flush left, centered school block, gradient divider, chip + meta.
 */

import { lightenColor } from '../components/reports/templates/helpers';

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
 * One A4 "page" shell for all built-in secondary HTML reports — matches primary
 * Template3KyoteraReport (Report for Lower Section): `px-[0.2cm] py-[0.25cm]` plus extra `padding-top: 0.08cm`,
 * `font-size: 10.2pt`, `line-height: 1.3`, exact 210mm × min 297mm, `@page { margin: 0 }`.
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
        }
        body {
          margin: 0 auto;
          width: 210mm;
          min-height: 297mm;
          padding: 0.33cm 0.2cm 0.25cm 0.2cm;
          font-family: 'Times New Roman', 'Times', serif;
          font-size: 10.2pt;
          line-height: 1.3;
          background: #ffffff;
          color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
`;

/**
 * Passport-style student photo box — matches Template3KyoteraReport Lower Section (P.1–P.3).
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
 * Inline HTML fragment (no wrapper document). Use once per report `<body>` after optional watermark.
 */
export function buildSecondaryLowerSectionHeaderHtml(
  school: any,
  schoolLogoBase64: string | null | undefined,
  banner: SecondaryLowerHeaderBanner
): string {
  const nameColor = school?.header_school_name_color || '#1e3a8a';
  const subtitleColor = school?.header_subtitle_color || '#3b82f6';
  const addressColor = school?.header_address_color || '#1e40af';
  const contactColor = school?.header_contact_color || '#1e40af';
  const mottoColor = school?.header_motto_color || '#2563eb';
  const dividerBase = school?.header_divider_color || '#1e3a8a';
  const dividerMid = school?.header_divider_color ? lightenColor(school.header_divider_color) : '#60a5fa';

  const contactEmail = school?.contact_email ?? school?.email ?? '';
  const contactPhone = school?.contact_phone ?? school?.phone ?? '';
  const addressLine = [school?.address, school?.pobox].filter(Boolean).join(' ').trim();

  const chip = escText(String(banner.chipTitle ?? '').toUpperCase());
  const meta = banner.metaLine ? escText(banner.metaLine) : '';

  let centerHtml = '';
  if (school?.name) {
    centerHtml += `<h1 style="font-size:16.5pt;font-weight:700;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.04em;line-height:1.06;margin:0 0 0.22cm 0;color:${escAttr(String(nameColor))};white-space:nowrap;">${escText(school.name)}</h1>`;
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
    if (contactEmail && contactPhone) centerHtml += `<span style="margin:0 8px;color:#64748b;">|</span>`;
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
      <div style="height:1px;background:linear-gradient(to right, ${escAttr(String(dividerBase))} 0%, ${escAttr(String(dividerMid))} 50%, ${escAttr(String(dividerBase))} 100%);margin-top:0.22cm;margin-bottom:0.12cm;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
      <div style="text-align:center;margin-bottom:0.2cm;">
        <div style="display:inline-block;padding:6px 20px;border-radius:18px;font-size:9pt;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#1e3a8a;background:#eff6ff;border:1px solid #bfdbfe;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          ${chip}
        </div>
        ${meta ? `<div style="font-size:7.4pt;color:#64748b;margin-top:0.14cm;font-weight:400;">${meta}</div>` : ''}
      </div>
    </div>`;
}
