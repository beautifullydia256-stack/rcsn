/**
 * Visual Template Designer - usePreview Hook
 *
 * Manages preview mode state: toggling it on/off and fetching sample data
 * from DataFetcherService. Debounces data refresh on template changes (500ms).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Template } from '../../domain/types';
import { DataFetcherService, type SampleStudentData } from '../../infrastructure/api/DataFetcherService';

const dataFetcherService = new DataFetcherService();

export function usePreview(template: Template | null) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [sampleData, setSampleData] = useState<SampleStudentData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSampleData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await dataFetcherService.fetchSampleData();
      setSampleData(data);
    } catch {
      setSampleData(dataFetcherService.getSampleDataPlaceholder());
    } finally {
      setIsLoading(false);
    }
  }, []);

  const togglePreview = useCallback(() => {
    setIsPreviewMode((prev) => {
      const next = !prev;
      if (next) {
        // Entering preview mode — fetch data immediately
        void loadSampleData();
      }
      return next;
    });
  }, [loadSampleData]);

  // Debounced refresh when template changes while preview mode is active
  useEffect(() => {
    if (!isPreviewMode || !template) return;

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void loadSampleData();
    }, 500);

    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isPreviewMode, template, loadSampleData]);

  return { isPreviewMode, togglePreview, sampleData, isLoading };
}
