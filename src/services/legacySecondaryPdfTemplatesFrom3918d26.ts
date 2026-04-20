/**
 * Secondary and O-Level report HTML — mostly from git commit 3918d26
 * `app/api/reports/generate-pdf/route.ts` (before SPA streamlining).
 *
 * Senior classes (S1–S6): Template 1–3 card HTML is from commit d082d5b (same route file);
 * see `secondaryOlevelHtmlFromD082d5b.ts`. Primary/nursery Kasozi + Kyotera layouts stay 3918d26.
 *
 * Line map (3918d26 file, 1-based):
 * - Nursery helpers for Kasozi Template 2 grid: 4761–5071
 * - lightenColor + generateProfessionalHeaderHTML: 4677–4759
 * - generateTemplate1OLevelHTML: 714–1223
 * - generateTemplate2KasoziHTML: 1225–1910
 * - generateTemplate3KyoteraHTML: 2966–3493
 * - generateOLevelReportHTML: 3495–3936
 * - generateSecondaryReportHTML (A-Level style marks layout): 3938–4306
 *
 * Regenerate: `git show 3918d26:app/api/reports/generate-pdf/route.ts > _tmp_route_3918d26.ts`
 * then `node scripts/extract-legacy-secondary-templates.mjs`.
 */

import { formatCurrency } from '../lib/reportUtils';
import { REPORT_HEADER_DEFAULTS } from '../lib/reportHeaderBrandingDefaults';

import { isALevelClass, isOLevelClass } from '../components/reports/templates/helpers';
import { isPrePrimaryNurseryClass } from '../templates/primary/prePrimaryHolisticRatings';
import {
  generateTemplate1OLevelHTML as d082d5bTemplate1OLevelHTML,
  generateTemplate2KasoziHTML as d082d5bTemplate2KasoziHTML,
  generateTemplate3KyoteraHTML as d082d5bTemplate3KyoteraHTML,
} from './secondaryOlevelHtmlFromD082d5b';
import { buildTemplate3LowerSectionHTML, escapeHtmlText } from './primaryPdfBuiltins';
import { prePrimaryHolisticChecklistToStaticHtml } from './prePrimaryHolisticPdfMarkup';
import { dataUrlForPdfImgSrc } from '../lib/reportImageDataUrl';
import { studentAgeLabelForReport } from '../lib/reportStudentAge';

// --- Nursery helpers (Kasozi / Template 2 skill colour grid) ---
const NURSERY_PERFORMANCE_OPTIONS = [
  { label: 'Very Good', color: '#4CAF50' },
  { label: 'Good', color: '#42A5F5' },
  { label: 'Tries', color: '#FFEB3B' },
  { label: 'Still a Problem', color: '#FF7043' },
  { label: 'Promising', color: '#BA68C8' }
] as const;

type NurserySkillCell = {
  key: string;
  label: string;
};

const NURSERY_PERFORMANCE_COLOR_MAP: Record<string, string> = NURSERY_PERFORMANCE_OPTIONS.reduce((acc, option) => {
  acc[option.label] = option.color;
  return acc;
}, {} as Record<string, string>);

const NURSERY_PERFORMANCE_NORMALIZED_MAP = (() => {
  const map = new Map<string, string>();

  const addVariant = (label: string, ...variants: string[]) => {
    variants.forEach(variant => {
      map.set(variant, label);
    });
  };

  NURSERY_PERFORMANCE_OPTIONS.forEach(({ label }) => {
    const normalized = label.trim().toLowerCase();
    const collapsed = normalized.replace(/\s+/g, '');
    addVariant(label, normalized, collapsed);
  });

  addVariant('Very Good', 'vg');
  addVariant('Good', 'g');
  addVariant('Tries', 't');
  addVariant('Still a Problem', 'stillaproblem', 'still_problem', 'sap', 'problem', 'needsattention');
  addVariant('Promising', 'p', 'promising', 'prom', 'progressing');

  return map;
})();

const NURSERY_SKILL_GRID: NurserySkillCell[][] = [
  [
    { key: 'toilet', label: 'Toilet' },
    { key: 'recognition_of_numbers', label: 'Recognition of numbers' },
    { key: 'property_care', label: 'Property care' },
    { key: 'handling_of_pencil', label: 'Handling of pencil' },
    { key: 're_sighting_alphabet', label: 'Re-sighting Alphabet' },
    { key: 'attention_span', label: 'Attention span' },
    { key: 'punctuality', label: 'Punctuality' },
    { key: 'shading', label: 'Shading' }
  ],
  [
    { key: 'nose_care', label: 'Nose care' },
    { key: 'recognition_of_shapes', label: 'Recognition of shapes' },
    { key: 'respect', label: 'Respect' },
    { key: 'arrival_time', label: 'Arrival time' },
    { key: 'counting_number_sequence', label: 'Counting number sequence' },
    { key: 're_sighting_poems', label: 'Re-sighting Poems' },
    { key: 'love_or_interest', label: 'Love or Interest' },
    { key: 'drawing', label: 'Drawing' }
  ],
  [
    { key: 'recognition_of_letters', label: 'Recognition of letters' },
    { key: 'sharing', label: 'Sharing' },
    { key: 'friendship', label: 'Friendship' },
    { key: 'colours', label: 'Colours' },
    { key: 'playing', label: 'Playing' },
    { key: 'emotional', label: 'Emotional' },
    { key: 'smartness', label: 'Smartness' },
    { key: 'placeholder', label: '' }
  ]
];

const sanitizeNurseryKey = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const normalizeNurseryPerformanceWord = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.toLowerCase();
  const collapsed = normalized.replace(/\s+/g, '');

  if (NURSERY_PERFORMANCE_NORMALIZED_MAP.has(normalized)) {
    return NURSERY_PERFORMANCE_NORMALIZED_MAP.get(normalized)!;
  }

  if (NURSERY_PERFORMANCE_NORMALIZED_MAP.has(collapsed)) {
    return NURSERY_PERFORMANCE_NORMALIZED_MAP.get(collapsed)!;
  }

  for (const [key, canonical] of NURSERY_PERFORMANCE_NORMALIZED_MAP.entries()) {
    if (key === normalized || key === collapsed) {
      return canonical;
    }
  }

  return null;
};

const getNurserySkillKeyVariants = (skill: NurserySkillCell): string[] => {
  const label = skill.label || '';
  const key = skill.key || '';
  const cleanedLabel = label.replace(/&/g, 'and');

  const variants = [
    key,
    cleanedLabel,
    label,
    key.replace(/_/g, ' '),
    key.replace(/_/g, ''),
    cleanedLabel.toLowerCase(),
    label.toLowerCase(),
    cleanedLabel.replace(/\s+/g, '_'),
    cleanedLabel.replace(/\s+/g, ''),
    key.toLowerCase(),
    key.replace(/_/g, '-'),
    cleanedLabel.replace(/\s+/g, '-')
  ];

  const unique = new Set<string>();
  variants.forEach(variant => {
    const sanitized = sanitizeNurseryKey(variant);
    if (sanitized) {
      unique.add(sanitized);
    }
  });

  return Array.from(unique);
};

