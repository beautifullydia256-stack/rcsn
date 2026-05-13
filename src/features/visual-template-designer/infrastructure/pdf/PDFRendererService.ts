/**
 * Visual Template Designer - PDF Renderer Service
 *
 * Generates PDF files from templates using jsPDF.
 * Supports single-student rendering and bulk generation with progress tracking.
 */

import jsPDF from 'jspdf';
import type { Template, TemplateComponent, ComponentType } from '../../domain/types';
import type { SampleStudentData } from '../api/DataFetcherService';
import type { DataFetcherService } from '../api/DataFetcherService';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface PDFRenderOptions {
  template: Template;
  studentData: SampleStudentData;
  pageIndex?: number; // optional — render specific page only
}

export interface BulkGenerationResult {
  studentId: string;
  success: boolean;
  error?: string;
  pdfBlob?: Blob;
}

export interface BulkGenerationProgress {
  total: number;
  completed: number;
  failed: number;
  currentStudentId: string;
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class PDFRenderError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'PDFRenderError';
  }
}

// ---------------------------------------------------------------------------
// Conversion constants
// ---------------------------------------------------------------------------

/** 1 pixel = 0.264583 mm */
const PX_TO_MM = 0.264583;

function pxToMm(px: number): number {
  return px * PX_TO_MM;
}

// ---------------------------------------------------------------------------
// Data resolution (mirrors PreviewMode logic)
// ---------------------------------------------------------------------------

function resolveComponentText(
  component: TemplateComponent,
  data: SampleStudentData
): string {
  const { dataBinding, type } = component;

  if (dataBinding?.field) {
    const value = resolveBoundField(dataBinding.field, data);
    if (value !== null) return value;
    if (dataBinding.fallback) return dataBinding.fallback;
  }

  return resolveByType(type, data);
}

function resolveBoundField(field: string, data: SampleStudentData): string | null {
  const map: Record<string, string> = {
    studentName: data.studentName,
    studentClass: data.studentClass,
    studentStream: data.studentStream,
    studentNumber: data.studentNumber,
    attendancePercentage: data.attendancePercentage,
    schoolName: data.schoolName,
    schoolMotto: data.schoolMotto,
    schoolAddress: data.schoolAddress,
    schoolContact: data.schoolContact,
    aggregate: String(data.aggregate),
    division: data.division,
    teacherRemarks: data.teacherRemarks,
    headTeacherComments: data.headTeacherComments,
    feesBalance: `UGX ${data.feesBalance.toLocaleString()}`,
    totalFees: `UGX ${data.totalFees.toLocaleString()}`,
    amountPaid: `UGX ${data.amountPaid.toLocaleString()}`,
  };
  return map[field] ?? null;
}

function resolveByType(type: ComponentType, data: SampleStudentData): string {
  switch (type) {
    case 'SCHOOL_NAME': return data.schoolName;
    case 'SCHOOL_MOTTO': return data.schoolMotto;
    case 'SCHOOL_ADDRESS': return data.schoolAddress;
    case 'SCHOOL_CONTACT': return data.schoolContact;
    case 'STUDENT_NAME': return data.studentName;
    case 'STUDENT_CLASS': return data.studentClass;
    case 'STUDENT_STREAM': return data.studentStream;
    case 'STUDENT_NUMBER': return data.studentNumber;
    case 'STUDENT_ATTENDANCE': return data.attendancePercentage;
    case 'AGGREGATE_DISPLAY': return `Aggregate: ${data.aggregate}`;
    case 'DIVISION_DISPLAY': return data.division;
    case 'TEACHER_REMARKS': return data.teacherRemarks;
    case 'HEAD_TEACHER_COMMENTS': return data.headTeacherComments;
    case 'FEES_BALANCE': return `Balance: UGX ${data.feesBalance.toLocaleString()}`;
    case 'PAYMENT_SUMMARY':
      return `Paid: UGX ${data.amountPaid.toLocaleString()} / Total: UGX ${data.totalFees.toLocaleString()}`;
    case 'GRADE_DISPLAY': {
      const best = data.results[0];
      return best ? `${best.subject}: ${best.grade}` : 'N/A';
    }
    case 'SUBJECT_SCORES':
      return data.results.map((r) => `${r.subject}: ${r.score}`).join(', ');
    default: return '';
  }
}

// ---------------------------------------------------------------------------
// Font helpers
// ---------------------------------------------------------------------------

type JsPDFFontStyle = 'normal' | 'bold' | 'italic' | 'bolditalic';

