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

export type TimetablePdfScope = 'whole_school' | 'single_class';

function safe(raw: unknown): string {
  if (raw == null) return '—';
  return String(raw)
    .replace(/[‒–—―]/g, '-')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, '...')
    .replace(/[  ]/g, ' ')
    .trim() || '—';
}

function normTime(t: string): string {
  return String(t || '').trim().slice(0, 5);
}

const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

function orderedDays(periods: TimetablePeriodForPdf[]): string[] {
  const present = new Set(periods.map((p) => p.day_of_week));
  const fromWeek = WEEK_ORDER.filter((d) => present.has(d));
  return fromWeek.length > 0 ? fromWeek : [...WEEK_ORDER.slice(0, 5)];
}

function slotSortKey(slot: string): number {
  const [sh, sm] = slot.split('|')[0].split(':').map((x) => Number(x) || 0);
  return sh * 60 + sm;
}

function buildGrid(periods: TimetablePeriodForPdf[], days: string[]) {
  const slotKeys = new Set<string>();
  for (const p of periods) {
    slotKeys.add(`${normTime(p.start_time)}|${normTime(p.end_time)}`);
  }
  const slots = Array.from(slotKeys).sort((a, b) => slotSortKey(a) - slotSortKey(b));

  const grid: Map<string, Map<string, string[]>> = new Map();
  for (const slot of slots) {
    grid.set(slot, new Map(days.map((d) => [d, []])));
  }

  for (const p of periods) {
    const sk = `${normTime(p.start_time)}|${normTime(p.end_time)}`;
    const dayMap = grid.get(sk);
    if (!dayMap) continue;
    const cell = dayMap.get(p.day_of_week);
    if (!cell) continue;
    const subj = safe(p.subject).replace(/^(\w)/, (c) => c.toUpperCase());
    const teacher = safe(p.teacher_name);
    cell.push(teacher && teacher !== '—' ? `${subj}\n(${teacher})` : subj);
  }

  return { slots, grid };
}

