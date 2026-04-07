import { isNonRemovableUaceSubsidiary } from '@/lib/uaceClassSubjectRules';
import { isOLevelClass } from '@/components/reports/templates/helpers';

export type ClassSubjectRow = {
  subject: string;
  uce_offering_type?: string | null;
  is_non_removable_default?: boolean | null;
};

export function canRemoveClassSubjectRow(selectedClass: string, row: ClassSubjectRow): boolean {
  if (isNonRemovableUaceSubsidiary(selectedClass, row.subject)) return false;
  if (isOLevelClass(selectedClass) && row.is_non_removable_default && row.uce_offering_type === 'compulsory') {
    return false;
  }
  return true;
}

export function classSubjectBadge(row: ClassSubjectRow): string | null {
  if (row.uce_offering_type === 'compulsory') return 'compulsory';
  if (row.uce_offering_type === 'subsidiary') return 'subsidiary';
  return null;
}
