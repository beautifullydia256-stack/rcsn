import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const STALE_TIME_MS = 5 * 60 * 1000;

export interface Snapshot {
  id: string;
  school_id: string;
  term: number;
  year: number;
  exam_set_id: string | null;
  template_id: string | null;
  created_at: string;
  locked_at: string | null;
  status: 'draft' | 'locked' | 'generated';
  created_by: string | null;
  student_count: number;
  class_count: number;
  metadata: any;
}

async function fetchSnapshot(snapshotId: string): Promise<Snapshot | null> {
  const { data, error } = await supabase
    .from('report_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single();
  if (error) throw error;
  return data;
}

export function useSnapshot(snapshotId: string) {
  const { data: snapshot, isLoading: loading, error: err } = useQuery({
    queryKey: ['admin', 'snapshot', snapshotId],
    queryFn: () => fetchSnapshot(snapshotId),
    enabled: !!snapshotId,
    staleTime: STALE_TIME_MS,
  });
  return { snapshot: snapshot ?? null, loading, error: err?.message ?? null };
}

export function useSnapshots(schoolId: string) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('report_snapshots')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSnapshots(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [schoolId]);

  return { snapshots, loading, error, refetch };
}
