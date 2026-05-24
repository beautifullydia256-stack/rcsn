import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Loads any http/https URL as a base64 data URL for embedding in jsPDF. */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  if (!url?.trim()) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addPageHeader(doc: jsPDF, title: string, subtitle: string, schoolName?: string): number {
  const pageW = doc.internal.pageSize.getWidth();
  let y = 14;
  if (schoolName?.trim()) {
    doc.setFontSize(14);
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
  doc.line(14, y, pageW - 14, y);
  y += 4;
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
    doc.text(`Page ${i} of ${totalPages}`, pageW - 14, pageH - 6, { align: 'right' });
    doc.text('PwezaCore School Management', 14, pageH - 6);
    doc.setTextColor(0);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type StudentPdfRow = {
  student_id: string;
  name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  current_class?: string | null;
  admission_number?: string | null;
  gender?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  date_of_birth?: string | null;
  admission_date?: string | null;
};

export type TeacherPdfRow = {
  teacher_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  employee_id?: string | null;
  date_of_hire?: string | null;
  classes?: string[];
  portal_active?: boolean;
};

export type ParentPdfRow = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  student_name?: string | null;
  student_class?: string | null;
  created_at?: string | null;
};

// ─── Student list ─────────────────────────────────────────────────────────────

function resolveStudentDisplayName(row: StudentPdfRow): string {
  const parts = [row.first_name, row.middle_name, row.last_name]
    .filter((x) => x != null && String(x).trim())
    .map((x) => String(x).trim());
  return parts.length ? parts.join(' ') : (row.name || '—').trim() || '—';
}

/**
 * Download a PDF of the students list.
 * When classFilter is empty, students are grouped by class.
 * When classFilter is set, only that class is included.
 */
export function downloadStudentListPdf(
  students: StudentPdfRow[],
  classFilter: string,
  schoolName?: string,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const subtitle = classFilter ? `Class: ${classFilter}` : 'All Classes';
  const title = classFilter ? `Students — ${classFilter}` : 'Students Directory';
  let y = addPageHeader(doc, title, subtitle, schoolName);

  const headStyles = {
    fillColor: [16, 185, 129] as [number, number, number],
    textColor: 255,
    fontStyle: 'bold' as const,
    fontSize: 8,
    halign: 'center' as const,
  };
  const bodyStyles = { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } };
  const altRowStyles = { fillColor: [248, 250, 252] as [number, number, number] };

  if (classFilter) {
    const rows = students.filter((s) => s.current_class === classFilter);
    const body = rows.map((s, i) => [
      String(i + 1),
      safe(resolveStudentDisplayName(s)),
      safe(s.admission_number),
      safe(s.gender),
      safe(s.date_of_birth ? fmtDate(s.date_of_birth) : null),
      safe(s.guardian_name),
      safe(s.guardian_phone),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['#', 'Student Name', 'Adm #', 'Gender', 'DOB', 'Guardian', 'Guardian Phone']],
      body,
      styles: bodyStyles,
      headStyles,
      alternateRowStyles: altRowStyles,
      columnStyles: { 0: { cellWidth: 8, halign: 'center' } },
      didDrawPage: () => {},
    });
  } else {
    // Group by class
    const byClass = new Map<string, StudentPdfRow[]>();
    for (const s of students) {
      const cls = s.current_class || 'Unassigned';
      if (!byClass.has(cls)) byClass.set(cls, []);
      byClass.get(cls)!.push(s);
    }
    // Sort classes alphabetically
    const sortedClasses = [...byClass.keys()].sort((a, b) => a.localeCompare(b));

    let isFirst = true;
    for (const cls of sortedClasses) {
      const classStudents = byClass.get(cls)!;
      if (!isFirst) {
        // Small gap between classes
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y;
        y += 4;
        if (y > pageH - 40) {
          doc.addPage();
          y = 14;
        }
      }
      isFirst = false;

      // Class header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text(safe(cls), 14, y);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${classStudents.length} student${classStudents.length !== 1 ? 's' : ''}`, 14 + doc.getTextWidth(safe(cls)) + 4, y);
      doc.setTextColor(0);
      y += 4;

      const body = classStudents.map((s, i) => [
        String(i + 1),
        safe(resolveStudentDisplayName(s)),
        safe(s.admission_number),
        safe(s.gender),
        safe(s.date_of_birth ? fmtDate(s.date_of_birth) : null),
        safe(s.guardian_name),
        safe(s.guardian_phone),
      ]);

      autoTable(doc, {
        startY: y,
        head: [['#', 'Student Name', 'Adm #', 'Gender', 'DOB', 'Guardian', 'Guardian Phone']],
        body,
        styles: bodyStyles,
        headStyles,
        alternateRowStyles: altRowStyles,
        columnStyles: { 0: { cellWidth: 8, halign: 'center' } },
        didDrawPage: () => {},
      });

      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY ?? y;
    }
  }

  addPageFooters(doc);
  const filename = classFilter
    ? `students-${classFilter.replace(/\s+/g, '-').toLowerCase()}`
    : 'students-all-classes';
  doc.save(`${filename}.pdf`);
}

