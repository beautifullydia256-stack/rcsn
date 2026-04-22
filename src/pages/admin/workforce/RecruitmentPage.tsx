import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { PERMISSION_KEYS } from '@/lib/permissions';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import { Link } from 'react-router-dom';
import { fetchRecruitmentPageData, type RecruitmentPageData } from '@/pages/admin/workforce/workforceApi';
import { workforceQueryKeys } from '@/pages/admin/workforce/workforceQueryKeys';

type Application = RecruitmentPageData['rows'][number];

const STAGES = ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'] as const;

export default function RecruitmentPage() {
  const canHr = usePermission(PERMISSION_KEYS.hrManage);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: workforceQueryKeys.recruitment(user?.id ?? ''),
    queryFn: () => fetchRecruitmentPageData(user!.id),
    enabled: !!user?.id,
  });
  const rows = q.data?.rows ?? [];
  const jobTitle = q.data?.jobTitle ?? {};
  const loading = q.isPending;
  const [err, setErr] = useState<string | null>(null);

  const update = async (id: string, status: (typeof STAGES)[number], notes: string) => {
    setErr(null);
    const { error } = await supabase.from('hr_job_applications').update({ status, stage_notes: notes || null }).eq('id', id);
    if (error) {
      setErr(error.message);
      return;
    }
    if (user?.id) void queryClient.invalidateQueries({ queryKey: workforceQueryKeys.recruitment(user.id) });
  };

  const updateStatus = (id: string, status: (typeof STAGES)[number], row: Application) => {
    void update(id, status, row.stage_notes || '');
  };

  if (q.isError) {
    return (
      <AdminPageWrapper title="Recruitment" subtitle="ATS">
        <div className={`${adminCardClass} text-red-200/90 text-sm`} role="alert">
          {q.error instanceof Error ? q.error.message : 'Failed to load'}
        </div>
      </AdminPageWrapper>
    );
  }
  if (loading) {
    return (
      <AdminPageWrapper title="Recruitment" subtitle="Loading…">
        <div className="ac-text-secondary text-sm">Loading…</div>
      </AdminPageWrapper>
    );
  }
  if (!canHr) {
    return (
      <AdminPageWrapper title="Recruitment" subtitle="ATS">
        <div className={`${adminCardClass} text-amber-200/90 text-sm`}>Workforce &amp; HR permission required.</div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper
      title="Recruitment"
      subtitle="Track applications. Public job seekers can apply at /jobs/:jobId/apply (also linked from the careers page when you add a link)."
    >
      {err && <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{err}</div>}
      <p className="text-sm text-slate-400">
        Manage job posts under{' '}
        <Link to="/dashboard/admin/jobs" className="text-sky-400 underline">
          Job Vacancies
        </Link>
        .
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-200">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 text-xs">
              <th className="py-2 pr-2">Applicant</th>
              <th className="py-2 pr-2">Job</th>
              <th className="py-2 pr-2">Contact</th>
              <th className="py-2 pr-2">Stage</th>
              <th className="py-2 pr-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-white/5 align-top">
                <td className="py-2 pr-2">
                  <div className="font-medium">{a.full_name}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(a.created_at).toLocaleString()}
                    <a href={`/jobs/${a.job_id}/apply`} className="ml-2 text-sky-400" target="_blank" rel="noreferrer">
                      Public apply link
                    </a>
                  </div>
                </td>
                <td className="py-2 pr-2 max-w-[140px]">{jobTitle[a.job_id] || a.job_id}</td>
                <td className="py-2 pr-2 text-xs">
                  {a.email}
                  {a.phone && <div>{a.phone}</div>}
                </td>
                <td className="py-2 pr-2">
                  <select
                    className="rounded border border-white/15 bg-white/5 px-1 py-0.5 text-xs"
                    value={a.status}
                    onChange={(e) => void updateStatus(a.id, e.target.value as (typeof STAGES)[number], a)}
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <div className="flex gap-1">
                    <input
                      className="w-full min-w-[100px] flex-1 rounded border border-white/10 bg-white/5 px-1 text-xs"
                      defaultValue={a.stage_notes || ''}
                      id={`n-${a.id}`}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded border border-white/20 px-1.5 text-[10px] text-slate-300"
                      onClick={() => {
                        const el = document.getElementById(`n-${a.id}`) as HTMLInputElement | null;
                        if (el) void update(a.id, a.status as (typeof STAGES)[number], el.value);
                      }}
                    >
                      Save
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-slate-500 text-sm py-4">No applications yet.</p>}
      </div>
    </AdminPageWrapper>
  );
}
