import * as XLSX from 'xlsx';

export type StudentExportRow = {
  name: string;
  admission_number?: string | null;
  current_class: string;
  status?: string | null;
  guardian_name?: string | null;
  guardian_email?: string | null;
  guardian_phone?: string | null;
  student_id?: string;
};

function triggerSave(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export function downloadStudentsXlsx(rows: StudentExportRow[], fileBase: string) {
  const out = rows.map((r) => ({
    'Student name': r.name || '',
    'Student ID': r.student_id || '',
    'Admission number': r.admission_number || '',
    Class: r.current_class || '',
    Status: r.status || '',
    'Guardian name': r.guardian_name || '',
    'Guardian email': r.guardian_email || '',
    'Guardian phone': r.guardian_phone || '',
  }));
  const ws = XLSX.utils.json_to_sheet(out);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const ab = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([ab], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const safe = fileBase.replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_').slice(0, 80) || 'students';
  const ts = new Date().toISOString().slice(0, 10);
  triggerSave(blob, `${safe}_${ts}.xlsx`);
}
