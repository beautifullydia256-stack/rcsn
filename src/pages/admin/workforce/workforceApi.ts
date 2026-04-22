import { supabase } from '@/lib/supabase';

export type LeavePageData = {
  schoolId: string;
  meTeacher: string | null;
  meOtherStaff: string | null;
  teachers: { teacher_id: string; name: string | null }[];
  otherStaff: { id: string; full_name: string | null }[];
  leaveTypes: { id: string; name: string; paid: boolean; default_days_per_year: number }[];
  requests: {
    id: string;
    school_id: string;
    staff_kind: 'teacher' | 'other_staff';
    staff_id: string;
    leave_type_id: string;
    start_date: string;
    end_date: string;
    half_day_part: 'am' | 'pm' | null;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    reason: string | null;
    created_at: string;
  }[];
};

export async function fetchLeavePageData(userId: string): Promise<LeavePageData> {
  const { data: u, error: ue } = await supabase
    .from('users')
    .select('school_id, linked_teacher_id')
    .eq('user_id', userId)
    .single();
  if (ue || !u?.school_id) throw new Error('Could not load your school profile.');

  let meOther: string | null = null;
  if (!u.linked_teacher_id) {
    const { data: oRow } = await supabase
      .from('other_staff_members')
      .select('id')
      .eq('school_id', u.school_id)
      .eq('linked_user_id', userId)
      .maybeSingle();
    meOther = oRow?.id ?? null;
  }

  const [tRes, oRes, ltRes, qRes] = await Promise.all([
    supabase.from('teachers').select('teacher_id, name').eq('school_id', u.school_id).order('name'),
    supabase.from('other_staff_members').select('id, full_name').eq('school_id', u.school_id).order('full_name'),
    supabase.from('hr_leave_types').select('id, name, paid, default_days_per_year').eq('school_id', u.school_id).order('sort_order'),
    supabase
      .from('hr_leave_requests')
      .select(
        'id, school_id, staff_kind, staff_id, leave_type_id, start_date, end_date, half_day_part, status, reason, created_at'
      )
      .eq('school_id', u.school_id)
      .order('start_date', { ascending: false }),
  ]);

  if (tRes.error) throw tRes.error;
  if (oRes.error) throw oRes.error;
  if (ltRes.error) throw ltRes.error;
  if (qRes.error) throw qRes.error;

  return {
    schoolId: u.school_id,
    meTeacher: u.linked_teacher_id || null,
    meOtherStaff: meOther,
    teachers: (tRes.data || []) as LeavePageData['teachers'],
    otherStaff: (oRes.data || []) as LeavePageData['otherStaff'],
    leaveTypes: (ltRes.data || []) as LeavePageData['leaveTypes'],
    requests: (qRes.data || []) as LeavePageData['requests'],
  };
}

export type RecruitmentPageData = {
  rows: {
    id: string;
    job_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    status: string;
    stage_notes: string | null;
    created_at: string;
  }[];
  jobTitle: Record<string, string>;
};

export async function fetchRecruitmentPageData(userId: string): Promise<RecruitmentPageData> {
  const { data: u, error: ue } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (ue || !u?.school_id) throw new Error('No school');

  const { data, error } = await supabase
    .from('hr_job_applications')
    .select('id, job_id, full_name, email, phone, status, stage_notes, created_at')
    .eq('school_id', u.school_id)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const list = (data || []) as RecruitmentPageData['rows'];
  const jids = [...new Set(list.map((a) => a.job_id))];
  let jobTitle: Record<string, string> = {};
  if (jids.length) {
    const { data: jrows } = await supabase.from('jobs').select('job_id, title').in('job_id', jids);
    (jrows || []).forEach((j) => {
      const row = j as { job_id: string; title: string | null };
      jobTitle[row.job_id] = row.title || 'Vacancy';
    });
  }
  return { rows: list, jobTitle };
}

export type OnboardingPageData = {
  schoolId: string;
  templates: { id: string; name: string; created_at: string }[];
  runs: {
    id: string;
    subject_staff_kind: string;
    subject_staff_id: string;
    status: string;
    started_at: string;
    template_id: string | null;
  }[];
  teachers: { teacher_id: string; name: string | null }[];
  other: { id: string; full_name: string | null }[];
};

