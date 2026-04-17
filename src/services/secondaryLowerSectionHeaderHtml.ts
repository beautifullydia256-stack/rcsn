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
        .pweza-footer {
          margin-top: 8px;
          padding-top: 4px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 7.5pt;
          color: #64748b;
          font-family: 'Times New Roman', Times, serif;
        }
`;

/**
 * O-Level Basic (template2) & Progressive (template3): extra legend blocks + default spacing push
 * Puppeteer past one A4. Scoped to {@code body.olevel-basic-progressive} — tighter typography and
 * margins so PDF/preview match a single sheet (same goal as primary one-page cards).
 */
export const SECONDARY_OLEVEL_BASIC_PROGRESSIVE_SINGLE_PAGE_CSS = `
        /* Fill the printable area like primary cards: no global zoom-shrink (that left a large white band on A4). */
        body.olevel-basic-progressive {
          font-size: 9.75pt;
          line-height: 1.26;
          padding: 0.06cm 0.18cm 0.12cm 0.18cm;
          min-height: auto !important;
        }
        body.olevel-basic-progressive .print-header-container {
          padding-top: 0.14cm !important;
          padding-bottom: 0 !important;
        }
        body.olevel-basic-progressive .print-header-container > div[style*="min-height:2.1cm"] {
          min-height: 1.58cm !important;
        }
        body.olevel-basic-progressive .secondary-upper-student-block {
          min-height: 0;
          padding: 4px 8px;
          margin-bottom: 2mm;
          font-size: 9.75pt;
        }
        body.olevel-basic-progressive .secondary-upper-student-grid {
          font-size: 9.75pt;
          row-gap: 2px;
        }
        body.olevel-basic-progressive table.upper-results {
          font-size: 8.65pt;
          margin-bottom: 2mm;
        }
        body.olevel-basic-progressive table.upper-results th,
        body.olevel-basic-progressive table.upper-results td {
          padding: 2px 4px;
        }
        body.olevel-basic-progressive table.upper-results td.note-cell {
          font-size: 8.35pt;
          text-align: left;
        }
        body.olevel-basic-progressive .secondary-ol-comments-panel {
          font-size: 9.15pt;
          line-height: 1.22;
          padding: 5px 7px;
          margin-bottom: 2mm;
        }
        body.olevel-basic-progressive .secondary-ol-comment-block {
          padding-bottom: 4px;
          margin-bottom: 4px;
        }
        body.olevel-basic-progressive .secondary-ol-comment-label {
          font-size: 9.2pt;
          margin-bottom: 2px;
        }
        body.olevel-basic-progressive .secondary-ol-comment-line {
          min-height: 1.1em;
          margin-bottom: 4px;
          padding-bottom: 2px;
        }
        body.olevel-basic-progressive .secondary-ol-meta-field {
          font-size: 8.6pt;
        }
        body.olevel-basic-progressive .secondary-ol-comment-meta .secondary-ol-meta-field strong {
          font-size: 8.6pt;
        }
        body.olevel-basic-progressive .secondary-ol-fees-balance {
          font-size: 9pt;
        }
        body.olevel-basic-progressive .grades {
          margin: 3px 0 4px;
          font-size: 8.35pt;
        }
        body.olevel-basic-progressive .grades strong {
          margin-bottom: 3px;
        }
        body.olevel-basic-progressive table.upper-results.terms-key {
          margin: 3px 0 4px;
        }
        body.olevel-basic-progressive table.upper-results.terms-key tbody td:last-child {
          font-size: 8.35pt;
          line-height: 1.22;
        }
        body.olevel-basic-progressive table.upper-results.lo-key {
          margin: 3px 0 4px;
        }
        body.olevel-basic-progressive table.upper-results.lo-key tbody td {
          padding: 2px 5px;
          font-size: 8.1pt;
          line-height: 1.22;
        }
        body.olevel-basic-progressive .summary-strip {
          margin-bottom: 3px;
          padding: 3px 6px;
          gap: 3px;
          font-size: 8.6pt;
        }
        body.olevel-basic-progressive .summary-strip .id-box {
          min-height: 30px;
          font-size: 10.75pt;
          padding: 2px 3px;
        }
        body.olevel-basic-progressive .pweza-footer {
          margin-top: 3px;
          padding-top: 2px;
          font-size: 7.1pt;
        }
        body.olevel-basic-progressive .olevel-prog-lo-footnote {
          margin: 2px 0 !important;
          font-size: 8pt !important;
          line-height: 1.2;
        }

        /* Progressive (template3): more sections than Basic — avoid a lone footer line on page 2. */
        body.olevel-basic-progressive.olevel-progressive .secondary-ol-comments-panel {
          padding: 5px 7px;
          margin-bottom: 2mm;
        }
        body.olevel-basic-progressive.olevel-progressive .summary-strip {
          margin-bottom: 2px;
          padding: 3px 6px;
          gap: 4px;
        }
        body.olevel-basic-progressive.olevel-progressive .summary-strip .id-box {
          min-height: 28px;
          font-size: 10.5pt;
          padding: 2px 4px;
        }
        body.olevel-basic-progressive.olevel-progressive .olevel-prog-lo-footnote {
          margin: 1px 0 2px !important;
          font-size: 7.5pt !important;
          line-height: 1.15 !important;
        }
        body.olevel-basic-progressive.olevel-progressive .grades {
          margin: 3px 0 3px;
        }
        body.olevel-basic-progressive.olevel-progressive table.upper-results.lo-key {
          margin: 2px 0 0;
        }
        body.olevel-basic-progressive.olevel-progressive table.upper-results.lo-key thead th {
          padding: 2px 4px;
          font-size: 8.5pt;
        }
        body.olevel-basic-progressive.olevel-progressive table.upper-results.lo-key tbody td {
          padding: 1px 4px;
          font-size: 7.85pt;
          line-height: 1.15;
        }
        body.olevel-basic-progressive.olevel-progressive .olevel-prog-footer-group {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        body.olevel-basic-progressive.olevel-progressive .pweza-footer {
          page-break-before: avoid;
          break-before: avoid;
          margin-top: 3px;
          padding-top: 2px;
        }
        @media print {
          body.olevel-basic-progressive.olevel-progressive .olevel-prog-footer-group {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          body.olevel-basic-progressive.olevel-progressive .pweza-footer {
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
        }
`;

/**
 * O-Level Standard (template1): 9-column table + comments + grading legend — compact to one A4 sheet
 * alongside Basic/Progressive; keeps grading block + footer together in print.
 */
export const SECONDARY_OLEVEL_STANDARD_SINGLE_PAGE_CSS = `
        body.olevel-standard {
          font-size: 9.75pt;
          line-height: 1.26;
          padding: 0.06cm 0.18cm 0.12cm 0.18cm;
          min-height: auto !important;
        }
        body.olevel-standard .print-header-container {
          padding-top: 0.14cm !important;
          padding-bottom: 0 !important;
        }
        body.olevel-standard .print-header-container > div[style*="min-height:2.1cm"] {
          min-height: 1.58cm !important;
        }
        body.olevel-standard .secondary-upper-student-block {
          min-height: 0;
          padding: 4px 8px;
          margin-bottom: 2mm;
          font-size: 9.75pt;
        }
        body.olevel-standard .secondary-upper-student-grid {
          font-size: 9.75pt;
          row-gap: 2px;
        }
        body.olevel-standard table.upper-results.o-level-standard {
          font-size: 8.55pt;
          margin-bottom: 2mm;
        }
        body.olevel-standard table.upper-results.o-level-standard th,
        body.olevel-standard table.upper-results.o-level-standard td {
          padding: 2px 4px;
        }
        body.olevel-standard table.upper-results.o-level-standard .standard-topic {
          font-size: 8.2pt;
          line-height: 1.14;
          margin-top: 0;
        }
        body.olevel-standard table.upper-results.o-level-standard td.remark-cell,
        body.olevel-standard table.upper-results.o-level-standard td.note-cell {
          font-size: 8.2pt;
        }
        body.olevel-standard .secondary-ol-comments-panel {
          font-size: 9.15pt;
          line-height: 1.22;
          padding: 5px 7px;
          margin-bottom: 2mm;
        }
        body.olevel-standard .secondary-ol-comment-block {
          padding-bottom: 4px;
          margin-bottom: 4px;
        }
        body.olevel-standard .secondary-ol-comment-label {
          font-size: 9.1pt;
          margin-bottom: 2px;
        }
        body.olevel-standard .secondary-ol-comment-line {
          min-height: 1.05em;
          margin-bottom: 4px;
          padding-bottom: 2px;
        }
        body.olevel-standard .secondary-ol-comment-meta {
          gap: 8px 14px;
        }
        body.olevel-standard .grading-system {
          margin-bottom: 0;
          margin-top: 0;
        }
        body.olevel-standard .grading-system h3 {
          font-size: 9.2pt;
          margin-bottom: 1px;
        }
        body.olevel-standard .grading-system p {
          font-size: 8.75pt;
          margin-bottom: 3px;
        }
        body.olevel-standard .grading-system .description-table {
          font-size: 7.75pt;
        }
        body.olevel-standard .grading-system .description-table th,
        body.olevel-standard .grading-system .description-table td {
          padding: 1px 3px;
          line-height: 1.14;
        }
        body.olevel-standard .olevel-standard-footer-group {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        body.olevel-standard .footer {
          margin-top: 3px;
          font-size: 7.1pt;
          page-break-before: avoid;
          break-before: avoid;
        }
        @media print {
          body.olevel-standard .olevel-standard-footer-group {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          body.olevel-standard .footer {
            page-break-before: avoid !important;
            break-before: avoid !important;
          }
        }
`;

/**
 * Subject-row count → PDF density tier for O-Level Standard / Basic / Progressive.
 * ≥10: compact (fits ~14 S1 / ~10 S3 lines on one A4). ≤7: relaxed (fills sheet when fewer subjects).
 */
export function olevelReportDensityClassFromRowCount(rowCount: number): string {
  const n = Math.max(0, Math.floor(Number(rowCount) || 0));
  if (n >= 10) return 'olevel-density-compact';
  if (n <= 7) return 'olevel-density-relaxed';
  return 'olevel-density-normal';
}

/**
 * Tier overrides on top of `SECONDARY_OLEVEL_*_SINGLE_PAGE_CSS`. Scoped to body.olevel-standard and
 * body.olevel-basic-progressive.
 */
export const SECONDARY_OLEVEL_DENSITY_TIER_CSS = `
        /* No body zoom: zoom shrinks text but leaves a large empty band on A4 (same as primary: use type + padding only). */
        body.olevel-standard.olevel-density-compact,
        body.olevel-basic-progressive.olevel-density-compact {
          font-size: 9.45pt;
          line-height: 1.25;
        }
        body.olevel-standard.olevel-density-compact .print-header-container {
          padding-top: 0.15cm !important;
        }
        body.olevel-standard.olevel-density-compact .print-header-container > div[style*="min-height:2.1cm"] {
          min-height: 1.62cm !important;
        }
        body.olevel-standard.olevel-density-compact .secondary-upper-student-block {
          padding: 4px 8px;
          margin-bottom: 2mm;
          font-size: 9.35pt;
        }
        body.olevel-standard.olevel-density-compact table.upper-results.o-level-standard {
          font-size: 8.05pt;
          margin-bottom: 2mm;
        }
        body.olevel-standard.olevel-density-compact table.upper-results.o-level-standard th,
        body.olevel-standard.olevel-density-compact table.upper-results.o-level-standard td {
          padding: 2px 3px;
        }
        body.olevel-standard.olevel-density-compact table.upper-results.o-level-standard .standard-topic {
          font-size: 7.65pt;
          line-height: 1.14;
          margin-top: 0;
        }
        body.olevel-standard.olevel-density-compact table.upper-results.o-level-standard td.remark-cell,
        body.olevel-standard.olevel-density-compact table.upper-results.o-level-standard td.note-cell {
          font-size: 7.65pt;
        }
        body.olevel-standard.olevel-density-compact .secondary-ol-comments-panel {
          font-size: 9pt;
          line-height: 1.26;
          padding: 5px 7px;
          margin-bottom: 2mm;
        }
        body.olevel-standard.olevel-density-compact .secondary-ol-comment-block {
          padding-bottom: 5px;
          margin-bottom: 5px;
        }
        body.olevel-standard.olevel-density-compact .grading-system h3 {
          font-size: 9pt;
          margin-bottom: 2px;
        }
        body.olevel-standard.olevel-density-compact .grading-system p {
          font-size: 8.75pt;
          margin-bottom: 3px;
        }
        body.olevel-standard.olevel-density-compact .grading-system .description-table {
          font-size: 7.75pt;
        }
        body.olevel-standard.olevel-density-compact .grading-system .description-table th,
        body.olevel-standard.olevel-density-compact .grading-system .description-table td {
          padding: 2px 4px;
          line-height: 1.18;
        }
        body.olevel-standard.olevel-density-compact .footer {
          margin-top: 4px;
          padding-top: 3px;
          font-size: 7.1pt;
        }

        body.olevel-basic-progressive.olevel-density-compact .secondary-upper-student-block {
          padding: 4px 8px;
          margin-bottom: 2mm;
          font-size: 9.35pt;
        }
        body.olevel-basic-progressive.olevel-density-compact table.upper-results {
          font-size: 8.2pt;
          margin-bottom: 2mm;
        }
        body.olevel-basic-progressive.olevel-density-compact table.upper-results th,
        body.olevel-basic-progressive.olevel-density-compact table.upper-results td {
          padding: 2px 4px;
        }
        body.olevel-basic-progressive.olevel-density-compact .secondary-ol-comments-panel {
          font-size: 9pt;
          padding: 5px 7px;
          margin-bottom: 2mm;
        }
        body.olevel-basic-progressive.olevel-density-compact .grades {
          margin: 3px 0 4px;
          font-size: 8pt;
        }
        body.olevel-basic-progressive.olevel-density-compact table.upper-results.terms-key tbody td:last-child,
        body.olevel-basic-progressive.olevel-density-compact table.upper-results.lo-key tbody td {
          font-size: 7.65pt;
          line-height: 1.15;
        }
        body.olevel-basic-progressive.olevel-density-compact.olevel-progressive .summary-strip {
          padding: 4px 6px;
          margin-bottom: 4px;
        }
        body.olevel-basic-progressive.olevel-density-compact .pweza-footer {
          margin-top: 4px;
          font-size: 7.1pt;
        }

        body.olevel-standard.olevel-density-normal .secondary-ol-comments-panel,
        body.olevel-basic-progressive.olevel-density-normal .secondary-ol-comments-panel {
          padding: 7px 9px;
          margin-bottom: 3mm;
        }
        body.olevel-standard.olevel-density-normal .secondary-ol-comments-panel {
          padding: 5px 7px;
          margin-bottom: 2mm;
        }
        body.olevel-standard.olevel-density-normal .grading-system h3 {
          margin-bottom: 2px;
        }
        body.olevel-standard.olevel-density-normal .grading-system .description-table {
          font-size: 7.85pt;
        }
        body.olevel-standard.olevel-density-normal .grading-system .description-table th,
        body.olevel-standard.olevel-density-normal .grading-system .description-table td {
          padding: 1px 3px;
          line-height: 1.16;
        }
        body.olevel-standard.olevel-density-normal .footer {
          margin-top: 4px;
          padding-top: 2px;
        }
        body.olevel-basic-progressive.olevel-density-normal .secondary-ol-comments-panel {
          padding: 5px 7px;
          margin-bottom: 2mm;
        }
        body.olevel-basic-progressive.olevel-density-normal .grades {
          margin: 4px 0 5px;
        }
        body.olevel-basic-progressive.olevel-density-normal .pweza-footer {
          margin-top: 4px;
          padding-top: 2px;
        }

        body.olevel-standard.olevel-density-relaxed,
        body.olevel-basic-progressive.olevel-density-relaxed {
          font-size: 10.1pt;
          line-height: 1.3;
          padding: 0.1cm 0.22cm 0.32cm 0.22cm;
        }
        body.olevel-standard.olevel-density-relaxed {
          padding: 0.08cm 0.2cm 0.16cm 0.2cm;
        }
        body.olevel-basic-progressive.olevel-density-relaxed {
          padding: 0.08cm 0.2cm 0.16cm 0.2cm;
        }
        body.olevel-standard.olevel-density-relaxed .secondary-upper-student-block {
          padding: 7px 11px;
          margin-bottom: 3.5mm;
          font-size: 10pt;
        }
        body.olevel-standard.olevel-density-relaxed table.upper-results.o-level-standard {
          font-size: 9.1pt;
          margin-bottom: 3.5mm;
        }
        body.olevel-standard.olevel-density-relaxed table.upper-results.o-level-standard th,
        body.olevel-standard.olevel-density-relaxed table.upper-results.o-level-standard td {
          padding: 4px 6px;
        }
        body.olevel-standard.olevel-density-relaxed table.upper-results.o-level-standard .standard-topic {
          font-size: 8.5pt;
          line-height: 1.22;
        }
        body.olevel-standard.olevel-density-relaxed .secondary-ol-comments-panel {
          font-size: 10pt;
          padding: 8px 11px;
          margin-bottom: 3.5mm;
        }
        body.olevel-standard.olevel-density-relaxed .grading-system .description-table {
          font-size: 8.6pt;
        }
        body.olevel-standard.olevel-density-relaxed .grading-system .description-table th,
        body.olevel-standard.olevel-density-relaxed .grading-system .description-table td {
          padding: 3px 6px;
          line-height: 1.28;
        }
        body.olevel-standard.olevel-density-relaxed .grading-system h3 {
          font-size: 10.2pt;
          margin-bottom: 4px;
        }
        body.olevel-standard.olevel-density-relaxed .footer {
          margin-top: 8px;
          padding-top: 5px;
          font-size: 7.8pt;
        }

        body.olevel-basic-progressive.olevel-density-relaxed table.upper-results {
          font-size: 9.2pt;
          margin-bottom: 3.5mm;
        }
        body.olevel-basic-progressive.olevel-density-relaxed table.upper-results th,
        body.olevel-basic-progressive.olevel-density-relaxed table.upper-results td {
          padding: 4px 6px;
        }
        body.olevel-basic-progressive.olevel-density-relaxed .secondary-ol-comments-panel {
          font-size: 10pt;
          padding: 8px 11px;
          margin-bottom: 2.5mm;
        }
        body.olevel-basic-progressive.olevel-density-relaxed .grades {
          margin: 5px 0 6px;
          font-size: 9pt;
        }
        body.olevel-basic-progressive.olevel-density-relaxed .pweza-footer {
          margin-top: 5px;
          padding-top: 3px;
          font-size: 7.8pt;
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

/**
 * Student details strip matching primary "Report for Upper Section" / Template 4 PDF (`student-block` in api/pdf/generate.ts):
 * flex row, 2-column grid of fields, passport photo right (2.1×2.9 cm).
 */
export const SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS = `
        .secondary-upper-student-block {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 6px 10px;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          margin-bottom: 3mm;
          background: #f8fafc;
          min-height: 28mm;
          font-size: 10.2pt;
          line-height: 1.3;
          color: #1e293b;
          font-family: 'Times New Roman', Times, serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .secondary-upper-student-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 10px;
          row-gap: 4px;
          font-size: 10.2pt;
          flex: 1;
        }
        .secondary-upper-student-grid strong {
          color: #1e3a8a;
        }
        .secondary-upper-photo-cell {
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
        .secondary-upper-photo-cell img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
`;

/**
 * Subject results table — same typography and colors as primary "Report for Upper Section"
 * PDF (`api/pdf/generate.ts`: table / thead / th,td borders #bfdbfe, header #dbeafe).
 */
export const SECONDARY_UPPER_SECTION_RESULTS_TABLE_CSS = `
        table.upper-results {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.8pt;
          margin-bottom: 3mm;
          font-family: 'Times New Roman', Times, serif;
          table-layout: auto;
          position: relative;
          z-index: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table.upper-results th,
        table.upper-results td {
          border: 1px solid #bfdbfe;
          padding: 4px 6px;
          vertical-align: middle;
        }
        table.upper-results thead tr {
          color: #1e3a8a;
          text-transform: uppercase;
          font-weight: 600;
        }
        table.upper-results thead th {
          background: #dbeafe;
        }
        table.upper-results tbody td {
          background: #ffffff;
        }
        table.upper-results th {
          text-align: left;
        }
        table.upper-results th.c,
        table.upper-results td.c {
          text-align: center;
        }
        table.upper-results tbody td.subj {
          font-weight: 600;
          color: #0f172a;
          text-align: left;
        }
        table.upper-results td.grade-col {
          font-weight: 700;
          color: #1e3a8a;
        }
        table.upper-results td.note-cell {
          font-size: 9.2pt;
          color: #475569;
          text-align: center;
        }
        table.upper-results tbody tr:nth-child(even) td {
          background: #f0f9ff;
        }
        table.upper-results tbody tr.sum td {
          background: #e0f2fe;
          color: #1e3a8a;
          font-weight: 600;
        }
`;

export function streamDisplayForSecondaryStudentBlock(student: any): string {
  return String(
    student?.stream ??
      student?.current_stream ??
      student?.stream_name ??
      student?.class_stream ??
      student?.section ??
      'N/A',
  );
}

/** Same rule as `Template4UpperSectionReport` report date line (en-GB short month). */
export function formatSecondaryReportDateDisplayForStudentBlock(examSet: any, student: any): string {
  const raw = examSet?.date ?? examSet?.exam_date ?? student?.report_date ?? student?.summary?.reportDate;
  if (raw == null || raw === '') return 'N/A';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return String(raw);
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function studentBlockPhotoInnerHtml(
  student: any,
  studentPhotoBase64: string | null | undefined,
  escAttrFn: (s: string) => string,
): string {
  const fromArg =
    studentPhotoBase64 != null && String(studentPhotoBase64).trim() !== ''
      ? String(studentPhotoBase64)
      : '';
  const fromProfile =
    student?.profile_photo != null && String(student.profile_photo).trim() !== ''
      ? String(student.profile_photo)
      : '';
  const raw = fromArg || fromProfile;
  if (raw) {
    return `<img src="${escAttrFn(raw)}" alt="Student Photo" />`;
  }
  return '<span style="font-size:8pt;color:#94a3b8">Photo</span>';
}

export function buildSecondaryUpperSectionStyleStudentBlockHtml(
  student: any,
  examSet: any,
  studentPhotoBase64: string | null | undefined,
): string {
  const name = escText(student?.name ?? '');
  const cls = escText(student?.current_class ?? '');
  const adm = escText(student?.admission_number ?? student?.student_id ?? 'N/A');
  const term = examSet?.term ?? 'N/A';
  const year = examSet?.year ?? new Date().getFullYear();
  const stream = escText(streamDisplayForSecondaryStudentBlock(student));
  const dateStr = escText(formatSecondaryReportDateDisplayForStudentBlock(examSet, student));
  const photo = studentBlockPhotoInnerHtml(student, studentPhotoBase64, escAttr);

  return `
      <div class="secondary-upper-student-block" style="margin-top:0.08cm;">
        <div class="secondary-upper-student-grid">
          <div><strong>Name:</strong> ${name}</div>
          <div><strong>Class:</strong> ${cls}</div>
          <div><strong>Admission No:</strong> ${adm}</div>
          <div><strong>Term:</strong> ${escText(term)} / ${escText(year)}</div>
          <div><strong>Stream:</strong> ${stream}</div>
          <div><strong>Date:</strong> ${dateStr}</div>
        </div>
        <div class="secondary-upper-photo-cell">
          ${photo}
        </div>
      </div>`;
}

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
  const contactSep = school?.header_contact_separator_color || REPORT_HEADER_DEFAULTS.contactSeparator;

  const contactEmail = school?.contact_email ?? school?.email ?? '';
  const contactPhone = school?.contact_phone ?? school?.phone ?? '';
  const addressLine = [school?.address, school?.pobox].filter(Boolean).join(' ').trim();

  const chip = escText(String(banner.chipTitle ?? '').toUpperCase());

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
      <div style="text-align:center;margin-bottom:0.15cm;">
        <div style="display:inline-block;padding:6px 20px;border-radius:18px;font-size:9pt;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:${escAttr(String(chipText))};background:${escAttr(String(chipBg))};border:1px solid ${escAttr(String(chipBorder))};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          ${chip}
        </div>
      </div>
    </div>`;
}

/** Escape text for secondary built-in HTML fragments (body text, not attributes). */
export function secondaryReportEscHtml(s: unknown): string {
  return escText(s);
}

/**
 * Long UK-style date for "Next term begins" line, e.g. Saturday, 13 September, 2025.
 * If parsing fails, returns the original string (or empty).
 */
export function formatNextTermBeginsLongDisplay(raw: unknown): string {
  if (raw == null) return '';
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime())
      ? ''
      : raw.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
  }
  const s = String(raw).trim();
  if (!s) return '';
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  return s;
}

/** UGX display for report footers (matches Progressive template). */
export function formatSecondaryFeesBalanceForReport(student: any): string {
  const raw =
    student?.progressiveFeesBalance ?? student?.feesBalance ?? student?.fees?.balance;
  if (raw === undefined || raw === null || raw === '') {
    return '—';
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(raw);
  }
  const n = Number(String(raw).replace(/,/g, ''));
  if (Number.isFinite(n)) {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(n);
  }
  return String(raw).trim() || '—';
}

/**
 * Class / head comments + next term — same visual language as primary Upper Section PDF
 * (`api/pdf/generate.ts` `.comments-box`, `.next-term-fees`).
 */
export const SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS = `
        .secondary-ol-comments-panel {
          font-family: 'Times New Roman', Times, serif;
          font-size: 10.2pt;
          line-height: 1.32;
          background: #ffffff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 3mm;
          position: relative;
          z-index: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .secondary-ol-comment-block {
          padding-bottom: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid #bfdbfe;
        }
        .secondary-ol-comment-block:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        .secondary-ol-comment-label {
          font-size: 10.6pt;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 3px;
          color: #1e3a8a;
          letter-spacing: 0.02em;
        }
        .secondary-ol-comment-line {
          border-bottom: 1px solid #cbd5e1;
          min-height: 1.35em;
          padding-bottom: 3px;
          margin-bottom: 8px;
        }
        .secondary-ol-comment-text {
          font-style: italic;
          color: #334155;
        }
        .secondary-ol-comment-meta {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 12px 20px;
          align-items: flex-end;
        }
        .secondary-ol-comment-meta .secondary-ol-meta-field strong {
          color: #1e3a8a;
          font-size: 9.6pt;
          font-weight: 600;
        }
        .secondary-ol-meta-field {
          flex: 1;
          min-width: 160px;
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-size: 9.6pt;
          color: #64748b;
        }
        .secondary-ol-dotted {
          flex: 1;
          border-bottom: 1px dotted #94a3b8;
          min-height: 1.15em;
          min-width: 72px;
        }
        .secondary-ol-next-term-row {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px 20px;
          flex-wrap: wrap;
          padding-top: 0;
          margin-top: 0;
        }
        .secondary-ol-next-term-col {
          flex: 1;
          min-width: 180px;
        }
        .secondary-ol-fees-balance {
          font-weight: 600;
          font-size: 10pt;
          color: #334155;
          white-space: nowrap;
          padding-bottom: 3px;
        }
        .secondary-ol-fees-balance strong {
          color: #1e3a8a;
          font-weight: 600;
        }
`;

export type SecondaryOlevelCommentsNextTermPanelInput = {
  classTeacherComment: string;
  headTeacherComment: string;
  classTeacherName: string;
  headTeacherName: string;
  nextTermBeginsDisplay: string;
  /** Pre-formatted balance text (e.g. UGX from formatSecondaryFeesBalanceForReport). */
  feesBalanceDisplay: string;
};

export function buildSecondaryOlevelCommentsNextTermPanelHtml(
  opts: SecondaryOlevelCommentsNextTermPanelInput,
): string {
  const ct = secondaryReportEscHtml(opts.classTeacherComment);
  const ht = secondaryReportEscHtml(opts.headTeacherComment);
  const ctn = secondaryReportEscHtml(opts.classTeacherName);
  const htn = secondaryReportEscHtml(opts.headTeacherName);
  const ntd = secondaryReportEscHtml(opts.nextTermBeginsDisplay);
  const fees = secondaryReportEscHtml(opts.feesBalanceDisplay);
  const blank = '&nbsp;';
  return `
      <div class="secondary-ol-comments-panel">
        <div class="secondary-ol-comment-block">
          <div class="secondary-ol-comment-label">Class Teacher's Comment:</div>
          <div class="secondary-ol-comment-line"><span class="secondary-ol-comment-text">${ct || blank}</span></div>
          <div class="secondary-ol-comment-meta">
            <div class="secondary-ol-meta-field"><strong>Name:</strong> <span class="secondary-ol-dotted">${ctn || blank}</span></div>
            <div class="secondary-ol-meta-field"><strong>Signature:</strong> <span class="secondary-ol-dotted">${blank}</span></div>
          </div>
        </div>
        <div class="secondary-ol-comment-block">
          <div class="secondary-ol-comment-label">Head Teacher's Comment:</div>
          <div class="secondary-ol-comment-line"><span class="secondary-ol-comment-text">${ht || blank}</span></div>
          <div class="secondary-ol-comment-meta">
            <div class="secondary-ol-meta-field"><strong>Name:</strong> <span class="secondary-ol-dotted">${htn || blank}</span></div>
            <div class="secondary-ol-meta-field"><strong>Signature:</strong> <span class="secondary-ol-dotted">${blank}</span></div>
          </div>
        </div>
        <div class="secondary-ol-comment-block">
          <div class="secondary-ol-next-term-row">
            <div class="secondary-ol-next-term-col">
              <div class="secondary-ol-comment-label">Next Term Begins:</div>
              <div class="secondary-ol-comment-line"><span class="secondary-ol-comment-text">${ntd || blank}</span></div>
            </div>
            <div class="secondary-ol-fees-balance"><strong>Fees Balance:</strong> <span>${fees || '—'}</span></div>
          </div>
        </div>
      </div>`;
}
