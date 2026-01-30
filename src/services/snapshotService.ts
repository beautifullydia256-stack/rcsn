import { supabase } from '../lib/supabase';

export interface ReportSnapshot {
  id: string;
  school_id: string;
  term: number;
  year: number;
  exam_set_id?: string;
  template_id?: string;
  created_at: string;
  locked_at?: string;
  status: 'draft' | 'locked' | 'generated';
  created_by?: string;
  metadata?: Record<string, any>;
}

export interface SnapshotData {
  id: string;
  snapshot_id: string;
  student_id: string;
  class_name: string;
  subject: string;
  marks_obtained?: number;
  total_marks?: number;
  grade?: string;
  remarks?: string;
  teacher_initials?: string;
  teacher_comment?: string;
  class_teacher_comment?: string;
  headteacher_comment?: string;
  attendance_percentage?: number;
  position?: number;
  aggregate?: number;
  frozen_data?: Record<string, any>;
}

/**
 * Create a new report snapshot
 */
export async function createSnapshot(
  schoolId: string,
  term: number,
  year: number,
  examSetId?: string,
  templateId?: string
): Promise<ReportSnapshot> {
  const { data, error } = await supabase
    .from('report_snapshots')
    .insert({
      school_id: schoolId,
      term,
      year,
      exam_set_id: examSetId,
      template_id: templateId,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Lock a snapshot (make it immutable)
 */
export async function lockSnapshot(snapshotId: string): Promise<void> {
  const { error } = await supabase.rpc('lock_report_snapshot', {
    p_snapshot_id: snapshotId,
  });

  if (error) throw error;
}

/**
 * Get snapshot by ID
 */
export async function getSnapshot(snapshotId: string): Promise<ReportSnapshot | null> {
  const { data, error } = await supabase
    .from('report_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Get all snapshots for a school
 */
export async function getSnapshots(
  schoolId: string,
  filters?: { term?: number; year?: number; status?: string }
): Promise<ReportSnapshot[]> {
  let query = supabase
    .from('report_snapshots')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });

  if (filters?.term) {
    query = query.eq('term', filters.term);
  }
  if (filters?.year) {
    query = query.eq('year', filters.year);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get snapshot data for a specific snapshot
 */
export async function getSnapshotData(snapshotId: string): Promise<SnapshotData[]> {
  const { data, error } = await supabase
    .from('report_snapshot_data')
    .select('*')
    .eq('snapshot_id', snapshotId)
    .order('student_id, subject');

  if (error) throw error;
  return data || [];
}

/**
 * Insert snapshot data (frozen student data)
 */
export async function insertSnapshotData(
  snapshotId: string,
  data: Omit<SnapshotData, 'id' | 'snapshot_id' | 'created_at'>[]
): Promise<void> {
  const records = data.map((item) => ({
    snapshot_id: snapshotId,
    ...item,
  }));

  const { error } = await supabase
    .from('report_snapshot_data')
    .insert(records);

  if (error) throw error;
}

/**
 * Check if snapshot is locked
 */
export async function isSnapshotLocked(snapshotId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_snapshot_locked', {
    p_snapshot_id: snapshotId,
  });

  if (error) throw error;
  return data || false;
}




