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
import { formatAverageWhole, formatCurrency } from '../lib/reportUtils';

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
 * Check if class is O-Level
 */
export function isOLevelClass(className: string): boolean {
  if (!className) return false;
  const trimmed = className.trim();
  return /^(senior\s*[1-4]|s\s*[1-4])/i.test(trimmed);
}

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
  
  // For primary format (non O-Level), strip attendance table/fields so PDF matches preview
  try {
    const isPrimary = !isOLevelClass(student.current_class || '');
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
  const schoolNameColor = school?.header_school_name_color || '#1e3a8a';
  const subtitleColor = school?.header_subtitle_color || '#3b82f6';
  const addressColor = school?.header_address_color || '#1e40af';
  const contactColor = school?.header_contact_color || '#1e40af';
  const mottoColor = school?.header_motto_color || '#2563eb';
  const dividerColor = school?.header_divider_color || '#1e3a8a';
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
              ${school?.contact_email || ''}${school?.contact_email && school?.contact_phone ? ' <span style="margin: 0 8px; color: #64748b;">|</span> ' : ''}${school?.contact_phone || ''}
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
        <div style="display: inline-block; padding: 5px 18px; border-radius: 16px; font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #1e3a8a; background: #eff6ff; border: 1px solid #bfdbfe; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          ${reportTitle}
        </div>
        ${(examSet?.name || examSet?.year) ? `
          <div style="font-size: 8pt; font-family: Arial, Helvetica, sans-serif; color: #64748b; margin-top: 0.2cm; font-weight: 400;">
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
// TEMPLATE HTML GENERATION FUNCTIONS
// ============================================================================
// NOTE: Due to the large size of each template function (500+ lines each),
// the full implementations are being extracted from app/api/reports/generate-pdf/route.ts
// These functions preserve the EXACT visual appearance of existing reports.
// All calculations are pre-done in snapshot - these functions only render HTML.

// The complete template functions are being added in the next update...
// For now, placeholders are included to maintain structure.

// TODO: Extract complete implementations for:
// - generateTemplate1OLevelHTML (lines 714-1223 in route.ts)
// - generateTemplate2KasoziHTML (lines 1225-1910 in route.ts)
// - generateTemplateNurseryCindrelinahHTML (lines 1912-2964 in route.ts)
// - generateTemplate3KyoteraHTML (lines 2966-3493 in route.ts)
// - generateOLevelReportHTML (lines 3495-3936 in route.ts)
// - generateSecondaryReportHTML (lines 3938-4306 in route.ts)
// - generatePrimaryReportHTML (lines 4308-4675 in route.ts) - This is Template 4

/**
 * Generate Template 1 O-Level HTML
 * Full implementation extracted from route.ts lines 714-1223
 */
export function generateTemplate1OLevelHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? '';
  const totalDays = attendance.totalSchoolDays ?? '';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  // O-Level calculation functions (matching exam results page logic)
  const calculateDescriptor = (activityScore: number): "Missed" | "Moderate" | "Outstanding" => {
    if (activityScore < 1) return "Missed";
    if (activityScore < 2.5) return "Moderate";
    return "Outstanding";
  };

  const calculateGrade = (finalScore: number): "A"|"B"|"C"|"D"|"E" => {
    if (finalScore >= 80) return "A";
    if (finalScore >= 70) return "B";
    if (finalScore >= 60) return "C";
    if (finalScore >= 50) return "D";
    return "E";
  };

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
          padding: 4mm 5mm 5mm;
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
          margin-bottom: 8px;
        }
        
        .school-logo {
          width: 128px;
          height: 128px;
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

        .nursery-student-info {
          margin-bottom: 12px;
        }

        .nursery-student-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          background: #ffffff;
          border: 1px solid rgba(59,130,246,0.35);
          border-radius: 12px;
          padding: 10px 12px;
          box-shadow: 0 2px 6px rgba(30,64,175,0.10);
        }

        .nursery-student-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 22px;
          font-size: 9.8pt;
        }

        .nursery-student-grid strong {
          color: #1e3a8a;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .nursery-student-grid div {
          color: #1f2937;
        }

        .nursery-student-photo {
          width: 2.1cm;
          height: 2.9cm;
          border: 1px solid rgba(59,130,246,0.45);
          background: #fff;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(30, 64, 175, 0.12);
        }

        .nursery-student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nursery-photo-placeholder {
          font-size: 10px;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          width: 100%;
          background: rgba(226, 232, 240, 0.35);
          letter-spacing: 0.08em;
        }

        .nursery-photo-placeholder {
          font-size: 10px;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: #f8fafc;
          font-weight: 600;
          letter-spacing: 0.08em;
        }
        
        .report-title {
          background: #4CAF50;
          color: white;
          text-align: center;
          padding: 8px;
          margin: 12px 0;
          font-size: 12.5pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-info {
          margin-bottom: 12px;
          font-size: 11pt;
        }
        
        .student-info div {
          margin-bottom: 5px;
        }
        
        .student-info strong {
          font-weight: bold;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 9.5pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 4px;
          text-align: left;
        }
        
        th {
          background: #4CAF50;
          color: white;
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 10px;
          font-size: 10.5pt;
        }
        
        .summary p {
          margin-bottom: 5px;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 12px;
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
          font-size: 11pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 20px;
        }
        
        .grading-system h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .description-table th {
          background: #f0f0f0;
          color: black;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
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
              const activityNum = parseFloat(activity) || 0;
              const descriptor = result.descriptor || (activityNum < 1 ? 'Missed' : activityNum < 2.5 ? 'Moderate' : 'Outstanding');
              const formative = result.formative_score ?? '';
              const exam = result.exam_score ?? '';
              const finalScore = result.final_score ?? '';
              const finalNum = parseFloat(finalScore) || 0;
              const gradeText = result.grade || (finalNum >= 80 ? 'A' : finalNum >= 70 ? 'B' : finalNum >= 60 ? 'C' : finalNum >= 50 ? 'D' : 'E');
              const overallRemark = result.overall_remark ?? '';
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

      <!-- COMMENTS (Reworked per request) -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <div style="height: 60px; border-bottom: 1px solid #000; margin-bottom: 8px;"></div>
        <p>Name: ${student.comments?.class_teacher_name || ''} | Signature: ____________________</p>

        <h3>Head Teacher's Comment</h3>
        <div style="height: 60px; border-bottom: 1px solid #000; margin-bottom: 8px;"></div>
        <p>Name: ${student.comments?.head_teacher_name || ''} | Signature: ____________________</p>
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
        <div>School Motto: '${school?.motto || 'Education the Future'}'</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate Template 2 Kasozi HTML
 * Full implementation extracted from route.ts lines 1225-1910
 */
export function generateTemplate2KasoziHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  const { school, examSet, students } = reportData;
  const student = students[0];

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
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          background: linear-gradient(135deg, #fff7ad 0%, #ffd1dc 40%, #c8f5ff 75%, #e7deff 100%);
          color: #1f2937;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
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
    <body>
      ${
        (schoolLogoBase64 || school?.logo_url || school?.logo)
          ? `
      <div class="watermark">
              <img src="${schoolLogoBase64 ? `data:image/png;base64,${schoolLogoBase64}` : (school.logo_url || school.logo)}" alt="School Watermark" />
      </div>
          `
          : ''
      }
      
      <div class="print-header-container">
        <div class="header-flex">
          <div class="header-logo">
            ${
              schoolLogoBase64
                ? `<img src="data:image/png;base64,${schoolLogoBase64}" alt="School Logo" />`
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
          <div class="report-chip">MIDDLE &amp; TOP CLASS - TERMLY REPORT</div>
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
          ${student.results.length > 0 ? 
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

      <!-- COMMENTS -->
    </body>
    </html>
  `;
}

/**
 * Generate Template 3 Kyotera HTML
 * Full implementation extracted from route.ts lines 2966-3493
 */
export function generateTemplate3KyoteraHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  // Full implementation to be added - preserving exact visual appearance
  throw new Error('generateTemplate3KyoteraHTML - Full implementation from route.ts lines 2966-3493 needs to be copied here');
}

