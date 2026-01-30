import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

export default function AdminJobsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      const { data } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (data?.school_id) setSchoolId(data.school_id);
    };
    run();
  }, [user]);

  const save = async () => {
    if (!title || !schoolId) return;
    setSaving(true);
    await supabase.from('jobs').insert({
      school_id: schoolId,
      title,
      location,
      description,
      posted_by: user?.email || 'admin',
      status: 'Pending',
    });
    setSaving(false);
    setTitle('');
    setLocation('');
    setDescription('');
  };

  return (
    <AdminPageWrapper title="Job Vacancies" subtitle="Post and manage job vacancies">
      <div className="flex items-center justify-end mb-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin')}
          className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 backdrop-blur-xl"
        >
          Back to Dashboard
        </button>
      </div>

      <div className={`${adminCardClass} space-y-4`}>
        <h2 className="text-lg font-semibold text-white">Post Job Vacancy</h2>
        <div className="space-y-3">
          <input
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Job title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <textarea
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-xl border border-blue-500/50 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Posting...' : 'Post & Stay'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await save();
              navigate('/dashboard/admin');
            }}
            className="rounded-xl border border-green-500/50 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Post & Return
          </button>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
