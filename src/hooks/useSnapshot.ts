import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

export function useSnapshot(snapshotId: string) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!snapshotId) {
      setLoading(false);
      return;
    }

    const fetchSnapshot = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('report_snapshots')
          .select('*')
          .eq('id', snapshotId)
          .single();

        if (fetchError) throw fetchError;
        setSnapshot(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshot();
  }, [snapshotId]);

  return { snapshot, loading, error };
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