export async function fetchOnboardingPageData(userId: string): Promise<OnboardingPageData> {
  const { data: u, error: ue } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (ue || !u?.school_id) throw new Error('No school');

  const [a, b, t, o] = await Promise.all([
    supabase.from('hr_onboarding_templates').select('id, name, created_at').eq('school_id', u.school_id).order('name'),
    supabase
      .from('hr_onboarding_runs')
      .select('id, subject_staff_kind, subject_staff_id, status, started_at, template_id')
      .eq('school_id', u.school_id)
      .order('started_at', { ascending: false })
      .limit(50),
    supabase.from('teachers').select('teacher_id, name').eq('school_id', u.school_id).order('name'),
    supabase.from('other_staff_members').select('id, full_name').eq('school_id', u.school_id).order('full_name'),
  ]);

  if (a.error) throw a.error;

  return {
    schoolId: u.school_id,
    templates: (a.data || []) as OnboardingPageData['templates'],
    runs: (b.data || []) as OnboardingPageData['runs'],
    teachers: (t.data || []) as OnboardingPageData['teachers'],
    other: (o.data || []) as OnboardingPageData['other'],
  };
}

export type PerformancePageData = {
  schoolId: string;
  cycles: { id: string; name: string; period_start: string; period_end: string; status: string }[];
  teachers: { teacher_id: string; name: string | null }[];
  other: { id: string; full_name: string | null }[];
};

export async function fetchPerformancePageData(userId: string): Promise<PerformancePageData> {
  const { data: u, error: ue } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (ue || !u?.school_id) throw new Error('No school');

  const [cRes, t, o] = await Promise.all([
    supabase
      .from('hr_review_cycles')
      .select('id, name, period_start, period_end, status')
      .eq('school_id', u.school_id)
      .order('period_start', { ascending: false }),
    supabase.from('teachers').select('teacher_id, name').eq('school_id', u.school_id).order('name'),
    supabase.from('other_staff_members').select('id, full_name').eq('school_id', u.school_id).order('full_name'),
  ]);

  if (cRes.error) throw cRes.error;

  return {
    schoolId: u.school_id,
    cycles: (cRes.data || []) as PerformancePageData['cycles'],
    teachers: (t.data || []) as PerformancePageData['teachers'],
    other: (o.data || []) as PerformancePageData['other'],
  };
}

export async function fetchPerformanceGoals(schoolId: string, cycleId: string) {
  const { data, error } = await supabase
    .from('hr_staff_goals')
    .select('id, title, staff_kind, status, cycle_id')
    .eq('school_id', schoolId)
    .eq('cycle_id', cycleId);
  if (error) throw error;
  return (data || []) as { id: string; title: string; staff_kind: string; status: string }[];
}

export type PayrollPageData = {
  schoolId: string;
  periods: { id: string; label: string; period_start: string; period_end: string; status: string }[];
  tList: { teacher_id: string; name: string | null }[];
  oList: { id: string; full_name: string | null }[];
};

export async function fetchPayrollPageData(userId: string): Promise<PayrollPageData> {
  const { data: u, error: ue } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (ue || !u?.school_id) throw new Error('No school on profile');

  const [pRes, t, o] = await Promise.all([
    supabase
      .from('hr_payroll_periods')
      .select('id, label, period_start, period_end, status')
      .eq('school_id', u.school_id)
      .order('period_start', { ascending: false }),
    supabase.from('teachers').select('teacher_id, name').eq('school_id', u.school_id).order('name'),
    supabase.from('other_staff_members').select('id, full_name').eq('school_id', u.school_id).order('full_name'),
  ]);

  if (pRes.error) throw pRes.error;
  if (t.error) throw t.error;
  if (o.error) throw o.error;

  return {
    schoolId: u.school_id,
    periods: (pRes.data || []) as PayrollPageData['periods'],
    tList: (t.data || []) as PayrollPageData['tList'],
    oList: (o.data || []) as PayrollPageData['oList'],
  };
}

export type PayslipRow = {
  id: string;
  staff_kind: 'teacher' | 'other_staff';
  staff_id: string;
  gross: number;
  net: number;
  currency: string;
  notes: string | null;
};

export async function fetchPayrollPayslips(periodId: string): Promise<PayslipRow[]> {
  const { data, error } = await supabase
    .from('hr_payslips')
    .select('id, staff_kind, staff_id, gross, net, currency, notes')
    .eq('payroll_period_id', periodId);
  if (error) throw error;
  return (data || []) as PayslipRow[];
}