function getFontStyle(weight: string | undefined, style: string | undefined): JsPDFFontStyle {
  const bold = weight === 'bold';
  const italic = style === 'italic';
  if (bold && italic) return 'bolditalic';
  if (bold) return 'bold';
  if (italic) return 'italic';
  return 'normal';
}

function hexToRgb(hex: string): [number, number, number] {
  // Handle rgb(...) format
  const rgbMatch = hex.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])];
  }
  // Handle hex format
  const clean = hex.replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean;
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// ---------------------------------------------------------------------------
// Component rendering to jsPDF
// ---------------------------------------------------------------------------

function renderComponentToPDF(
  doc: jsPDF,
  component: TemplateComponent,
  studentData: SampleStudentData
): void {
  const { type, layout } = component;
  const { position, size, font, color, border } = layout;

  const x = pxToMm(position.x);
  const y = pxToMm(position.y);
  const w = pxToMm(size.width);
  const h = pxToMm(size.height);

  switch (type) {
    // -----------------------------------------------------------------------
    // Image placeholders — draw a rect with label
    // -----------------------------------------------------------------------
    case 'SCHOOL_LOGO':
    case 'STUDENT_PHOTO': {
      doc.setDrawColor(150, 150, 150);
      doc.setFillColor(230, 230, 230);
      doc.rect(x, y, w, h, 'FD');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(type === 'SCHOOL_LOGO' ? 'Logo' : 'Photo', x + w / 2, y + h / 2, { align: 'center' });
      break;
    }

    // -----------------------------------------------------------------------
    // Results table — manual grid
    // -----------------------------------------------------------------------
    case 'RESULTS_TABLE': {
      const colWidths = [w * 0.4, w * 0.15, w * 0.15, w * 0.3];
      const rowHeight = 5;
      const headers = ['Subject', 'Score', 'Grade', 'Remarks'];

      // Header row
      doc.setFillColor(30, 64, 175);
      doc.rect(x, y, w, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(font?.size ?? 8);
      doc.setFont('helvetica', 'bold');

      let colX = x;
      headers.forEach((header, i) => {
        doc.text(header, colX + 1, y + rowHeight - 1.5);
        colX += colWidths[i];
      });

      // Data rows
      doc.setFont('helvetica', 'normal');
      studentData.results.forEach((row, rowIdx) => {
        const rowY = y + rowHeight * (rowIdx + 1);
        doc.setFillColor(rowIdx % 2 === 0 ? 249 : 255, rowIdx % 2 === 0 ? 250 : 255, rowIdx % 2 === 0 ? 251 : 255);
        doc.rect(x, rowY, w, rowHeight, 'F');
        doc.setTextColor(0, 0, 0);

        colX = x;
        const cells = [row.subject, String(row.score), row.grade, row.remarks];
        cells.forEach((cell, i) => {
          doc.text(String(cell), colX + 1, rowY + rowHeight - 1.5);
          colX += colWidths[i];
        });

        // Row border
        doc.setDrawColor(200, 200, 200);
        doc.line(x, rowY + rowHeight, x + w, rowY + rowHeight);
      });

      // Outer border
      doc.setDrawColor(150, 150, 150);
      doc.rect(x, y, w, rowHeight * (studentData.results.length + 1), 'S');
      break;
    }

    // -----------------------------------------------------------------------
    // LINE
    // -----------------------------------------------------------------------
    case 'LINE': {
      const lineColor = border?.color ?? color?.text ?? '#000000';
      const [r, g, b] = hexToRgb(lineColor);
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(pxToMm(border?.width ?? 1));
      doc.line(x, y, x + w, y);
      break;
    }

    // -----------------------------------------------------------------------
    // RECTANGLE / BORDER
    // -----------------------------------------------------------------------
    case 'RECTANGLE':
    case 'BORDER': {
      const fillColor = color?.background;
      const borderColor = border?.color ?? '#000000';
      const [dr, dg, db] = hexToRgb(borderColor);
      doc.setDrawColor(dr, dg, db);
      doc.setLineWidth(pxToMm(border?.width ?? 1));

      if (fillColor) {
        const [fr, fg, fb] = hexToRgb(fillColor);
        doc.setFillColor(fr, fg, fb);
        doc.rect(x, y, w, h, 'FD');
      } else {
        doc.rect(x, y, w, h, 'S');
      }
      break;
    }

    // -----------------------------------------------------------------------
    // CIRCLE
    // -----------------------------------------------------------------------
    case 'CIRCLE': {
      const fillColor = color?.background;
      const borderColor = border?.color ?? '#000000';
      const [dr, dg, db] = hexToRgb(borderColor);
      doc.setDrawColor(dr, dg, db);
      doc.setLineWidth(pxToMm(border?.width ?? 1));

      if (fillColor) {
        const [fr, fg, fb] = hexToRgb(fillColor);
        doc.setFillColor(fr, fg, fb);
        doc.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 'FD');
      } else {
        doc.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 'S');
      }
      break;
    }

    // -----------------------------------------------------------------------
    // Static shapes with optional fill
    // -----------------------------------------------------------------------
    case 'BACKGROUND_IMAGE':
    case 'WATERMARK': {
      const fillColor = color?.background;
      if (fillColor) {
        const [fr, fg, fb] = hexToRgb(fillColor);
        doc.setFillColor(fr, fg, fb);
        doc.rect(x, y, w, h, 'F');
      }
      break;
    }

    // -----------------------------------------------------------------------
    // Text components (default)
    // -----------------------------------------------------------------------
    default: {
      const text = resolveComponentText(component, studentData);
      if (!text) break;

      const fontFamily = font?.family?.toLowerCase() === 'times new roman' ? 'times' : 'helvetica';
      const fontStyle = getFontStyle(font?.weight, font?.style);
      const fontSize = font?.size ?? 10;

      doc.setFont(fontFamily, fontStyle);
      doc.setFontSize(fontSize);

      const textColor = color?.text ?? '#000000';
      const [tr, tg, tb] = hexToRgb(textColor);
      doc.setTextColor(tr, tg, tb);

      if (color?.background) {
        const [fr, fg, fb] = hexToRgb(color.background);
        doc.setFillColor(fr, fg, fb);
        doc.rect(x, y, w, h, 'F');
      }

      const padding = pxToMm(layout.spacing?.padding ?? 2);
      const alignment = layout.alignment ?? 'left';
      let textX = x + padding;

      if (alignment === 'center') {
        textX = x + w / 2;
      } else if (alignment === 'right') {
        textX = x + w - padding;
      }

      const jsPDFAlign = alignment === 'justify' ? 'left' : alignment;

      // Clip text within component bounds
      const lines = doc.splitTextToSize(text, w - padding * 2);
      doc.text(lines, textX, y + padding + fontSize * PX_TO_MM, {
        align: jsPDFAlign as 'left' | 'center' | 'right',
        maxWidth: w - padding * 2,
      });
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// PDFRendererService
// ---------------------------------------------------------------------------

export class PDFRendererService {
  /**
   * Render a template with the given student data, returning a PDF Blob.
   */
  async renderTemplate(options: PDFRenderOptions): Promise<Blob> {
    const { template, studentData, pageIndex } = options;

    const orientation = template.pageOrientation === 'landscape' ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    const pagesToRender =
      pageIndex !== undefined
        ? [template.pages[pageIndex]].filter(Boolean)
        : template.pages;

    if (pagesToRender.length === 0) {
      throw new PDFRenderError('No pages to render');
    }

    pagesToRender.forEach((page, idx) => {
      if (!page) return;

      if (idx > 0) {
        doc.addPage();
      }

      // Sort by zIndex ascending so lower z-index components render first
      const sorted = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);

      for (const component of sorted) {
        try {
          renderComponentToPDF(doc, component, studentData);
        } catch (err) {
          // Continue rendering other components even if one fails
          console.warn(`[PDFRenderer] Failed to render component ${component.id}:`, err);
        }
      }
    });

    const pdfOutput = doc.output('blob');
    return pdfOutput;
  }

  /**
   * Bulk-generate PDFs for multiple students.
   * Reports progress via callback; continues on individual failures.
   */
  async renderBulk(
    template: Template,
    studentIds: string[],
    onProgress: (progress: BulkGenerationProgress) => void,
    dataFetcher: DataFetcherService
  ): Promise<BulkGenerationResult[]> {
    const results: BulkGenerationResult[] = [];
    let completed = 0;
    let failed = 0;

    for (const studentId of studentIds) {
      onProgress({
        total: studentIds.length,
        completed,
        failed,
        currentStudentId: studentId,
      });

      try {
        const studentData = await dataFetcher.fetchSampleData(studentId);
        const pdfBlob = await this.renderTemplate({ template, studentData });
        results.push({ studentId, success: true, pdfBlob });
        completed++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[PDFRenderer] Failed to generate PDF for student ${studentId}:`, err);
        results.push({ studentId, success: false, error: errorMessage });
        failed++;
        completed++;
      }

      onProgress({
        total: studentIds.length,
        completed,
        failed,
        currentStudentId: studentId,
      });
    }

    return results;
  }
}
