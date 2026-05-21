import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SchoolTerm {
  id: string;
  school_id: string;
  year: number;
  term: number;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
}

interface AttendanceRecord {
  attendance_id: string;
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  attendance_date: string;
  present: boolean;
  status: string;
  arrived_late: boolean;
}

interface StudentRow {
  student_id: string;
  student_name: string;
  admission_number: string;
  class_name: string;
  days: Record<string, boolean | null>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function getStudyingDaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    if (isWeekday(cur)) {
      days.push(cur.toISOString().split('T')[0]);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ─── Data Fetchers ────────────────────────────────────────────────────────────

async function fetchSchoolData(userId: string) {
  const { data: userData } = await supabase
    .from('users')
    .select('school_id')
    .eq('user_id', userId)
    .single();
  if (!userData?.school_id) return { schoolId: null, schoolName: '', terms: [], classes: [] };

  const schoolId = userData.school_id;

  const [termsRes, classesRes, schoolRes] = await Promise.all([
    supabase
      .from('school_terms')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('term', { ascending: true }),
    supabase
      .from('student_attendance')
      .select('class_name')
      .eq('school_id', schoolId),
    supabase
      .from('schools')
      .select('name')
      .eq('school_id', schoolId)
      .single(),
  ]);

  const uniqueClasses = [
    ...new Set((classesRes.data || []).map((c: any) => c.class_name)),
  ].sort();

  return {
    schoolId,
    schoolName: (schoolRes.data as { name?: string } | null)?.name ?? '',
    terms: termsRes.data || [],
    classes: uniqueClasses,
  };
}

async function fetchAttendance(
  schoolId: string,
  startDate: string,
  endDate: string,
  classFilter: string
) {
  let query = supabase
    .from('student_attendance')
    .select(
      `attendance_id, student_id, class_name, attendance_date,
       present, status, arrived_late,
       students!inner(name, admission_number)`
    )
    .eq('school_id', schoolId)
    .gte('attendance_date', startDate)
    .lte('attendance_date', endDate)
    .order('class_name', { ascending: true })
    .order('attendance_date', { ascending: true });

  if (classFilter && classFilter !== 'all') {
    query = query.eq('class_name', classFilter);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r: any) => ({
    attendance_id: r.attendance_id,
    student_id: r.student_id,
    student_name: r.students?.name || 'Unknown',
    admission_number: r.students?.admission_number || '',
    class_name: r.class_name,
    attendance_date: r.attendance_date,
    present: r.present,
    status: r.status,
    arrived_late: r.arrived_late,
  })) as AttendanceRecord[];
}

// ─── Build Pivot Table ────────────────────────────────────────────────────────

function buildStudentRows(
  records: AttendanceRecord[],
  studyingDays: string[]
): StudentRow[] {
  const map = new Map<string, StudentRow>();

  for (const r of records) {
    if (!map.has(r.student_id)) {
      map.set(r.student_id, {
        student_id: r.student_id,
        student_name: r.student_name,
        admission_number: r.admission_number,
        class_name: r.class_name,
        days: {},
      });
    }
    map.get(r.student_id)!.days[r.attendance_date] = r.present;
  }

  for (const row of map.values()) {
    for (const d of studyingDays) {
      if (!(d in row.days)) row.days[d] = null;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      a.class_name.localeCompare(b.class_name) ||
      a.student_name.localeCompare(b.student_name)
  );
}

// ─── Excel Export ─────────────────────────────────────────────────────────────

async function exportToExcel(
  rows: StudentRow[],
  studyingDays: string[],
  title: string
) {
  const workbook = new ExcelJS.Workbook();
  const classes = [...new Set(rows.map((r) => r.class_name))];

  // Define colors
  const colors = {
    titleBlue: '1E40AF',
    headerBg: 'DBEAFE',
    headerText: '1E3A5F',
    presentBg: '16A34A',
    absentBg: 'DC2626',
    white: 'FFFFFF',
    highAttendanceBar: '2563EB',
    lowAttendanceBar: 'EA580C',
    alternateRow: 'EFF6FF',
    borderGrey: 'CBD5E1',
  };

  for (const cls of classes) {
    const classRows = rows.filter((r) => r.class_name === cls);
    const sheetName = cls.replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 31);
    const worksheet = workbook.addWorksheet(sheetName);

    // Row 1: Title
    worksheet.mergeCells(1, 1, 1, studyingDays.length + 4);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = `${title} — ${cls}`;
    titleCell.font = { size: 14, bold: true, color: { argb: colors.titleBlue } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 25;

    // Row 2: Empty spacing
    worksheet.getRow(2).height = 10;

    // Row 3: Headers
    const headerRow = worksheet.getRow(3);
    headerRow.height = 80; // Tall enough for rotated text

    // Column A: Names
    const nameHeader = worksheet.getCell(3, 1);
    nameHeader.value = 'Names';
    nameHeader.font = { bold: true, color: { argb: colors.headerText } };
    nameHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.headerBg },
    };
    nameHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    nameHeader.border = {
      top: { style: 'thin', color: { argb: colors.borderGrey } },
      left: { style: 'thin', color: { argb: colors.borderGrey } },
      bottom: { style: 'thin', color: { argb: colors.borderGrey } },
      right: { style: 'thin', color: { argb: colors.borderGrey } },
    };
    worksheet.getColumn(1).width = 30;

    // Columns B to B+studyingDays.length: Day headers (horizontal, stacked)
    studyingDays.forEach((d, i) => {
      const col = i + 2;
      const dayCell = worksheet.getCell(3, col);
      dayCell.value = `${getDayLabel(d)}\n${formatDate(d)}`; // Stacked text
      dayCell.font = { bold: true, color: { argb: colors.headerText }, size: 9 };
      dayCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: colors.headerBg },
      };
      dayCell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true, // Stack the two lines
        textRotation: 0, // NO rotation - horizontal only
      };
      dayCell.border = {
        top: { style: 'thin', color: { argb: colors.borderGrey } },
        left: { style: 'thin', color: { argb: colors.borderGrey } },
        bottom: { style: 'thin', color: { argb: colors.borderGrey } },
        right: { style: 'thin', color: { argb: colors.borderGrey } },
      };
      worksheet.getColumn(col).width = 8; // Wider for horizontal text
    });

    // Column for "Absent %"
    const absentCol = studyingDays.length + 2;
    const absentHeader = worksheet.getCell(3, absentCol);
    absentHeader.value = 'Absent %';
    absentHeader.font = { bold: true, color: { argb: colors.headerText } };
    absentHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.headerBg },
    };
    absentHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    absentHeader.border = {
      top: { style: 'thin', color: { argb: colors.borderGrey } },
      left: { style: 'thin', color: { argb: colors.borderGrey } },
      bottom: { style: 'thin', color: { argb: colors.borderGrey } },
      right: { style: 'thin', color: { argb: colors.borderGrey } },
    };
    worksheet.getColumn(absentCol).width = 10;

    // Column for "Attended" (progress bar)
    const attendedCol = studyingDays.length + 3;
    const attendedHeader = worksheet.getCell(3, attendedCol);
    attendedHeader.value = 'Attended';
    attendedHeader.font = { bold: true, color: { argb: colors.headerText } };
    attendedHeader.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.headerBg },
    };
    attendedHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    attendedHeader.border = {
      top: { style: 'thin', color: { argb: colors.borderGrey } },
      left: { style: 'thin', color: { argb: colors.borderGrey } },
      bottom: { style: 'thin', color: { argb: colors.borderGrey } },
      right: { style: 'thin', color: { argb: colors.borderGrey } },
    };
    worksheet.getColumn(attendedCol).width = 12;

    // Data rows
    classRows.forEach((row, idx) => {
      const rowNum = idx + 4;
      const dataRow = worksheet.getRow(rowNum);
      dataRow.height = 20;

      // Alternating row color
      const isAlternate = idx % 2 === 1;

      // Column A: Student name
      const nameCell = worksheet.getCell(rowNum, 1);
      nameCell.value = row.student_name;
      nameCell.alignment = { horizontal: 'left', vertical: 'middle' };
      if (isAlternate) {
        nameCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.alternateRow },
        };
      }
      nameCell.border = {
        top: { style: 'thin', color: { argb: colors.borderGrey } },
        left: { style: 'thin', color: { argb: colors.borderGrey } },
        bottom: { style: 'thin', color: { argb: colors.borderGrey } },
        right: { style: 'thin', color: { argb: colors.borderGrey } },
      };

      // Day columns: Green ✓ or Red ✗ (null = absent = red)
      studyingDays.forEach((d, i) => {
        const col = i + 2;
        const dayCell = worksheet.getCell(rowNum, col);
        const val = row.days[d];

        if (val === true) {
          // Present: Green background, white ✓
          dayCell.value = '✓';
          dayCell.font = { color: { argb: colors.white }, bold: true, size: 12 };
          dayCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: colors.presentBg },
          };
        } else {
          // Absent OR No Record: Red background, white ✗
          dayCell.value = '✗';
          dayCell.font = { color: { argb: colors.white }, bold: true, size: 12 };
          dayCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: colors.absentBg },
          };
        }

        dayCell.alignment = { horizontal: 'center', vertical: 'middle' };
        dayCell.border = {
          top: { style: 'thin', color: { argb: colors.borderGrey } },
          left: { style: 'thin', color: { argb: colors.borderGrey } },
          bottom: { style: 'thin', color: { argb: colors.borderGrey } },
          right: { style: 'thin', color: { argb: colors.borderGrey } },
        };
      });

      // Absent % column
      const presentCount = studyingDays.filter((d) => row.days[d] === true).length;
      const total = studyingDays.length;
      const attendedPct = total > 0 ? Math.round((presentCount / total) * 100) : 0;
      const absentPct = 100 - attendedPct;

      const absentCell = worksheet.getCell(rowNum, absentCol);
      absentCell.value = `${absentPct}%`;
      absentCell.alignment = { horizontal: 'center', vertical: 'middle' };
      if (isAlternate) {
        absentCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: colors.alternateRow },
        };
      }
      absentCell.border = {
        top: { style: 'thin', color: { argb: colors.borderGrey } },
        left: { style: 'thin', color: { argb: colors.borderGrey } },
        bottom: { style: 'thin', color: { argb: colors.borderGrey } },
        right: { style: 'thin', color: { argb: colors.borderGrey } },
      };

      // Attended column: Progress bar
      const attendedCell = worksheet.getCell(rowNum, attendedCol);
      attendedCell.value = `${attendedPct}%`;
      const isHighAttendance = attendedPct >= 75;
      attendedCell.font = {
        color: { argb: colors.white },
        bold: true,
        size: 10,
      };
      attendedCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: isHighAttendance ? colors.highAttendanceBar : colors.lowAttendanceBar,
        },
      };
      attendedCell.alignment = { horizontal: 'center', vertical: 'middle' };
      attendedCell.border = {
        top: { style: 'thin', color: { argb: colors.borderGrey } },
        left: { style: 'thin', color: { argb: colors.borderGrey } },
        bottom: { style: 'thin', color: { argb: colors.borderGrey } },
        right: { style: 'thin', color: { argb: colors.borderGrey } },
      };
    });
  }

  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function groupDaysByMonth(days: string[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const d of days) {
    const key = d.slice(0, 7); // 'YYYY-MM'
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }
  return map;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

function exportToPDF(
  rows: StudentRow[],
  studyingDays: string[],
  title: string,
  schoolName: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const MARGIN = 14;
  const generatedOn = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const classes = [...new Set(rows.map((r) => r.class_name))].sort();
  const monthGroups = groupDaysByMonth(studyingDays); // preserves insertion (chronological) order

  let firstPage = true;

  for (const cls of classes) {
    const classRows = rows.filter((r) => r.class_name === cls);

    for (const [monthKey, monthDays] of monthGroups) {
      if (!firstPage) doc.addPage();
      firstPage = false;

      const label = monthLabel(monthKey);
      const weekdayCount = monthDays.length;
      const presentAll = classRows.reduce(
        (sum, r) => sum + monthDays.filter((d) => r.days[d] === true).length,
        0
      );
      const possibleAll = classRows.length * weekdayCount;
      const overallPct = possibleAll > 0 ? Math.round((presentAll / possibleAll) * 100) : 0;

      // ── Header block ──────────────────────────────────────────────────────
      let y = MARGIN;

      // School name
      if (schoolName) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // emerald
        doc.text(schoolName, pageW / 2, y, { align: 'center' });
        y += 6;
      }

      // Report title
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(title, pageW / 2, y, { align: 'center' });
      y += 5;

      // Divider line
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.4);
      doc.line(MARGIN, y, pageW - MARGIN, y);
      y += 4;

      // Class · Month subtitle (left) | overall % (right)
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`${cls}  ·  ${label}`, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(
        `${weekdayCount} school days  ·  ${classRows.length} students  ·  Overall attendance: ${overallPct}%`,
        pageW - MARGIN,
        y,
        { align: 'right' }
      );
      y += 5;

      // ── Table ──────────────────────────────────────────────────────────────
      const dayColCount = monthDays.length;
      const summaryColW = 13; // Absent % + Attended % columns
      const nameColW = 36;
      const usable = pageW - MARGIN * 2 - nameColW - summaryColW * 2;
      const dayColW = Math.max(5, usable / dayColCount);

      const lastColIdx = dayColCount + 2; // Attended % column index

      const head = [[
        'Student Name',
        ...monthDays.map((d) => `${getDayLabel(d)}\n${formatDate(d)}`),
        'Absent',
        'Attend.',
      ]];

      const body = classRows.map((row) => {
        const present = monthDays.filter((d) => row.days[d] === true).length;
        const total = monthDays.length;
        const attendedPct = total > 0 ? Math.round((present / total) * 100) : 0;
        return [
          row.student_name,
          ...monthDays.map((d) => (row.days[d] === true ? 'P' : 'A')),
          `${100 - attendedPct}%`,
          `${attendedPct}%`,
        ];
      });

      // Build per-column width styles
      const columnStyles: Record<number, { cellWidth?: number; halign?: 'left' | 'center' | 'right' }> = {
        0: { cellWidth: nameColW, halign: 'left' },
      };
      for (let i = 1; i <= dayColCount; i++) {
        columnStyles[i] = { cellWidth: dayColW };
      }
      columnStyles[dayColCount + 1] = { cellWidth: summaryColW };
      columnStyles[dayColCount + 2] = { cellWidth: summaryColW };

      autoTable(doc, {
        head,
        body,
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        tableWidth: pageW - MARGIN * 2,
        styles: {
          fontSize: 6.5,
          cellPadding: 1.8,
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.1,
          lineColor: [203, 213, 225],
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [30, 58, 95],
          fontStyle: 'bold',
          fontSize: 5.5,
          minCellHeight: 11,
          cellPadding: 1.5,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles,
        didDrawCell: (data) => {
          const isAttendanceCell = data.section === 'body' && data.column.index >= 1 && data.column.index <= dayColCount;
          const isAttendedCol = data.section === 'body' && data.column.index === lastColIdx;

          if (isAttendanceCell) {
            const val = String(data.cell.text[0] || '');
            const isPresent = val === 'P';
            doc.setFillColor(...(isPresent ? [34, 197, 94] : [239, 68, 68]) as [number, number, number]);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(dayColW < 7 ? 5 : 7);
            doc.setFont('helvetica', 'bold');
            doc.text(
              isPresent ? '✓' : '✕',
              data.cell.x + data.cell.width / 2,
              data.cell.y + data.cell.height / 2 + 0.6,
              { align: 'center' }
            );
          }

          if (isAttendedCol) {
            const pct = parseInt(String(data.cell.text[0] || '0'));
            doc.setFillColor(...(pct >= 75 ? [37, 99, 235] : [234, 88, 12]) as [number, number, number]);
            doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.text(
              `${pct}%`,
              data.cell.x + data.cell.width / 2,
              data.cell.y + data.cell.height / 2 + 0.6,
              { align: 'center' }
            );
          }
        },
      });

      // ── Footer ─────────────────────────────────────────────────────────────
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated ${generatedOn} — PwezaCore School Management`, MARGIN, pageH - 5);
      doc.text(
        `${cls}  ·  ${label}`,
        pageW - MARGIN,
        pageH - 5,
        { align: 'right' }
      );
    }
  }

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

// ─── Main Component ───────────────────────────────────────────────────────────

const STALE_TIME_MS = 5 * 60 * 1000;

export default function AttendanceRecordsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all'); // Selected student ID
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>(''); // Search input
  const [showStudentDropdown, setShowStudentDropdown] = useState<boolean>(false); // Show/hide results
  const [filterMode, setFilterMode] = useState<'term' | 'custom'>('custom'); // Start with custom mode
  const [customStart, setCustomStart] = useState<string>(
    new Date().toISOString().split('T')[0] // Default to today
  );
  const [customEnd, setCustomEnd] = useState<string>(
    new Date().toISOString().split('T')[0] // Default to today
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.student-search-container')) {
        setShowStudentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch school metadata
  const { data: meta, isLoading: metaLoading } = useQuery({
    queryKey: ['attendance-meta', user?.id],
    queryFn: () => fetchSchoolData(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const schoolId = meta?.schoolId ?? null;
  const schoolName: string = meta?.schoolName ?? '';
  const terms: SchoolTerm[] = meta?.terms ?? [];
  const classes: string[] = meta?.classes ?? [];
  const availableYears = [
    ...new Set(terms.map((t) => t.year)),
  ].sort((a, b) => b - a);
  const termsForYear = terms.filter((t) => t.year === selectedYear);

  // Resolve date range & report title
  const { startDate, endDate, reportTitle } = useMemo(() => {
    if (filterMode === 'custom' && customStart && customEnd) {
      return {
        startDate: customStart,
        endDate: customEnd,
        reportTitle: `Attendance Report ${customStart} to ${customEnd}`,
      };
    }
    if (filterMode === 'term' && selectedTerm) {
      const t = terms.find((t) => t.id === selectedTerm);
      if (t) {
        return {
          startDate: t.start_date,
          endDate: t.end_date,
          reportTitle: `Attendance Report Term ${t.term} ${t.year}`,
        };
      }
    }
    return { startDate: '', endDate: '', reportTitle: 'Attendance Report' };
  }, [filterMode, customStart, customEnd, selectedTerm, terms]);

  const canFetch = !!schoolId && !!startDate && !!endDate;

  // Fetch attendance records
  const { data: attendanceRecords = [], isLoading: attLoading } = useQuery({
    queryKey: [
      'attendance-records',
      schoolId,
      startDate,
      endDate,
      selectedClass,
    ],
    queryFn: () =>
      fetchAttendance(schoolId!, startDate, endDate, selectedClass),
    enabled: canFetch,
    staleTime: STALE_TIME_MS,
  });

  const studyingDays = useMemo(
    () =>
      startDate && endDate ? getStudyingDaysBetween(startDate, endDate) : [],
    [startDate, endDate]
  );

  const studentRows = useMemo(
    () => buildStudentRows(attendanceRecords, studyingDays),
    [attendanceRecords, studyingDays]
  );

  // Filter by student if selected
  const filteredStudentRows = useMemo(() => {
    if (selectedStudent === 'all') return studentRows;
    return studentRows.filter((row) => row.student_id === selectedStudent);
  }, [studentRows, selectedStudent]);

  // Get unique students for the dropdown
  const availableStudents = useMemo(() => {
    return studentRows
      .map((row) => ({
        id: row.student_id,
        name: row.student_name,
        class: row.class_name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [studentRows]);

  // Filter students based on search query
  const filteredAvailableStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return availableStudents;
    const query = studentSearchQuery.toLowerCase();
    return availableStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.class.toLowerCase().includes(query)
    );
  }, [availableStudents, studentSearchQuery]);

  const groupedByClass = useMemo(() => {
    const map = new Map<string, StudentRow[]>();
    for (const row of filteredStudentRows) {
      if (!map.has(row.class_name)) map.set(row.class_name, []);
      map.get(row.class_name)!.push(row);
    }
    return map;
  }, [filteredStudentRows]);

  const isLoading = metaLoading || attLoading;

  return (
    <AdminPageWrapper
      eyebrow="ATTENDANCE"
      title="Attendance Records"
      subtitle="View, filter and download school attendance for any term or date range"
    >
      {/* ── Filter Panel ── */}
      <div className={`${adminCardClass} mb-6`}>
        <div className="flex flex-wrap gap-4 items-end">

          {/* Mode Toggle */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Filter By
            </label>
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              <button
                onClick={() => setFilterMode('term')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filterMode === 'term'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Term / Year
              </button>
              <button
                onClick={() => setFilterMode('custom')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  filterMode === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Quick Date Filters (only show in custom mode) */}
          {filterMode === 'custom' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Quick Filters
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const today = new Date();
                    const lastWeekStart = new Date(today);
                    lastWeekStart.setDate(today.getDate() - today.getDay() - 6); // Last Monday
                    const lastWeekEnd = new Date(lastWeekStart);
                    lastWeekEnd.setDate(lastWeekStart.getDate() + 4); // Last Friday
                    setCustomStart(lastWeekStart.toISOString().split('T')[0]);
                    setCustomEnd(lastWeekEnd.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                >
                  Last Week
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const thisWeekStart = new Date(today);
                    thisWeekStart.setDate(today.getDate() - today.getDay() + 1); // This Monday
                    const thisWeekEnd = new Date(thisWeekStart);
                    thisWeekEnd.setDate(thisWeekStart.getDate() + 4); // This Friday
                    setCustomStart(thisWeekStart.toISOString().split('T')[0]);
                    setCustomEnd(thisWeekEnd.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                >
                  This Week
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
                    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    setCustomStart(thisMonthStart.toISOString().split('T')[0]);
                    setCustomEnd(thisMonthEnd.toISOString().split('T')[0]);
                  }}
                  className="px-3 py-2 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                >
                  This Month
                </button>
              </div>
            </div>
          )}

          {filterMode === 'term' ? (
            <>
              {/* Year */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value));
                    setSelectedTerm('');
                  }}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Term */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Term
                </label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Select Term —</option>
                  {termsForYear.map((t) => (
                    <option key={t.id} value={t.id}>
                      Term {t.term}
                      {t.is_current ? ' (Current)' : ''}
                      {t.is_closed ? ' (Closed)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  From
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  To
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {/* Class Filter */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSelectedStudent('all'); // Reset student when class changes
                setStudentSearchQuery(''); // Clear search
                setShowStudentDropdown(false);
              }}
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Student Filter with Search */}
          <div className="flex flex-col gap-1 relative student-search-container">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Student
            </label>
            <div className="relative">
              <input
                type="text"
                value={studentSearchQuery}
                onChange={(e) => {
                  setStudentSearchQuery(e.target.value);
                  setShowStudentDropdown(true);
                  if (!e.target.value.trim()) {
                    setSelectedStudent('all');
                  }
                }}
                onFocus={() => setShowStudentDropdown(true)}
                placeholder="Search student name..."
                className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[250px] w-full"
              />
              {selectedStudent !== 'all' && (
                <button
                  onClick={() => {
                    setSelectedStudent('all');
                    setStudentSearchQuery('');
                    setShowStudentDropdown(false);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
            
            {/* Dropdown Results */}
            {showStudentDropdown && studentSearchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                {filteredAvailableStudents.length > 0 ? (
                  <>
                    <button
                      onClick={() => {
                        setSelectedStudent('all');
                        setStudentSearchQuery('');
                        setShowStudentDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-300 text-sm border-b border-slate-700"
                    >
                      All Students
                    </button>
                    {filteredAvailableStudents.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedStudent(s.id);
                          setStudentSearchQuery(s.name);
                          setShowStudentDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-700 text-slate-100 text-sm flex justify-between items-center"
                      >
                        <span>{s.name}</span>
                        <span className="text-xs text-slate-400">{s.class}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <div className="px-3 py-2 text-slate-400 text-sm">
                    No students found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Download Buttons */}
          <div className="ml-auto flex gap-2 flex-wrap">
            <button
              onClick={() =>
                exportToExcel(filteredStudentRows, studyingDays, reportTitle)
              }
              disabled={!canFetch || filteredStudentRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              📊 Download Excel
            </button>
            <button
              onClick={() =>
                exportToPDF(filteredStudentRows, studyingDays, reportTitle, schoolName)
              }
              disabled={!canFetch || filteredStudentRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              📄 Download PDF
            </button>
          </div>
        </div>

        {/* Summary bar */}
        {startDate && endDate && (
          <div className="mt-3 pt-3 border-t border-slate-700 flex flex-wrap gap-4 text-xs text-slate-400">
            <span>
              Period:{' '}
              <span className="text-blue-400 font-medium">{startDate}</span> →{' '}
              <span className="text-blue-400 font-medium">{endDate}</span>
            </span>
            <span>
              Studying days:{' '}
              <span className="text-slate-200 font-medium">
                {studyingDays.length}
              </span>
            </span>
            <span>
              Students:{' '}
              <span className="text-slate-200 font-medium">
                {filteredStudentRows.length}
              </span>
            </span>
            <span>
              Classes:{' '}
              <span className="text-slate-200 font-medium">
                {groupedByClass.size}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm gap-3">
          <svg
            className="animate-spin h-5 w-5 text-blue-500"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          Loading attendance records…
        </div>
      ) : !canFetch ? (
        <div
          className={`${adminCardClass} flex flex-col items-center justify-center py-20 text-slate-400`}
        >
          <div className="text-5xl mb-4">📋</div>
          <p className="text-sm font-medium">
            Select a term or date range above to view attendance records.
          </p>
          <p className="text-xs mt-1 text-slate-500">
            Use "Term / Year" for official term reports, or "Custom Range" for
            specific weeks.
          </p>
        </div>
      ) : filteredStudentRows.length === 0 ? (
        <div
          className={`${adminCardClass} flex flex-col items-center justify-center py-20 text-slate-400`}
        >
          <div className="text-5xl mb-4">🔍</div>
          <p className="text-sm font-medium">
            No attendance records found for the selected period.
          </p>
          <p className="text-xs mt-1 text-slate-500">
            Try a different term, year, or date range.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(groupedByClass.entries()).map(([cls, classStudents]) => (
            <ClassAttendanceTable
              key={cls}
              className={cls}
              students={classStudents}
              studyingDays={studyingDays}
            />
          ))}
        </div>
      )}
    </AdminPageWrapper>
  );
}

// ─── Class Table ──────────────────────────────────────────────────────────────

function ClassAttendanceTable({
  className,
  students,
  studyingDays,
}: {
  className: string;
  students: StudentRow[];
  studyingDays: string[];
}) {
  return (
    <div className={adminCardClass}>
      {/* Class header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">{className}</h3>
            <p className="text-xs text-slate-400">
              {students.length} student{students.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <ClassAvgBadge students={students} studyingDays={studyingDays} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-800">
              <th className="sticky left-0 z-10 bg-slate-800 text-left px-3 py-2.5 font-semibold text-slate-300 border-r border-slate-700 min-w-[170px]">
                Student Name
              </th>
              {studyingDays.map((d, i) => {
                const isMonday = new Date(d).getDay() === 1 && i > 0;
                return (
                  <th
                    key={d}
                    className={`px-1 py-2 text-center min-w-[34px] ${
                      isMonday
                        ? 'border-l-2 border-slate-500'
                        : 'border-l border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-300">
                      {getDayLabel(d)}
                    </div>
                    <div className="text-[9px] text-slate-500">
                      {formatDate(d)}
                    </div>
                  </th>
                );
              })}
              <th className="px-3 py-2 text-center font-semibold text-slate-300 border-l-2 border-slate-500 min-w-[70px]">
                Absent %
              </th>
              <th className="px-3 py-2 text-center font-semibold text-slate-300 border-l border-slate-700 min-w-[110px]">
                Attended
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              const presentCount = studyingDays.filter(
                (d) => student.days[d] === true
              ).length;
              const total = studyingDays.length;
              const attendedPct =
                total > 0 ? Math.round((presentCount / total) * 100) : 0;
              const absentPct = 100 - attendedPct;
              const isGood = attendedPct >= 75;

              return (
                <tr
                  key={student.student_id}
                  className={`border-t border-slate-700/50 hover:bg-slate-700/20 transition-colors ${
                    idx % 2 === 0
                      ? 'bg-slate-900/30'
                      : 'bg-slate-800/10'
                  }`}
                >
                  {/* Name */}
                  <td className="sticky left-0 z-10 px-3 py-2 border-r border-slate-700 bg-inherit">
                    <div className="font-medium text-slate-200 leading-tight">
                      {student.student_name}
                    </div>
                    {student.admission_number && (
                      <div className="text-[10px] text-slate-500">
                        {student.admission_number}
                      </div>
                    )}
                  </td>

                  {/* Day cells */}
                  {studyingDays.map((d, i) => {
                    const val = student.days[d];
                    const isMonday = new Date(d).getDay() === 1 && i > 0;
                    return (
                      <td
                        key={d}
                        className={`px-0.5 py-2 text-center ${
                          isMonday
                            ? 'border-l-2 border-slate-500'
                            : 'border-l border-slate-700/40'
                        }`}
                      >
                        {val === true ? (
                          <span
                            className="text-emerald-400 text-sm"
                            title="Present"
                          >
                            ✔
                          </span>
                        ) : (
                          <span
                            className="text-red-400 text-sm"
                            title={val === false ? "Absent" : "No record (counted as absent)"}
                          >
                            ✘
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Absent % */}
                  <td className="px-3 py-2 text-center border-l-2 border-slate-500">
                    <span
                      className={`font-bold text-xs ${
                        absentPct > 25 ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {absentPct}%
                    </span>
                  </td>

                  {/* Progress bar */}
                  <td className="px-3 py-2 border-l border-slate-700/40">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isGood ? 'bg-blue-500' : 'bg-orange-500'
                          }`}
                          style={{ width: `${attendedPct}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-bold w-8 text-right ${
                          isGood ? 'text-blue-400' : 'text-orange-400'
                        }`}
                      >
                        {attendedPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Class Average Badge ──────────────────────────────────────────────────────

function ClassAvgBadge({
  students,
  studyingDays,
}: {
  students: StudentRow[];
  studyingDays: string[];
}) {
  const totals = students.reduce(
    (acc, s) => {
      acc.present += studyingDays.filter((d) => s.days[d] === true).length;
      acc.total += studyingDays.length;
      return acc;
    },
    { present: 0, total: 0 }
  );
  const pct =
    totals.total > 0 ? Math.round((totals.present / totals.total) * 100) : 0;
  const isGood = pct >= 75;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">Class avg:</span>
      <span
        className={`text-sm font-bold px-3 py-0.5 rounded-full border ${
          isGood
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}