/**
 * Generate Template 4 Upper Section HTML (Primary Report)
 * Full implementation extracted from route.ts lines 4308-4675
 */
export function generateTemplate4UpperSectionHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  // Full implementation to be added - preserving exact visual appearance
  // Note: This is the same as generatePrimaryReportHTML
  throw new Error('generateTemplate4UpperSectionHTML - Full implementation from route.ts lines 4308-4675 needs to be copied here');
}

/**
 * Generate Template 6 Nursery HTML (Cindrelinah)
 * Full implementation extracted from route.ts lines 1912-2964
 */
export function generateTemplateNurseryCindrelinahHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null,
  nurseryAutoComments?: NurseryAutoCommentMap
): string {
  // Full implementation to be added - preserving exact visual appearance
  throw new Error('generateTemplateNurseryCindrelinahHTML - Full implementation from route.ts lines 1912-2964 needs to be copied here');
}

/**
 * Generate O-Level Report HTML
 * Full implementation extracted from route.ts lines 3495-3936
 */
export function generateOLevelReportHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  // Full implementation to be added - preserving exact visual appearance
  throw new Error('generateOLevelReportHTML - Full implementation from route.ts lines 3495-3936 needs to be copied here');
}

/**
 * Generate Secondary Report HTML
 * Full implementation extracted from route.ts lines 3938-4306
 */
export function generateSecondaryReportHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  // Full implementation to be added - preserving exact visual appearance
  throw new Error('generateSecondaryReportHTML - Full implementation from route.ts lines 3938-4306 needs to be copied here');
}

/**
 * Generate Primary Report HTML (Template 4)
 * Full implementation extracted from route.ts lines 4308-4675
 */
export function generatePrimaryReportHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  // Full implementation to be added - preserving exact visual appearance
  throw new Error('generatePrimaryReportHTML - Full implementation from route.ts lines 4308-4675 needs to be copied here');
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

  // Check if O-Level class
  const isOLevel = isOLevelClass(className);

  if (isOLevel) {
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
  } else {
    // Primary/Nursery templates
    const isLowerSection = /(primary\s*[123]|p\.\s*[123]|p[123])/i.test(className);
    const isUpperSection = /(primary\s*[4567]|p\.\s*[4567]|p[4567])/i.test(className);

    if (templateKey === 'template6') {
      return generateTemplateNurseryCindrelinahHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    } else if (templateKey === 'template4' || isUpperSection) {
      return generateTemplate4UpperSectionHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    } else if (templateKey === 'template3' || isLowerSection) {
      return generateTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    } else if (templateKey === 'template2') {
      return generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    } else {
      return generateSecondaryReportHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    }
  }
}
