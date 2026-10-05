import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Building2,
  Users,
  ShieldCheck,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  Trophy,
  HeartPulse,
  Sun,
  MapPin,
  Sparkles
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import AdmissionsModal from '@/components/website/AdmissionsModal';
import SeoHead from '@/components/website/SeoHead';

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

  const campusFeatures = [
    {
      id: 'hostels',
      title: 'Modern Residential Hostels',
      category: 'Living on Campus',
      image: '/images/rcsn/rcsn-modern-hostels.webp',
      badge: 'Residential Wings',
      desc: 'Clean, secure on-campus hostels for female and male trainees with resident wardens and paved stone walkways.',
      tags: ['24/7 Security', 'Resident Wardens', 'Paved Verandas']
    },
    {
      id: 'gardens',
      title: 'Green Compound & Walkways',
      category: 'Campus Grounds',
      image: '/images/rcsn/compound.webp',
      badge: 'Serene Grounds',
      desc: 'Quiet, shaded campus spaces with paved paths, manicured lawns, and trees ideal for outdoor study and relaxation.',
      tags: ['Spacious Lawns', 'Paved Walkways', 'Gated Security']
    },
    {
      id: 'lecture-halls',
      title: 'Spacious Lecture & Assembly Halls',
      category: 'Academic Spaces',
      image: '/images/rcsn/lecture-hall.webp',
      badge: 'Learning Theatres',
      desc: 'Well-ventilated academic halls equipped with multimedia presentation tools for clinical seminars and lectures.',
      tags: ['Audio-Visual Systems', 'Clean Seating', 'Study Sessions']
    },
    {
      id: 'guild',
      title: 'Student Guild Government',
      category: 'Student Leadership',
      image: '/images/rcsn/rcsn-guild-council-assembly.webp',
      badge: 'Elected Council',
      desc: 'Democratically elected Guild ministers championing student welfare, academic dialogue, and community outreach.',
      tags: ['Cabinet Ministers', 'Advocacy', 'Community Outreach']
    },
    {
      id: 'sports',
      title: "Athletics & Women's Volleyball",
      category: 'Sports & Wellness',
      image: '/images/rcsn/rcsn-sports-volleyball.webp',
      badge: 'Competitive Sports',
      desc: 'Championing physical vitality, mental wellness, and team spirit on our dedicated sports pitch and volleyball court.',
      tags: ['Volleyball Team', 'Sports Pitch', 'Inter-Class Games']
    },
    {
      id: 'library',
      title: 'Medical Reference Library',
      category: 'Academic Resources',
      image: '/images/rcsn/rcsn-students-library.webp',
      badge: 'Study Sanctuary',
      desc: 'Organized stacks of medical textbooks, pharmacology journals, midwifery volumes, and quiet study carrels.',
      tags: ['Medical Reference', 'Quiet Reading', 'Tutor Assisted']
    },
    {
      id: 'dining',
      title: 'Dining Hall & Assembly Complex',
      category: 'Student Life',
      image: '/images/rcsn/rcsn-dining-hall.webp',
      badge: 'Nutritious Meals',
      desc: 'Serving hot, balanced meals daily with spacious seating for communal dining, fellowship, and morning devotions.',
      tags: ['Daily Hot Meals', 'Morning Briefings', 'Communal Hall']
    },
    {
      id: 'water-supply',
      title: '24/7 Solar Water Security',
      category: 'Hygiene & Utilities',
      image: '/images/rcsn/rcsn-water-supply.webp',
      badge: 'Continuous Water',
      desc: 'High-capacity reserve water storage tanks and solar-powered pumps ensure uninterrupted clean running water.',
      tags: ['Solar Pumps', 'Reserve Tanks', 'Hospital Hygiene']
    },
    {
      id: 'cohort',
      title: 'Student Fellowship & Unity',
      category: 'Community',
      image: '/images/rcsn/rcsn-students-walking.webp',
      badge: 'Campus Family',
      desc: 'A warm, inclusive community where nursing trainees build lifelong professional bonds and collaborative spirit.',
      tags: ['Peer Revision', 'Christian Values', 'Diverse Cohorts']
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#00873E] selection:text-white">
      <SeoHead
        title="Campus Facilities, Student Hostels & Student Life | RCSN Rakai Town"
        description="Explore student hostels, medical library, dining complex, 24/7 solar water supply, and recreation grounds at Rakai Community School of Nursing in Uganda."
        canonicalPath="/campus-life"
        image="https://www.rcsn.ac.ug/images/rcsn/hostels.webp"
        imageAlt="RCSN Student Residential Hostels and Walkways"
      />
      <RcsnNavbar onOpenAdmissions={() => setAdmissionsOpen(true)} />

      <main className="flex-1">
        {/* Header - Campus Life */}
        <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/rcsn/hostels.webp"
              alt="RCSN Student Residential Hostels and Walkways"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/65 to-slate-950/45" />
          </div>

          <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="max-w-4xl space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                Campus Facilities & Student Life
              </h1>
              <p className="text-lg sm:text-xl text-slate-200 leading-relaxed font-normal drop-shadow">
                Discover a disciplined, supportive, and vibrant collegiate environment in Rakai Town Council designed to nurture academic brilliance, clinical skills, and moral character.
              </p>
            </div>
          </div>
        </section>

        {/* Full Cohort Hero Banner */}
        <section className="py-12 bg-emerald-950 text-white border-b border-emerald-900">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 rounded-3xl overflow-hidden shadow-2xl border border-emerald-800/80">
                <img
                  src="/images/rcsn/rcsn-nursing-cohort-wide.webp"
                  alt="Full Assembly of RCSN Nursing and Midwifery Students"
                  className="w-full h-72 sm:h-96 object-cover"
                />
              </div>
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 block">
                  The RCSN Family
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  A Unified Body of Compassionate Healers
                </h2>
                <p className="text-sm sm:text-base text-emerald-200/90 leading-relaxed">
                  Students from across Uganda and East Africa come together at Rakai Community School of Nursing, united in uniform, Christian values, and dedication to saving lives.
                </p>
                <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-emerald-300">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Student Community
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Resident Mentors & Matrons
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Safe, Secure Grounds
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Visual Campus Tour Grid */}
        <section className="py-16 lg:py-20 bg-white dark:bg-slate-900">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <span className="text-xs font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                Photo Tour
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Our Campus & Student Facilities
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Explore life at Rakai Community School of Nursing in Rakai Town Council.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {campusFeatures.map((f) => (
                <div
                  key={f.id}
                  id={f.id}
                  className="rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all flex flex-col group"
                >
                  <div className="h-60 sm:h-64 overflow-hidden relative">
                    <img
                      src={f.image}
                      alt={f.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                    <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      {f.badge}
                    </span>
                    <span className="absolute bottom-3 left-3.5 text-xs font-medium text-slate-300">
                      {f.category}
                    </span>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                        {f.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                        {f.desc}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
                      {f.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Library Spotlight Banner */}
            <div className="mt-16 bg-slate-50 dark:bg-slate-800/60 p-6 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-5 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 h-60">
                  <img
                    src="/images/rcsn/rcsn-librarian-desk.webp"
                    alt="Library Medical Reference Desk and Shelves"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="md:col-span-7 space-y-3">
                  <span className="text-xs font-bold text-[#00873E] uppercase tracking-wider block">
                    Learning Resource Center
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    Supervised Reference Stacks & Clinical Textbooks
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Immediate access to national nursing curriculum guidelines, nursing care plans, and anatomy atlases. Open Monday to Friday 7:00 AM – 9:00 PM with weekend study hours.
                  </p>
                </div>
              </div>
            </div>

            {/* Call to action */}
            <div className="mt-14 text-center">
              <button
                type="button"
                onClick={() => setAdmissionsOpen(true)}
                className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-base shadow-lg transition-colors"
              >
                <GraduationCap className="w-5 h-5" />
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
