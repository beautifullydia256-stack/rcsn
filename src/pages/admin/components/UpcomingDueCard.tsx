import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { FileText, ChevronRight } from 'lucide-react';

interface UpcomingItem {
  id: string;
  title: string;
  dueInfo: string;
  type: 'exam' | 'report' | 'fee';
}

export default function UpcomingDueCard() {
  const navigate = useNavigate();
  const [items, setItems] = useState<UpcomingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUpcoming = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
        if (!u?.school_id) return;
        const currentYear = new Date().getFullYear();
        const { data: examSets } = await supabase
          .from('exam_sets')
          .select('id, name, term, year')
          .eq('school_id', u.school_id)
          .eq('year', currentYear)
          .order('term', { ascending: true })
          .limit(5);
        const upcoming: UpcomingItem[] = (examSets || []).map((es: { id: string; name?: string; term: number; year: number }) => ({
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-600" />
          Upcoming
        </h3>
        <button
          type="button"
          onClick={() => navigate('/dashboard/admin/exam-sets')}
          className="text-sm font-medium text-green-600 hover:text-green-700 flex items-center gap-1"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm">No upcoming exams or deadlines.</p>
      ) : (
        <ul className="space-y-3">
          {items.slice(0, 4).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigate('/dashboard/admin/exam-sets')}
                className="w-full text-left flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">Due: {item.dueInfo}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
