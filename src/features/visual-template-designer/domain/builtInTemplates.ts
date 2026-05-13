/**
 * Built-in template presets.
 *
 * These are read-only starting points. When a user selects one, the system
 * duplicates it (new ID, new timestamps) and opens the copy in the designer.
 * The originals here are NEVER modified.
 */

import type { Template } from './types';

const NOW = new Date('2024-01-01T00:00:00.000Z');
const SYSTEM_USER = 'system';

// A4 portrait dimensions in pixels (96 dpi)
const A4_W = 794;
const A4_H = 1123;

export const BUILT_IN_TEMPLATES: Template[] = [
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Standard Report Card
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'builtin-report-card-standard',
    name: 'Standard Report Card',
    category: 'REPORT_CARD',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: SYSTEM_USER,
    version: 1,
    pages: [
      {
        id: 'p1',
        pageNumber: 1,
        width: A4_W,
        height: A4_H,
        elements: [
          // Header area
          { id: 'e-logo',         type: 'SCHOOL_LOGO',          zIndex: 1, layout: { position: { x: 30,  y: 20,  unit: 'px' }, size: { width: 80,  height: 80,  unit: 'px' }, rotation: 0 } },
          { id: 'e-school-name',  type: 'SCHOOL_NAME',          zIndex: 2, layout: { position: { x: 130, y: 28,  unit: 'px' }, size: { width: 500, height: 36,  unit: 'px' }, rotation: 0 } },
          { id: 'e-school-motto', type: 'SCHOOL_MOTTO',         zIndex: 2, layout: { position: { x: 130, y: 68,  unit: 'px' }, size: { width: 500, height: 24,  unit: 'px' }, rotation: 0 } },
          { id: 'e-divider1',     type: 'LINE',                 zIndex: 3, layout: { position: { x: 30,  y: 110, unit: 'px' }, size: { width: 734, height: 3,   unit: 'px' }, rotation: 0 } },
          // Student info row
          { id: 'e-stu-name',     type: 'STUDENT_NAME',         zIndex: 2, layout: { position: { x: 30,  y: 125, unit: 'px' }, size: { width: 300, height: 30,  unit: 'px' }, rotation: 0 } },
          { id: 'e-stu-class',    type: 'STUDENT_CLASS',        zIndex: 2, layout: { position: { x: 340, y: 125, unit: 'px' }, size: { width: 180, height: 30,  unit: 'px' }, rotation: 0 } },
          { id: 'e-stu-num',      type: 'STUDENT_NUMBER',       zIndex: 2, layout: { position: { x: 534, y: 125, unit: 'px' }, size: { width: 230, height: 30,  unit: 'px' }, rotation: 0 } },
          { id: 'e-attend',       type: 'STUDENT_ATTENDANCE',   zIndex: 2, layout: { position: { x: 30,  y: 162, unit: 'px' }, size: { width: 200, height: 28,  unit: 'px' }, rotation: 0 } },
          { id: 'e-divider2',     type: 'LINE',                 zIndex: 3, layout: { position: { x: 30,  y: 198, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
          // Results table
          { id: 'e-results',      type: 'RESULTS_TABLE',        zIndex: 2, layout: { position: { x: 30,  y: 210, unit: 'px' }, size: { width: 734, height: 480, unit: 'px' }, rotation: 0 } },
          // Summary
          { id: 'e-aggregate',    type: 'AGGREGATE_DISPLAY',    zIndex: 2, layout: { position: { x: 30,  y: 706, unit: 'px' }, size: { width: 200, height: 36,  unit: 'px' }, rotation: 0 } },
          { id: 'e-division',     type: 'DIVISION_DISPLAY',     zIndex: 2, layout: { position: { x: 250, y: 706, unit: 'px' }, size: { width: 200, height: 36,  unit: 'px' }, rotation: 0 } },
          { id: 'e-divider3',     type: 'LINE',                 zIndex: 3, layout: { position: { x: 30,  y: 750, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
          // Remarks
          { id: 'e-teacher-rem',  type: 'TEACHER_REMARKS',      zIndex: 2, layout: { position: { x: 30,  y: 762, unit: 'px' }, size: { width: 734, height: 60,  unit: 'px' }, rotation: 0 } },
          { id: 'e-head-rem',     type: 'HEAD_TEACHER_COMMENTS',zIndex: 2, layout: { position: { x: 30,  y: 832, unit: 'px' }, size: { width: 734, height: 60,  unit: 'px' }, rotation: 0 } },
          // Signatures
          { id: 'e-sig-teacher',  type: 'SIGNATURE_FIELD',      zIndex: 2, layout: { position: { x: 30,  y: 910, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
          { id: 'e-sig-head',     type: 'SIGNATURE_FIELD',      zIndex: 2, layout: { position: { x: 564, y: 910, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
          // Border
          { id: 'e-border',       type: 'BORDER',               zIndex: 0, layout: { position: { x: 10,  y: 10,  unit: 'px' }, size: { width: 774, height: 1103,unit: 'px' }, rotation: 0 } },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Achievement Certificate
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'builtin-certificate-achievement',
    name: 'Achievement Certificate',
    category: 'CERTIFICATE',
    pageSize: 'A4',
    pageOrientation: 'landscape',
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: SYSTEM_USER,
    version: 1,
    pages: [
      {
        id: 'p1',
        pageNumber: 1,
        width: A4_H,   // landscape: swap width/height
        height: A4_W,
        elements: [
          // Decorative outer border
          { id: 'e-border',       type: 'BORDER',      zIndex: 0, layout: { position: { x: 15,  y: 15,  unit: 'px' }, size: { width: 1093, height: 764, unit: 'px' }, rotation: 0 } },
          // School info at top
          { id: 'e-logo',         type: 'SCHOOL_LOGO', zIndex: 2, layout: { position: { x: 487, y: 40,  unit: 'px' }, size: { width: 80,   height: 80,  unit: 'px' }, rotation: 0 } },
          { id: 'e-school-name',  type: 'SCHOOL_NAME', zIndex: 2, layout: { position: { x: 100, y: 135, unit: 'px' }, size: { width: 923,  height: 40,  unit: 'px' }, rotation: 0 } },
          { id: 'e-divider-top',  type: 'LINE',        zIndex: 3, layout: { position: { x: 60,  y: 185, unit: 'px' }, size: { width: 1003, height: 3,   unit: 'px' }, rotation: 0 } },
          // Certificate title
          { id: 'e-title',        type: 'TEXT_LABEL',  zIndex: 2, layout: { position: { x: 100, y: 210, unit: 'px' }, size: { width: 923,  height: 60,  unit: 'px' }, rotation: 0 } },
          // Student name (large)
          { id: 'e-stu-name',     type: 'STUDENT_NAME',zIndex: 2, layout: { position: { x: 100, y: 310, unit: 'px' }, size: { width: 923,  height: 70,  unit: 'px' }, rotation: 0 } },
          { id: 'e-stu-class',    type: 'STUDENT_CLASS',zIndex: 2,layout: { position: { x: 100, y: 395, unit: 'px' }, size: { width: 923,  height: 36,  unit: 'px' }, rotation: 0 } },
          { id: 'e-divider-btm',  type: 'LINE',        zIndex: 3, layout: { position: { x: 60,  y: 500, unit: 'px' }, size: { width: 1003, height: 2,   unit: 'px' }, rotation: 0 } },
          // Signatures
          { id: 'e-sig-left',     type: 'SIGNATURE_FIELD', zIndex: 2, layout: { position: { x: 80,  y: 620, unit: 'px' }, size: { width: 220, height: 60, unit: 'px' }, rotation: 0 } },
          { id: 'e-sig-right',    type: 'SIGNATURE_FIELD', zIndex: 2, layout: { position: { x: 820, y: 620, unit: 'px' }, size: { width: 220, height: 60, unit: 'px' }, rotation: 0 } },
          // Watermark
          { id: 'e-watermark',    type: 'WATERMARK',   zIndex: 1, layout: { position: { x: 200, y: 150, unit: 'px' }, size: { width: 700,  height: 500, unit: 'px' }, rotation: 0 } },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Student ID Card (landscape, small)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'builtin-id-card',
    name: 'Student ID Card',
    category: 'ID_CARD',
    pageSize: 'CUSTOM',
    pageOrientation: 'landscape',
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: SYSTEM_USER,
    version: 1,
    pages: [
      {
        id: 'p1',
        pageNumber: 1,
        width: 340,
        height: 215,
        elements: [
          { id: 'e-bg',          type: 'BACKGROUND_IMAGE', zIndex: 0, layout: { position: { x: 0,   y: 0,   unit: 'px' }, size: { width: 340, height: 215, unit: 'px' }, rotation: 0 } },
          { id: 'e-border',      type: 'BORDER',           zIndex: 1, layout: { position: { x: 5,   y: 5,   unit: 'px' }, size: { width: 330, height: 205, unit: 'px' }, rotation: 0 } },
          { id: 'e-logo',        type: 'SCHOOL_LOGO',      zIndex: 3, layout: { position: { x: 140, y: 12,  unit: 'px' }, size: { width: 60,  height: 60,  unit: 'px' }, rotation: 0 } },
          { id: 'e-school-name', type: 'SCHOOL_NAME',      zIndex: 3, layout: { position: { x: 10,  y: 78,  unit: 'px' }, size: { width: 320, height: 22,  unit: 'px' }, rotation: 0 } },
          { id: 'e-divider',     type: 'LINE',             zIndex: 3, layout: { position: { x: 10,  y: 105, unit: 'px' }, size: { width: 320, height: 2,   unit: 'px' }, rotation: 0 } },
          { id: 'e-photo',       type: 'STUDENT_PHOTO',    zIndex: 3, layout: { position: { x: 14,  y: 115, unit: 'px' }, size: { width: 70,  height: 85,  unit: 'px' }, rotation: 0 } },
          { id: 'e-stu-name',    type: 'STUDENT_NAME',     zIndex: 3, layout: { position: { x: 95,  y: 115, unit: 'px' }, size: { width: 235, height: 26,  unit: 'px' }, rotation: 0 } },
          { id: 'e-stu-num',     type: 'STUDENT_NUMBER',   zIndex: 3, layout: { position: { x: 95,  y: 148, unit: 'px' }, size: { width: 235, height: 22,  unit: 'px' }, rotation: 0 } },
          { id: 'e-stu-class',   type: 'STUDENT_CLASS',    zIndex: 3, layout: { position: { x: 95,  y: 174, unit: 'px' }, size: { width: 235, height: 22,  unit: 'px' }, rotation: 0 } },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Fee Statement
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'builtin-fee-statement',
    name: 'Fee Statement',
    category: 'FEE_STATEMENT',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: SYSTEM_USER,
    version: 1,
    pages: [
      {
        id: 'p1',
        pageNumber: 1,
        width: A4_W,
        height: A4_H,
        elements: [
          { id: 'e-logo',         type: 'SCHOOL_LOGO',     zIndex: 2, layout: { position: { x: 30,  y: 20,  unit: 'px' }, size: { width: 80,  height: 80,  unit: 'px' }, rotation: 0 } },
          { id: 'e-school-name',  type: 'SCHOOL_NAME',     zIndex: 2, layout: { position: { x: 130, y: 28,  unit: 'px' }, size: { width: 500, height: 36,  unit: 'px' }, rotation: 0 } },
          { id: 'e-school-addr',  type: 'SCHOOL_ADDRESS',  zIndex: 2, layout: { position: { x: 130, y: 68,  unit: 'px' }, size: { width: 400, height: 22,  unit: 'px' }, rotation: 0 } },
          { id: 'e-school-cont',  type: 'SCHOOL_CONTACT',  zIndex: 2, layout: { position: { x: 130, y: 92,  unit: 'px' }, size: { width: 300, height: 22,  unit: 'px' }, rotation: 0 } },
          { id: 'e-divider1',     type: 'LINE',            zIndex: 3, layout: { position: { x: 30,  y: 120, unit: 'px' }, size: { width: 734, height: 3,   unit: 'px' }, rotation: 0 } },
          { id: 'e-stu-name',     type: 'STUDENT_NAME',    zIndex: 2, layout: { position: { x: 30,  y: 135, unit: 'px' }, size: { width: 360, height: 30,  unit: 'px' }, rotation: 0 } },
          { id: 'e-stu-class',    type: 'STUDENT_CLASS',   zIndex: 2, layout: { position: { x: 410, y: 135, unit: 'px' }, size: { width: 354, height: 30,  unit: 'px' }, rotation: 0 } },
          { id: 'e-stu-num',      type: 'STUDENT_NUMBER',  zIndex: 2, layout: { position: { x: 30,  y: 170, unit: 'px' }, size: { width: 360, height: 28,  unit: 'px' }, rotation: 0 } },
          { id: 'e-divider2',     type: 'LINE',            zIndex: 3, layout: { position: { x: 30,  y: 205, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
          { id: 'e-fee-struct',   type: 'FEE_STRUCTURE',   zIndex: 2, layout: { position: { x: 30,  y: 220, unit: 'px' }, size: { width: 734, height: 400, unit: 'px' }, rotation: 0 } },
          { id: 'e-divider3',     type: 'LINE',            zIndex: 3, layout: { position: { x: 30,  y: 630, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
          { id: 'e-pay-summary',  type: 'PAYMENT_SUMMARY', zIndex: 2, layout: { position: { x: 400, y: 645, unit: 'px' }, size: { width: 364, height: 120, unit: 'px' }, rotation: 0 } },
          { id: 'e-fees-bal',     type: 'FEES_BALANCE',    zIndex: 2, layout: { position: { x: 400, y: 775, unit: 'px' }, size: { width: 364, height: 50,  unit: 'px' }, rotation: 0 } },
          { id: 'e-sig',          type: 'SIGNATURE_FIELD', zIndex: 2, layout: { position: { x: 30,  y: 900, unit: 'px' }, size: { width: 220, height: 55,  unit: 'px' }, rotation: 0 } },
          { id: 'e-border',       type: 'BORDER',          zIndex: 0, layout: { position: { x: 10,  y: 10,  unit: 'px' }, size: { width: 774, height: 1103,unit: 'px' }, rotation: 0 } },
        ],
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Result Slip (simple half-page)
  // ──────────────────────────────────────────────────────────────────────────
  {
    id: 'builtin-result-slip',
    name: 'Result Slip',
    category: 'RESULT_SLIP',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: SYSTEM_USER,
    version: 1,
    pages: [
      {
        id: 'p1',
        pageNumber: 1,
        width: A4_W,
        height: A4_H,
        elements: [
          { id: 'e-school-name', type: 'SCHOOL_NAME',          zIndex: 2, layout: { position: { x: 30,  y: 20,  unit: 'px' }, size: { width: 734, height: 36,  unit: 'px' }, rotation: 0 } },
          { id: 'e-school-motto',type: 'SCHOOL_MOTTO',         zIndex: 2, layout: { position: { x: 30,  y: 58,  unit: 'px' }, size: { width: 734, height: 24,  unit: 'px' }, rotation: 0 } },
          { id: 'e-divider1',    type: 'LINE',                 zIndex: 3, layout: { position: { x: 30,  y: 90,  unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
          { id: 'e-stu-name',    type: 'STUDENT_NAME',         zIndex: 2, layout: { position: { x: 30,  y: 100, unit: 'px' }, size: { width: 350, height: 30,  unit: 'px' }, rotation: 0 } },
          { id: 'e-stu-class',   type: 'STUDENT_CLASS',        zIndex: 2, layout: { position: { x: 400, y: 100, unit: 'px' }, size: { width: 180, height: 30,  unit: 'px' }, rotation: 0 } },
          { id: 'e-results',     type: 'RESULTS_TABLE',        zIndex: 2, layout: { position: { x: 30,  y: 145, unit: 'px' }, size: { width: 734, height: 440, unit: 'px' }, rotation: 0 } },
          { id: 'e-agg',         type: 'AGGREGATE_DISPLAY',    zIndex: 2, layout: { position: { x: 30,  y: 597, unit: 'px' }, size: { width: 200, height: 36,  unit: 'px' }, rotation: 0 } },
          { id: 'e-div',         type: 'DIVISION_DISPLAY',     zIndex: 2, layout: { position: { x: 250, y: 597, unit: 'px' }, size: { width: 200, height: 36,  unit: 'px' }, rotation: 0 } },
          { id: 'e-teacher-rem', type: 'TEACHER_REMARKS',      zIndex: 2, layout: { position: { x: 30,  y: 650, unit: 'px' }, size: { width: 734, height: 60,  unit: 'px' }, rotation: 0 } },
          { id: 'e-border',      type: 'BORDER',               zIndex: 0, layout: { position: { x: 10,  y: 10,  unit: 'px' }, size: { width: 774, height: 730, unit: 'px' }, rotation: 0 } },
        ],
      },
    ],
  },
];

/** Category display labels */
export const CATEGORY_LABELS: Record<string, string> = {
  REPORT_CARD: 'Report Card',
  CERTIFICATE: 'Certificate',
  ID_CARD: 'ID Card',
  RECEIPT: 'Receipt',
  FEE_STATEMENT: 'Fee Statement',
  ADMISSION_FORM: 'Admission Form',
  RESULT_SLIP: 'Result Slip',
};

/** Category badge colours (Tailwind classes) */
export const CATEGORY_COLORS: Record<string, string> = {
  REPORT_CARD: 'bg-blue-100 text-blue-700',
  CERTIFICATE: 'bg-yellow-100 text-yellow-700',
  ID_CARD: 'bg-green-100 text-green-700',
  RECEIPT: 'bg-gray-100 text-gray-700',
  FEE_STATEMENT: 'bg-orange-100 text-orange-700',
  ADMISSION_FORM: 'bg-purple-100 text-purple-700',
  RESULT_SLIP: 'bg-pink-100 text-pink-700',
};
