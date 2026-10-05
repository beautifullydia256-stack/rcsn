import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  BookOpen,
  Calendar,
  Building2,
  Users,
  HeartPulse,
  Clock,
  ArrowRight,
  GraduationCap,
  ChevronRight,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import AdmissionsModal from '@/components/website/AdmissionsModal';
import SeoHead from '@/components/website/SeoHead';

export default function AboutPage() {
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

  const coreValues = [
    { title: 'God Fearing', desc: 'Grounding healthcare practice in moral reverence, spiritual humility, and compassionate Christian values.' },
    { title: 'Honesty & Reliability', desc: 'Uncompromising truthfulness in clinical reporting, medication dispensing, and patient management.' },
    { title: 'Respectfulness', desc: 'Treating every patient, guardian, colleague, and community member with utmost dignity and empathy.' },
    { title: 'Accountability', desc: 'Taking full ownership of professional actions, clinical decisions, and institutional stewardship.' },
    { title: 'Ethics & Professionalism', desc: 'Adhering strictly to the Uganda Nurses and Midwives Code of Conduct and international medical ethics.' },
  ];


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <SeoHead
        title="About Us | Accredited Nursing School in Rakai Uganda — RCSN History & Leadership"
        description="Discover the 20+ year history, leadership, and SDA Christian values of Rakai Community School of Nursing in Uganda. Founded in 2003 with over 10,000 health graduates."
        canonicalPath="/about"
        image="https://www.rcsn.ac.ug/images/rcsn/rcsn-campus-panoramic.webp"
        imageAlt="Rakai Community School of Nursing Campus Vista"
      />
      <RcsnNavbar onOpenAdmissions={() => setAdmissionsOpen(true)} />

      <main className="flex-1">
        {/* Page Header */}
        <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/rcsn/rcsn-campus-panoramic.webp"
              alt="Panoramic View of Rakai Community School of Nursing Campus"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/65 to-slate-950/45" />
          </div>

          <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="max-w-4xl space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                About Rakai Community School of Nursing
              </h1>
              <p className="text-lg sm:text-xl text-slate-200 leading-relaxed font-normal drop-shadow">
                Founded through visionary community collaboration in Rakai District, RCSN has grown into a distinguished
                center of academic and clinical excellence in Uganda.
              </p>
            </div>
          </div>
        </section>

        {/* Founding Story & Fast Facts */}
        <section id="history" className="scroll-mt-28 py-16 lg:py-20 bg-white dark:bg-slate-900">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                    Institutional Heritage
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Rooted in Service, Faith & Clinical Excellence
                  </h2>
                </div>

                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  Established in 2003 through community and SDA leadership, RCSN is a premier health training institution accredited by the Ministry of Education and Sports (ME\VOC\071), UNMC, and UNMEB (Center U028), having trained over 10,000 certified healthcare professionals across Uganda.
                </p>

                {/* 4 Fast-Facts Badges */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                    <span className="text-2xl font-black text-[#00873E] dark:text-emerald-400 block">Est. 2003</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">20+ Years Health Training</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                    <span className="text-2xl font-black text-[#00873E] dark:text-emerald-400 block">10,000+</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Graduated Nurses & Midwives</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                    <span className="text-2xl font-black text-[#00873E] dark:text-emerald-400 block">Center U028</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">UNMEB Examination Center</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                    <span className="text-2xl font-black text-[#00873E] dark:text-emerald-400 block">7 Hospitals</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Clinical Ward Rotations</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => setAdmissionsOpen(true)}
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-base shadow-lg transition-colors"
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span>Apply for Admissions</span>
                  </button>
                  <Link
                    to="/courses"
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-base hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span>View Academic Courses</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Real Cohort Photo */}
              <div className="lg:col-span-6">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 group">
                  <img
                    src="/images/rcsn/rcsn-nursing-cohort-main.webp"
                    alt="RCSN Nursing & Midwifery Trainees in Official Teal Uniforms"
                    className="w-full h-80 sm:h-96 lg:h-[440px] object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                      Official Student Cohort
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold">Nursing & Midwifery Trainees at Rakai Campus</h3>
                    <p className="text-xs sm:text-sm text-slate-200 mt-1">
                      Nationally accredited Certificate and Diploma nursing trainees under UNMEB standards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Institutional Leadership & Administration */}
        <section id="leadership" className="scroll-mt-28 py-16 lg:py-20 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <span className="text-xs font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                Governance & Staff
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Institutional Leadership & Administration
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Guiding academic rigor, clinical supervision, and student welfare across all nursing cohorts.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Card 1: Office of the Principal */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col group">
                <div className="h-60 sm:h-64 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-principal-office.webp"
                    alt="The Principal in the Office of the Principal"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Head of Institution
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Office of the Principal
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Overseeing institutional strategy, healthcare ethics, and academic excellence.
                    </p>
                  </div>
                  <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500">
                    The Principal • Executive Leadership
                  </div>
                </div>
              </div>

              {/* Card 2: Academic Registrar's Office */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col group">
                <div className="h-60 sm:h-64 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-academic-registrar-office.webp"
                    alt="The Academic Registrar in the Academic Registrar's Office"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Admissions Desk
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Academic Registrar's Office
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Coordinating admissions, student records, enrollment, and UNMEB examination certification.
                    </p>
                  </div>
                  <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500">
                    The Academic Registrar • Records & Admissions
                  </div>
                </div>
              </div>

              {/* Card 3: Academic Administration & Tutors */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col group">
                <div className="h-60 sm:h-64 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-faculty-leadership.webp"
                    alt="Academic Leadership and Administration Team outside Administration Block"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Academic Tutors
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Academic Administration & Tutors
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Leading clinical curriculum delivery, hospital rotations, and laboratory demonstrations.
                    </p>
                  </div>
                  <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500">
                    Director of Studies • Clinical Tutors Team
                  </div>
                </div>
              </div>

              {/* Card 4: School Bursar */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col group">
                <div className="h-60 sm:h-64 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-bursar-office.webp"
                    alt="School Bursar at the Bursar's Office Desk"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Student Accounts
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Bursar's Office & Accounts Desk
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Assisting students and guardians with fee structures, bank payments, and receipts.
                    </p>
                  </div>
                  <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500">
                    The Bursar • Finance Office
                  </div>
                </div>
              </div>

              {/* Card 5: Head Librarian */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col group">
                <div className="h-60 sm:h-64 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-librarian-portrait.webp"
                    alt="Head Librarian at the Learning Resource Center"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Resource Center
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Head Librarian & Study Desk
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Curating medical textbooks, clinical journals, and digital research resources.
                    </p>
                  </div>
                  <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500">
                    Medical Library • Student Research
                  </div>
                </div>
              </div>

              {/* Card 6: Student Mentorship & Chaplaincy */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md flex flex-col group">
                <div className="h-60 sm:h-64 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-chaplain-cohort.webp"
                    alt="Student Cohort with Mentor outside Chaplain's Office"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Student Welfare
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      Chaplaincy & Student Guidance
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Fostering spiritual growth, compassionate values, and personal student mentorship.
                    </p>
                  </div>
                  <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-500">
                    Chaplain • Pastoral Mentorship
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* Vision & Mission Cards */}
        <section id="vision-mission" className="scroll-mt-28 py-20 lg:py-24 bg-slate-100 dark:bg-slate-950 border-y border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-[#00873E] dark:text-emerald-400 flex items-center justify-center mb-5">
                  <Building2 className="w-7 h-7" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
                  Our Institutional Vision
                </h3>
                <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  "A fountain of health training in the country and region."
                </p>
              </div>

              <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-5">
                  <HeartPulse className="w-7 h-7" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-3">
                  Our Institutional Mission
                </h3>
                <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  "To impart cognitive, clinical, and professional competencies to health trainees so as to offer
                  comprehensive healthcare to the communities they serve."
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section id="values" className="scroll-mt-28 py-20 lg:py-24 bg-white dark:bg-slate-900">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                Our Ethical Foundation
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                Core Institutional Values
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
                These principles guide every lecture, bedside rotation, and institutional decision at Rakai Community
                School of Nursing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {coreValues.map((v) => (
                <div
                  key={v.title}
                  className="p-7 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {v.title}
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Strategic Healthcare Focus */}
        <section id="objectives" className="scroll-mt-28 py-16 bg-slate-900 text-white">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">
                Healthcare Impact
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Institutional Objectives & Community Service
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <h4 className="text-base font-bold text-white">Alleviate Staff Shortages</h4>
                <p className="text-xs text-slate-300">Graduating certified nurses and midwives to strengthen regional health centers.</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <h4 className="text-base font-bold text-white">Primary Healthcare Focus</h4>
                <p className="text-xs text-slate-300">Deep practical training in maternal-child health and rural community wellness.</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <h4 className="text-base font-bold text-white">Disease Prevention</h4>
                <p className="text-xs text-slate-300">Community outreach combating infectious diseases and promoting hygiene.</p>
              </div>
              <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <h4 className="text-base font-bold text-white">Ethical Leadership</h4>
                <p className="text-xs text-slate-300">Producing principled healthcare workers grounded in Christian compassion.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Campus Location & Map Directions */}
        <section id="geography" className="scroll-mt-28 py-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="p-8 sm:p-12 rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="space-y-3">
                <span className="text-sm font-bold text-[#00873E] uppercase tracking-wider block">
                  Campus Geography
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Located in Rakai Town Council, Southwestern Uganda
                </h3>
                <p className="text-base text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  Our main teaching campus is situated off Rakai–Byakabanda Road near Rakai General Hospital. View
                  the complete geographic coordinates, interactive map, and driving directions.
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0 flex-wrap">
                <Link
                  to="/campus-life"
                  className="inline-flex items-center gap-2.5 px-6 py-4 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-[#00873E] text-slate-800 dark:text-white text-base font-bold shadow-sm transition-colors"
                >
                  <Building2 className="w-5 h-5 text-[#00873E]" />
                  <span>Campus Facilities</span>
                </Link>
                <Link
                  to="/contact#map"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-[#00873E] hover:bg-[#007033] text-white text-base font-bold shadow-md transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                  <span>View Official Campus Map</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <RcsnFooter />
      <AdmissionsModal isOpen={admissionsOpen} onClose={() => setAdmissionsOpen(false)} />
    </div>
  );
}
