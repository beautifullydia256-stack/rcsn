'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { IdCard, Search, Users } from 'lucide-react';

export default function AdminIdentityCardsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data: urow } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!urow?.school_id) {
        setLoading(false);
        return;
      }
      const { data: studs } = await supabase
        .from('students')
        .select('student_id, name, admission_number, current_class')
        .eq('school_id', urow.school_id)
        .eq('status', 'active')
        .order('name');
      setStudents(studs || []);
      setLoading(false);
    };
    run();
  }, [router]);

  const filtered = useMemo(() => {
    let r = students;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (s) =>
          String(s.name || '').toLowerCase().includes(q) ||
          String(s.admission_number || '').toLowerCase().includes(q) ||
          String(s.current_class || '').toLowerCase().includes(q)
      );
    }
    if (classFilter) r = r.filter((s) => s.current_class === classFilter);
    return r;
  }, [students, searchQuery, classFilter]);

  const classes = useMemo(() => {
    const c = students.map((s) => s.current_class as string).filter(Boolean);
    return Array.from(new Set(c)).sort();
  }, [students]);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <IdCard className="w-8 h-8 text-emerald-400" />
          <div>
            <h1 className="text-2xl font-semibold">Identity cards</h1>
            <p className="text-white/60 text-sm">Select a student to view or print their ID card.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              className="w-full rounded-lg bg-white/10 border border-white/15 pl-10 pr-3 py-2 text-white placeholder:text-white/40"
              placeholder="Search name, admission, class…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="rounded-lg bg-white/10 border border-white/15 px-3 py-2 text-white min-w-[160px]"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c} value={c} className="text-black">
                {c}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-white/50">Loading…</p>
        ) : (
          <ul className="grid gap-2">
            {filtered.map((s) => (
              <motion.li key={String(s.student_id)} layout>
                <Link
                  href={`/dashboard/admin/identity/${s.student_id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3 transition-colors"
                >
                  <span className="font-medium">{String(s.name)}</span>
                  <span className="text-white/50 text-sm">
                    {String(s.current_class || '')} · {String(s.admission_number || '')}
                  </span>
                </Link>
              </motion.li>
            ))}
            {filtered.length === 0 ? (
              <li className="text-white/45 text-sm flex items-center gap-2 py-8 justify-center">
                <Users className="w-5 h-5" /> No students found.
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </div>
  );
}
