import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../components/layout/AdminPageWrapper';

interface StaffMember {
  teacher_id?: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  employee_id: string | null;
  role_label: string;
}

async function fetchStaffDirectory(schoolId: string): Promise<StaffMember[]> {
  const { data: teachers } = await supabase
    .from('teachers')
    .select('teacher_id, name, email, phone, department, employee_id')
    .eq('school_id', schoolId)
    .order('name');

  return ((teachers ?? []) as { teacher_id: string; name: string; email: string | null; phone: string | null; department: string | null; employee_id: string | null }[]).map((t) => ({
    ...t,
    role_label: t.department || 'Teacher',
  }));
}

export default function StaffDirectoryPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;
  const [search, setSearch] = useState('');

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff-directory', schoolId],
    queryFn: () => fetchStaffDirectory(schoolId!),
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = staff.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.department ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminPageWrapper eyebrow="OFFICE" title="Staff Directory" subtitle="Contact list for all teaching and non-teaching staff">
      <div className={`${adminCardClass} mb-6 p-4`}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, department or email…"
          className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-10 text-slate-500">Loading…</div>
        ) : !filtered.length ? (
          <div className="col-span-full text-center py-10 text-slate-500">No staff found{search ? ` for "${search}"` : ''}.</div>
        ) : filtered.map((s, i) => {
          const initials = s.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
          const colors = ['linear-gradient(135deg,#10d9a8,#4f8ef7)', 'linear-gradient(135deg,#8b5cf6,#4f8ef7)', 'linear-gradient(135deg,#f59e0b,#ef4444)', 'linear-gradient(135deg,#22c55e,#10d9a8)'];
          return (
            <div key={s.teacher_id ?? i} className={`${adminCardClass} p-4 flex items-center gap-4`}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: colors[i % colors.length], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: '#05080f', flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-semibold text-slate-100 truncate">{s.name}</div>
                <div className="text-xs text-slate-400">{s.role_label}</div>
                {s.phone && <a href={`tel:${s.phone}`} className="text-xs text-indigo-400 hover:underline block mt-0.5">{s.phone}</a>}
                {s.email && <a href={`mailto:${s.email}`} className="text-xs text-slate-500 hover:text-slate-300 block truncate">{s.email}</a>}
              </div>
              {s.employee_id && <span className="text-xs text-slate-600 bg-slate-800 rounded px-2 py-0.5 border border-slate-700 flex-shrink-0">{s.employee_id}</span>}
            </div>
          );
        })}
      </div>
    </AdminPageWrapper>
  );
}
