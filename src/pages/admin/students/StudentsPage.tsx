import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { GlassPanel } from '@/components/Glass/GlassPanel';

export default function StudentsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [q, setQ] = useState('');
  const [klass, setKlass] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      const { data } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!data?.school_id) {
        navigate('/login');
        return;
      }
      const { data: sch } = await supabase.from('schools').select('type').eq('school_id', data.school_id).single();
      setSchoolType((sch?.type as any) || null);
      const { data: studs } = await supabase.from('students').select('*').eq('school_id', data.school_id).order('created_at', { ascending: false });
      setRows(studs || []);
      setLoading(false);
    };
    run();
  }, [navigate]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    let out = rows;
    if (t) {
      out = out.filter((r) => (r.name || '').toLowerCase().includes(t) || (r.current_class || '').toLowerCase().includes(t));
    }
    if (klass) {
      out = out.filter((r) => (r.current_class || '') === klass);
    }
    return out;
  }, [q, klass, rows]);

  const remove = async (id: string, admission_number: string) => {
    if (!confirm('Delete this student? This may require additional cleanup for login credentials.')) return;
    try {
      await supabase.from('students').delete().eq('student_id', id);
      setRows((prev) => prev.filter((r) => r.student_id !== id));
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">All Students</h1>
        <button
          type="button"
          className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/80"
          onClick={() => navigate('/dashboard/admin')}
        >
          Back to Dashboard
        </button>
      </div>

      <GlassPanel className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <input
            className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search by name or class"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="w-full md:w-64 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            value={klass}
            onChange={(e) => setKlass(e.target.value)}
          >
            <option value="">All Classes</option>
            {schoolType === 'Nursery/Primary' && (
              <>
                <option value="Baby Class">Baby Class</option>
                <option value="Middle Class">Middle Class</option>
                <option value="Top Class">Top Class</option>
                {Array.from({ length: 7 }).map((_, i) => (
                  <option key={`P-${i}`} value={`Primary ${i + 1}`}>{`Primary ${i + 1}`}</option>
                ))}
              </>
            )}
            {schoolType === 'Secondary' && (
              Array.from({ length: 6 }).map((_, i) => (
                <option key={`S-${i}`} value={`Senior ${i + 1}`}>{`Senior ${i + 1}`}</option>
              ))
            )}
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-2 font-medium text-foreground">Name</th>
                <th className="px-4 py-2 font-medium text-foreground">Class</th>
                <th className="px-4 py-2 font-medium text-foreground">Status</th>
                <th className="px-4 py-2 font-medium text-foreground">Enrolled</th>
                <th className="px-4 py-2 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No students found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.student_id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <button type="button" className="text-primary hover:underline" onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}>
                        {r.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.current_class}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.status}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button type="button" className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90" onClick={() => navigate(`/dashboard/admin/students/${r.student_id}`)}>View</button>
                        <button type="button" className="rounded bg-destructive/90 px-2 py-1 text-xs text-destructive-foreground hover:bg-destructive" onClick={() => remove(r.student_id, r.admission_number)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}
