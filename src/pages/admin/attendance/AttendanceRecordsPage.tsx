import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';
import { GraduationCap, FileSpreadsheet, FileText, ClipboardList, Search, ArrowRight } from 'lucide-react';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
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

  const [termsRes, streamsRes, studentsRes, schoolRes] = await Promise.all([
    supabase
      .from('school_terms')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('term', { ascending: true }),
    supabase
      .from('class_streams')
      .select('class_name')
      .eq('school_id', schoolId)
      .limit(100),
    supabase
      .from('students')
      .select('current_class')
      .eq('school_id', schoolId)
      .limit(300),
    supabase
      .from('schools')
      .select('name')
      .eq('school_id', schoolId)
      .single(),
  ]);

  const setOfClasses = new Set<string>();
  (streamsRes.data || []).forEach((c: any) => { if (c.class_name) setOfClasses.add(c.class_name.trim()); });
  (studentsRes.data || []).forEach((s: any) => { if (s.current_class) setOfClasses.add(s.current_class.trim()); });

  const uniqueClasses = Array.from(setOfClasses).sort();

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

import { useUIStore } from '@/store/uiStore';
import { getTokens, SORA, INTER } from '@/styles/posThemeTokens';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Filter,
  Users,
  Percent,
  ChevronRight,
  School,
  TrendingUp,
} from 'lucide-react';

const STALE_TIME_MS = 5 * 60 * 1000;