function sanitizeFilenamePart(s: string): string {
  return safe(s).replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'timetable';
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

function addPageHeader(
  doc: jsPDF,
  schoolName: string,
  title: string,
  subtitle: string,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;

  if (schoolName.trim()) {
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(safe(schoolName), pageW / 2, y, { align: 'center' });
    y += 7;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(safe(title), pageW / 2, y, { align: 'center' });
  y += 5;

  if (subtitle.trim()) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(safe(subtitle), pageW / 2, y, { align: 'center' });
    y += 5;
  }

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleString('en-UG')}`, pageW / 2, y, { align: 'center' });
  doc.setTextColor(0);
  y += 5;

  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.3);
  doc.line(14, y, pageW - 14, y);
  y += 5;

  return y;
}

function addPageFooters(doc: jsPDF): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 14, pageH - 5, { align: 'right' });
    doc.text('PwezaCore School Management', 14, pageH - 5);
    doc.setDrawColor(209, 213, 219);
    doc.setLineWidth(0.2);
    doc.line(14, pageH - 8, pageW - 14, pageH - 8);
    doc.setTextColor(0);
  }
}

// Single-class view: rows = time slots, columns = days (with teacher names in cells)
function drawClassPage(
  doc: jsPDF,
  schoolName: string,
  className: string,
  periods: TimetablePeriodForPdf[],
  startY: number,
): void {
  const days = orderedDays(periods);
  const { slots, grid } = buildGrid(periods, days);

  const dayAbbr = (d: string) => (d.length > 3 ? d.slice(0, 3) : d);

  const headRow = ['Time / Period', ...days.map(dayAbbr)];

  const body: string[][] = slots.map((slot) => {
    const [st, en] = slot.split('|');
    const timeLabel = `${normTime(st)} – ${normTime(en)}`;
    const dayMap = grid.get(slot)!;
    return [timeLabel, ...days.map((d) => (dayMap.get(d) || []).join('\n+ ') || '—')];
  });

  const pageW = doc.internal.pageSize.getWidth();
  const timeColW = 28;
  const remainW = pageW - 14 - 14 - timeColW;
  const dayW = remainW / Math.max(1, days.length);

  autoTable(doc, {
    startY,
    head: [headRow],
    body,
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [16, 185, 129] as [number, number, number],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: timeColW, fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] as [number, number, number] },
      ...Object.fromEntries(
        days.map((_, i) => [i + 1, { cellWidth: dayW, halign: 'center' as const }])
      ),
    },
    margin: { left: 14, right: 14 },
    tableLineColor: [209, 213, 219] as [number, number, number],
    tableLineWidth: 0.2,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        data.cell.styles.textColor = [30, 41, 59];
      }
    },
  });

  void schoolName;
  void className;
}

// Whole-school master view: one compact table with all classes as columns.
// Rows group by day (day-separator row) then one row per time slot.
// Shows subject only (no teacher) to keep cells compact.
function drawWholeSchoolMasterTimetable(
  doc: jsPDF,
  periods: TimetablePeriodForPdf[],
  classes: string[],
  startY: number,
): void {
  if (classes.length === 0 || periods.length === 0) return;

  const days = orderedDays(periods);

  const slotSet = new Set<string>();
  for (const p of periods) {
    slotSet.add(`${normTime(p.start_time)}|${normTime(p.end_time)}`);
  }
  const slots = Array.from(slotSet).sort((a, b) => slotSortKey(a) - slotSortKey(b));

  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 10;
  const marginR = 10;
  const usableW = pageW - marginL - marginR;
  const timeColW = 24;
  // Distribute remaining width equally across classes; minimum 14mm per class column
  const classColW = Math.max(14, Math.floor((usableW - timeColW) / classes.length));

  const totalCols = 1 + classes.length;

  const headRow = [
    'Time',
    ...classes.map((c) => (c.length > 10 ? `${c.slice(0, 9)}…` : c)),
  ];

  // Build body rows: day-separator row + one row per slot for each day
  const body: any[][] = [];

  for (const day of days) {
    // Full-width day separator row
    body.push([
      {
        content: day.toUpperCase(),
        colSpan: totalCols,
        styles: {
          fillColor: [30, 41, 59] as [number, number, number],
          textColor: [255, 255, 255] as [number, number, number],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7.5,
          cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
        },
      },
    ]);

    const dayPeriods = periods.filter((p) => p.day_of_week === day);

    for (const slot of slots) {
      const [st, en] = slot.split('|');
      const timeLabel = `${normTime(st)}-${normTime(en)}`;

      const row: any[] = [timeLabel];
      for (const cls of classes) {
        const match = dayPeriods.find(
          (p) =>
            p.class_name === cls &&
            `${normTime(p.start_time)}|${normTime(p.end_time)}` === slot,
        );
        if (!match) {
          row.push('');
        } else {
          const subj = safe(match.subject);
          row.push(subj === '—' ? '' : subj);
        }
      }
      body.push(row);
    }
  }

  autoTable(doc, {
    startY,
    head: [headRow],
    body,
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
      valign: 'middle',
      overflow: 'linebreak',
      lineColor: [209, 213, 219] as [number, number, number],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: [16, 185, 129] as [number, number, number],
      textColor: [255, 255, 255] as [number, number, number],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] as [number, number, number],
    },
    columnStyles: {
      0: {
        cellWidth: timeColW,
        fontStyle: 'bold',
        halign: 'center',
        fillColor: [241, 245, 249] as [number, number, number],
      },
      ...Object.fromEntries(
        classes.map((_, i) => [
          i + 1,
          { cellWidth: classColW, halign: 'center' as const },
        ]),
      ),
    },
    margin: { left: marginL, right: marginR, bottom: 15 },
    tableLineColor: [209, 213, 219] as [number, number, number],
    tableLineWidth: 0.2,
  });
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
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  if (options.scope === 'single_class') {
    const cls = options.singleClassName!;
    const classPeriods = options.periods.filter((p) => p.class_name === cls);
    if (classPeriods.length === 0) throw new Error('No timetable rows for selected class');
    const startY = addPageHeader(doc, options.schoolName || 'School', 'Class Timetable', cls);
    drawClassPage(doc, options.schoolName || 'School', cls, classPeriods, startY);
  } else {
    // Whole-school: compact master timetable — all classes as columns, days grouped by separator rows
    const classes = uniqueClasses(options.periods, classOrder);
    const startY = addPageHeader(
      doc,
      options.schoolName || 'School',
      'Master Timetable — All Classes',
      `${classes.length} class${classes.length !== 1 ? 'es' : ''}`,
    );
    drawWholeSchoolMasterTimetable(doc, options.periods, classes, startY);
  }

  addPageFooters(doc);

  const base = sanitizeFilenamePart(options.schoolName || 'School');
  const fname =
    options.scope === 'whole_school'
      ? `${base}_Master_Timetable_All_Classes.pdf`
      : `${base}_Timetable_${sanitizeFilenamePart(options.singleClassName || 'class')}.pdf`;

  doc.save(fname);
}
