import { useAcademicPeriod, getAcademicPeriodLabels, formatAcademicPeriod, AcademicVocabularyLabels } from '@/lib/academicPeriodTerminology';

export function useAcademicVocabulary() {
  const result = useAcademicPeriod();
  return {
    ...result,
    v: result.labels,
  };
}

export { getAcademicPeriodLabels, formatAcademicPeriod };
export type { AcademicVocabularyLabels };
export default useAcademicVocabulary;