const gatherNurseryPerformanceSources = (student: any): any[] => {
  const sources: any[] = [];
  const pushIfPresent = (value: any) => {
    if (value !== null && value !== undefined) {
      sources.push(value);
    }
  };

  pushIfPresent(student?.nursery_performance);
  pushIfPresent(student?.nurseryPerformance);
  pushIfPresent(student?.nursery_skills);
  pushIfPresent(student?.nurserySkills);
  pushIfPresent(student?.developmentalSkills);
  pushIfPresent(student?.developmental_skills);
  pushIfPresent(student?.skillAssessments);
  pushIfPresent(student?.skillsChecklist);
  pushIfPresent(student?.skills_checklist);
  pushIfPresent(student?.skills);
  pushIfPresent(student?.summary?.nurserySkills);
  pushIfPresent(student?.summary?.nursery_skills);
  pushIfPresent(student?.summary?.developmentalSkills);
  pushIfPresent(student?.summary?.developmental_skills);
  pushIfPresent(student?.summary?.skillsChecklist);
  pushIfPresent(student?.summary?.skills_checklist);

  if (Array.isArray(student?.results)) {
    student.results.forEach((result: any) => {
      pushIfPresent(result?.nurserySkills);
      pushIfPresent(result?.nursery_skills);
      pushIfPresent(result?.developmentalSkills);
      pushIfPresent(result?.developmental_skills);
      pushIfPresent(result?.skillsChecklist);
      pushIfPresent(result?.skills_checklist);
    });
  }

  return sources;
};

const extractPerformanceFromSource = (source: any, targetKeys: Set<string>): string | null => {
  const tryPush = (rawKey: unknown, rawValue: unknown): string | null => {
    const key = sanitizeNurseryKey(rawKey);
    if (!key || !targetKeys.has(key)) return null;
    const normalizedValue = normalizeNurseryPerformanceWord(rawValue);
    return normalizedValue;
  };

  if (Array.isArray(source)) {
    for (const entry of source) {
      if (!entry) continue;

      if (typeof entry === 'string') {
        const parts = entry.split(/[:\-]/);
        if (parts.length >= 2) {
          const keyCandidate = parts[0];
          const valueCandidate = parts.slice(1).join('-').trim();
          const result = tryPush(keyCandidate, valueCandidate);
          if (result) return result;
        }
        continue;
      }

      if (typeof entry === 'object') {
        const keyCandidates = [
          entry.key,
          entry.skill,
          entry.skill_name,
          entry.skillName,
          entry.name,
          entry.label,
          entry.title,
          entry.description,
          entry.field
        ];

        const valueCandidates = [
          entry.value,
          entry.performance,
          entry.status,
          entry.level,
          entry.assessment,
          entry.rating,
          entry.result,
          entry.word,
          entry.selection,
          entry.score
        ];

        for (const keyCandidate of keyCandidates) {
          if (!keyCandidate) continue;
          for (const valueCandidate of valueCandidates) {
            const result = tryPush(keyCandidate, valueCandidate);
            if (result) return result;
          }
        }

        if (entry.text) {
          const parts = String(entry.text).split(/[:\-]/);
          if (parts.length >= 2) {
            const keyCandidate = parts[0];
            const valueCandidate = parts.slice(1).join('-').trim();
            const result = tryPush(keyCandidate, valueCandidate);
            if (result) return result;
          }
        }
      }
    }
    return null;
  }

  if (typeof source === 'object' && source !== null) {
    for (const [rawKey, rawValue] of Object.entries(source)) {
      const result = tryPush(rawKey, rawValue);
      if (result) return result;
    }
    return null;
  }

  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      return extractPerformanceFromSource(parsed, targetKeys);
    } catch {
      const parts = source.split(/[:\-]/);
      if (parts.length >= 2) {
        const keyCandidate = parts[0];
        const valueCandidate = parts.slice(1).join('-').trim();
        return tryPush(keyCandidate, valueCandidate);
      }
    }
  }

  return null;
};

const resolveNurseryPerformanceValue = (student: any, skill: NurserySkillCell): string | null => {
  if (!skill.label) return null;
  const targetKeys = new Set(getNurserySkillKeyVariants(skill));
  const sources = gatherNurseryPerformanceSources(student);

  for (const source of sources) {
    const value = extractPerformanceFromSource(source, targetKeys);
    if (value) return value;
  }

  return null;
};

const getReadableTextColor = (hex: string): string => {
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized.split('').map(char => char + char).join('');
  }

  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
};

const applyAlphaToHex = (hex: string | null, alpha: number): string => {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized.split('').map(char => char + char).join('');
  }

  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
};

