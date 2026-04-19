/**
 * Template HTML Generator - PRESENTATION ONLY
 * 
 * This file contains extracted template HTML generation functions
 * from app/api/reports/generate-pdf/route.ts
 * 
 * CRITICAL: These functions are used ONLY for rendering HTML.
 * All calculations are pre-done in snapshot.
 * All data comes from cached report_data.
 */

import { supabase } from '../lib/supabase';
import { REPORT_HEADER_DEFAULTS } from '../lib/reportHeaderBrandingDefaults';
import { formatAverageWhole, formatCurrency } from '../lib/reportUtils';
import { isALevelClass, isOLevelClass } from '../components/reports/templates/helpers';
import {
  generateTemplate1OLevelHTML,
  generateTemplate2KasoziHTML,
  generateTemplate3KyoteraHTML,
  generateSecondaryReportHTML,
} from './legacySecondaryPdfTemplatesFrom3918d26';
import { generateTemplate4AlevelHTML } from './template4AlevelHtml';
import { assertSecondaryBuiltinTemplatesAllowed } from './reportSecondaryBuiltinGuards';

// ============================================================================
// TYPES AND CONSTANTS
// ============================================================================

export type NurseryCommentRole = 'class_teacher' | 'head_teacher';
export type NurseryAutoCommentMap = Record<NurseryCommentRole, Record<string, string>>;

