import { useCallback } from 'react';
import { getCachedReport, preloadClassReports, invalidateSnapshotCache } from '../services/reportCache';

export function useReportCache() {
  const getReport = useCallback(
    async (snapshotId: string, studentId: string, templateId?: string) => {
      return getCachedReport(snapshotId, studentId, templateId);
    },
    []
  );

  const preloadReports = useCallback(
    async (snapshotId: string, classNames: string[]) => {
      return preloadClassReports(snapshotId, classNames);
    },
    []
  );

  const invalidateCache = useCallback((snapshotId: string) => {
    invalidateSnapshotCache(snapshotId);
  }, []);

  return {
    getReport,
    preloadReports,
    invalidateCache,
  };
}