export default function AttendanceRecordsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
  const [showStudentDropdown, setShowStudentDropdown] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'term' | 'custom'>('custom');
  const [customStart, setCustomStart] = useState<string>(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().split('T')[0]);

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
  const availableYears = [...new Set(terms.map((t) => t.year))].sort((a, b) => b - a);
  const termsForYear = terms.filter((t) => t.year === selectedYear);

  // Automatically select current term if in term mode and not selected yet
  useEffect(() => {
    if (filterMode === 'term' && !selectedTerm && terms.length > 0) {
      const cur = terms.find((t) => t.is_current) || terms[0];
      if (cur) {
        setSelectedTerm(cur.id);
        setSelectedYear(cur.year);
      }
    }
  }, [filterMode, selectedTerm, terms]);

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
      const tm = terms.find((t) => t.id === selectedTerm);
      if (tm) {
        return {
          startDate: tm.start_date,
          endDate: tm.end_date,
          reportTitle: `Attendance Report Term ${tm.term} ${tm.year}`,
        };
      }
    }
    return { startDate: '', endDate: '', reportTitle: 'Attendance Report' };
  }, [filterMode, customStart, customEnd, selectedTerm, terms]);

  const canFetch = !!schoolId && !!startDate && !!endDate;

  // Fetch attendance records
  const { data: attendanceRecords = [], isLoading: attLoading } = useQuery({
    queryKey: ['attendance-records', schoolId, startDate, endDate, selectedClass],
    queryFn: () => fetchAttendance(schoolId!, startDate, endDate, selectedClass),
    enabled: canFetch,
    staleTime: STALE_TIME_MS,
  });

  const studyingDays = useMemo(
    () => (startDate && endDate ? getStudyingDaysBetween(startDate, endDate) : []),
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
      (s) => s.name.toLowerCase().includes(query) || s.class.toLowerCase().includes(query)
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

  // KPI calculations
  const totalRecordedDays = studyingDays.length;
  const totalStudentsMonitored = filteredStudentRows.length;
  const attendanceAggregates = useMemo(() => {
    let present = 0;
    let totalPossible = totalStudentsMonitored * totalRecordedDays;
    let late = 0;

    for (const row of filteredStudentRows) {
      for (const d of studyingDays) {
        if (row.days[d] === true) present++;
      }
    }
    for (const rec of attendanceRecords) {
      if (rec.arrived_late) late++;
    }
    const rate = totalPossible > 0 ? Math.round((present / totalPossible) * 100) : 0;
    return { present, absent: Math.max(0, totalPossible - present), rate, late };
  }, [filteredStudentRows, studyingDays, attendanceRecords, totalStudentsMonitored, totalRecordedDays]);

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 transition-colors"
      style={{ background: t.screenBg, color: t.textHi, fontFamily: INTER }}
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: t.mint }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: t.mint }}>
              Academic Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: t.textHi, fontFamily: SORA }}>
            Attendance Records
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: t.textMid }}>
            Review official roll call sheets, monitor daily attendance rates, track absenteeism, and export ministry registers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportToExcel(filteredStudentRows, studyingDays, reportTitle)}
            disabled={filteredStudentRows.length === 0 || studyingDays.length === 0}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all border shadow-sm hover:scale-[1.01] disabled:opacity-40"
            style={{
              background: t.panel,
              borderColor: t.stroke,
              color: t.mint,
            }}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={() => exportToPDF(filteredStudentRows, studyingDays, reportTitle, schoolName)}
            disabled={filteredStudentRows.length === 0 || studyingDays.length === 0}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all border shadow-sm hover:scale-[1.01] disabled:opacity-40"
            style={{
              background: t.panel,
              borderColor: t.stroke,
              color: t.blue,
            }}
          >
            <FileText className="h-4 w-4" />
            <span>Export PDF</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/attendance/teachers')}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all border shadow-sm hover:scale-[1.01]"
            style={{
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
              borderColor: 'transparent',
            }}
          >
            <GraduationCap className="h-4 w-4" />
            <span>Teacher Attendance</span>
          </button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Present Rate */}
        <div className="rounded-2xl p-4 sm:p-5 border shadow-sm transition-all" style={{ background: t.panel, borderColor: t.stroke }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
              Attendance Rate
            </span>
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: t.mintDim, color: t.mint }}>
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tabular-nums" style={{ color: t.mint, fontFamily: SORA }}>
            {isLoading ? '…' : `${attendanceAggregates.rate}%`}
          </div>
          <p className="text-[11px] mt-1" style={{ color: t.textMid }}>
            Average presence across selected range
          </p>
        </div>

        {/* Monitored Students */}
        <div className="rounded-2xl p-4 sm:p-5 border shadow-sm transition-all" style={{ background: t.panel, borderColor: t.stroke }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
              Students In View
            </span>
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: t.blueDim, color: t.blue }}>
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tabular-nums" style={{ color: t.textHi, fontFamily: SORA }}>
            {isLoading ? '…' : totalStudentsMonitored}
          </div>
          <p className="text-[11px] mt-1" style={{ color: t.textMid }}>
            Learners matching current cohort filter
          </p>
        </div>

        {/* Present Instances */}
        <div className="rounded-2xl p-4 sm:p-5 border shadow-sm transition-all" style={{ background: t.panel, borderColor: t.stroke }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
              Days Recorded
            </span>
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: t.goldDim, color: t.gold }}>
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tabular-nums" style={{ color: t.gold, fontFamily: SORA }}>
            {isLoading ? '…' : totalRecordedDays}
          </div>
          <p className="text-[11px] mt-1" style={{ color: t.textMid }}>
            Weekdays active in selected timeline
          </p>
        </div>

        {/* Late Arrivals */}
        <div className="rounded-2xl p-4 sm:p-5 border shadow-sm transition-all" style={{ background: t.panel, borderColor: t.stroke }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textLow }}>
              Late Arrivals
            </span>
            <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: t.warnDim, color: t.warn }}>
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black mt-2 tabular-nums" style={{ color: t.warn, fontFamily: SORA }}>
            {isLoading ? '…' : attendanceAggregates.late}
          </div>
          <p className="text-[11px] mt-1" style={{ color: t.textMid }}>
            Flagged tardy arrivals across period
          </p>
        </div>
      </div>

      {/* FILTER AND SELECTION WORKSPACE */}
      <div className="rounded-2xl p-5 sm:p-6 border shadow-sm space-y-4" style={{ background: t.panel, borderColor: t.stroke }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: t.divider }}>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" style={{ color: t.mint }} />
            <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: t.textHi }}>
              Attendance Query & Scope
            </h3>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 rounded-xl p-1 border" style={{ background: t.fieldBg, borderColor: t.stroke }}>
            <button
              type="button"
              onClick={() => setFilterMode('custom')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: filterMode === 'custom' ? t.mintDim : 'transparent',
                color: filterMode === 'custom' ? t.mint : t.textMid,
              }}
            >
              Date Range
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('term')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: filterMode === 'term' ? t.mintDim : 'transparent',
                color: filterMode === 'term' ? t.mint : t.textMid,
              }}
            >
              Academic Term
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filterMode === 'term' ? (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textLow }}>
                  Academic Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    const y = Number(e.target.value);
                    setSelectedYear(y);
                    const tm = terms.find((t) => t.year === y);
                    if (tm) setSelectedTerm(tm.id);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl focus:outline-none transition-all"
                  style={{ background: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textLow }}>
                  Academic Term
                </label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl focus:outline-none transition-all"
                  style={{ background: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                >
                  {termsForYear.map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      Term {tm.term} {tm.is_current ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textLow }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl focus:outline-none transition-all"
                  style={{ background: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textLow }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium rounded-xl focus:outline-none transition-all"
                  style={{ background: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
                />
              </div>
            </>
          )}

          {/* Class Filter */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textLow }}>
              Filter by Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium rounded-xl focus:outline-none transition-all"
              style={{ background: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
            >
              <option value="all">All Classes & Grades</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Student Search & Select with Z-Index float */}
          <div className="relative student-search-container">
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: t.textLow }}>
              Search Student
            </label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: t.textLow }} />
              <input
                type="text"
                value={studentSearchQuery}
                onFocus={() => setShowStudentDropdown(true)}
                onChange={(e) => {
                  setStudentSearchQuery(e.target.value);
                  setShowStudentDropdown(true);
                  if (selectedStudent !== 'all') setSelectedStudent('all');
                }}
                placeholder="Type learner name…"
                className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl focus:outline-none transition-all"
                style={{ background: t.fieldBg, border: `1px solid ${t.stroke}`, color: t.textHi }}
              />
              {selectedStudent !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent('all');
                    setStudentSearchQuery('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: t.stroke, color: t.textMid }}
                >
                  Clear
                </button>
              )}
            </div>

            {showStudentDropdown && filteredAvailableStudents.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-1.5 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 border"
                style={{
                  background: t.panel,
                  borderColor: t.strokeHi,
                  boxShadow: isDark
                    ? '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.5)'
                    : '0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.06)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudent('all');
                    setStudentSearchQuery('');
                    setShowStudentDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs font-semibold border-b transition-colors"
                  style={{ borderColor: t.divider, color: t.mint }}
                >
                  All Students in Selected Class
                </button>
                {filteredAvailableStudents.slice(0, 20).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setSelectedStudent(st.id);
                      setStudentSearchQuery(st.name);
                      setShowStudentDropdown(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between"
                    style={{ color: t.textHi }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = t.fieldBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span className="font-medium">{st.name}</span>
                    <span className="text-[10px] rounded px-2 py-0.5" style={{ background: t.fieldBg, color: t.textMid }}>
                      {st.class}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Date Range Shortcuts (Custom mode only) */}
        {filterMode === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider mr-1" style={{ color: t.textLow }}>
              Quick Presets:
            </span>
            {[
              {
                label: 'Today',
                action: () => {
                  const now = new Date().toISOString().split('T')[0];
                  setCustomStart(now);
                  setCustomEnd(now);
                },
              },
              {
                label: 'Yesterday',
                action: () => {
                  const yest = new Date();
                  yest.setDate(yest.getDate() - 1);
                  const str = yest.toISOString().split('T')[0];
                  setCustomStart(str);
                  setCustomEnd(str);
                },
              },
              {
                label: 'This Week',
                action: () => {
                  const today = new Date();
                  const mon = new Date(today);
                  mon.setDate(today.getDate() - today.getDay() + 1);
                  const fri = new Date(mon);
                  fri.setDate(mon.getDate() + 4);
                  setCustomStart(mon.toISOString().split('T')[0]);
                  setCustomEnd(fri.toISOString().split('T')[0]);
                },
              },
              {
                label: 'Last Week',
                action: () => {
                  const today = new Date();
                  const lastMon = new Date(today);
                  lastMon.setDate(today.getDate() - today.getDay() - 6);
                  const lastFri = new Date(lastMon);
                  lastFri.setDate(lastMon.getDate() + 4);
                  setCustomStart(lastMon.toISOString().split('T')[0]);
                  setCustomEnd(lastFri.toISOString().split('T')[0]);
                },
              },
              {
                label: 'This Month',
                action: () => {
                  const today = new Date();
                  const start = new Date(today.getFullYear(), today.getMonth(), 1);
                  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                  setCustomStart(start.toISOString().split('T')[0]);
                  setCustomEnd(end.toISOString().split('T')[0]);
                },
              },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={preset.action}
                className="px-3 py-1 text-xs font-semibold rounded-lg border transition-all hover:scale-[1.02]"
                style={{ background: t.fieldBg, borderColor: t.stroke, color: t.textMid }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ATTENDANCE TABLES CONTENT */}
      {isLoading ? (
        <div
          className="rounded-2xl p-12 border text-center text-xs font-medium animate-pulse shadow-sm"
          style={{ background: t.panel, borderColor: t.stroke, color: t.textMid }}
        >
          Loading official attendance register records…
        </div>
      ) : !canFetch ? (
        <PosEmptyState
          icon={<ClipboardList className="w-8 h-8" style={{ color: t.mint }} />}
          title="Select Attendance Scope"
          description="Choose a date range or active academic term above to inspect attendance roll calls."
          accentColor="mint"
        />
      ) : filteredStudentRows.length === 0 ? (
        <PosEmptyState
          icon={<Search className="w-8 h-8" style={{ color: t.gold }} />}
          title="No Attendance Records Found"
          description="No attendance entries were found matching your current filter criteria. Try adjusting the date range or class."
          accentColor="gold"
        />
      ) : (
        <div className="space-y-6">
          {Array.from(groupedByClass.entries()).map(([cls, classStudents]) => (
            <PosClassAttendanceTable
              key={cls}
              className={cls}
              students={classStudents}
              studyingDays={studyingDays}
              t={t}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── POS CLASS ATTENDANCE TABLE ───────────────────────────────────────────────

function PosClassAttendanceTable({
  className,
  students,
  studyingDays,
  t,
  isDark,
}: {
  className: string;
  students: StudentRow[];
  studyingDays: string[];
  t: any;
  isDark: boolean;
}) {
  return (
    <div
      className="rounded-2xl border shadow-sm overflow-hidden"
      style={{ background: t.panel, borderColor: t.stroke }}
    >
      {/* Class header bar */}
      <div
        className="flex items-center justify-between p-4 sm:px-6 border-b"
        style={{ borderColor: t.divider }}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs" style={{ background: t.mintDim, color: t.mint }}>
            <School className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
              {className}
            </h3>
            <p className="text-[11px]" style={{ color: t.textMid }}>
              {students.length} {students.length === 1 ? 'student enrolled' : 'students enrolled'}
            </p>
          </div>
        </div>

        <PosClassAvgBadge students={students} studyingDays={studyingDays} t={t} />
      </div>

      {/* High-Definition Responsive Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr style={{ background: t.fieldBg, borderBottom: `1px solid ${t.stroke}` }}>
              <th
                className="sticky left-0 z-10 text-left px-4 py-3 font-bold border-r min-w-[200px]"
                style={{ background: t.fieldBg, borderColor: t.stroke, color: t.textHi }}
              >
                Student Name & LIN
              </th>
              {studyingDays.map((d, i) => {
                const isMonday = new Date(d).getDay() === 1 && i > 0;
                return (
                  <th
                    key={d}
                    className="px-1.5 py-2.5 text-center min-w-[42px] border-l"
                    style={{
                      borderColor: isMonday ? t.strokeHi : t.stroke,
                    }}
                  >
                    <div className="font-bold text-[11px]" style={{ color: t.textHi }}>
                      {getDayLabel(d)}
                    </div>
                    <div className="text-[9px] font-medium" style={{ color: t.textLow }}>
                      {formatDate(d)}
                    </div>
                  </th>
                );
              })}
              <th
                className="px-3 py-3 text-center font-bold border-l min-w-[80px]"
                style={{ borderColor: t.strokeHi, color: t.textHi }}
              >
                Absent %
              </th>
              <th
                className="px-4 py-3 text-center font-bold border-l min-w-[130px]"
                style={{ borderColor: t.stroke, color: t.textHi }}
              >
                Present Rate
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => {
              const presentCount = studyingDays.filter((d) => student.days[d] === true).length;
              const total = studyingDays.length;
              const attendedPct = total > 0 ? Math.round((presentCount / total) * 100) : 0;
              const absentPct = 100 - attendedPct;
              const isGood = attendedPct >= 75;

              return (
                <tr
                  key={student.student_id}
                  className="border-b transition-colors"
                  style={{
                    borderColor: t.divider,
                    background: idx % 2 === 0 ? 'transparent' : isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = t.fieldBg)}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      idx % 2 === 0 ? 'transparent' : isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.012)')
                  }
                >
                  {/* Student Name */}
                  <td
                    className="sticky left-0 z-10 px-4 py-2.5 border-r font-medium"
                    style={{ background: t.panel, borderColor: t.stroke }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0"
                        style={{ background: t.mintDim, color: t.mint }}
                      >
                        {student.student_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate" style={{ color: t.textHi }}>
                          {student.student_name}
                        </div>
                        {student.admission_number && (
                          <div className="text-[10px]" style={{ color: t.textLow }}>
                            {student.admission_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Day Columns */}
                  {studyingDays.map((d, i) => {
                    const val = student.days[d];
                    const isMonday = new Date(d).getDay() === 1 && i > 0;
                    return (
                      <td
                        key={d}
                        className="px-1 py-2 text-center border-l"
                        style={{ borderColor: isMonday ? t.strokeHi : t.stroke }}
                      >
                        {val === true ? (
                          <span
                            className="inline-flex items-center justify-center h-5 w-5 rounded-full font-bold text-[11px]"
                            style={{ background: t.mintDim, color: t.mint }}
                            title="Present"
                          >
                            ✓
                          </span>
                        ) : val === false ? (
                          <span
                            className="inline-flex items-center justify-center h-5 w-5 rounded-full font-bold text-[11px]"
                            style={{ background: t.redDim, color: t.red }}
                            title="Absent"
                          >
                            ✕
                          </span>
                        ) : (
                          <span className="text-[10px]" style={{ color: t.textLow }}>
                            —
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Absent % */}
                  <td className="px-3 py-2 text-center border-l font-semibold tabular-nums" style={{ borderColor: t.strokeHi }}>
                    <span
                      className="px-2 py-0.5 rounded text-[11px]"
                      style={{
                        background: absentPct > 25 ? t.redDim : 'transparent',
                        color: absentPct > 25 ? t.red : t.textLow,
                      }}
                    >
                      {absentPct}%
                    </span>
                  </td>

                  {/* Attended Rate & Progress Bar */}
                  <td className="px-4 py-2 border-l" style={{ borderColor: t.stroke }}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full h-1.5 overflow-hidden" style={{ background: t.stroke }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${attendedPct}%`,
                            background: isGood ? t.mint : t.gold,
                          }}
                        />
                      </div>
                      <span
                        className="text-xs font-bold w-9 text-right tabular-nums"
                        style={{ color: isGood ? t.mint : t.gold }}
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

// ─── POS CLASS AVERAGE BADGE ──────────────────────────────────────────────────

function PosClassAvgBadge({
  students,
  studyingDays,
  t,
}: {
  students: StudentRow[];
  studyingDays: string[];
  t: any;
}) {
  const totals = students.reduce(
    (acc, s) => {
      acc.present += studyingDays.filter((d) => s.days[d] === true).length;
      acc.total += studyingDays.length;
      return acc;
    },
    { present: 0, total: 0 }
  );
  const pct = totals.total > 0 ? Math.round((totals.present / totals.total) * 100) : 0;
  const isGood = pct >= 75;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold" style={{ color: t.textLow }}>
        Cohort Average:
      </span>
      <span
        className="text-xs font-bold px-3 py-1 rounded-xl border tabular-nums"
        style={{
          background: isGood ? t.mintDim : t.goldDim,
          borderColor: isGood ? t.mintRing : t.gold,
          color: isGood ? t.mint : t.gold,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}