// ─── Single student from list ─────────────────────────────────────────────────

export function downloadSingleStudentListPdf(
  student: StudentPdfRow,
  schoolName?: string,
): void {
  downloadStudentListPdf([student], student.current_class || '', schoolName);
}

// ─── Teacher list ─────────────────────────────────────────────────────────────

export function downloadTeacherListPdf(
  teachers: TeacherPdfRow[],
  schoolName?: string,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  const y = addPageHeader(doc, 'Teachers Directory', `${teachers.length} teacher${teachers.length !== 1 ? 's' : ''}`, schoolName);

  const body = teachers.map((t, i) => [
    String(i + 1),
    safe(t.name),
    safe(t.phone),
    safe(t.email),
    safe(t.employee_id),
    safe(t.date_of_hire ? fmtDate(t.date_of_hire) : null),
    safe((t.classes || []).join(', ')),
    t.portal_active ? 'Active' : 'No Portal',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Name', 'Phone', 'Email', 'Employee ID', 'Date of Hire', 'Classes', 'Portal']],
    body,
    styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    headStyles: { fillColor: [79, 142, 247], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      7: { halign: 'center' },
    },
    didDrawPage: (data) => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${data.pageNumber}`, pageW - 14, pageH - 6, { align: 'right' });
      doc.setTextColor(0);
    },
  });

  addPageFooters(doc);
  doc.save('teachers-directory.pdf');
}

// ─── Parent list ──────────────────────────────────────────────────────────────

export function downloadParentListPdf(
  parents: ParentPdfRow[],
  schoolName?: string,
): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  const y = addPageHeader(doc, 'Parents & Guardians', `${parents.length} parent${parents.length !== 1 ? 's' : ''}`, schoolName);

  const body = parents.map((p, i) => [
    String(i + 1),
    safe(p.name),
    safe(p.email),
    safe(p.phone),
    safe(p.student_name),
    safe(p.student_class),
    safe(p.created_at ? fmtDate(p.created_at) : null),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Name', 'Email', 'Phone', 'Student', 'Class', 'Enrolled']],
    body,
    styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { cellWidth: 8, halign: 'center' } },
    didDrawPage: (data) => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${data.pageNumber}`, pageW - 14, pageH - 6, { align: 'right' });
      doc.setTextColor(0);
    },
  });

  addPageFooters(doc);
  doc.save('parents-guardians.pdf');
}

// ─── Student profile PDF ──────────────────────────────────────────────────────

export type StudentProfilePdfData = {
  name: string;
  admission_number?: string | null;
  current_class?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  age_years?: number | null;
  nationality?: string | null;
  religion?: string | null;
  address?: string | null;
  student_phone?: string | null;
  student_email?: string | null;
  guardian_name?: string | null;
  guardian_relationship?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  medical_condition?: string | null;
  previous_school?: string | null;
  admission_date?: string | null;
  boarding_type?: string | null;
  photoUrl?: string | null;
  schoolName?: string | null;
};

