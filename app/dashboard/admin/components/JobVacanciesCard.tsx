'use client';

import { useRouter } from 'next/navigation';

type Vacancy = {
  id: string;
  title: string;
  meta: string;
  applied: number;
  chipColor: 'teal' | 'violet' | 'amber';
  icon: string;
  chipText?: string;
};

export default function JobVacanciesCard() {
  const router = useRouter();

  // UI-only placeholder vacancies list (no backend fetch yet).
  const vacancies: Vacancy[] = [
    {
      id: 'v1',
      title: 'Physics Teacher',
      meta: 'Full-time · Posted Mar 17',
      applied: 8,
      chipColor: 'teal',
      icon: '⚗️',
      chipText: 'applied',
    },
    {
      id: 'v2',
      title: 'School Librarian',
      meta: 'Full-time · Posted Mar 10',
      applied: 6,
      chipColor: 'violet',
      icon: '📚',
      chipText: 'applied',
    },
    {
      id: 'v3',
      title: 'Mathematics Tutor',
      meta: 'Part-time · Posted Mar 07',
      applied: 4,
      chipColor: 'amber',
      icon: '🧮',
      chipText: 'applied',
    },
  ];

  const chipClass = (c: Vacancy['chipColor']) => {
    switch (c) {
      case 'teal':
        return 'bg-[#10d9a8]/15 border-[#10d9a8]/30 text-[#10d9a8]';
      case 'violet':
        return 'bg-[#9d7bf8]/15 border-[#9d7bf8]/30 text-[#9d7bf8]';
      case 'amber':
        return 'bg-[#f5a623]/15 border-[#f5a623]/30 text-[#f5a623]';
      default:
        return 'bg-white/5 border-white/10 text-white/70';
    }
  };

  return (
    <div className="bg-[#101828] rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/5 border border-white/10">💼</div>
          <div>
            <h3 className="text-lg font-semibold text-white">Job Vacancies</h3>
            <div className="text-xs text-white/50">Placeholder list · connect later</div>
          </div>
        </div>
        <div className="text-xs text-white/50">Manage</div>
      </div>

      <div className="space-y-3">
        {vacancies.map((v) => (
          <div
            key={v.id}
            className="flex items-start justify-between gap-4 p-3 rounded-xl bg-white/5 border border-white/10"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl flex-shrink-0">
                {v.icon}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">{v.title}</div>
                <div className="text-xs text-white/60 mt-1">{v.meta}</div>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${chipClass(v.chipColor)} whitespace-nowrap`}
              title={`${v.applied} applications`}
            >
              {v.applied} applied
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => router.push('/dashboard/admin/jobs/post')}
        className="mt-4 w-full py-2.5 rounded-lg text-sm font-semibold text-[#05080f] bg-[#10d9a8] hover:bg-[#14f0bb] transition-colors"
        aria-label="Manage all job vacancies"
      >
        Manage All Vacancies
      </button>
    </div>
  );
}

