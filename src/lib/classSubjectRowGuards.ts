import { isNonRemovableUaceSubsidiary } from '@/lib/uaceClassSubjectRules';
import { isALevelClass, isOLevelClass } from '@/components/reports/templates/helpers';

export type ClassSubjectRow = {
  subject: string;
  uce_offering_type?: string | null;
  is_non_removable_default?: boolean | null;
  /** Resolved from `uace_subject_catalog` for Senior 5–6 rows (not stored on `class_subjects`). */
  uace_catalog_type?: 'principal' | 'subsidiary' | null;
};

export type UaceCatalogRow = { subject_name: string; subject_type: string };

/** Map class_subjects rows to UACE catalog type for A-Level classes. */
export function enrichClassSubjectsWithUaceCatalog(
  rows: ClassSubjectRow[],
  selectedClass: string,
  catalog: UaceCatalogRow[] | null | undefined,
): ClassSubjectRow[] {
  if (!isALevelClass(selectedClass) || !catalog?.length) {
    return rows.map((r) => ({ ...r, uace_catalog_type: r.uace_catalog_type ?? null }));
  }
  const m = new Map<string, 'principal' | 'subsidiary'>();
  for (const r of catalog) {
    const n = String(r.subject_name || '').trim();
    if (!n) continue;
    if (r.subject_type === 'principal' || r.subject_type === 'subsidiary') {
      m.set(n, r.subject_type as 'principal' | 'subsidiary');
    }
  }
  return rows.map((row) => ({
    ...row,
    uace_catalog_type: m.get(String(row.subject || '').trim()) ?? null,
  }));
}

/** Whether `subjectName` is a UACE principal row in the national catalog (schools may add these to S5–6). */
export function isUacePrincipalCatalogSubject(
  subjectName: string,
  catalog: UaceCatalogRow[] | null | undefined,
): boolean {
  const t = subjectName.trim();
  return !!catalog?.some((r) => String(r.subject_name || '').trim() === t && r.subject_type === 'principal');
}

export function canRemoveClassSubjectRow(selectedClass: string, row: ClassSubjectRow): boolean {
  if (isNonRemovableUaceSubsidiary(selectedClass, row.subject)) return false;
  if (isOLevelClass(selectedClass) && row.is_non_removable_default && row.uce_offering_type === 'compulsory') {
    return false;
  }
  return true;
}

export function classSubjectBadge(row: ClassSubjectRow, selectedClass: string): string | null {
  if (isALevelClass(selectedClass)) {
    if (row.uace_catalog_type === 'principal') return 'principal';
    if (row.uace_catalog_type === 'subsidiary') return 'subsidiary';
    return null;
  }
  if (row.uce_offering_type === 'compulsory') return 'compulsory';
  if (row.uce_offering_type === 'subsidiary') return 'subsidiary';
  return null;
}
