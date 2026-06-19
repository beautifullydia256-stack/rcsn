import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type TimetablePeriodForPdf = {
  class_name: string;
  day_of_week: string;
  subject: string;
  start_time: string;
  end_time: string;
  teacher_name: string;
};

export type TimetableFixedPeriodForPdf = {
  name: string;
  start_time: string;
  end_time: string;
  color: string; // hex, e.g. '#EF4444'
  type: 'break' | 'lunch' | 'custom';
  /** null / undefined = every day; array = only on these days */
  days?: string[] | null;
};

export type TimetablePdfScope = 'whole_school' | 'single_class';

// ---------------------------------------------------------------------------
// Colour palette
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

const C_GREEN:     RGB = [5,   150, 105];
const C_NAVY:      RGB = [30,  58,  138];
const C_SLATE:     RGB = [51,  65,  85];
const C_RED:       RGB = [220, 38,  38];
const C_NAVY_DARK: RGB = [17,  24,  39];
const C_PURPLE:    RGB = [109, 40,  217];
const C_WHITE:     RGB = [255, 255, 255];
const C_ALT:       RGB = [241, 245, 249];
const C_LIGHT:     RGB = [248, 250, 252];
const C_BORDER:    RGB = [203, 213, 225];
const C_TEXT:      RGB = [30,  41,  59];

// Day-column colour palette — each day gets a distinct dark shade
const DAY_COLORS: RGB[] = [
  [30,  58,  138], // Monday    – deep blue
  [6,   78,  59],  // Tuesday   – forest green
  [76,  29,  149], // Wednesday – deep purple
  [22,  78,  99],  // Thursday  – dark teal
  [127, 29,  29],  // Friday    – dark red
  [120, 53,  15],  // Saturday  – dark amber
  [30,  41,  59],  // Sunday    – dark slate
];

const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function safe(raw: unknown): string {
  if (raw == null) return '';
  return String(raw)
    .replace(/[‒–—―]/g, '-')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, '...')
    .replace(/[  ]/g, ' ')
    .trim();
}

function normTime(t: string): string {
  return String(t || '').trim().slice(0, 5);
}

function slotKey(p: { start_time: string; end_time: string }): string {
  return `${normTime(p.start_time)}|${normTime(p.end_time)}`;
}

function slotSortKey(slot: string): number {
  const [sh, sm] = slot.split('|')[0].split(':').map(Number);
  return (sh || 0) * 60 + (sm || 0);
}

function sanitizeFilename(s: string): string {
  return (safe(s) || 'timetable').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80);
}

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  if (h.length !== 6) return C_PURPLE;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Returns true if the fixed period should appear on the given day. */
function fpAppliesToDay(fp: TimetableFixedPeriodForPdf, day: string): boolean {
  return !fp.days || fp.days.length === 0 || fp.days.includes(day);
}

function fpColor(fp: TimetableFixedPeriodForPdf): RGB {
  if (fp.type === 'break') return C_RED;
  if (fp.type === 'lunch') return C_NAVY_DARK;
  return hexToRgb(fp.color);
}

function orderedDays(periods: TimetablePeriodForPdf[]): string[] {
  const present = new Set(periods.map((p) => p.day_of_week));
  const fromWeek = WEEK_ORDER.filter((d) => present.has(d));
  return fromWeek.length > 0 ? fromWeek : [...WEEK_ORDER.slice(0, 5)];
}

function uniqueClasses(periods: TimetablePeriodForPdf[], classOrder: string[]): string[] {
  const names = [...new Set(periods.map((p) => p.class_name))];
  const idx = new Map(classOrder.map((c, i) => [c, i]));
  return names.sort((a, b) => {
    const ia = idx.get(a);
    const ib = idx.get(b);
    if (ia !== undefined && ib !== undefined) return ia - ib;
    if (ia !== undefined) return -1;
    if (ib !== undefined) return 1;
    return a.localeCompare(b);
  });
}

