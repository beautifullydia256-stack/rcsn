/**
 * Shared print header for secondary O/A-Level cards — matches primary "Report for Lower Section"
 * (Template3KyoteraReport) layout: 132×132 logo flush left, centered school block, gradient divider, chip + meta.
 */

import { lightenColor } from '../components/reports/templates/helpers';

/** Match primary `generateProfessionalHeaderHTML` — no extra print margins that shift the chip vs on-screen preview. */
export const SECONDARY_LOWER_HEADER_PRINT_CSS = `
          @media print {
            .print-header-container {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
`;

/**
 * One A4 "page" shell for all built-in secondary HTML reports. Body padding is aligned with primary
 * Template3KyoteraPrimaryHTML (Report for Lower Section): same horizontal inset as that template’s `body` rule.
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
          padding: 0.5mm 1.8mm 1mm;
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
 * Passport-style student photo box — matches primary Lower Section card (66×82px, soft blue border).
 */
export const SECONDARY_LOWER_SECTION_STUDENT_PHOTO_CSS = `
        .student-photo {
          width: 66px;
          height: 82px;
          border: 1px solid rgba(191, 219, 254, 0.45);
          border-radius: 9px;
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
 * Numeric styling matches primary `generateProfessionalHeaderHTML` (Report for Lower Section) in
 * `legacySecondaryPdfTemplatesFrom3918d26.ts` so all four secondary templates share the exact header look.
 */
export function buildSecondaryLowerSectionHeaderHtml(
  school: any,
  schoolLogoBase64: string | null | undefined,
  banner: SecondaryLowerHeaderBanner
): string {
  const schoolNameColor = school?.header_school_name_color || '#1e3a8a';
  const subtitleColor = school?.header_subtitle_color || '#3b82f6';
  const addressColor = school?.header_address_color || '#1e40af';
  const contactColor = school?.header_contact_color || '#1e40af';
  const mottoColor = school?.header_motto_color || '#2563eb';
  const dividerColor = school?.header_divider_color || '#1e3a8a';
  const dividerGradient = `linear-gradient(to right, ${escAttr(String(dividerColor))} 0%, ${escAttr(lightenColor(dividerColor))} 50%, ${escAttr(String(dividerColor))} 100%)`;

  const contactEmail = school?.contact_email ?? school?.email ?? '';
  const contactPhone = school?.contact_phone ?? school?.phone ?? '';
  const addressLine = [school?.address, school?.pobox].filter(Boolean).join(' ').trim();

  const chip = escText(String(banner.chipTitle ?? '').toUpperCase());
  const meta = banner.metaLine ? escText(banner.metaLine) : '';

  let centerHtml = '';
  if (school?.name) {
    centerHtml += `<h1 style="font-size:17pt;font-weight:700;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.04em;line-height:1.1;margin:0 0 0.28cm 0;color:${escAttr(String(schoolNameColor))};white-space:nowrap;">${escText(school.name)}</h1>`;
  }
  if (school?.subtitle) {
    centerHtml += `<div style="font-size:11pt;font-family:'Times New Roman',Georgia,serif;font-weight:400;color:${escAttr(String(subtitleColor))};margin-bottom:0.22cm;line-height:1.4;">${escText(school.subtitle)}</div>`;
  }
  if (addressLine) {
    centerHtml += `<div style="font-size:11pt;font-family:'Times New Roman',Georgia,serif;font-weight:600;color:${escAttr(String(addressColor))};margin-bottom:0.2cm;line-height:1.4;">${escText(addressLine)}</div>`;
  }
  if (contactEmail || contactPhone) {
    centerHtml += `<div style="font-size:11pt;font-family:'Times New Roman',Georgia,serif;font-weight:600;color:${escAttr(String(contactColor))};margin-bottom:0.22cm;line-height:1.4;">`;
    if (contactEmail) centerHtml += `<span>${escText(contactEmail)}</span>`;
    if (contactEmail && contactPhone) centerHtml += ` <span style="margin:0 8px;color:#64748b;">|</span> `;
    if (contactPhone) centerHtml += `<span>${escText(contactPhone)}</span>`;
    centerHtml += `</div>`;
  }
  if (school?.motto) {
    centerHtml += `<div style="font-size:10.2pt;font-family:'Times New Roman',Georgia,serif;font-style:italic;font-weight:600;color:${escAttr(String(mottoColor))};margin-bottom:0.3cm;line-height:1.4;letter-spacing:0.02em;">&quot;${escText(school.motto)}&quot;</div>`;
  }

  return `
    <div class="print-header-container" style="padding-top:0.1cm;padding-bottom:0.04cm;padding-left:0;padding-right:0.45cm;background:transparent;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-inside:avoid;break-inside:avoid;">
      <div style="display:flex;align-items:center;min-height:2.1cm;position:relative;">
        <div style="width:150px;height:150px;display:flex;align-items:center;justify-content:center;position:absolute;left:0;margin-left:0;">
          ${logoInnerHtml(school, schoolLogoBase64)}
        </div>
        <div style="flex:1;text-align:center;font-family:'Times New Roman',serif;margin-left:150px;padding-left:0.35cm;">
          ${centerHtml}
        </div>
      </div>
      <div style="height:1px;background:${dividerGradient};margin-top:0.35cm;margin-bottom:0.12cm;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
      <div style="text-align:center;margin-bottom:0.15cm;">
        <div style="display:inline-block;padding:5px 18px;border-radius:16px;font-size:9pt;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#1e3a8a;background:#eff6ff;border:1px solid #bfdbfe;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          ${chip}
        </div>
        ${meta ? `<div style="font-size:8pt;font-family:Arial,Helvetica,sans-serif;color:#64748b;margin-top:0.2cm;font-weight:400;">${meta}</div>` : ''}
      </div>
    </div>`;
}
