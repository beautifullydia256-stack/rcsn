import { jsPDF } from 'jspdf';

export type TimetablePeriodForPdf = {
  class_name: string;
  day_of_week: string;
  subject: string;
  start_time: string;
  end_time: string;
  teacher_name: string;
};

export type TimetablePdfScope = 'whole_school' | 'single_class';

/** jsPDF standard fonts: keep ASCII-safe for Edge and common viewers. */
function pdfAsciiSafe(raw: string): string {
  if (raw == null) return '';
  return String(raw)
    .replace(/\u2212/g, '-')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u2192/g, ' to ')
    .replace(/\u00b7/g, ' | ')
    .replace(/\u2022/g, '*')
    .replace(/[\u201c\u201d\u00ab\u00bb]/g, '"')
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/\u2026/g, '...')
    .replace(/[\u00a0\u2007\u202f\u2009\u200a]/g, ' ')
    .replace(/[\ufeff]/g, '');
}

function normTime(t: string): string {
  const s = String(t || '').trim();
  if (s.length >= 5) return s.slice(0, 5);
  return s;
}

const WEEK_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

function orderedDays(periods: TimetablePeriodForPdf[]): string[] {
  const present = new Set(periods.map((p) => p.day_of_week));
  const fromWeek = WEEK_ORDER.filter((d) => present.has(d));
  if (fromWeek.length > 0) return fromWeek;
  const rest = Array.from(present).sort((a, b) => a.localeCompare(b));
  return rest.length > 0 ? rest : [...WEEK_ORDER.slice(0, 5)];
}

function slotSortKey(start: string, end: string): number {
  const [sh, sm] = normTime(start).split(':').map((x) => Number(x) || 0);
  const [eh, em] = normTime(end).split(':').map((x) => Number(x) || 0);
  return (sh * 60 + sm) * 10000 + (eh * 60 + em);
}

function buildGrid(periods: TimetablePeriodForPdf[], days: string[]) {
  const slotKeys = new Set<string>();
  for (const p of periods) {
    slotKeys.add(`${normTime(p.start_time)}|${normTime(p.end_time)}`);
  }
  const slots = Array.from(slotKeys).sort((a, b) => {
    const [as, ae] = a.split('|');
    const [bs, be] = b.split('|');
    return slotSortKey(as, ae) - slotSortKey(bs, be);
  });

  const grid: ({ lines: string } | null)[][] = slots.map(() =>
    days.map(() => null)
  );

  for (const p of periods) {
    const sk = `${normTime(p.start_time)}|${normTime(p.end_time)}`;
    const si = slots.indexOf(sk);
    const di = days.indexOf(p.day_of_week);
    if (si < 0 || di < 0) continue;
    const subj = capitalizeAscii(pdfAsciiSafe(p.subject));
    const teach = pdfAsciiSafe(p.teacher_name);
    const text = `${subj}\n(${teach})`;
    const cell = grid[si][di];
    if (cell) cell.lines += `\n+ ${text}`;
    else grid[si][di] = { lines: text };
  }

  return { slots, grid };
}

