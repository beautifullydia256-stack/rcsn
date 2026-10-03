import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import AdmissionsModal from '@/components/website/AdmissionsModal';

export default function CampusLifePage() {
  const location = useLocation();
  const [admissionsOpen, setAdmissionsOpen] = useState(false);

  useEffect(() => {
    if (location.hash) {
      const rawId = location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(rawId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  }, [location.hash]);

  const pillars = [
    {
      id: 'hostels',
      title: 'Residential Hostels & Student Welfare',
      image: '/images/rcsn/hostels.jpg',
      desc: 'On-campus boarding accommodation for female and male nursing students with resident wardens and 24/7 security.',
      highlights: ['24/7 Campus Security', 'Matron & Patron Oversight', 'Dedicated Water & Solar Power Backup'],
    },
    {
      id: 'lecture-halls',
      title: 'Lecture & Assembly Halls',
      image: '/images/rcsn/lecture-hall.jpg',
      desc: 'Well-ventilated learning environments designed for focused lectures, clinical seminars, and academic discussions.',
      highlights: ['Comfortable Seating', 'Public Address System', 'Academic Assemblies & Seminars'],
    },
    {
      id: 'sports',
      title: 'Recreation & Sports Courts',
      image: '/images/rcsn/compound.jpg',
      desc: 'Physical wellness is encouraged at RCSN. Students participate in volleyball, netball, and football matches on campus.',
      highlights: ['Inter-Class Games', 'Spacious Green Compound', 'Health & Physical Fitness'],
    },
    {
      id: 'guild',
      title: 'Student Guild & Spiritual Fellowship',
      image: '/images/rcsn/school-main.jpg',
      desc: 'Ethical leadership development through democratic student guild government, and respectful fellowship for SDA, Anglican, Catholic, and Muslim students.',
      highlights: ['Student Guild Government', 'Spiritual Gatherings', 'Community Health Ministry'],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#00873E] selection:text-white">
      <RcsnNavbar onOpenAdmissions={() => setAdmissionsOpen(true)} />

      <main className="flex-1">
        {/* Header - Solid Dark Slate */}
        <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/rcsn/hostels.jpg"
              alt="Hostels"
              className="w-full h-full object-cover brightness-50"
            />
            <div className="absolute inset-0 bg-slate-950/85" />
          </div>

          <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="max-w-4xl space-y-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-emerald-400 text-sm font-bold uppercase tracking-wider">
                <Building2 className="w-4 h-4" />
                <span>Campus Life</span>
              </span>
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
                Campus Facilities & Student Life
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-normal">
                A disciplined, supportive educational setting in Rakai Town designed to support nursing and midwifery
                trainees throughout their academic stay.
              </p>
            </div>
          </div>
        </section>

        {/* Pillars Grid */}
        <section className="py-20 lg:py-24 bg-white dark:bg-slate-900">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="space-y-20">
              {pillars.map((p) => (
                <div
                  key={p.title}
                  id={p.id}
                  className="scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center"
                >
                  <div className="lg:col-span-6 space-y-5">
                    <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                      Facility & Environment
                    </span>
                    <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                      {p.title}
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                      {p.desc}
                    </p>

                    <div className="space-y-3 pt-3">
                      {p.highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm sm:text-base text-slate-800 dark:text-slate-200">
                          <CheckCircle2 className="w-5 h-5 text-[#00873E] shrink-0" />
                          <span className="font-semibold">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 aspect-[16/10]">
                      <img
                        src={p.image}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-20 text-center">
              <button
                type="button"
                onClick={() => setAdmissionsOpen(true)}
                className="inline-flex items-center gap-3 px-9 py-4 rounded-2xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-base shadow-lg transition-colors"
              >
                <GraduationCap className="w-6 h-6" />
                <span>Apply for Admission</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <RcsnFooter />
      <AdmissionsModal isOpen={admissionsOpen} onClose={() => setAdmissionsOpen(false)} />
    </div>
  );
}
