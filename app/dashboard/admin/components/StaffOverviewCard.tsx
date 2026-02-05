'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import { Users } from 'lucide-react';

interface StaffMember {
  teacher_id: string;
  name: string;
  email?: string;
  status: 'Teaching' | 'Free' | 'On leave';
}

export default function StaffOverviewCard() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStaff = async () => {
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

        const { data: teachers } = await supabase
          .from('teachers')
          .select('teacher_id, name, email')
          .eq('school_id', u.school_id)
          .limit(6);

        const list: StaffMember[] = (teachers || []).map((t: any) => ({
          teacher_id: t.teacher_id,
          name: t.name || 'Teacher',
          email: t.email,
          status: 'Teaching' as const,
        }));

        setStaff(list);
      } catch (error) {
        console.error('Error loading staff:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStaff();
  }, []);

  const statusColors: Record<StaffMember['status'], string> = {
    Teaching: 'bg-green-100 text-green-800',
    Free: 'bg-amber-100 text-amber-800',
    'On leave': 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-600" />
          Staff Overview
        </h3>
        <button
          type="button"
          onClick={() => router.push('/dashboard/admin/teachers')}
          className="text-sm font-medium text-green-600 hover:text-green-700"
        >
          View all
        </button>
      </div>
      {loading ? (
        <div className="h-32 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      ) : staff.length === 0 ? (
        <p className="text-gray-500 text-sm">No staff listed.</p>
      ) : (
        <ul className="space-y-3">
          {staff.map((s) => (
            <li key={s.teacher_id}>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/admin/teachers/${s.teacher_id}`)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold text-sm flex-shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                  <p className="text-xs text-gray-500 truncate">Current class</p>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusColors[s.status]}`}
                >
                  {s.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