export const NURSERY_PERFORMANCE_OPTIONS = [
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

export const NURSERY_SKILL_GRID: NurserySkillCell[][] = [
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Load nursery auto comments from database
 */
export async function loadNurseryAutoComments(): Promise<NurseryAutoCommentMap> {
  const base: NurseryAutoCommentMap = {
    class_teacher: {},
    head_teacher: {}
  };

  try {
    const { data, error } = await supabase
      .from('nursery_auto_comments')
      .select('role, grade_letter, comment');

    if (error || !data) {
      if (error) {
        console.warn('Failed to load nursery auto comments:', error);
      }
      return base;
    }

    data.forEach(row => {
      const role = (row.role || '').trim().toLowerCase() as NurseryCommentRole;
      const grade = (row.grade_letter || '').trim().toUpperCase();
      if (!role || !grade) return;
      if (role !== 'class_teacher' && role !== 'head_teacher') return;
      base[role][grade] = row.comment || '';
    });

    return base;
  } catch (err) {
    console.warn('Error loading nursery auto comments:', err);
    return base;
  }
}

/**
 * Load custom template from Supabase
 */
export async function loadCustomTemplate(schoolId: string, templateId?: string): Promise<{ html: string; css: string } | null> {
  try {
    let query = supabase
      .from('report_templates')
      .select('html_content, css_content')
      .eq('school_id', schoolId);
    
    if (templateId) {
      query = query.eq('id', templateId);
    } else {
      query = query.eq('is_default', true);
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) {
      console.log('No custom template found, using default');
      return null;
    }
    
    return {
      html: data.html_content,
      css: data.css_content || ''
    };
  } catch (error) {
    console.error('Error loading custom template:', error);
    return null;
  }
}

/**
 * Replace placeholders in custom template
 */
export function replaceTemplatePlaceholders(
  html: string,
  css: string,
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  const { school, examSet, students } = reportData;
  const student = students[0];
  
  // Replace common placeholders
  let processedHtml = html
    .replace(/\[SCHOOL_NAME\]/g, school?.name || 'School Name')
    .replace(/\[SCHOOL_ADDRESS\]/g, school?.address || 'Address')
    .replace(/\[SCHOOL_PHONE\]/g, school?.phone || 'Phone')
    .replace(/\[SCHOOL_EMAIL\]/g, school?.email || 'Email')
    .replace(/\[SCHOOL_MOTTO\]/g, school?.motto || 'Motto')
    .replace(/\[STUDENT_ID\]/g, student.admission_number || student.student_id || '')
    .replace(/\[STUDENT_NAME\]/g, student.name || '')
    .replace(/\[STUDENT_CLASS\]/g, student.current_class || '')
    .replace(/\[TERM\]/g, examSet?.term || '')
    .replace(/\[YEAR\]/g, examSet?.year || '')
    .replace(/\[AVERAGE_SCORE\]/g, formatAverageWhole(student.summary?.average, ''))
    .replace(/\[OVERALL_GRADE\]/g, student.summary?.division || '')
    .replace(/\[POSITION\]/g, student.summary?.position || '')
    .replace(/\[TEACHER_COMMENT\]/g, student.comments?.class_teacher_text || '')
    .replace(/\[TEACHER_NAME\]/g, student.comments?.class_teacher_name || '')
    .replace(/\[DATE\]/g, new Date().toLocaleDateString());
  
  // Replace school logo
  if (schoolLogoBase64) {
    processedHtml = processedHtml.replace(
      /<div[^>]*class="[^"]*school-logo[^"]*"[^>]*>[\s\S]*?<\/div>/g,
      `<div class="school-logo"><img src="${schoolLogoBase64}" alt="School Logo" /></div>`
    );
  }
  
  // Replace student photo
  if (studentPhotoBase64) {
    processedHtml = processedHtml.replace(
      /<div[^>]*class="[^"]*student-photo[^"]*"[^>]*>[\s\S]*?<\/div>/g,
      `<div class="student-photo"><img src="${studentPhotoBase64}" alt="Student Photo" /></div>`
    );
  }
  
  // Replace results table with actual data
  if (student.results && student.results.length > 0) {
    const resultsRows = student.results.map((result: any) => `
      <tr>
        <td>${result.subject || ''}</td>
        <td>${result.marks_obtained || result.exam_score || ''}</td>
        <td>${result.total_marks || '100'}</td>
        <td>${result.grade || ''}</td>
        <td>${result.remark || result.overall_remark || ''}</td>
      </tr>
    `).join('');
    
    processedHtml = processedHtml.replace(
      /<tbody>[\s\S]*?<\/tbody>/g,
      `<tbody>${resultsRows}</tbody>`
    );
  }
  
  // For primary format (not secondary O/A-Level), strip attendance table/fields so PDF matches preview
  try {
    const cls = student.current_class || '';
    const isPrimary = !isOLevelClass(cls) && !isALevelClass(cls);
    if (isPrimary) {
      // Remove attendance placeholders if present
      processedHtml = processedHtml
        .replace(/\[DAYS_PRESENT\]/g, '')
        .replace(/\[DAYS_ABSENT\]/g, '')
        .replace(/\[TOTAL_DAYS\]/g, '');
      // Remove any table that contains Days Present/Days Absent/Total in header
      processedHtml = processedHtml.replace(/<table[\s\S]*?<thead>[\s\S]*?<tr>[\s\S]*?<th>\s*Days\s*Present\s*<\/th>[\s\S]*?<th>\s*Days\s*Absent\s*<\/th>[\s\S]*?<th>\s*Total\s*<\/th>[\s\S]*?<\/tr>[\s\S]*?<\/thead>[\s\S]*?<\/table>/i, '');
    }
  } catch {}
  
  return processedHtml;
}

/**
 * Helper function to convert image URL to base64 data URL
 */
export async function convertImageToBase64(url: string): Promise<string | null> {
  try {
    if (!url || url.trim() === '') {
      console.log('No image URL provided');
      return null;
    }
    
    console.log('Converting image to base64:', url);
    
    // Add timeout to fetch request (optimized for faster processing)
    const controller = new AbortController();
    const timeout = 3000;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('Image fetch failed:', response.status, response.statusText);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      console.log('Image buffer is empty');
      return null;
    }
    
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    console.log('Image converted successfully, size:', buffer.byteLength, 'bytes, type:', contentType);
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

/**
 * Helper function to lighten a hex color for gradient
 */
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

/**
 * Helper function to generate professional header HTML matching Template 3 and Template 4
 */
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
  `;
}

// ============================================================================
// NURSERY SKILL ASSESSMENT HELPER FUNCTIONS
// ============================================================================

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

// ============================================================================
// SECONDARY / O-LEVEL TEMPLATES (verbatim restore: git 3918d26 generate-pdf route)
// Full source: ./legacySecondaryPdfTemplatesFrom3918d26.ts
// ============================================================================

export {
  generateTemplate1OLevelHTML,
  generateTemplate2KasoziHTML,
  generateTemplate3KyoteraHTML,
  generateOLevelReportHTML,
  generateSecondaryReportHTML,
} from './legacySecondaryPdfTemplatesFrom3918d26';

/**
 * Generate Template 4 Upper Section HTML (Primary Report)
 * Still pending extraction into this module; primary PDFs use api/pdf built-ins.
 */
export function generateTemplate4UpperSectionHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  const student = reportData?.students?.[0];
  const className = student?.current_class || '';
  if (isALevelClass(className)) {
    return generateTemplate4AlevelHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  void schoolLogoBase64;
  void studentPhotoBase64;
  throw new Error(
    'generateTemplate4UpperSectionHTML: primary upper (P4–P7) template4 is built in api/pdf/generate.ts, not this browser bundle.'
  );
}

/**
 * Template 6 Nursery HTML — still pending full port from 3918d26 route (lines 1912–2964).
 */
export function generateTemplateNurseryCindrelinahHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null,
  nurseryAutoComments?: NurseryAutoCommentMap
): string {
  void reportData;
  void schoolLogoBase64;
  void studentPhotoBase64;
  void nurseryAutoComments;
  throw new Error(
    'generateTemplateNurseryCindrelinahHTML — full HTML not yet ported from historical route'
  );
}

/**
 * Primary Report HTML (Template 4 duplicate) — not used when api/pdf built-ins run.
 */
export function generatePrimaryReportHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  void reportData;
  void schoolLogoBase64;
  void studentPhotoBase64;
  throw new Error('generatePrimaryReportHTML — use primary built-in PDF path');
}

/**
 * Select appropriate template based on class and template key
 * Returns HTML string using cached data only
 */
export function renderTemplateHTML(
  reportData: any,
  templateKey: string,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  const student = reportData.students[0];
  const className = student?.current_class || '';
  const isLowerSection = /(primary\s*[123]|p\.\s*[123]|p[123])/i.test(className);
  const isUpperSection = /(primary\s*[4567]|p\.\s*[4567]|p[4567])/i.test(className);

  const schoolObj = reportData?.school as Record<string, unknown> | undefined;
  const usesD082d5bSeniorCards =
    isOLevelClass(className) ||
    (isALevelClass(className) && (templateKey === 'template2' || templateKey === 'template3'));
  if (usesD082d5bSeniorCards) {
    assertSecondaryBuiltinTemplatesAllowed(schoolObj, 'renderTemplateHTML');
  }

  // O-Level (S1–S4): historic route used Template 1–3 card layouts only here.
  if (isOLevelClass(className)) {
    switch (templateKey) {
      case 'template1':
        return generateTemplate1OLevelHTML(reportData, schoolLogoBase64, studentPhotoBase64);
      case 'template2':
        return generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
      case 'template3':
        return generateTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);
      default:
        return generateTemplate1OLevelHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    }
  }

  // A-Level (S5–S6): historic route did NOT use O-Level card generators; it followed the
  // same switch as primary “non–O-Level” (template1 → marks-style secondary report).
  if (isALevelClass(className)) {
    if (templateKey === 'template6') {
      return generateTemplateNurseryCindrelinahHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    }
    if (templateKey === 'template4' || (isUpperSection && templateKey !== 'template3')) {
      return generateTemplate4UpperSectionHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    }
    if (templateKey === 'template3' || isLowerSection) {
      return generateTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    }
    if (templateKey === 'template2') {
      return generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    }
    return generateSecondaryReportHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }

  // Primary/Nursery — template6 is Baby Class Heritage in the app (same React card as template2 Kasozi nursery).
  if (templateKey === 'template6') {
    return generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  if (templateKey === 'template4' || isUpperSection) {
    return generateTemplate4UpperSectionHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  if (templateKey === 'template3' || isLowerSection) {
    return generateTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  if (templateKey === 'template2') {
    return generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  return generateSecondaryReportHTML(reportData, schoolLogoBase64, studentPhotoBase64);
}
