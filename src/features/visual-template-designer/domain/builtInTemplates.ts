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

  // ══════════════════════════════════════════════════════════════════════════
  // System-template canvas presets
  // One per real HTML report template so the canvas opens with the right
  // components pre-placed. IDs must match PRIMARY_META / SECONDARY_META in
  // TemplateDesignerPage so the lookup works.
  // ══════════════════════════════════════════════════════════════════════════

  // ─── Nursery/Baby Class (primary_template1, _template2, _template6) ────────
  {
    id: 'preset-primary-nursery',
    name: 'Baby Class Report Card',
    category: 'REPORT_CARD',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    createdAt: NOW, updatedAt: NOW, createdBy: SYSTEM_USER, version: 1,
    pages: [{
      id: 'p1', pageNumber: 1, width: A4_W, height: A4_H,
      elements: [
        { id: 'e-border',      type: 'BORDER',               zIndex: 0, layout: { position: { x: 10,  y: 10,  unit: 'px' }, size: { width: 774, height: 1103, unit: 'px' }, rotation: 0 } },
        { id: 'e-logo',        type: 'SCHOOL_LOGO',           zIndex: 2, layout: { position: { x: 30,  y: 22,  unit: 'px' }, size: { width: 80,  height: 80,  unit: 'px' }, rotation: 0 } },
        { id: 'e-school-name', type: 'SCHOOL_NAME',           zIndex: 2, layout: { position: { x: 125, y: 26,  unit: 'px' }, size: { width: 510, height: 36,  unit: 'px' }, rotation: 0 } },
        { id: 'e-motto',       type: 'SCHOOL_MOTTO',          zIndex: 2, layout: { position: { x: 125, y: 66,  unit: 'px' }, size: { width: 510, height: 24,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div1',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 114, unit: 'px' }, size: { width: 734, height: 3,   unit: 'px' }, rotation: 0 } },
        // Student photo on left, info on right
        { id: 'e-photo',       type: 'STUDENT_PHOTO',         zIndex: 2, layout: { position: { x: 30,  y: 126, unit: 'px' }, size: { width: 90,  height: 110, unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-name',    type: 'STUDENT_NAME',          zIndex: 2, layout: { position: { x: 134, y: 128, unit: 'px' }, size: { width: 340, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-class',   type: 'STUDENT_CLASS',         zIndex: 2, layout: { position: { x: 484, y: 128, unit: 'px' }, size: { width: 280, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-num',     type: 'STUDENT_NUMBER',        zIndex: 2, layout: { position: { x: 134, y: 162, unit: 'px' }, size: { width: 200, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-gender',      type: 'STUDENT_GENDER',        zIndex: 2, layout: { position: { x: 344, y: 162, unit: 'px' }, size: { width: 140, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-attend',      type: 'STUDENT_ATTENDANCE',    zIndex: 2, layout: { position: { x: 134, y: 196, unit: 'px' }, size: { width: 350, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div2',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 248, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
        // Skills / results table
        { id: 'e-results',     type: 'RESULTS_TABLE',         zIndex: 2, layout: { position: { x: 30,  y: 260, unit: 'px' }, size: { width: 734, height: 440, unit: 'px' }, rotation: 0 } },
        { id: 'e-div3',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 708, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
        // Summary
        { id: 'e-perc',        type: 'PERCENTAGE_DISPLAY',    zIndex: 2, layout: { position: { x: 30,  y: 720, unit: 'px' }, size: { width: 200, height: 30,  unit: 'px' }, rotation: 0 } },
        { id: 'e-pos',         type: 'CLASS_POSITION',        zIndex: 2, layout: { position: { x: 244, y: 720, unit: 'px' }, size: { width: 200, height: 30,  unit: 'px' }, rotation: 0 } },
        { id: 'e-next-term',   type: 'NEXT_TERM_DATE',        zIndex: 2, layout: { position: { x: 458, y: 720, unit: 'px' }, size: { width: 306, height: 30,  unit: 'px' }, rotation: 0 } },
        // Comments
        { id: 'e-teacher-rem', type: 'TEACHER_REMARKS',       zIndex: 2, layout: { position: { x: 30,  y: 762, unit: 'px' }, size: { width: 734, height: 56,  unit: 'px' }, rotation: 0 } },
        { id: 'e-head-rem',    type: 'HEAD_TEACHER_COMMENTS', zIndex: 2, layout: { position: { x: 30,  y: 828, unit: 'px' }, size: { width: 734, height: 56,  unit: 'px' }, rotation: 0 } },
        { id: 'e-sig-t',       type: 'SIGNATURE_FIELD',       zIndex: 2, layout: { position: { x: 30,  y: 900, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
        { id: 'e-sig-h',       type: 'SIGNATURE_FIELD',       zIndex: 2, layout: { position: { x: 564, y: 900, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
      ],
    }],
  },

  // ─── Lower Primary P.1-P.3 (primary_template3) ───────────────────────────
  {
    id: 'preset-primary-lower',
    name: 'Lower Primary Report Card',
    category: 'REPORT_CARD',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    createdAt: NOW, updatedAt: NOW, createdBy: SYSTEM_USER, version: 1,
    pages: [{
      id: 'p1', pageNumber: 1, width: A4_W, height: A4_H,
      elements: [
        { id: 'e-border',      type: 'BORDER',               zIndex: 0, layout: { position: { x: 10,  y: 10,  unit: 'px' }, size: { width: 774, height: 1103, unit: 'px' }, rotation: 0 } },
        { id: 'e-logo',        type: 'SCHOOL_LOGO',           zIndex: 2, layout: { position: { x: 30,  y: 22,  unit: 'px' }, size: { width: 80,  height: 80,  unit: 'px' }, rotation: 0 } },
        { id: 'e-school-name', type: 'SCHOOL_NAME',           zIndex: 2, layout: { position: { x: 125, y: 26,  unit: 'px' }, size: { width: 510, height: 36,  unit: 'px' }, rotation: 0 } },
        { id: 'e-motto',       type: 'SCHOOL_MOTTO',          zIndex: 2, layout: { position: { x: 125, y: 66,  unit: 'px' }, size: { width: 510, height: 24,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div1',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 114, unit: 'px' }, size: { width: 734, height: 3,   unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-name',    type: 'STUDENT_NAME',          zIndex: 2, layout: { position: { x: 30,  y: 128, unit: 'px' }, size: { width: 310, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-class',   type: 'STUDENT_CLASS',         zIndex: 2, layout: { position: { x: 354, y: 128, unit: 'px' }, size: { width: 180, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-num',     type: 'STUDENT_NUMBER',        zIndex: 2, layout: { position: { x: 548, y: 128, unit: 'px' }, size: { width: 216, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-attend',      type: 'STUDENT_ATTENDANCE',    zIndex: 2, layout: { position: { x: 30,  y: 164, unit: 'px' }, size: { width: 240, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-gender',      type: 'STUDENT_GENDER',        zIndex: 2, layout: { position: { x: 284, y: 164, unit: 'px' }, size: { width: 130, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div2',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 200, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
        // Results table — sized for 8 subjects
        { id: 'e-results',     type: 'RESULTS_TABLE',         zIndex: 2, layout: { position: { x: 30,  y: 212, unit: 'px' }, size: { width: 734, height: 460, unit: 'px' }, rotation: 0 } },
        { id: 'e-div3',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 680, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
        // Summary row
        { id: 'e-agg',         type: 'AGGREGATE_DISPLAY',     zIndex: 2, layout: { position: { x: 30,  y: 692, unit: 'px' }, size: { width: 140, height: 30,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div-disp',    type: 'DIVISION_DISPLAY',      zIndex: 2, layout: { position: { x: 182, y: 692, unit: 'px' }, size: { width: 140, height: 30,  unit: 'px' }, rotation: 0 } },
        { id: 'e-pos',         type: 'CLASS_POSITION',        zIndex: 2, layout: { position: { x: 334, y: 692, unit: 'px' }, size: { width: 160, height: 30,  unit: 'px' }, rotation: 0 } },
        { id: 'e-perc',        type: 'PERCENTAGE_DISPLAY',    zIndex: 2, layout: { position: { x: 506, y: 692, unit: 'px' }, size: { width: 160, height: 30,  unit: 'px' }, rotation: 0 } },
        // Comments
        { id: 'e-teacher-rem', type: 'TEACHER_REMARKS',       zIndex: 2, layout: { position: { x: 30,  y: 738, unit: 'px' }, size: { width: 734, height: 56,  unit: 'px' }, rotation: 0 } },
        { id: 'e-head-rem',    type: 'HEAD_TEACHER_COMMENTS', zIndex: 2, layout: { position: { x: 30,  y: 804, unit: 'px' }, size: { width: 734, height: 56,  unit: 'px' }, rotation: 0 } },
        { id: 'e-next-term',   type: 'NEXT_TERM_DATE',        zIndex: 2, layout: { position: { x: 30,  y: 874, unit: 'px' }, size: { width: 260, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-sig-t',       type: 'SIGNATURE_FIELD',       zIndex: 2, layout: { position: { x: 30,  y: 912, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
        { id: 'e-sig-h',       type: 'SIGNATURE_FIELD',       zIndex: 2, layout: { position: { x: 564, y: 912, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
      ],
    }],
  },

  // ─── Upper Primary P.4-P.7 (primary_template4, primary_template5) ─────────
  {
    id: 'preset-primary-upper',
    name: 'Upper Primary Report Card',
    category: 'REPORT_CARD',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    createdAt: NOW, updatedAt: NOW, createdBy: SYSTEM_USER, version: 1,
    pages: [{
      id: 'p1', pageNumber: 1, width: A4_W, height: A4_H,
      elements: [
        { id: 'e-border',      type: 'BORDER',               zIndex: 0, layout: { position: { x: 10,  y: 10,  unit: 'px' }, size: { width: 774, height: 1103, unit: 'px' }, rotation: 0 } },
        { id: 'e-logo',        type: 'SCHOOL_LOGO',           zIndex: 2, layout: { position: { x: 30,  y: 22,  unit: 'px' }, size: { width: 80,  height: 80,  unit: 'px' }, rotation: 0 } },
        { id: 'e-school-name', type: 'SCHOOL_NAME',           zIndex: 2, layout: { position: { x: 125, y: 26,  unit: 'px' }, size: { width: 510, height: 36,  unit: 'px' }, rotation: 0 } },
        { id: 'e-motto',       type: 'SCHOOL_MOTTO',          zIndex: 2, layout: { position: { x: 125, y: 66,  unit: 'px' }, size: { width: 510, height: 24,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div1',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 114, unit: 'px' }, size: { width: 734, height: 3,   unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-name',    type: 'STUDENT_NAME',          zIndex: 2, layout: { position: { x: 30,  y: 128, unit: 'px' }, size: { width: 310, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-class',   type: 'STUDENT_CLASS',         zIndex: 2, layout: { position: { x: 354, y: 128, unit: 'px' }, size: { width: 180, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-num',     type: 'STUDENT_NUMBER',        zIndex: 2, layout: { position: { x: 548, y: 128, unit: 'px' }, size: { width: 216, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-attend',      type: 'STUDENT_ATTENDANCE',    zIndex: 2, layout: { position: { x: 30,  y: 164, unit: 'px' }, size: { width: 240, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-gender',      type: 'STUDENT_GENDER',        zIndex: 2, layout: { position: { x: 284, y: 164, unit: 'px' }, size: { width: 130, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div2',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 200, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
        // Results table — tall for 11 subjects
        { id: 'e-results',     type: 'RESULTS_TABLE',         zIndex: 2, layout: { position: { x: 30,  y: 212, unit: 'px' }, size: { width: 734, height: 520, unit: 'px' }, rotation: 0 } },
        { id: 'e-div3',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 740, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
        { id: 'e-agg',         type: 'AGGREGATE_DISPLAY',     zIndex: 2, layout: { position: { x: 30,  y: 752, unit: 'px' }, size: { width: 140, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div-disp',    type: 'DIVISION_DISPLAY',      zIndex: 2, layout: { position: { x: 182, y: 752, unit: 'px' }, size: { width: 140, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-pos',         type: 'CLASS_POSITION',        zIndex: 2, layout: { position: { x: 334, y: 752, unit: 'px' }, size: { width: 160, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-perc',        type: 'PERCENTAGE_DISPLAY',    zIndex: 2, layout: { position: { x: 506, y: 752, unit: 'px' }, size: { width: 160, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-teacher-rem', type: 'TEACHER_REMARKS',       zIndex: 2, layout: { position: { x: 30,  y: 796, unit: 'px' }, size: { width: 734, height: 50,  unit: 'px' }, rotation: 0 } },
        { id: 'e-head-rem',    type: 'HEAD_TEACHER_COMMENTS', zIndex: 2, layout: { position: { x: 30,  y: 856, unit: 'px' }, size: { width: 734, height: 50,  unit: 'px' }, rotation: 0 } },
        { id: 'e-next-term',   type: 'NEXT_TERM_DATE',        zIndex: 2, layout: { position: { x: 30,  y: 918, unit: 'px' }, size: { width: 260, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-sig-t',       type: 'SIGNATURE_FIELD',       zIndex: 2, layout: { position: { x: 30,  y: 952, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
        { id: 'e-sig-h',       type: 'SIGNATURE_FIELD',       zIndex: 2, layout: { position: { x: 564, y: 952, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
      ],
    }],
  },

  // ─── Secondary O-Level (secondary_template1, _template2, _template3) ───────
  {
    id: 'preset-secondary-olevel',
    name: 'Secondary O-Level Report Card',
    category: 'REPORT_CARD',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    createdAt: NOW, updatedAt: NOW, createdBy: SYSTEM_USER, version: 1,
    pages: [{
      id: 'p1', pageNumber: 1, width: A4_W, height: A4_H,
      elements: [
        { id: 'e-border',      type: 'BORDER',               zIndex: 0, layout: { position: { x: 10,  y: 10,  unit: 'px' }, size: { width: 774, height: 1103, unit: 'px' }, rotation: 0 } },
        { id: 'e-logo',        type: 'SCHOOL_LOGO',           zIndex: 2, layout: { position: { x: 30,  y: 22,  unit: 'px' }, size: { width: 80,  height: 80,  unit: 'px' }, rotation: 0 } },
        { id: 'e-school-name', type: 'SCHOOL_NAME',           zIndex: 2, layout: { position: { x: 125, y: 26,  unit: 'px' }, size: { width: 510, height: 36,  unit: 'px' }, rotation: 0 } },
        { id: 'e-motto',       type: 'SCHOOL_MOTTO',          zIndex: 2, layout: { position: { x: 125, y: 66,  unit: 'px' }, size: { width: 340, height: 22,  unit: 'px' }, rotation: 0 } },
        { id: 'e-address',     type: 'SCHOOL_ADDRESS',        zIndex: 2, layout: { position: { x: 125, y: 90,  unit: 'px' }, size: { width: 340, height: 20,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div1',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 114, unit: 'px' }, size: { width: 734, height: 3,   unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-name',    type: 'STUDENT_NAME',          zIndex: 2, layout: { position: { x: 30,  y: 128, unit: 'px' }, size: { width: 270, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-class',   type: 'STUDENT_CLASS',         zIndex: 2, layout: { position: { x: 314, y: 128, unit: 'px' }, size: { width: 140, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-stream',  type: 'STUDENT_STREAM',        zIndex: 2, layout: { position: { x: 468, y: 128, unit: 'px' }, size: { width: 160, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-num',     type: 'STUDENT_NUMBER',        zIndex: 2, layout: { position: { x: 30,  y: 162, unit: 'px' }, size: { width: 220, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-term',        type: 'TERM_DISPLAY',          zIndex: 2, layout: { position: { x: 264, y: 162, unit: 'px' }, size: { width: 140, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-year',        type: 'YEAR_DISPLAY',          zIndex: 2, layout: { position: { x: 418, y: 162, unit: 'px' }, size: { width: 120, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-attend',      type: 'STUDENT_ATTENDANCE',    zIndex: 2, layout: { position: { x: 552, y: 162, unit: 'px' }, size: { width: 212, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div2',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 198, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
        { id: 'e-results',     type: 'RESULTS_TABLE',         zIndex: 2, layout: { position: { x: 30,  y: 210, unit: 'px' }, size: { width: 734, height: 480, unit: 'px' }, rotation: 0 } },
        { id: 'e-div3',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 698, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
        { id: 'e-div-disp',    type: 'DIVISION_DISPLAY',      zIndex: 2, layout: { position: { x: 30,  y: 710, unit: 'px' }, size: { width: 160, height: 30,  unit: 'px' }, rotation: 0 } },
        { id: 'e-pos',         type: 'CLASS_POSITION',        zIndex: 2, layout: { position: { x: 204, y: 710, unit: 'px' }, size: { width: 160, height: 30,  unit: 'px' }, rotation: 0 } },
        { id: 'e-perc',        type: 'PERCENTAGE_DISPLAY',    zIndex: 2, layout: { position: { x: 378, y: 710, unit: 'px' }, size: { width: 160, height: 30,  unit: 'px' }, rotation: 0 } },
        { id: 'e-teacher-rem', type: 'TEACHER_REMARKS',       zIndex: 2, layout: { position: { x: 30,  y: 754, unit: 'px' }, size: { width: 734, height: 56,  unit: 'px' }, rotation: 0 } },
        { id: 'e-head-rem',    type: 'HEAD_TEACHER_COMMENTS', zIndex: 2, layout: { position: { x: 30,  y: 820, unit: 'px' }, size: { width: 734, height: 56,  unit: 'px' }, rotation: 0 } },
        { id: 'e-next-term',   type: 'NEXT_TERM_DATE',        zIndex: 2, layout: { position: { x: 30,  y: 888, unit: 'px' }, size: { width: 280, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-sig-t',       type: 'SIGNATURE_FIELD',       zIndex: 2, layout: { position: { x: 30,  y: 926, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
        { id: 'e-sig-h',       type: 'SIGNATURE_FIELD',       zIndex: 2, layout: { position: { x: 564, y: 926, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
      ],
    }],
  },

  // ─── Secondary A-Level (secondary_template4) ──────────────────────────────
  {
    id: 'preset-secondary-alevel',
    name: 'Secondary A-Level Report Card',
    category: 'REPORT_CARD',
    pageSize: 'A4',
    pageOrientation: 'portrait',
    createdAt: NOW, updatedAt: NOW, createdBy: SYSTEM_USER, version: 1,
    pages: [{
      id: 'p1', pageNumber: 1, width: A4_W, height: A4_H,
      elements: [
        { id: 'e-border',      type: 'BORDER',               zIndex: 0, layout: { position: { x: 10,  y: 10,  unit: 'px' }, size: { width: 774, height: 1103, unit: 'px' }, rotation: 0 } },
        { id: 'e-logo',        type: 'SCHOOL_LOGO',           zIndex: 2, layout: { position: { x: 30,  y: 22,  unit: 'px' }, size: { width: 80,  height: 80,  unit: 'px' }, rotation: 0 } },
        { id: 'e-school-name', type: 'SCHOOL_NAME',           zIndex: 2, layout: { position: { x: 125, y: 26,  unit: 'px' }, size: { width: 510, height: 36,  unit: 'px' }, rotation: 0 } },
        { id: 'e-motto',       type: 'SCHOOL_MOTTO',          zIndex: 2, layout: { position: { x: 125, y: 66,  unit: 'px' }, size: { width: 340, height: 22,  unit: 'px' }, rotation: 0 } },
        { id: 'e-address',     type: 'SCHOOL_ADDRESS',        zIndex: 2, layout: { position: { x: 125, y: 90,  unit: 'px' }, size: { width: 340, height: 20,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div1',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 114, unit: 'px' }, size: { width: 734, height: 3,   unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-name',    type: 'STUDENT_NAME',          zIndex: 2, layout: { position: { x: 30,  y: 128, unit: 'px' }, size: { width: 270, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-class',   type: 'STUDENT_CLASS',         zIndex: 2, layout: { position: { x: 314, y: 128, unit: 'px' }, size: { width: 140, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-stream',  type: 'STUDENT_STREAM',        zIndex: 2, layout: { position: { x: 468, y: 128, unit: 'px' }, size: { width: 160, height: 28,  unit: 'px' }, rotation: 0 } },
        { id: 'e-stu-num',     type: 'STUDENT_NUMBER',        zIndex: 2, layout: { position: { x: 30,  y: 162, unit: 'px' }, size: { width: 220, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-term',        type: 'TERM_DISPLAY',          zIndex: 2, layout: { position: { x: 264, y: 162, unit: 'px' }, size: { width: 140, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-year',        type: 'YEAR_DISPLAY',          zIndex: 2, layout: { position: { x: 418, y: 162, unit: 'px' }, size: { width: 120, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-attend',      type: 'STUDENT_ATTENDANCE',    zIndex: 2, layout: { position: { x: 552, y: 162, unit: 'px' }, size: { width: 212, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-div2',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 198, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
        { id: 'e-results',     type: 'RESULTS_TABLE',         zIndex: 2, layout: { position: { x: 30,  y: 210, unit: 'px' }, size: { width: 734, height: 500, unit: 'px' }, rotation: 0 } },
        { id: 'e-div3',        type: 'LINE',                  zIndex: 3, layout: { position: { x: 30,  y: 718, unit: 'px' }, size: { width: 734, height: 2,   unit: 'px' }, rotation: 0 } },
        { id: 'e-pos',         type: 'CLASS_POSITION',        zIndex: 2, layout: { position: { x: 30,  y: 730, unit: 'px' }, size: { width: 180, height: 30,  unit: 'px' }, rotation: 0 } },
        { id: 'e-perc',        type: 'PERCENTAGE_DISPLAY',    zIndex: 2, layout: { position: { x: 224, y: 730, unit: 'px' }, size: { width: 180, height: 30,  unit: 'px' }, rotation: 0 } },
        { id: 'e-teacher-rem', type: 'TEACHER_REMARKS',       zIndex: 2, layout: { position: { x: 30,  y: 776, unit: 'px' }, size: { width: 734, height: 56,  unit: 'px' }, rotation: 0 } },
        { id: 'e-head-rem',    type: 'HEAD_TEACHER_COMMENTS', zIndex: 2, layout: { position: { x: 30,  y: 842, unit: 'px' }, size: { width: 734, height: 56,  unit: 'px' }, rotation: 0 } },
        { id: 'e-next-term',   type: 'NEXT_TERM_DATE',        zIndex: 2, layout: { position: { x: 30,  y: 910, unit: 'px' }, size: { width: 280, height: 26,  unit: 'px' }, rotation: 0 } },
        { id: 'e-sig-t',       type: 'SIGNATURE_FIELD',       zIndex: 2, layout: { position: { x: 30,  y: 948, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
        { id: 'e-sig-h',       type: 'SIGNATURE_FIELD',       zIndex: 2, layout: { position: { x: 564, y: 948, unit: 'px' }, size: { width: 200, height: 50,  unit: 'px' }, rotation: 0 } },
      ],
    }],
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
