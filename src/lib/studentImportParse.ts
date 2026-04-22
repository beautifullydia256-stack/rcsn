import * as XLSX from 'xlsx';

const PREVIEW_MAX = 15;

export type ImportColumnRole = 'name' | 'class' | 'guardian_name' | 'guardian_phone' | 'ignore';

export const IMPORT_COLUMN_ROLES: { value: ImportColumnRole; label: string }[] = [
  { value: 'name', label: 'Student name (required)' },
  { value: 'class', label: 'Class' },
  { value: 'guardian_name', label: 'Guardian name' },
  { value: 'guardian_phone', label: 'Guardian phone' },
  { value: 'ignore', label: 'Ignore' },
];

/** Parse .csv or .xlsx: first sheet for Excel; UTF-8 CSV. */
export async function parseImportFile(file: File): Promise<{
  headers: string[];
  rows: string[][];
  previewRows: string[][];
  sheetName: string;
}> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  const firstName = wb.SheetNames[0] || 'Sheet1';
  const sheet = wb.Sheets[firstName];
  if (!sheet) {
    return { headers: [], rows: [], previewRows: [], sheetName: firstName };
  }
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!aoa.length) {
    return { headers: [], rows: [], previewRows: [], sheetName: firstName };
  }
  const rawHeader = aoa[0]!.map((c) => String(c ?? '').trim());
  const headers = rawHeader.length ? rawHeader : [`Column_${1}`];
  const dataRows = aoa
    .slice(1)
    .map((row) => {
      const arr = (row as unknown[]).map((c) => String(c ?? '').trim());
      while (arr.length < headers.length) arr.push('');
      return arr.slice(0, headers.length);
    })
    .filter((row) => row.some((c) => c.length > 0));
  return {
    headers,
    rows: dataRows,
    previewRows: dataRows.slice(0, PREVIEW_MAX),
    sheetName: firstName,
  };
}

export function defaultColumnMappings(headers: string[]): Record<string, ImportColumnRole> {
  const map: Record<string, ImportColumnRole> = {};
  const lower = headers.map((h) => h.toLowerCase().replace(/\s+/g, ' ').trim());
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const l = lower[i] || '';
    if (/^(name|student|full name|pupil|learner|child)$/i.test(l) || l === 'name') {
      map[h] = 'name';
    } else if (/(^class$|current class|grade|form|stream)/i.test(l)) {
      map[h] = 'class';
    } else if (/(parent|guardian|mother|father).*(name)?/i.test(l) && !/phone|tel|mobile|email/.test(l)) {
      map[h] = 'guardian_name';
    } else if (/(phone|tel|mobile|msisdn|contact)/i.test(l) && /parent|guardian|pupil|student/.test(l)) {
      map[h] = 'guardian_phone';
    } else {
      map[h] = 'ignore';
    }
  }
  // Ensure at least one name column
  if (!Object.values(map).some((r) => r === 'name') && headers.length) {
    map[headers[0]!] = 'name';
  }
  return map;
}

export function splitNameParts(full: string): { first: string; last: string; name: string } {
  const t = full.replace(/\s+/g, ' ').trim();
  if (!t) return { first: 'Student', last: 'Import', name: 'Student Import' };
  const parts = t.split(' ');
  if (parts.length === 1) return { first: parts[0]!, last: 'Import', name: t };
  return {
    first: parts[0]!,
    last: parts.slice(1).join(' '),
    name: t,
  };
}

export type RowError = { rowIndex: number; message: string };

export function getCell(
  row: string[],
  headers: string[],
  mapping: Record<string, ImportColumnRole>,
  role: ImportColumnRole
): string {
  for (const h of headers) {
    if (mapping[h] === role) {
      const idx = headers.indexOf(h);
      if (idx >= 0) return (row[idx] ?? '').trim();
    }
  }
  return '';
}
