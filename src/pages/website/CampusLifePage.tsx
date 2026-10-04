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
      title: 'Modern Student Hostels & Residential Quarters',
      category: 'Living on Campus',
      image: '/images/rcsn/rcsn-modern-hostels.webp',
      badge: 'Modern Residential Hostels',
      desc: 'We provide safe, clean, and comfortable hostels right on campus for both female and male nursing students. Paved stone verandas and walkways connect residential quarters directly to lecture rooms, the library, and clinical spaces under 24/7 security.',
      highlights: [
        'Clean, well-maintained rooms for female and male trainees',
        'Resident matron, warden, and 24/7 security guards on duty',
        'Paved stone walkways connecting hostel wings to campus facilities',
        'Reliable water, backup power, and clean dining facilities'
      ],
      reverse: false,
    },
    {
      id: 'gardens',
      title: 'School Compound & Green Environment',
      category: 'Campus Environment',
      image: '/images/rcsn/compound.webp',
      badge: 'Quiet & Green Compound',
      desc: 'Our campus offers a clean, green, and spacious environment with pleasant compound grounds, shade trees, and paved paths. Students have plenty of quiet outdoor space to sit, review class notes, take fresh air, and relax between lessons.',
      highlights: [
        'Spacious, well-kept green compound with paved stone walkways',
        'Peaceful and quiet surroundings ideal for reading and rest',
        'Friendly campus gate and information desk for visitors',
        'Safe, gated compound located in Rakai Town'
      ],
      reverse: true,
    },
    {
      id: 'lecture-halls',
      title: 'Spacious Lecture & Assembly Halls',
      category: 'Academic Facilities',
      image: '/images/rcsn/lecture-hall.webp',
      badge: 'Lecture Halls',
      desc: 'Well-ventilated learning environments designed for focused lectures, clinical seminars, multimedia presentations, and academic group study under experienced nurse educators.',
      highlights: [
        'Clean, comfortable lecture seating for focused instruction',
        'Audio-visual presentation equipment & tutorial facilities',
        'Conducive spaces for term examinations and UNMEB preparation',
        'Supervised evening study sessions and peer discussions'
      ],
      reverse: false,
    },
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
      reverse: true,
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
      reverse: false,
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
      reverse: true,
    },
    {
      id: 'dining',
      title: 'Campus Dining Hall & Multipurpose Complex',
      category: 'Student Community',
      image: '/images/rcsn/rcsn-dining-hall.webp',
      badge: 'Dining & Campus Complex',
      desc: 'The campus dining hall and multipurpose complex brings students together every day for nutritious meals, morning clinical announcements, and community fellowship in a welcoming, modern facility.',
      highlights: [
        'Hot, nutritious meals served daily by dedicated kitchen staff',
        'Morning briefings and hospital ward assignments from tutors',
        'Community devotions, encouragement, and announcements',
        'Spacious, clean dining hall with comfortable seating'
      ],
      reverse: false,
    },
    {
      id: 'water-supply',
      title: 'Reliable Clean Water Supply & Solar Backup',
      category: 'Utilities & Health Hygiene',
      image: '/images/rcsn/rcsn-water-supply.webp',
      badge: '24/7 Water Security',
      desc: 'Clean, reliable running water is essential for student wellbeing, clinical sanitation, and uninterrupted daily living. RCSN maintains high-capacity reserve water storage tanks with solar-powered pumping systems, ensuring constant, uninterrupted clean water throughout the year across student hostels, dining kitchens, and practical skills laboratories.',
      highlights: [
        'High-capacity reserve water storage tanks ensuring 24/7 clean supply',
        'Solar-powered backup pumping stations that operate even during power outages',
        'Constant water for student hostels, hot meal preparations, and personal hygiene',
        'Strict health, hygiene, and hospital-grade infection-prevention standards'
      ],
      reverse: true,
    },
    {
      id: 'cohort',
      title: 'Student Life & Friendship on Campus',
      category: 'Student Life',
      image: '/images/rcsn/rcsn-students-walking.webp',
      badge: 'Campus Community',
      desc: 'At Rakai Community School of Nursing, students live and study together as one family. Through class discussions, sports, and daily campus life, trainees build lifelong friendships and learn the true spirit of teamwork and compassionate healthcare.',
      highlights: [
        'Supportive friendships across Certificate and Diploma classes',
        'Group revision sessions to help each other succeed',
        'Community health outreaches and volunteer activities',
        'A friendly, respectful, and disciplined school culture'
      ],
      reverse: false,
    },
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