export async function downloadStudentProfilePdf(data: StudentProfilePdfData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header
  if (data.schoolName?.trim()) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(safe(data.schoolName), pageW / 2, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Student Profile', pageW / 2, 21, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleString('en-UG')}`, pageW / 2, 26, { align: 'center' });
  } else {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Student Profile', pageW / 2, 16, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleString('en-UG')}`, pageW / 2, 22, { align: 'center' });
  }
  doc.setTextColor(0);
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, 30, pageW - margin, 30);

  let y = 36;
  const photoSize = 36;

  // Photo
  if (data.photoUrl) {
    const imgData = await loadImageAsDataUrl(data.photoUrl);
    if (imgData) {
      doc.addImage(imgData, 'JPEG', pageW - margin - photoSize, 34, photoSize, photoSize);
    }
  }

  // Student name & class badge
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(safe(data.name), margin, y);
  y += 7;

  if (data.current_class) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(16, 185, 129);
    doc.text(`Class: ${safe(data.current_class)}`, margin, y);
    y += 5;
  }
  if (data.admission_number) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Admission #: ${safe(data.admission_number)}`, margin, y);
    y += 5;
  }

  y = Math.max(y, 34 + photoSize + 6); // clear photo

  // Section: Personal Details
  y += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('Personal Details', margin, y);
  y += 2;
  doc.setDrawColor(16, 185, 129);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  const fields: [string, string | null | undefined][] = [
    ['Gender', data.gender],
    ['Date of Birth', data.date_of_birth ? fmtDate(data.date_of_birth) : null],
    ['Age', data.age_years != null ? `${data.age_years} years` : null],
    ['Nationality', data.nationality],
    ['Religion', data.religion],
    ['Address', data.address],
    ['Phone', data.student_phone],
    ['Email', data.student_email],
    ['Previous School', data.previous_school],
    ['Boarding Type', data.boarding_type],
    ['Admission Date', data.admission_date ? fmtDate(data.admission_date) : null],
  ];

  const colW = (pageW - margin * 2) / 2;
  const leftFields = fields.filter((_, i) => i % 2 === 0);
  const rightFields = fields.filter((_, i) => i % 2 !== 0);
  const maxRows = Math.max(leftFields.length, rightFields.length);

  doc.setFontSize(8);
  for (let i = 0; i < maxRows; i++) {
    const lf = leftFields[i];
    const rf = rightFields[i];
    if (lf) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(lf[0] + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(safe(lf[1]), margin + 30, y);
    }
    if (rf) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(rf[0] + ':', margin + colW, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(safe(rf[1]), margin + colW + 30, y);
    }
    y += 5;
  }

  // Section: Guardian / Parent
  y += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 142, 247);
  doc.text('Guardian / Parent', margin, y);
  y += 2;
  doc.setDrawColor(79, 142, 247);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  const guardianFields: [string, string | null | undefined][] = [
    ['Name', data.guardian_name],
    ['Relationship', data.guardian_relationship],
    ['Phone', data.guardian_phone],
    ['Email', data.guardian_email],
  ];

  doc.setFontSize(8);
  const guardianLeft = guardianFields.filter((_, i) => i % 2 === 0);
  const guardianRight = guardianFields.filter((_, i) => i % 2 !== 0);
  const gMax = Math.max(guardianLeft.length, guardianRight.length);

  for (let i = 0; i < gMax; i++) {
    const lf = guardianLeft[i];
    const rf = guardianRight[i];
    if (lf) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(lf[0] + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(safe(lf[1]), margin + 30, y);
    }
    if (rf) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(rf[0] + ':', margin + colW, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(safe(rf[1]), margin + colW + 30, y);
    }
    y += 5;
  }

  // Medical condition
  if (data.medical_condition?.trim()) {
    y += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68);
    doc.text('Medical Notes', margin, y);
    y += 2;
    doc.setDrawColor(239, 68, 68);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(safe(data.medical_condition), pageW - margin * 2);
    doc.text(lines, margin, y);
  }

  // Footer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('PwezaCore School Management', margin, pageH - 6);
  doc.text('Confidential', pageW - margin, pageH - 6, { align: 'right' });

  doc.save(`student-profile-${safe(data.name).replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

// ─── Teacher profile PDF ──────────────────────────────────────────────────────

export type TeacherProfilePdfData = {
  name: string;
  phone?: string | null;
  email?: string | null;
  employee_id?: string | null;
  date_of_hire?: string | null;
  gender?: string | null;
  nationality?: string | null;
  address?: string | null;
  qualification?: string | null;
  specialization?: string | null;
  classes?: string[];
  portal_active?: boolean;
  photoUrl?: string | null;
  schoolName?: string | null;
};

export async function downloadTeacherProfilePdf(data: TeacherProfilePdfData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  if (data.schoolName?.trim()) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 142, 247);
    doc.text(safe(data.schoolName), pageW / 2, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Teacher Profile', pageW / 2, 21, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleString('en-UG')}`, pageW / 2, 26, { align: 'center' });
  } else {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Teacher Profile', pageW / 2, 16, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleString('en-UG')}`, pageW / 2, 22, { align: 'center' });
  }
  doc.setTextColor(0);
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, 30, pageW - margin, 30);

  let y = 36;
  const photoSize = 36;

  if (data.photoUrl) {
    const imgData = await loadImageAsDataUrl(data.photoUrl);
    if (imgData) {
      doc.addImage(imgData, 'JPEG', pageW - margin - photoSize, 34, photoSize, photoSize);
    }
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(safe(data.name), margin, y);
  y += 7;

  if (data.employee_id) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Employee ID: ${safe(data.employee_id)}`, margin, y);
    y += 5;
  }

  y = Math.max(y, 34 + photoSize + 6);

  // Details section
  y += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 142, 247);
  doc.text('Professional Details', margin, y);
  y += 2;
  doc.setDrawColor(79, 142, 247);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  const colW = (pageW - margin * 2) / 2;
  const tFields: [string, string | null | undefined][] = [
    ['Phone', data.phone],
    ['Email', data.email],
    ['Gender', data.gender],
    ['Nationality', data.nationality],
    ['Date of Hire', data.date_of_hire ? fmtDate(data.date_of_hire) : null],
    ['Qualification', data.qualification],
    ['Specialization', data.specialization],
    ['Portal Status', data.portal_active ? 'Active' : 'No Portal'],
    ['Address', data.address],
  ];

  const leftF = tFields.filter((_, i) => i % 2 === 0);
  const rightF = tFields.filter((_, i) => i % 2 !== 0);
  const fMax = Math.max(leftF.length, rightF.length);

  doc.setFontSize(8);
  for (let i = 0; i < fMax; i++) {
    const lf = leftF[i];
    const rf = rightF[i];
    if (lf) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(lf[0] + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(safe(lf[1]), margin + 35, y);
    }
    if (rf) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(rf[0] + ':', margin + colW, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(safe(rf[1]), margin + colW + 35, y);
    }
    y += 5;
  }

  // Classes
  if (data.classes?.length) {
    y += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Assigned Classes', margin, y);
    y += 2;
    doc.setDrawColor(16, 185, 129);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Class']],
      body: data.classes.map((c) => [safe(c)]),
      styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      tableWidth: 80,
    });
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('PwezaCore School Management', margin, pageH - 6);
  doc.text('Confidential', pageW - margin, pageH - 6, { align: 'right' });

  doc.save(`teacher-profile-${safe(data.name).replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

// ─── Parent profile PDF ───────────────────────────────────────────────────────

export type ParentProfilePdfData = {
  name: string;
  email?: string | null;
  phone?: string | null;
  relationship?: string | null;
  address?: string | null;
  occupation?: string | null;
  created_at?: string | null;
  children?: Array<{
    student_id: string;
    name: string;
    current_class?: string | null;
    admission_number?: string | null;
    photoUrl?: string | null;
  }>;
  schoolName?: string | null;
};

export async function downloadParentProfilePdf(data: ParentProfilePdfData): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;

  if (data.schoolName?.trim()) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 92, 246);
    doc.text(safe(data.schoolName), pageW / 2, 14, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Parent / Guardian Profile', pageW / 2, 21, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleString('en-UG')}`, pageW / 2, 26, { align: 'center' });
  } else {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Parent / Guardian Profile', pageW / 2, 16, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated: ${new Date().toLocaleString('en-UG')}`, pageW / 2, 22, { align: 'center' });
  }
  doc.setTextColor(0);
  doc.setDrawColor(209, 213, 219);
  doc.line(margin, 30, pageW - margin, 30);

  let y = 36;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(safe(data.name), margin, y);
  y += 7;

  if (data.relationship) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Relationship: ${safe(data.relationship)}`, margin, y);
    y += 5;
  }

  y += 4;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(139, 92, 246);
  doc.text('Contact Details', margin, y);
  y += 2;
  doc.setDrawColor(139, 92, 246);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  const colW = (pageW - margin * 2) / 2;
  const pFields: [string, string | null | undefined][] = [
    ['Phone', data.phone],
    ['Email', data.email],
    ['Occupation', data.occupation],
    ['Address', data.address],
    ['Enrolled', data.created_at ? fmtDate(data.created_at) : null],
  ];

  const leftF = pFields.filter((_, i) => i % 2 === 0);
  const rightF = pFields.filter((_, i) => i % 2 !== 0);
  const fMax = Math.max(leftF.length, rightF.length);

  doc.setFontSize(8);
  for (let i = 0; i < fMax; i++) {
    const lf = leftF[i];
    const rf = rightF[i];
    if (lf) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(lf[0] + ':', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(safe(lf[1]), margin + 28, y);
    }
    if (rf) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(rf[0] + ':', margin + colW, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(safe(rf[1]), margin + colW + 28, y);
    }
    y += 5;
  }

  // Children
  if (data.children?.length) {
    y += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Children / Students', margin, y);
    y += 2;
    doc.setDrawColor(16, 185, 129);
    doc.line(margin, y, pageW - margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['Student Name', 'Class', 'Admission #']],
      body: data.children.map((c) => [safe(c.name), safe(c.current_class), safe(c.admission_number)]),
      styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('PwezaCore School Management', margin, pageH - 6);
  doc.text('Confidential', pageW - margin, pageH - 6, { align: 'right' });

  doc.save(`parent-profile-${safe(data.name).replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
