'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import { FileText, ChevronRight } from 'lucide-react';

interface UpcomingItem {
  id: string;
  title: string;
  dueInfo: string;
  type: 'exam' | 'report' | 'fee';
}

export default function UpcomingDueCard() {
  const router = useRouter();
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUpcoming = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: u } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();
        if (!u?.school_id) return;

        const currentYear = new Date().getFullYear();
        const { data: examSets } = await supabase
          .from('exam_sets')
          .select('id, name, term, year')
          .eq('school_id', u.school_id)
          .eq('year', currentYear)
          .order('term', { ascending: true })
          .limit(5);

        const upcoming: UpcomingItem[] = (examSets || []).map((es: any) => ({
          id: es.id,
          title: es.name || `Exam Set T${es.term} ${es.year}`,
          dueInfo: `Term ${es.term}, ${es.year}`,
          type: 'exam',
        }));

        setItems(upcoming);
      } catch (error) {
        console.error('Error loading upcoming:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUpcoming();
  }, []);

  return (
    <div className="bg-[#101828] rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          Upcoming
        </h3>
        <button
          type="button"
          onClick={() => router.push('/dashboard/admin/exam-sets')}
          className="text-sm font-semibold text-[#10d9a8] hover:text-[#14f0bb] flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="text-white/60 text-sm">Loading...</div>
        </div>
      ) : items.length === 0 ? (
        <p className="text-white/60 text-sm">No upcoming exams or deadlines.</p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 4).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => router.push('/dashboard/admin/exam-sets')}
                className="w-full text-left flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-xs text-white/60">Due: {item.dueInfo}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/50 flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