function capitalizeAscii(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function uniqueClasses(periods: TimetablePeriodForPdf[], classOrder: string[]): string[] {
  const names = [...new Set(periods.map((p) => p.class_name))];
  const idx = new Map(classOrder.map((c, i) => [c, i]));
  return names.sort((a, b) => {
    const ia = idx.get(a);
    const ib = idx.get(b);
    if (ia !== undefined && ib !== undefined && ia !== ib) return ia - ib;
    if (ia !== undefined && ib === undefined) return -1;
    if (ia === undefined && ib !== undefined) return 1;
    return a.localeCompare(b);
  });
}

function sanitizeFilenamePart(s: string): string {
  return pdfAsciiSafe(s).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'timetable';
}

function drawClassTimetablePage(
  doc: jsPDF,
  schoolName: string,
  classLabel: string,
  periods: TimetablePeriodForPdf[]
) {
  const W = 297;
  const H = 210;
  const margin = 10;
  let y = margin;

  const days = orderedDays(periods);
  const { slots, grid } = buildGrid(periods, days);

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(pdfAsciiSafe(schoolName), W / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(pdfAsciiSafe(`Class timetable — ${classLabel}`), W / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(`Printed ${new Date().toLocaleString('en-GB')}`, W / 2, y, { align: 'center' });
  y += 8;
  doc.setTextColor(0, 0, 0);

  const timeColW = 28;
  const dayColW = (W - 2 * margin - timeColW) / Math.max(1, days.length);
  const headerH = 9;
  const nRows = slots.length;
  const tableBottom = H - margin - 6;
  const availBody = tableBottom - y - headerH;
  const rowH = nRows > 0 ? Math.min(24, Math.max(11, availBody / nRows)) : 12;

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.15);

  let x0 = margin;
  doc.setFillColor(30, 58, 138);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.rect(x0, y, timeColW, headerH, 'FD');
  doc.text('Time / period', x0 + timeColW / 2, y + 5.5, { align: 'center' });
  x0 += timeColW;
  for (let d = 0; d < days.length; d++) {
    doc.rect(x0, y, dayColW, headerH, 'FD');
    const label = days[d].length > 6 ? days[d].slice(0, 3) : days[d];
    doc.text(pdfAsciiSafe(label), x0 + dayColW / 2, y + 5.5, { align: 'center' });
    x0 += dayColW;
  }
  y += headerH;

  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  for (let r = 0; r < nRows; r++) {
    const rowTop = y + r * rowH;
    x0 = margin;
    const [st, en] = slots[r].split('|');
    doc.setFillColor(243, 244, 246);
    doc.rect(x0, rowTop, timeColW, rowH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const timeLabel = `${normTime(st)} - ${normTime(en)}`;
    const timeLines = doc.splitTextToSize(pdfAsciiSafe(timeLabel), timeColW - 2);
    let ty = rowTop + rowH / 2 - (timeLines.length * 2.2) / 2 + 2;
    for (const line of timeLines) {
      doc.text(line, x0 + timeColW / 2, ty, { align: 'center' });
      ty += 3.2;
    }
    x0 += timeColW;
    doc.setFont('helvetica', 'normal');
    for (let d = 0; d < days.length; d++) {
      doc.setFillColor(255, 255, 255);
      doc.rect(x0, rowTop, dayColW, rowH, 'FD');
      const cell = grid[r][d];
      if (cell?.lines) {
        const maxW = dayColW - 2;
        const lines = doc.splitTextToSize(cell.lines, maxW);
        const maxLinesFit = Math.max(1, Math.floor((rowH - 3) / 3.1));
        const toDraw = lines.slice(0, maxLinesFit);
        let ly = rowTop + 3.5;
        for (const line of toDraw) {
          doc.text(line, x0 + 1.2, ly);
          ly += 3.1;
        }
        if (lines.length > maxLinesFit) {
          doc.setFontSize(6);
          doc.text('...', x0 + dayColW / 2, rowTop + rowH - 2, { align: 'center' });
          doc.setFontSize(7);
        }
      }
      x0 += dayColW;
    }
  }

  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(
    pdfAsciiSafe('Subject shown with class teacher in brackets. Ugandan week layout (periods x days).'),
    margin,
    H - 4
  );
}

export function downloadTimetablePdf(options: {
  schoolName: string;
  periods: TimetablePeriodForPdf[];
  scope: TimetablePdfScope;
  singleClassName?: string;
  classOrder?: string[];
}): void {
  if (!options.periods.length) {
    throw new Error('No periods to export');
  }

  const classOrder = options.classOrder ?? [];
  const classes =
    options.scope === 'single_class' && options.singleClassName
      ? [options.singleClassName]
      : uniqueClasses(options.periods, classOrder);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let firstPage = true;
  let anyPage = false;

  for (const cls of classes) {
    const classPeriods = options.periods.filter((p) => p.class_name === cls);
    if (classPeriods.length === 0) continue;
    if (!firstPage) doc.addPage();
    firstPage = false;
    anyPage = true;
    drawClassTimetablePage(doc, options.schoolName || 'School', cls, classPeriods);
  }

  if (!anyPage) {
    throw new Error('No timetable rows matched the selected scope');
  }

  const base = sanitizeFilenamePart(options.schoolName || 'School');
  const fname =
    options.scope === 'whole_school'
      ? `${base}_Timetable_All_Classes.pdf`
      : `${base}_Timetable_${sanitizeFilenamePart(options.singleClassName || 'class')}.pdf`;
  doc.save(fname);
}
