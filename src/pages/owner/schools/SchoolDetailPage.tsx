import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { registerApiUrl } from '@/lib/registerApiOrigin';

const ROLE_ICONS: Record<string, string> = {
  owner: '⚙️',
  admin: '🏫',
  head_teacher: '👩‍💼',
  deputy_head_teacher: '👨‍💼',
  dos: '📐',
  deputy_dos: '📏',
  teacher: '👨‍🏫',
  accountant: '💰',
  secretary: '📋',
  librarian: '📚',
  lab_technician: '🔬',
  clinician: '🏥',
  parent: '👨‍👧',
};

type PortalUser = {
  user_id: string;
  name: string | null;
  email: string;
  is_active: boolean;
  extra_roles: string[];
};

type Section = {
  role: string;
  label: string;
  users: PortalUser[];
};

type School = {
  school_id: string;
  name: string;
  email: string | null;
  contact_email: string | null;
  phone: string | null;
  contact_phone: string | null;
  address: string | null;
  subscription_plan: string | null;
  created_at: string | null;
  school_code: string | null;
  location_name: string | null;
  logo_url: string | null;
  motto: string | null;
  website: string | null;
};

export default function SchoolDetailPage() {
  const { schoolId } = useParams<{ schoolId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [totalPortalUsers, setTotalPortalUsers] = useState(0);
  const [activePortalUsers, setActivePortalUsers] = useState(0);
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!schoolId) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) { setError('Session expired. Please sign in again.'); return; }

        const res = await fetch(registerApiUrl(`/api/owner/schools/detail?schoolId=${encodeURIComponent(schoolId)}`), {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) { setError((json as { error?: string }).error || 'Failed to load school details.'); return; }

        const data = json as {
          school: School;
          sections: Section[];
          totalPortalUsers: number;
          activePortalUsers: number;
        };
        setSchool(data.school);
        setSections(data.sections);
        setTotalPortalUsers(data.totalPortalUsers);
        setActivePortalUsers(data.activePortalUsers);
        // Expand all sections by default
        setExpandedRoles(new Set(data.sections.map((s) => s.role)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unexpected error');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [schoolId]);

  const toggleRole = (role: string) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05080f]">
        <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="text-[#8296be] hover:text-[#eef3ff] text-sm mb-4 flex items-center gap-1">
          ← Back
        </button>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
          {error || 'School not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-[#8296be] hover:text-[#eef3ff] text-sm flex items-center gap-1 transition-colors"
      >
        ← All Schools
      </button>

      {/* School header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#101828] border border-white/10 rounded-2xl p-6"
      >
        <div className="flex items-start gap-4">
          {school.logo_url && (
            <img src={school.logo_url} alt="" className="w-12 h-12 rounded-xl object-contain bg-white/5 p-1 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-[#eef3ff]">{school.name}</h1>
                {school.motto && <p className="text-xs text-[#8296be] italic mt-0.5">"{school.motto}"</p>}
              </div>
              {school.subscription_plan && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0">
                  {school.subscription_plan}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8296be]">
              {(school.email || school.contact_email) && (
                <span>{school.email || school.contact_email}</span>
              )}
              {(school.phone || school.contact_phone) && (
                <span>{school.phone || school.contact_phone}</span>
              )}
              {school.location_name && <span>{school.location_name}</span>}
              {school.address && <span>{school.address}</span>}
              {school.website && <span>{school.website}</span>}
              {school.school_code && (
                <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded text-[#eef3ff]">{school.school_code}</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="bg-[#0d1520] rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-[#eef3ff]">{totalPortalUsers}</div>
            <div className="text-xs text-[#8296be] mt-0.5">Portal logins</div>
          </div>
          <div className="bg-[#0d1520] rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{activePortalUsers}</div>
            <div className="text-xs text-[#8296be] mt-0.5">Active accounts</div>
          </div>
          <div className="bg-[#0d1520] rounded-xl p-3 text-center">
            <div className="text-xl font-bold text-[#eef3ff]">
              {school.created_at ? new Date(school.created_at).getFullYear() : '—'}
            </div>
            <div className="text-xs text-[#8296be] mt-0.5">Year joined</div>
          </div>
        </div>
      </motion.div>

      {/* Portal users by role */}
      <div>
        <h2 className="text-sm font-semibold text-[#8296be] uppercase tracking-wider mb-3">
          Portal Users — accounts with login access
        </h2>

        {sections.length === 0 && (
          <div className="bg-[#101828] border border-white/10 rounded-2xl p-8 text-center text-[#8296be]">
            No portal accounts have been created for this school yet.
          </div>
        )}

        <div className="space-y-3">
          {sections.map((section, si) => (
            <motion.div
              key={section.role}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.04 }}
              className="bg-[#101828] border border-white/10 rounded-2xl overflow-hidden"
            >
              {/* Role header — clickable to expand/collapse */}
              <button
                onClick={() => toggleRole(section.role)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg leading-none">{ROLE_ICONS[section.role] ?? '👤'}</span>
                  <span className="text-sm font-semibold text-[#eef3ff]">{section.label}</span>
                  <span className="text-xs text-[#8296be] bg-white/5 px-2 py-0.5 rounded-full">
                    {section.users.length}
                  </span>
                </div>
                <span className="text-[#3d5278] text-sm">
                  {expandedRoles.has(section.role) ? '▲' : '▼'}
                </span>
              </button>

              {/* User list */}
              {expandedRoles.has(section.role) && (
                <div className="divide-y divide-white/5">
                  {section.users.map((user) => (
                    <div key={user.user_id} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs text-[#8296be] shrink-0 font-medium">
                        {(user.name || user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        {user.name && (
                          <div className="text-sm text-[#eef3ff] font-medium truncate">{user.name}</div>
                        )}
                        <div className="text-xs text-[#8296be] truncate">{user.email}</div>
                      </div>
                      {!user.is_active && (
                        <span className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5 shrink-0">
                          inactive
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