// --- Header helpers (Kyotera / Template 3) ---
// Helper function to lighten a hex color for gradient
function lightenColor(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const lighten = (color: number) => Math.min(255, Math.round(color + (255 - color) * 0.5));
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(lighten(r))}${toHex(lighten(g))}${toHex(lighten(b))}`;
}

// Helper function to generate professional header HTML matching Template 3 and Template 4
function generateProfessionalHeaderHTML(
  school: any,
  schoolLogoBase64: string | null,
  reportTitle: string,
  examSet: any
): string {
  const H = REPORT_HEADER_DEFAULTS;
  const schoolNameColor = school?.header_school_name_color || H.schoolName;
  const subtitleColor = school?.header_subtitle_color || H.subtitle;
  const addressColor = school?.header_address_color || H.address;
  const contactColor = school?.header_contact_color || H.contact;
  const mottoColor = school?.header_motto_color || H.motto;
  const dividerColor = school?.header_divider_color || H.divider;
  const chipText = school?.header_chip_text_color || H.chipText;
  const chipBg = school?.header_chip_background_color || H.chipBackground;
  const chipBorder = school?.header_chip_border_color || H.chipBorder;
  const metaLine = school?.header_meta_line_color || H.metaLine;
  const contactSep = school?.header_contact_separator_color || H.contactSeparator;
  const dividerGradient = `linear-gradient(to right, ${dividerColor} 0%, ${lightenColor(dividerColor)} 50%, ${dividerColor} 100%)`;

  return `
    <div class="print-header-container" style="padding-top: 0.1cm; padding-bottom: 0.04cm; padding-left: 0; padding-right: 0.45cm; background: transparent; -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-inside: avoid; break-inside: avoid;">
      <div style="display: flex; align-items: center; min-height: 2.1cm; position: relative;">
        <div style="width: 150px; height: 150px; display: flex; align-items: center; justify-content: center; position: absolute; left: 0; margin-left: 0;">
          ${schoolLogoBase64 ? `
            <img src="${schoolLogoBase64}" alt="School Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          ` : `
            <div style="width: 100%; height: 100%; border: 1px solid #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f9fafb;">
              <span style="font-size: 9pt; color: #9ca3af; text-align: center; padding: 8px;">School<br/>Logo</span>
            </div>
          `}
        </div>
        <div style="flex: 1; text-align: center; font-family: 'Times New Roman', serif; margin-left: 150px; padding-left: 0.35cm;">
          ${school?.name ? `
            <h1 style="font-size: 17pt; font-weight: 700; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.1; margin: 0 0 0.28cm 0; color: ${schoolNameColor}; white-space: nowrap;">
              ${school.name}
            </h1>
          ` : ''}
          ${school?.subtitle ? `
            <div style="font-size: 11pt; font-family: 'Times New Roman', Georgia, serif; font-weight: 400; color: ${subtitleColor}; margin-bottom: 0.22cm; line-height: 1.4;">
              ${school.subtitle}
            </div>
          ` : ''}
          ${(school?.address || school?.pobox) ? `
            <div style="font-size: 11pt; font-family: 'Times New Roman', Georgia, serif; font-weight: 600; color: ${addressColor}; margin-bottom: 0.2cm; line-height: 1.4;">
              ${school?.address || ''}${school?.address && school?.pobox ? ' ' : ''}${school?.pobox || ''}
            </div>
          ` : ''}
          ${(school?.contact_email || school?.contact_phone) ? `
            <div style="font-size: 11pt; font-family: 'Times New Roman', Georgia, serif; font-weight: 600; color: ${contactColor}; margin-bottom: 0.22cm; line-height: 1.4;">
              ${school?.contact_email || ''}${school?.contact_email && school?.contact_phone ? ` <span style="margin: 0 8px; color: ${contactSep};">|</span> ` : ''}${school?.contact_phone || ''}
            </div>
          ` : ''}
          ${school?.motto ? `
            <div style="font-size: 10.2pt; font-family: 'Times New Roman', Georgia, serif; font-style: italic; font-weight: 600; color: ${mottoColor}; margin-bottom: 0.3cm; line-height: 1.4; letter-spacing: 0.02em;">
              &quot;${school.motto}&quot;
            </div>
          ` : ''}
        </div>
      </div>
      <div style="height: 1px; background: ${dividerGradient}; margin-top: 0.35cm; margin-bottom: 0.12cm; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>
      <div style="text-align: center; margin-bottom: 0.15cm;">
        <div style="display: inline-block; padding: 5px 18px; border-radius: 16px; font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: ${chipText}; background: ${chipBg}; border: 1px solid ${chipBorder}; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          ${reportTitle}
        </div>
        ${(examSet?.name || examSet?.year) ? `
          <div style="font-size: 8pt; font-family: Arial, Helvetica, sans-serif; color: ${metaLine}; margin-top: 0.2cm; font-weight: 400;">
            ${examSet?.name || 'Term Report'} - ${examSet?.year || new Date().getFullYear()}
          </div>
        ` : ''}
      </div>
    </div>
  `
}

// --- Template 1: O-Level (UCE-style card) — HTML from commit d082d5b ---
export function generateTemplate1OLevelHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  return d082d5bTemplate1OLevelHTML(reportData, schoolLogoBase64, studentPhotoBase64);
}

// --- Template 2: Kasozi — senior classes use d082d5b; primary/nursery uses checklist layout below ---
export function generateTemplate2KasoziHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const cls = String(reportData?.students?.[0]?.current_class || '');
  if (isOLevelClass(cls) || isALevelClass(cls)) {
    return d082d5bTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  return generateTemplate2KasoziPrimaryNurseryHTML(reportData, schoolLogoBase64, studentPhotoBase64);
}

function generateTemplate2KasoziPrimaryNurseryHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const plainNurseryA4 = isPrePrimaryNurseryClass(student?.current_class);
  const reportBannerTitle = plainNurseryA4
    ? `${String(student?.current_class || 'Pre-primary').toUpperCase()} - TERMLY REPORT`
    : 'MIDDLE &amp; TOP CLASS - TERMLY REPORT';

  const streamDisplay = student?.stream
    || student?.current_stream
    || student?.stream_name
    || student?.class_stream
    || student?.section
    || 'N/A';

  const reportDateDisplay = (() => {
    const raw = examSet?.date || student?.report_date || student?.summary?.reportDate;
    if (!raw) return 'N/A';
    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? String(raw) : parsed.toLocaleDateString();
  })();

  const feesBalance = student?.feesBalance ?? 0;

  const contactEmail = school?.contact_email || school?.email || '';
  const contactPhone = school?.contact_phone || school?.phone || '';
  const addressLine = [school?.address, school?.pobox].filter(Boolean).join(' ');
  const headerMetaItems = [
    student?.current_class ? `Class: ${student.current_class}` : null,
    streamDisplay && streamDisplay !== 'N/A' ? `Stream: ${streamDisplay}` : null,
    examSet?.term ? `Term: ${examSet.term}` : null,
    examSet?.year ? `Year: ${examSet.year}` : null,
  ].filter(Boolean) as string[];
  const headerMetaLine = headerMetaItems.join(' • ');
  const headerDividerColor = school?.header_divider_color || '#1e3a8a';
  const headerDividerLight = school?.header_divider_color ? lightenColor(school.header_divider_color) : '#60a5fa';
  const studentPhotoSrc = (() => {
    if (typeof studentPhotoBase64 === 'string' && studentPhotoBase64.length > 0) {
      return studentPhotoBase64.startsWith('data:')
        ? studentPhotoBase64
        : `data:image/png;base64,${studentPhotoBase64}`;
    }
    if (typeof student?.profile_photo === 'string' && student.profile_photo.length > 0) {
      return student.profile_photo;
    }
    return null;
  })();

  const nurserySkillRowsHtml = NURSERY_SKILL_GRID.map(row => {
    const cells = row.map(skill => {
      if (!skill.label) {
        return '<td style="border: 2px solid rgba(148,163,184,0.35); padding: 8px 6px; min-height: 42px; background: #ffffff;">&nbsp;</td>';
      }

      const performanceWord = resolveNurseryPerformanceValue(student, skill);
      const fallbackColor = '#e2e8f0';
      const hasPerformance = Boolean(performanceWord);
      const accentColor = performanceWord ? NURSERY_PERFORMANCE_COLOR_MAP[performanceWord] : fallbackColor;
      const textColor = getReadableTextColor(accentColor);
      const cellBackground = hasPerformance ? accentColor : '#f8fafc';
      const labelColor = hasPerformance
        ? (textColor === '#ffffff' ? 'rgba(255,255,255,0.88)' : 'rgba(15,23,42,0.92)')
        : '#1f2937';
      const cellBorderColor = hasPerformance ? accentColor : 'rgba(148,163,184,0.45)';
      const cellShadow = hasPerformance
        ? `0 16px 32px ${applyAlphaToHex(accentColor, 0.35)}`
        : 'inset 0 0 0 1px rgba(148,163,184,0.25)';

      const cellBaseStyles = [
        `border: 2px solid ${cellBorderColor}`,
        'padding: 8px 6px',
        'min-height: 48px',
        'text-align: center',
        'vertical-align: middle',
        'font-weight: 600',
        `background: ${cellBackground}`,
        `box-shadow: ${cellShadow}`
      ];

      return `
        <td style="${cellBaseStyles.join('; ')}">
          <div class="nursery-skill-cell">
            <span class="nursery-skill-label" style="color: ${labelColor};">${skill.label}</span>
          </div>
        </td>
      `;
    }).join('');

    return `<tr>${cells}</tr>`;
  }).join('');

  const nurseryLegendHtml = NURSERY_PERFORMANCE_OPTIONS.map(({ label, color }) => `
    <div class="nursery-legend-item">
      <span class="nursery-legend-swatch" style="background: ${color}"></span>
      <span>${label}</span>
    </div>
  `).join('');

  const prePrimaryMode = (reportData as { prePrimaryReportMode?: 'colour' | 'detailed' }).prePrimaryReportMode ?? 'colour';
  const useHolisticColourPdf = plainNurseryA4 && prePrimaryMode !== 'detailed';

  const classTeacherCommentPdf = escapeHtmlText(
    student?.comments?.class_teacher_text ?? student?.comments?.class_teacher_comment ?? '..............................................................'
  );
  const headTeacherCommentPdf = escapeHtmlText(
    student?.comments?.head_teacher_text ?? student?.comments?.headteacher_text ?? '..............................................................'
  );
  const nextTermPdf = student?.results?.[0]?.next_term_begins_date
    ? escapeHtmlText(new Date(String(student.results[0].next_term_begins_date)).toLocaleDateString())
    : '____________________';

  const nurseryCommentsCardsHtml = plainNurseryA4
    ? `
      <div style="margin-top:8px;margin-bottom:8px;font-size:9pt;background:linear-gradient(135deg,rgba(219,228,255,0.95) 0%,rgba(255,230,242,0.95) 100%);border:2px solid rgba(30,64,175,0.12);border-radius:14px;padding:8px 12px;font-family:'Baloo 2','Comic Sans MS','Comic Neue','Poppins',sans-serif;">
        <h3 style="font-size:10pt;font-weight:600;margin:0 0 4px;color:#1e3a8a;">Class Teacher's Comments:</h3>
        <p style="margin:0 0 4px;">${classTeacherCommentPdf}</p>
        <p style="margin:0 0 8px;">Signature: ______________________</p>
        <h3 style="font-size:10pt;font-weight:600;margin:10px 0 4px;color:#1e3a8a;">Headteacher's Comments:</h3>
        <p style="margin:0 0 4px;">${headTeacherCommentPdf}</p>
        <p style="margin:0;">Signature: ______________________</p>
      </div>
      <div style="margin-bottom:8px;font-size:9pt;background:linear-gradient(135deg,rgba(207,255,226,0.92) 0%,rgba(223,255,204,0.92) 100%);border:2px solid rgba(30,64,175,0.12);border-radius:14px;padding:8px 12px;font-family:'Baloo 2','Comic Sans MS','Comic Neue','Poppins',sans-serif;">
        <p style="margin:0;"><strong>Next term begins on:</strong> ${nextTermPdf}</p>
      </div>`
    : `
      <div style="margin-top:18px;margin-bottom:18px;font-size:10pt;background:linear-gradient(135deg,rgba(219,228,255,0.95) 0%,rgba(255,230,242,0.95) 100%);border:3px solid rgba(30,64,175,0.12);border-radius:18px;padding:12px 16px;font-family:'Baloo 2','Comic Sans MS','Comic Neue','Poppins',sans-serif;">
        <h3 style="font-size:11pt;font-weight:600;margin:0 0 6px;color:#1e3a8a;">Class Teacher's Comments:</h3>
        <p style="margin:0 0 8px;">${classTeacherCommentPdf}</p>
        <p style="margin:0 0 12px;">Signature: ______________________</p>
        <h3 style="font-size:11pt;font-weight:600;margin:16px 0 6px;color:#1e3a8a;">Headteacher's Comments:</h3>
        <p style="margin:0 0 8px;">${headTeacherCommentPdf}</p>
        <p style="margin:0;">Signature: ______________________</p>
      </div>
      <div style="margin-bottom:18px;font-size:10pt;background:linear-gradient(135deg,rgba(207,255,226,0.92) 0%,rgba(223,255,204,0.92) 100%);border:3px solid rgba(30,64,175,0.12);border-radius:18px;padding:12px 16px;font-family:'Baloo 2','Comic Sans MS','Comic Neue','Poppins',sans-serif;">
        <p style="margin:0;"><strong>Next term begins on:</strong> ${nextTermPdf}</p>
      </div>`;

  let middleContent: string;
  if (useHolisticColourPdf) {
    const { gridHtml, legendHtml: holisticLegendHtml } = prePrimaryHolisticChecklistToStaticHtml(reportData as any);
    const holisticFrameStyle = plainNurseryA4
      ? 'padding:5px;background:linear-gradient(135deg,rgba(255,244,209,0.94) 0%,rgba(204,238,255,0.94) 100%);border:3px solid rgba(30,64,175,0.18);border-radius:16px;box-shadow:0 12px 22px rgba(30,64,175,0.14);'
      : 'padding:8px;background:linear-gradient(135deg,rgba(255,244,209,0.94) 0%,rgba(204,238,255,0.94) 100%);border:4px solid rgba(30,64,175,0.18);border-radius:20px;box-shadow:0 20px 36px rgba(30,64,175,0.18);';
    middleContent = `
      <div class="nursery-skill-section">
        <div class="nursery-heading">Developmental Skills Checklist</div>
        <div class="nursery-skill-frame" style="${holisticFrameStyle}">
          ${gridHtml}
        </div>
        ${holisticLegendHtml}
      </div>
      ${nurseryCommentsCardsHtml}`;
  } else {
    middleContent = `
      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>SUBJECT</th>
            <th>FULL MARKS</th>
            <th>MID TERM</th>
            <th>END OF TERM</th>
            <th>TEACHER'S REMARKS</th>
            <th>INITIALS</th>
          </tr>
        </thead>
        <tbody>
          ${(student.results ?? []).length > 0 ? 
            (() => {
              // Group results by subject for processed data
              const all = Array.isArray(student.results) ? student.results : [];
              const isMid = (name: any) => {
                const n = String(name || '').trim().toLowerCase();
                return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
              };
              const isEnd = (name: any) => {
                const n = String(name || '').trim().toLowerCase();
                return n === 'end of term' || n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
              };
              
              const subjectGroups: { [key: string]: { mid?: any; end?: any; subject: string; total_marks: number; remarks: string; initials: string } } = {};
              
              all.forEach((r: any) => {
                const subject = r.subject ?? '';
                const examSetName = r.exam_set_name || '';
                
                if (!subjectGroups[subject]) {
                  subjectGroups[subject] = {
                    subject,
                    total_marks: r.total_marks ?? 100,
                    remarks: '',
                    initials: ''
                  };
                }
                
                if (isMid(examSetName)) {
                  subjectGroups[subject].mid = r.grade === 'MISSED' ? 'MISSED' : (r.marks_obtained ?? '');
                  // Use Mid Term results for remarks and initials if End of Term not available
                  if (!subjectGroups[subject].remarks) {
                    subjectGroups[subject].remarks = r.teacher_remark || '';
                    subjectGroups[subject].initials = r.teacher_initials ?? '';
                  }
                } else if (isEnd(examSetName)) {
                  subjectGroups[subject].end = r.grade === 'MISSED' ? 'MISSED' : (r.marks_obtained ?? '');
                  // Use pre-processed teacher remarks from the processed table
                  subjectGroups[subject].remarks = r.teacher_remark || '';
                  subjectGroups[subject].initials = r.teacher_initials ?? '';
                }
              });
              
              // If no remarks found from any exam set, use any available remarks
              Object.values(subjectGroups).forEach((group: any) => {
                if (!group.remarks) {
                  const anyResult = all.find((r: any) => r.subject === group.subject);
                  if (anyResult) {
                    group.remarks = anyResult.teacher_remark || '';
                    group.initials = anyResult.teacher_initials ?? '';
                  }
                }
              });
              
              const subjects = Object.values(subjectGroups);
              
              return subjects.map((group, idx) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${group.subject}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.total_marks}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.mid ?? ''}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.end ?? ''}</td>
                  <td style="border: 1px solid #000; padding: 6px;">${group.remarks}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.initials}</td>
                </tr>
              `).join('');
            })() : `
              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: center; color: #555;">No results available</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- DEVELOPMENTAL SKILLS TABLE -->
      <div class="nursery-skill-section">
        <div class="nursery-heading">Developmental Skills Checklist</div>
        <div class="nursery-skill-frame">
          <table class="nursery-skill-table">
            <tbody>
              ${nurserySkillRowsHtml}
            </tbody>
          </table>
        </div>
        <div class="nursery-legend">
          ${nurseryLegendHtml}
        </div>
      </div>
      ${nurseryCommentsCardsHtml}`;
  }

  const ageLabelPdf = escapeHtmlText(studentAgeLabelForReport(student, examSet));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }

        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700&display=swap');

        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Baloo 2', 'Comic Sans MS', 'Comic Neue', 'Poppins', sans-serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 0;
          box-sizing: border-box;
          color: #1f2937;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Nursery track only: plain white page + A4 margins; keep Baloo + coloured panels below. */
        body.nursery-plain-a4 {
          padding: 8mm 9mm 7mm 9mm;
          background: #ffffff;
        }
        body.nursery-plain-a4 .nursery-wrapper {
          min-height: 0;
          padding: 0.4cm;
        }
        body.nursery-plain-a4 .print-header-container {
          padding-top: 0.12cm;
          padding-bottom: 0.06cm;
        }
        body.nursery-plain-a4 .nursery-skill-section {
          margin-bottom: 6px;
        }
        body.nursery-plain-a4 .nursery-heading {
          font-size: 10pt;
          margin-bottom: 4px;
        }
        body.nursery-plain-a4 .nursery-paper {
          padding: 0.38cm 0.45cm 0.45cm;
        }

        body:not(.nursery-plain-a4) {
          background: linear-gradient(135deg, #fff7ad 0%, #ffd1dc 40%, #c8f5ff 75%, #e7deff 100%);
        }
        
        .print-header-container {
          padding-top: 0.3cm;
          padding-bottom: 0.12cm;
          padding-right: 0.32cm;
          background: transparent;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .header-flex {
          display: flex;
          align-items: center;
          min-height: 2cm;
          position: relative;
        }
        
        .header-logo {
          width: 120px;
          height: 120px;
          position: absolute;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          border: none;
        }
        
        .header-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .header-logo-placeholder {
          width: 100%;
          height: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          color: #9ca3af;
          font-size: 9pt;
          text-align: center;
          padding: 8px;
        }
        
        .header-center {
          flex: 1;
          margin-left: 120px;
          padding-left: 0.28cm;
          text-align: center;
          font-family: 'Times New Roman', 'Times', serif;
        }
        
        .school-name {
          font-weight: 700;
          font-size: 16pt;
          font-family: Arial, Helvetica, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.045em;
          line-height: 1.06;
          margin: 0 0 0.2cm 0;
          color: ${school?.header_school_name_color || '#1e3a8a'};
          white-space: nowrap;
        }
        
        .school-subtitle {
          font-size: 11pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-weight: 400;
          color: ${school?.header_subtitle_color || '#3b82f6'};
          margin-bottom: 0.16cm;
          line-height: 1.3;
        }
        
        .school-address {
          font-size: 11pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-weight: 600;
          color: ${school?.header_address_color || '#1e40af'};
          margin-bottom: 0.16cm;
          line-height: 1.28;
        }
        
        .school-contact {
          font-size: 10.8pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-weight: 600;
          color: ${school?.header_contact_color || '#1e40af'};
          margin-bottom: 0.16cm;
          line-height: 1.28;
        }
        
        .school-motto {
          font-size: 9.8pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-style: italic;
          font-weight: 600;
          color: ${school?.header_motto_color || '#2563eb'};
          margin-bottom: 0.2cm;
          line-height: 1.32;
        }
        
        .header-divider {
          height: 1px;
          background: linear-gradient(to right, ${headerDividerColor} 0%, ${headerDividerLight} 50%, ${headerDividerColor} 100%);
          margin-top: 0.2cm;
          margin-bottom: 0.18cm;
        }
        
        .report-banner {
          text-align: center;
          margin-bottom: 0.18cm;
        }
        
        .report-chip {
          display: inline-block;
          padding: 6px 22px;
          border-radius: 18px;
          font-size: 9.2pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #1e3a8a;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }
        
        .report-meta {
          font-size: 7.5pt;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-top: 4px;
          color: #1f2937;
        }
        
        .nursery-wrapper {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          padding: 0.6cm;
          box-sizing: border-box;
          border-radius: 26px;
          overflow: hidden;
        }

        .nursery-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 12% 18%, rgba(255,255,255,0.6) 0%, transparent 60%), radial-gradient(circle at 80% 32%, rgba(255,255,255,0.45) 0%, transparent 55%);
          opacity: 0.65;
          pointer-events: none;
        }

        .nursery-paper {
          position: relative;
          z-index: 2;
          background: rgba(255,255,255,0.97);
          border-radius: 26px;
          padding: 0.45cm 0.55cm 0.55cm;
          box-shadow: 0 30px 48px rgba(30,64,175,0.22);
        }

        .student-info {
          margin-bottom: 18px;
          font-size: 10.4pt;
        }
        
        .nursery-student-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          background: linear-gradient(120deg, rgba(255,246,207,0.95) 0%, rgba(255,214,235,0.95) 100%);
          border: 4px solid rgba(30,64,175,0.18);
          border-radius: 20px;
          padding: 10px 16px;
          box-shadow: 0 16px 28px rgba(30,64,175,0.18);
        }

        .nursery-student-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 22px;
        }

        .nursery-student-grid strong {
          color: #1e3a8a;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .nursery-student-photo {
          width: 21mm;
          height: 29mm;
          border: 2px solid #60a5fa;
          background: #ffffff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 6px 14px rgba(30,64,175,0.16);
        }

        .nursery-student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
          font-size: 10pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
        }
        
        th {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 600;
          text-align: center;
        }
        
        .nursery-skill-section {
          margin-bottom: 12px;
        }
        
        .nursery-heading {
          font-size: 11pt;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #0f172a;
        }

        .nursery-skill-table td {
          border: 1px solid #000;
          padding: 0;
        }

        .nursery-skill-frame {
          background: linear-gradient(135deg, rgba(255,244,209,0.94) 0%, rgba(204,238,255,0.94) 100%);
          border: 4px solid rgba(30,64,175,0.18);
          border-radius: 20px;
          padding: 8px;
          box-shadow: 0 20px 36px rgba(30,64,175,0.18);
        }

        .nursery-skill-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
        }

        .nursery-paper .school-name,
        .nursery-paper .school-contact,
        .nursery-paper .report-title,
        .nursery-paper .report-chip,
        .nursery-paper .school-meta {
          font-family: 'Baloo 2', 'Comic Sans MS', 'Comic Neue', 'Poppins', sans-serif !important;
        }

        .nursery-paper .school-name {
          letter-spacing: 0.05em;
        }

        .nursery-skill-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 40px;
          padding: 10px 6px;
        }

        .nursery-skill-label {
          font-size: 8.5pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .nursery-skill-value {
          font-size: 10pt;
          font-weight: 700;
        }

        .nursery-legend {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 18px;
          margin-top: 16px;
          font-size: 9.5pt;
          background: rgba(255,255,255,0.9);
          border-radius: 16px;
          padding: 10px 14px;
          border: 2px dashed rgba(30,64,175,0.24);
          box-shadow: 0 8px 18px rgba(30,64,175,0.12);
        }
        
        .nursery-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        
        .nursery-legend-swatch {
          width: 18px;
          height: 18px;
          border: 1px solid #0f172a;
          border-radius: 4px;
          display: inline-block;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
          font-size: 10pt;
        }
        
        .summary-card {
          border: 1px solid #94a3b8;
          padding: 8px;
          border-radius: 6px;
        }
        
        .comments {
          margin-bottom: 18px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: 600;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .footer {
          text-align: center;
          font-size: 9pt;
          margin-top: 20px;
        }
        
        .watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.15;
          z-index: 0;
          pointer-events: none;
        }
        
        .watermark img {
          width: 58%;
          max-width: 550px;
          object-fit: contain;
        }
      </style>
    </head>
    <body${plainNurseryA4 ? ' class="nursery-plain-a4"' : ''}>
      ${
        (schoolLogoBase64 || school?.logo_url || school?.logo)
          ? `
      <div class="watermark">
              <img src="${schoolLogoBase64 ? (dataUrlForPdfImgSrc(schoolLogoBase64) ?? '') : (school.logo_url || school.logo)}" alt="School Watermark" />
      </div>
          `
          : ''
      }
      
      <div class="print-header-container">
        <div class="header-flex">
          <div class="header-logo">
            ${
              schoolLogoBase64
                ? `<img src="${dataUrlForPdfImgSrc(schoolLogoBase64) ?? ''}" alt="School Logo" />`
                : (school?.logo_url || school?.logo)
                  ? `<img src="${school.logo_url || school.logo}" alt="School Logo" />`
                  : `<div class="header-logo-placeholder">School<br/>Logo</div>`
            }
        </div>
          <div class="header-center">
            ${school?.name ? `<div class="school-name">${school.name}</div>` : ''}
            ${school?.subtitle ? `<div class="school-subtitle">${school.subtitle}</div>` : ''}
            ${addressLine ? `<div class="school-address">${addressLine}</div>` : ''}
            ${(contactEmail || contactPhone) ? `
              <div class="school-contact">
                ${contactEmail ? `<span>${contactEmail}</span>` : ''}
                ${(contactEmail && contactPhone) ? `<span style="margin: 0 8px; color: #64748b;">|</span>` : ''}
                ${contactPhone ? `<span>${contactPhone}</span>` : ''}
        </div>
            ` : ''}
            ${school?.motto ? `<div class="school-motto">"${school.motto}"</div>` : ''}
      </div>
        </div>
        <div class="header-divider"></div>
        <div class="report-banner">
          <div class="report-chip">${reportBannerTitle}</div>
          ${headerMetaLine ? `<div class="report-meta">${headerMetaLine}</div>` : ''}
        </div>
      </div>

      <!-- STUDENT INFO -->
      <div class="student-info nursery-student-info">
        <div class="nursery-student-row">
          <div class="nursery-student-grid">
            <div><strong>STUDENT'S NAME:</strong> ${student.name}</div>
            <div><strong>YEAR:</strong> ${examSet?.year || new Date().getFullYear()}</div>
            <div><strong>STREAM:</strong> ${streamDisplay}</div>
            <div><strong>CLASS:</strong> ${student.current_class}</div>
            ${plainNurseryA4 ? `<div><strong>AGE (YEARS):</strong> ${ageLabelPdf}</div>` : ''}
            <div><strong>ADMISSION NO:</strong> ${student.admission_number || student.student_id}</div>
            <div><strong>TERM:</strong> ${examSet?.term || 'N/A'}</div>
            <div><strong>REPORT DATE:</strong> ${reportDateDisplay}</div>
          </div>
          <div class="nursery-student-photo">
            ${studentPhotoSrc
              ? `<img src="${studentPhotoSrc}" alt="Student Photo" />`
              : '<div class="nursery-photo-placeholder">PHOTO</div>'}
          </div>
        </div>
      </div>

      ${middleContent}
    </body>
    </html>
  `;
}

