import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { GlassPanel } from '@/components/Glass/GlassPanel';

export default function TeachersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState('');
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
      const { data: tchs } = await supabase.from('teachers').select('*').eq('school_id', data.school_id).order('created_at', { ascending: false });
      setRows(tchs || []);
      setLoading(false);
    };
    run();
  }, [navigate]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) => (r.name || '').toLowerCase().includes(t) || (r.email || '').toLowerCase().includes(t));
  }, [q, rows]);

  const remove = async (id: string) => {
    if (!confirm('Delete this teacher? This cannot be undone.')) return;
    try {
      await supabase.from('teachers').delete().eq('teacher_id', id);
      setRows((prev) => prev.filter((r) => r.teacher_id !== id));
    } catch (err: any) {
      alert(err?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">All Teachers</h1>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/80"
            onClick={() => navigate('/dashboard/admin/teachers/add')}
          >
            Add Teacher
          </button>
          <button
            type="button"
            className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/80"
            onClick={() => navigate('/dashboard/admin')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      <GlassPanel className="p-4 space-y-4">
        <input
          className="w-full md:w-1/2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Search by name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-2 font-medium text-foreground">Name</th>
                <th className="px-4 py-2 font-medium text-foreground">Phone</th>
                <th className="px-4 py-2 font-medium text-foreground">Email</th>
                <th className="px-4 py-2 font-medium text-foreground">Hired</th>
                <th className="px-4 py-2 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No teachers found.</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.teacher_id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <button type="button" className="text-primary hover:underline" onClick={() => navigate(`/dashboard/admin/teachers/${r.teacher_id}`)}>
                        {r.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{r.phone || '-'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.email}</td>
                    <td className="px-4 py-2 text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleString() : '-'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button type="button" className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:opacity-90" onClick={() => navigate(`/dashboard/admin/teachers/${r.teacher_id}`)}>View</button>
                        <button type="button" className="rounded bg-destructive/90 px-2 py-1 text-xs text-destructive-foreground hover:bg-destructive" onClick={() => remove(r.teacher_id)}>Delete</button>
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