// ---------------------------------------------------------------------------
// Page header with optional school logo
// ---------------------------------------------------------------------------
function addPageHeader(
  doc: jsPDF,
  schoolName: string,
  title: string,
  subtitle: string,
  logoDataUrl?: string | null,
  termLabel?: string | null,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const mL = 10;
  const mR = 10;
  const logoSize = 22;
  let y = 8;

  if (logoDataUrl) {
    try {
      const ext = logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      doc.addImage(logoDataUrl, ext, mL, y, logoSize, logoSize);
    } catch { /* ignore if logo fails */ }
  }

  // School name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C_TEXT[0], C_TEXT[1], C_TEXT[2]);
  doc.text(safe(schoolName) || 'School', pageW / 2, y + 7, { align: 'center' });

  // Timetable type title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(C_GREEN[0], C_GREEN[1], C_GREEN[2]);
  doc.text(safe(title), pageW / 2, y + 14, { align: 'center' });

  // Subtitle (class name or "N classes")
  if (subtitle.trim()) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(safe(subtitle), pageW / 2, y + 20, { align: 'center' });
  }

  // TERM label on the right
  doc.setFontSize(8.5);
  doc.setFont('helvetica', termLabel ? 'bold' : 'normal');
  doc.setTextColor(termLabel ? C_TEXT[0] : 100, termLabel ? C_TEXT[1] : 116, termLabel ? C_TEXT[2] : 139);
  doc.text(termLabel ? `TERM ${termLabel}` : 'TERM: ____________', pageW - mR, y + 7, { align: 'right' });

  y = Math.max(y + logoSize, y + 22) + 4;

  // Coloured divider
  doc.setDrawColor(C_GREEN[0], C_GREEN[1], C_GREEN[2]);
  doc.setLineWidth(0.7);
  doc.line(mL, y, pageW - mR, y);
  y += 5;

  return y;
}