// --- Template 3: Kyotera — senior classes use d082d5b; primary lower uses shared `buildTemplate3LowerSectionHTML` (same as Vercel PDF) ---
export function generateTemplate3KyoteraHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const cls = String(reportData?.students?.[0]?.current_class || '');
  if (isOLevelClass(cls) || isALevelClass(cls)) {
    return d082d5bTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  void schoolLogoBase64;
  void studentPhotoBase64;
  return buildTemplate3LowerSectionHTML(reportData);
}

// --- Alternate O-Level HTML (legacy route) ---
export function generateOLevelReportHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? '';
  const totalDays = attendance.totalSchoolDays ?? '';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : '';
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', 'Times', serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 2mm 3mm 3mm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        
        .school-logo {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: none;
        }
        
        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border: none;
        }
        
        .school-info {
          text-align: right;
          flex: 1;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 14pt;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        
        .school-contact {
          font-size: 9pt;
          font-weight: normal;
          margin-bottom: 4px;
        }
        
        .school-motto {
          font-size: 10pt;
          font-weight: normal;
          font-style: italic;
          margin-bottom: 4px;
        }
        
        .student-photo {
          width: 54px;
          height: 72px;
          border: 2px solid #ccc;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        
        .student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .report-title {
          background: #1e3a8a;
          color: white;
          text-align: center;
          padding: 5px 12px;
          margin: 6px 0 6px;
          font-size: 10.3pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 6px;
          padding: 5px 6px;
          font-size: 9.4pt;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(191, 219, 254, 0.45);
          border-radius: 9px;
        }
        
        .student-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5px;
        }
        
        .student-info div {
          margin-bottom: 3px;
        }
        
        .student-info strong {
          font-weight: bold;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
        }
        
        th, td {
          border: 1px solid rgba(191, 219, 254, 0.45);
          padding: 3.2px 4.8px;
          text-align: left;
        }
        
        th {
          background: rgba(191, 219, 254, 0.68);
          color: #1e3a8a;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 10px;
          font-size: 9.5pt;
        }
        
        .summary p {
          margin-bottom: 5px;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 12px;
          font-size: 9pt;
        }
        
        .comments h3 {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .next-term {
          margin-bottom: 15px;
          font-size: 9pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 15px;
          font-size: 9pt;
        }
        
        .grading-system h3 {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          margin-bottom: 5px;
        }
        
        .description-table th {
          background: #f0f0f0;
          color: black;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 7.6pt;
          margin-top: 5px;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.1;
          z-index: -1;
          pointer-events: none;
        }
        
        .watermark img {
          width: 480px;
          height: 480px;
          object-fit: contain;
        }
        
        .watermark-placeholder {
          width: 480px;
          height: 480px;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          font-size: 108pt;
          font-weight: bold;
          color: #ccc;
          text-align: center;
          line-height: 1.2;
        }
      </style>
    </head>
    <body>
      <!-- WATERMARK -->
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER - School Logo and Info -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">SCHOOL</div><div style="font-weight: bold;">LOGO</div></div>'}
        </div>
        
        <!-- School Name and Contact -->
        <div class="school-info">
          <div class="school-name">${school?.name || 'EMIRATES COLLEGE SCHOOL'}</div>
          <div class="school-contact">TEL :: ${school?.phone || '0701395594'} | EMAIL :: ${school?.email || 'info@emiratescollege.sc.ug'} | ${school?.address || 'P.O.BOX 31175, KAMPALA, UGANDA'}</div>
          <div class="school-motto">SCHOOL MOTTO: ${school?.motto || 'Education the Future'}</div>
        </div>
        
      </div>

      <!-- REPORT TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || '2'}, ${examSet?.year || '2025'}
      </div>

      <!-- Student Info and Photo - Side by side -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <!-- LEARNER INFO - Left side -->
        <div class="student-info" style="margin-bottom: 0;">
          <div><strong>LNo.:</strong> ${student.admission_number || student.student_id}</div>
          <div><strong>NAME:</strong> ${student.name}</div>
          <div><strong>CLASS & STREAM:</strong> ${student.current_class}</div>
        </div>
        
        <!-- Student Photo - Right side -->
        <div class="student-photo">
          ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">STUDENT<br/>PHOTO</div>'}
        </div>
      </div>

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>Subjects & Topics Covered</th>
            <th>Activity Score [3]</th>
            <th>Descriptor</th>
            <th>Formative Score [20%]</th>
            <th>Exam Score [80%]</th>
            <th>Final Score [100%]</th>
            <th>Grade</th>
            <th>Overall Remark</th>
            <th>Subject Teacher</th>
          </tr>
        </thead>
        <tbody>
          ${student.results.length > 0 ? 
            student.results.map((result: any) => {
              const activity = result.activity_score ?? '';
              const descriptor = result.descriptor != null && result.descriptor !== '' ? String(result.descriptor) : '';
              const formative = result.formative_score ?? '';
              const exam = result.exam_score ?? '';
              const finalScore = result.final_score ?? '';
              const gradeText = result.grade != null && result.grade !== '' ? String(result.grade) : '';
              const overallRemark = result.overall_remark != null ? String(result.overall_remark) : '';
              const teacherInitials = result.teacher_initials ?? '';
              const topic = result.topic || '';

              return `
                <tr>
                  <td>
                    <strong>${result.subject}</strong>
                    <div style="font-size: 9pt; line-height: 1.2; margin-top: 2px;">
                      ${topic}
                    </div>
                  </td>
                  <td class="center">${activity}</td>
                  <td class="center">${descriptor}</td>
                  <td class="center">${formative}</td>
                  <td class="center">${exam}</td>
                  <td class="center">${finalScore}</td>
                  <td class="center">${gradeText}</td>
                  <td style="font-size: 9pt;">${overallRemark}</td>
                  <td class="center">${teacherInitials}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="9" class="center" style="color: #555;">N/A - Student did not sit for this term</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>AVERAGE SCORES:</strong> ${avg} ${avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>

      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <p>${student.comments?.class_teacher_text || 'Shafic is progressing well but needs to focus more on specific subject for better results.'}</p>
        <p>Name: ${student.comments?.class_teacher_name || '__________'} | Signature: ${student.comments?.class_teacher_signature || '__________'} | Date: ${student.comments?.class_teacher_date || '17 September, 2025'}</p>

        <h3>Head Teacher's Comment</h3>
        <p>${student.comments?.head_teacher_text || 'Shafic needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.'}</p>
        <p>Name: ${student.comments?.head_teacher_name || 'NAKIYINGI MARIAM'} | Signature: ${student.comments?.head_teacher_signature || '__________'} | Date: ${student.comments?.head_teacher_date || '17 September, 2025'}</p>
      </div>

      <div class="next-term">
        <strong>Next Term Begins:</strong> ${student?.nextTermBegins || 'Saturday, 13 September, 2025'}
      </div>

      <!-- Grading system & descriptions -->
      <div class="grading-system">
        <h3>Grading System</h3>
        <p><strong>80 - A | 70 - B | 50 - C | 40 - D | 0 - E</strong></p>
        
        <h3>Description</h3>
        <table class="description-table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Achievement Level</th>
              <th>Descriptor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A</td>
              <td>Exceptional</td>
              <td>Demonstrates an extraordinary level of competence by applying innovatively and creatively the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>B</td>
              <td>Outstanding</td>
              <td>Demonstrates a high level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>C</td>
              <td>Satisfactory</td>
              <td>Demonstrates an adequate level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>D</td>
              <td>Basic</td>
              <td>Demonstrates a minimum level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>E</td>
              <td>Elementary</td>
              <td>Demonstrates below the basic level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>Printed from: Pwezacore</div>
      </div>
    </body>
    </html>
  `;
}

// --- Secondary / A-Level marks layout ---
export function generateSecondaryReportHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const nextTermBegins = student?.nextTermBegins || reportData?.nextTermBegins || '______________________';

  // We no longer include attendance block for primary/secondary non O-Level
  const avg = student.summary.average != null ? String(student.summary.average) : 'N/A';
  const avgGrade = student.summary.division != null ? String(student.summary.division) : 'N/A';
  const overallPerf = student.summary.performanceRemark != null ? String(student.summary.performanceRemark) : 'N/A';
  const projects = Array.isArray(student.projects) ? student.projects : [];
  const comments = student.comments || null;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', 'Times', serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        
        .school-logo {
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: none;
          flex-shrink: 0;
        }
        
        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border: none;
        }
        
        .school-info {
          text-align: right;
          flex: 1;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 18pt;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        
        .school-contact {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .school-motto {
          font-size: 11pt;
          font-weight: bold;
          font-style: italic;
        }
        
        .report-title {
          text-align: center;
          margin: 20px 0;
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-meta {
          margin-bottom: 20px;
          font-size: 11pt;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .student-info {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }
        
        .student-photo {
          width: 80px;
          height: 96px;
          border: 2px solid #ccc;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        
        .student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 9pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 4px;
          text-align: left;
        }
        
        th {
          background: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .next-term {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .grading-system h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          margin-bottom: 5px;
        }
        
        .footer {
          text-align: center;
          font-size: 9pt;
          margin-top: 20px;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.1;
          z-index: -1;
          pointer-events: none;
        }
        
        .watermark img {
          width: 900px;
          height: 900px;
          object-fit: contain;
        }
        
        .watermark-placeholder {
          width: 900px;
          height: 900px;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          font-size: 108pt;
          font-weight: bold;
          color: #ccc;
          text-align: center;
          line-height: 1.2;
        }
      </style>
    </head>
    <body>
      <!-- WATERMARK -->
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">SCHOOL</div><div style="font-weight: bold;">LOGO</div></div>'}
        </div>
        
        <!-- School Info -->
        <div class="school-info">
          <div class="school-name">${school?.name || 'School Name'}</div>
          <div class="school-contact">TEL: ${school?.phone || 'Phone'} | EMAIL: ${school?.email || 'Email'} | ${school?.address || 'Address'}</div>
          <div class="school-motto">SCHOOL MOTTO: ${school?.motto || 'Education the Future'}</div>
        </div>
      </div>

      <!-- TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || ''}, ${examSet?.year || ''}
      </div>

      <!-- STUDENT META -->
      <div class="student-meta">
        <div class="student-info">
          <div><strong>LNo.</strong> ${student.admission_number || student.student_id}</div>
          <div><strong>NAME:</strong> ${student.name}</div>
          <div><strong>CLASS & STREAM:</strong> ${student.current_class}</div>
        </div>
        
        <!-- Student Photo -->
        <div class="student-photo">
          ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>'}
        </div>
      </div>

      <!-- ATTENDANCE TABLE REMOVED PER REQUIREMENT -->

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>SUBJECT & PAPER</th>
            <th>MARKS OBTAINED</th>
            <th>TOTAL MARKS</th>
            <th>GRADE</th>
            <th>REMARK</th>
            <th>INITIALS</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
            const coreNames = ['english','mathematics','science','social studies','sst'];
            const core = (student.results || []).filter((r:any) => coreNames.includes(String(r.subject||'').toLowerCase())).slice(0,4);
            return core.length > 0 ? core.map((result: any) => {
              const subject = result.subject ?? '';
              const marksObtained = result.marks_obtained != null ? String(result.marks_obtained) : '';
              const totalMarks = result.total_marks != null ? String(result.total_marks) : '';
              const grade = result.grade ?? '';
              const remark = result.remark ?? result.overall_remark ?? '';
              const initials = result.teacher_initials ?? result.teacher_name ?? '';

              return `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${subject}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${marksObtained}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${totalMarks}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grade}</td>
                  <td style="border: 1px solid #000; padding: 6px;">${remark}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${initials}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: center; color: #555;">N/A - Student did not sit for this term</td>
              </tr>
            `;
          })()}
        </tbody>
      </table>

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>


      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <p>${comments?.class_teacher_text ?? '..............................................................'}</p>
        <p>Name: ${comments?.class_teacher_name ?? '__________'} | Signature: ${comments?.class_teacher_signature ?? '__________'} | Date: ${comments?.class_teacher_date ?? '__________'}</p>

        <h3>Head Teacher's Comment</h3>
        <p>${comments?.head_teacher_text ?? '..............................................................'}</p>
        <p>Name: ${comments?.head_teacher_name ?? '__________'} | Signature: ${comments?.head_teacher_signature ?? '__________'} | Date: ${comments?.head_teacher_date ?? '__________'}</p>
      </div>

      <!-- NEXT TERM & GRADING -->
      <div class="next-term">
        <strong>Next Term Begins:</strong> ${nextTermBegins}
      </div>

      <div class="grading-system">
        <h3>Grading System</h3>
        <p><strong>A (80–100) | B (70–79) | C (50–69) | D (40–49) | E (0–39)</strong></p>
        
        <h3>Grade Descriptions</h3>
        <p>A: Excellent mastery and application of concepts.</p>
        <p>B: Very good understanding with minor gaps.</p>
        <p>C: Satisfactory performance with notable room for improvement.</p>
        <p>D: Below average; needs significant improvement.</p>
        <p>E: Poor performance; urgent intervention required.</p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        Printed from: Pwezacore
      </div>
    </body>
    </html>
  `;
}