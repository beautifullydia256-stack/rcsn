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
      id: 'guild',
      title: 'Student Guild Council & Democratic Leadership',
      category: 'Student Government',
      image: '/images/rcsn/rcsn-student-guild.webp',
      badge: 'Guild Cabinet',
      desc: 'RCSN fosters ethical leadership through a fully recognized, democratically elected Student Guild Government. Guild ministers represent student interests in academic policy, health welfare, religious activities, sports, and community outreach.',
      highlights: [
        'Guild President, Prime Minister & Cabinet Ministers',
        'Liaison with School Administration & UNMC Student Body',
        'Organizes Community Health Weeks & Blood Donation Drives',
        'Student Advocacy, Peer Support & Disciplinary Representation'
      ],
      reverse: false,
    },
    {
      id: 'sports',
      title: 'Recreation, Athletics & Women\'s Volleyball',
      category: 'Sports & Wellness',
      image: '/images/rcsn/rcsn-sports-volleyball.webp',
      badge: 'Volleyball & Athletics',
      desc: 'Physical vitality and teamwork are essential for future nursing professionals. RCSN fields competitive sports teams—including our acclaimed Women\'s Volleyball Squad—competing in inter-institutional games across the Greater Masaka and Rakai sports circuits.',
      highlights: [
        'Competitive Women\'s Volleyball & Netball Teams',
        'Inter-Class Tournaments & Athletics Competitions',
        'Spacious Grass Sports Pitch & Outdoor Recreation Courts',
        'Promoting Physical Fitness, Team Spirit & Mental Wellness'
      ],
      reverse: true,
    },
    {
      id: 'library',
      title: 'Modern Medical Library & Reference Stacks',
      category: 'Academic Facilities',
      image: '/images/rcsn/rcsn-students-library.webp',
      badge: 'Resource Center',
      desc: 'Our expansive campus library provides a quiet, focused scholarly sanctuary. Stocked with thousands of medical, pharmacology, surgical, and midwifery reference volumes, the library also features digital workstations and e-learning resources.',
      highlights: [
        'Organized Stacks: Pharmacology, Psychiatry, Surgery & Midwifery',
        'Dedicated Tutor-Guided Research & Digital Laptop Stations',
        'Quiet Study Desks for Examination Preparation',
        'Supervised by Certified Professional Librarian'
      ],
      reverse: false,
    },
    {
      id: 'hostels',
      title: 'Residential Hostels & Elizabeth Lecture Hall Walkways',
      category: 'Living Accommodations',
      image: '/images/rcsn/rcsn-campus-signpost.webp',
      badge: 'Hostels & Grounds',
      desc: 'Safe, gated residential accommodation is provided on campus with distinct wings for female and male nursing trainees. Prominent stone walkways connect residential wings directly to lecture halls, dining areas, and administrative blocks.',
      highlights: [
        'Dedicated Girls Wing No 2 & Boys Residential Blocks',
        'Elizabeth Lecture Hall & Adjacent Training Wings',
        '24/7 Gated Security & Resident Matron / Patron Oversight',
        'Reliable Piped Water, Solar Power & Emergency Backup'
      ],
      reverse: true,
    },
    {
      id: 'gardens',
      title: 'Botanical Grounds, Walkways & Information Center',
      category: 'Campus Environment',
      image: '/images/rcsn/rcsn-campus-gardens.webp',
      badge: 'Serene Grounds',
      desc: 'Set amidst southwestern Uganda\'s rolling landscapes, RCSN offers lush green compounds with paved stone paths, mature shade trees, and an Information Centre that warmly welcomes visitors, students, and clinical supervisors.',
      highlights: [
        'Paved Stone Walkways Connecting All Academic Buildings',
        'Lush Botanical Hedges & Shaded Outdoor Study Pavilions',
        'Welcoming Campus Information & Security Gate Post',
        'Fresh Air & Peaceful Atmosphere Conducive to Deep Study'
      ],
      reverse: false,
    },
    {
      id: 'dining',
      title: 'Dining Hall & Daily Clinical Assemblies',
      category: 'Student Community',
      image: '/images/rcsn/rcsn-hall-briefing.webp',
      badge: 'Community Life',
      desc: 'The campus dining and assembly hall is the heartbeat of student fellowship. In addition to daily nutritious student meals, it hosts morning clinical roll calls, procedural briefings, pastoral devotions, and cohort announcements.',
      highlights: [
        'Nutritious Balanced Meals Prepared by Dedicated Kitchen Staff',
        'Morning Roll Calls & Ward Assignment Briefings by Clinical Tutors',
        'Cohort Fellowship, Spiritual Songs & Announcements',
        'Spacious, Clean Seating for Over 300 Students'
      ],
      reverse: true,
    },
    {
      id: 'cohort',
      title: 'Vibrant Cohort Community & Campus Movement',
      category: 'Student Experience',
      image: '/images/rcsn/rcsn-students-walking.webp',
      badge: 'Student Community',
      desc: 'From early morning rotations to evening study sessions, the RCSN campus pulses with purposeful activity. Trainees form lifelong bonds of camaraderie, mutual academic support, and shared commitment to compassionate healthcare.',
      highlights: [
        'Close-Knit Trainee Camaraderie Across Certificate & Diploma',
        'Peer Study Groups & Clinical Skill Exchange Sessions',
        'Community Health Outreaches in Rakai Villages & Schools',
        'Professional Discipline, Uniform Etiquette & Ethical Pride'
      ],
      reverse: false,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#00873E] selection:text-white">
      <RcsnNavbar onOpenAdmissions={() => setAdmissionsOpen(true)} />

      <main className="flex-1">
        {/* Header - Panoramic Campus Vista */}
        <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/rcsn/rcsn-campus-panoramic.webp"
              alt="Panoramic View of Rakai Community School of Nursing Campus"
              className="w-full h-full object-cover brightness-50"
            />
            <div className="absolute inset-0 bg-slate-950/85" />
          </div>

          <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="max-w-4xl space-y-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/80 border border-emerald-500/40 text-emerald-400 text-sm font-bold uppercase tracking-wider backdrop-blur-md">
                <Building2 className="w-4 h-4" />
                <span>Life at Rakai Campus</span>
              </span>
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
                Campus Facilities & Student Life
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-normal">
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
                    Boarding & Day Scholars
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

        {/* Detailed Campus Features */}
        <section className="py-20 lg:py-24 bg-white dark:bg-slate-900">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="space-y-24">
              {campusFeatures.map((f) => (
                <div
                  key={f.id}
                  id={f.id}
                  className={`scroll-mt-28 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center ${
                    f.reverse ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  <div className={`lg:col-span-6 space-y-5 ${f.reverse ? 'lg:order-2' : 'lg:order-1'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest">
                        {f.category}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                        {f.badge}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                      {f.title}
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                      {f.desc}
                    </p>

                    <div className="space-y-3 pt-3">
                      {f.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm sm:text-base text-slate-800 dark:text-slate-200">
                          <CheckCircle2 className="w-5 h-5 text-[#00873E] shrink-0 mt-0.5" />
                          <span className="font-semibold">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`lg:col-span-6 ${f.reverse ? 'lg:order-1' : 'lg:order-2'}`}>
                    <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 aspect-[16/11] relative group">
                      <img
                        src={f.image}
                        alt={f.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Library Supporting Photo Desk */}
            <div className="mt-20 pt-16 border-t border-slate-200 dark:border-slate-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-50 dark:bg-slate-800/60 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-700">
                <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 h-72">
                  <img
                    src="/images/rcsn/rcsn-librarian-desk.webp"
                    alt="Library Medical Reference Desk and Shelves"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-4">
                  <span className="text-xs font-bold text-[#00873E] uppercase tracking-wider block">
                    Learning Resource Center
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    Supervised Reference Stacks & Clinical Textbooks
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                    Our library circulation desk gives students immediate access to the latest medical curriculum guidelines, nursing care plans, and anatomy atlases.
                  </p>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Open Monday to Friday 7:00 AM – 9:00 PM • Weekend Study Hours
                  </div>
                </div>
              </div>
            </div>

            {/* Call to action */}
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