// ---------------------------------------------------------------------------
// Page footers
// ---------------------------------------------------------------------------
function addPageFooters(doc: jsPDF): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${total}`, pageW - 10, pageH - 5, { align: 'right' });
    doc.text('PwezaCore School Management', 10, pageH - 5);
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.2);
    doc.line(10, pageH - 8, pageW - 10, pageH - 8);
    doc.setTextColor(0);
  }
}

// ---------------------------------------------------------------------------
// WHOLE-SCHOOL master timetable
// Layout matches wall-chart style from the image:
//   Rows  = Day (merged/spanning) × Class
//   Cols  = sorted time slots; break/lunch slots are coloured bands
// ---------------------------------------------------------------------------
function drawWholeSchoolMasterTimetable(
  doc: jsPDF,
  periods: TimetablePeriodForPdf[],
  classes: string[],
  fixedPeriods: TimetableFixedPeriodForPdf[],
  startY: number,
): void {
  if (classes.length === 0) return;

  const days = orderedDays(periods);

  // All time slots: lessons + fixed periods, sorted by start time
  const slotKeySet = new Set<string>();
  for (const p of periods) slotKeySet.add(slotKey(p));
  for (const fp of fixedPeriods) slotKeySet.add(slotKey(fp));
  const sortedSlots = Array.from(slotKeySet).sort((a, b) => slotSortKey(a) - slotSortKey(b));

  const fixedMap = new Map<string, TimetableFixedPeriodForPdf>();
  for (const fp of fixedPeriods) fixedMap.set(slotKey(fp), fp);

  // Column widths
  const pageW = doc.internal.pageSize.getWidth();
  const mL = 8;
  const mR = 8;
  const usableW = pageW - mL - mR;
  const dayColW  = 16;
  const clsColW  = 14;
  const slotsW   = usableW - dayColW - clsColW;
  const slotColW = Math.max(13, Math.floor(slotsW / Math.max(1, sortedSlots.length)));

  // Head row — fixed-period columns get their own colour; regular slots get green
  const headRow: unknown[] = [
    { content: 'DAY',   styles: { fillColor: C_NAVY,  textColor: C_WHITE, fontStyle: 'bold', halign: 'center' } },
    { content: 'CLASS', styles: { fillColor: C_SLATE, textColor: C_WHITE, fontStyle: 'bold', halign: 'center' } },
    ...sortedSlots.map((slot) => {
      const fp = fixedMap.get(slot);
      const [st, en] = slot.split('|');
      if (fp) {
        const clr = fpColor(fp);
        return {
          content: `${fp.name.toUpperCase()}\n${st}–${en}`,
          styles: { fillColor: clr, textColor: C_WHITE, fontStyle: 'bold', halign: 'center', fontSize: 5.5 },
        };
      }
      return `${st}\n${en}`;
    }),
  ];

  // Build body rows: for each day → for each class
  const body: unknown[][] = [];

  for (let di = 0; di < days.length; di++) {
    const day = days[di];
    const dayBg: RGB = DAY_COLORS[di % DAY_COLORS.length];
    const dayPeriods = periods.filter((p) => p.day_of_week === day);

    for (let ci = 0; ci < classes.length; ci++) {
      const cls = classes[ci];
      const row: unknown[] = [];

      // Day cell — only on the first class row; spans all class rows for this day
      if (ci === 0) {
        row.push({
          content: day.toUpperCase(),
          rowSpan: classes.length,
          styles: {
            fillColor: dayBg,
            textColor: C_WHITE,
            fontStyle: 'bold',
            fontSize: 7.5,
            halign: 'center',
            valign: 'middle',
            cellPadding: { top: 2, bottom: 2, left: 1, right: 1 },
          },
        });
      }

      // Class cell
      row.push({
        content: cls,
        styles: {
          fillColor: [226, 232, 240] as RGB,
          textColor: C_TEXT,
          fontStyle: 'bold',
          fontSize: 7,
          halign: 'center',
          valign: 'middle',
        },
      });

      // Time slot cells
      for (const slot of sortedSlots) {
        const fp = fixedMap.get(slot);
        const [st, en] = slot.split('|');
        if (fp && fpAppliesToDay(fp, day)) {
          const clr = fpColor(fp);
          row.push({
            content: fp.name.toUpperCase(),
            styles: {
              fillColor: clr,
              textColor: C_WHITE,
              fontStyle: 'bold',
              fontSize: 6.5,
              halign: 'center',
              valign: 'middle',
            },
          });
        } else {
          // Lesson slot (also covers fixed period slots on days where the period doesn't apply)
          const matches = dayPeriods.filter(
            (p) => p.class_name === cls && normTime(p.start_time) === st && normTime(p.end_time) === en,
          );
          if (matches.length === 0) {
            row.push('');
          } else {
            const subj = safe(matches[0].subject);
            const teachers = [...new Set(matches.map((m) => safe(m.teacher_name)).filter(Boolean))];
            row.push(teachers.length > 0 ? `${subj}\n(${teachers.join(' / ')})` : subj);
          }
        }
      }

      body.push(row);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  autoTable(doc, {
    startY,
    head:  [headRow] as any,
    body:  body as any,
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
      valign: 'middle',
      overflow: 'linebreak',
      lineColor: C_BORDER,
      lineWidth: 0.2,
      textColor: C_TEXT,
    },
    headStyles: {
      fillColor: C_GREEN,
      textColor: C_WHITE,
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
    },
    alternateRowStyles: { fillColor: C_ALT },
    columnStyles: {
      0: { cellWidth: dayColW },
      1: { cellWidth: clsColW },
      ...Object.fromEntries(
        sortedSlots.map((_, i) => [i + 2, { cellWidth: slotColW, halign: 'center' as const }]),
      ),
    },
    margin: { left: mL, right: mR, bottom: 15 },
    tableLineColor: C_BORDER,
    tableLineWidth: 0.25,
  });
}

// ---------------------------------------------------------------------------
// SINGLE-CLASS timetable
// Layout: rows = time slots (break/lunch are full-width coloured rows),
//         cols = days of the week
// ---------------------------------------------------------------------------
function drawClassPage(
  doc: jsPDF,
  cls: string,
  periods: TimetablePeriodForPdf[],
  fixedPeriods: TimetableFixedPeriodForPdf[],
  startY: number,
): void {
  const days = orderedDays(periods);
  const dayAbbr = (d: string) => d.slice(0, 3).toUpperCase();

  const slotKeySet = new Set<string>();
  for (const p of periods) slotKeySet.add(slotKey(p));
  for (const fp of fixedPeriods) slotKeySet.add(slotKey(fp));
  const sortedSlots = Array.from(slotKeySet).sort((a, b) => slotSortKey(a) - slotSortKey(b));

  const fixedMap = new Map<string, TimetableFixedPeriodForPdf>();
  for (const fp of fixedPeriods) fixedMap.set(slotKey(fp), fp);

  const headRow = ['TIME SLOT', ...days.map(dayAbbr)];

  const body: unknown[][] = sortedSlots.map((slot) => {
    const fp = fixedMap.get(slot);
    const [st, en] = slot.split('|');
    const timeLabel = `${st} – ${en}`;

    const slotPeriods = periods.filter(
      (p) => normTime(p.start_time) === st && normTime(p.end_time) === en,
    );

    if (fp) {
      // If the period applies to ALL days, use a full-width coloured band (classic look).
      // If it's day-specific, render per-day cells so non-applicable days show lessons.
      const allDays = !fp.days || fp.days.length === 0;
      if (allDays) {
        const clr = fpColor(fp);
        return [
          {
            content: `${fp.name.toUpperCase()}   (${st} – ${en})`,
            colSpan: days.length + 1,
            styles: {
              fillColor: clr,
              textColor: C_WHITE,
              fontStyle: 'bold',
              fontSize: 8.5,
              halign: 'center',
              valign: 'middle',
              cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
            },
          },
        ];
      }
      // Day-specific: per-day cells
      const clr = fpColor(fp);
      return [
        { content: timeLabel, styles: { fontStyle: 'bold' as const, halign: 'center' as const, fillColor: C_LIGHT } },
        ...days.map((d) => {
          if (fpAppliesToDay(fp, d)) {
            return {
              content: fp.name.toUpperCase(),
              styles: { fillColor: clr, textColor: C_WHITE, fontStyle: 'bold' as const, halign: 'center' as const, valign: 'middle' as const },
            };
          }
          // Show lesson on this day if any, otherwise empty
          const matches = slotPeriods.filter((p) => p.day_of_week === d);
          if (matches.length === 0) return '';
          const subj = safe(matches[0].subject);
          const teachers = [...new Set(matches.map((m) => safe(m.teacher_name)).filter(Boolean))];
          return teachers.length > 0 ? `${subj}\n(${teachers.join(' / ')})` : subj;
        }),
      ];
    }

    return [
      timeLabel,
      ...days.map((d) => {
        const matches = slotPeriods.filter((p) => p.day_of_week === d);
        if (matches.length === 0) return '';
        const subj = safe(matches[0].subject);
        const teachers = [...new Set(matches.map((m) => safe(m.teacher_name)).filter(Boolean))];
        return teachers.length > 0 ? `${subj}\n(${teachers.join(' / ')})` : subj;
      }),
    ];
  });

  const pageW = doc.internal.pageSize.getWidth();
  const mL = 14;
  const mR = 14;
  const usableW = pageW - mL - mR;
  const timeColW = 30;
  const dayColW  = Math.max(20, Math.floor((usableW - timeColW) / Math.max(1, days.length)));

  autoTable(doc, {
    startY,
    head:  [headRow],
    body:  body as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      valign: 'middle',
      overflow: 'linebreak',
      lineColor: C_BORDER,
      lineWidth: 0.2,
      textColor: C_TEXT,
    },
    headStyles: {
      fillColor: C_GREEN,
      textColor: C_WHITE,
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'center',
    },
    alternateRowStyles: { fillColor: C_ALT },
    columnStyles: {
      0: { cellWidth: timeColW, fontStyle: 'bold', halign: 'center', fillColor: C_LIGHT },
      ...Object.fromEntries(days.map((_, i) => [i + 1, { cellWidth: dayColW, halign: 'center' as const }])),
    },
    margin: { left: mL, right: mR, bottom: 15 },
    tableLineColor: C_BORDER,
    tableLineWidth: 0.25,
  });

  void cls; // used for header only
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
export function downloadTimetablePdf(options: {
  schoolName: string;
  periods: TimetablePeriodForPdf[];
  scope: TimetablePdfScope;
  singleClassName?: string;
  classOrder?: string[];
  fixedPeriods?: TimetableFixedPeriodForPdf[];
  logoDataUrl?: string | null;
  /** e.g. "1 — 2026" or "Term 2, 2026" */
  termLabel?: string | null;
}): void {
  const { periods, scope, fixedPeriods = [], classOrder = [], logoDataUrl, termLabel } = options;

  if (periods.length === 0 && fixedPeriods.length === 0) {
    throw new Error('No timetable data to export');
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  if (scope === 'single_class') {
    const cls = options.singleClassName!;
    const classPeriods = periods.filter((p) => p.class_name === cls);
    if (classPeriods.length === 0) throw new Error('No timetable periods for the selected class');
    const startY = addPageHeader(doc, options.schoolName || 'School', 'CLASS TIMETABLE', cls, logoDataUrl, termLabel);
    drawClassPage(doc, cls, classPeriods, fixedPeriods, startY);
  } else {
    const classes = uniqueClasses(periods, classOrder);
    const startY = addPageHeader(
      doc,
      options.schoolName || 'School',
      'MASTER TIMETABLE — ALL CLASSES',
      `${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
      logoDataUrl,
      termLabel,
    );
    drawWholeSchoolMasterTimetable(doc, periods, classes, fixedPeriods, startY);
  }

  addPageFooters(doc);

  const base = sanitizeFilename(options.schoolName || 'School');
  const fname =
    scope === 'whole_school'
      ? `${base}_Master_Timetable.pdf`
      : `${base}_${sanitizeFilename(options.singleClassName || 'class')}_Timetable.pdf`;

  doc.save(fname);
}
