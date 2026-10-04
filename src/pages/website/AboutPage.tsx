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

  const objectives = [
    'Contribute substantially to the improvement of health indices across Uganda and East Africa.',
    'Promote population health with particular emphasis on Primary Health Care (PHC) and community wellness.',
    'Alleviate the national shortage of qualified nurses and midwives, improving patient-to-health-worker ratios.',
    'Actively reduce the burden of infectious diseases, notably HIV/AIDS and malaria, through preventive community outreach.',
    'Produce ethical health workers equipped with leadership competencies to participate in healthcare policy formulation.',
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <SeoHead
        title="About Us | Rakai Community School of Nursing (RCSN)"
        description="Discover the history, mission, leadership, and Christian values of Rakai Community School of Nursing, founded in 2003 in Rakai District, Uganda. Over 10,000 health graduates."
        canonicalPath="/about"
        image="https://rcsn.vercel.app/images/rcsn/rcsn-campus-panoramic.webp"
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

        {/* Founding Story & Mission */}
        <section id="history" className="scroll-mt-28 py-20 lg:py-24 bg-white dark:bg-slate-900">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block">
                  Our Origins
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Born from Community Need and Faith
                </h2>
                <div className="space-y-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  <p>
                    Rakai Community School of Nursing (RCSN) is a health training institution that was established in{' '}
                    <span className="font-bold text-slate-900 dark:text-white">2003</span> through the collaborative
                    efforts of the <span className="font-bold text-slate-900 dark:text-white">Seventh-day Adventist (SDA) Church Community of Rakai</span>,
                    the <span className="font-bold text-slate-900 dark:text-white">Rakai District Local Government Council</span>,
                    and committed community leaders who recognized the urgent need for dedicated health workers in the region.
                  </p>
                  <p>
                    Over more than two decades, the school has developed into a reputable fountain of healthcare training,
                    having graduated over 10,000 healthcare professionals and hosted more than 6 successful national
                    graduation ceremonies.
                  </p>
                  <p>
                    The institution is duly registered and accredited by the{' '}
                    <span className="font-bold text-slate-900 dark:text-white">Ministry of Education and Sports (MoES)</span>,
                    <span className="font-bold text-slate-900 dark:text-white">BTVET (ME\VOC\071)</span>, the{' '}
                    <span className="font-bold text-slate-900 dark:text-white">Uganda Nurses and Midwives Council (UNMC)</span>, and
                    operates as an official examination center for the{' '}
                    <span className="font-bold text-slate-900 dark:text-white">Uganda Nurses and Midwives Examinations Board (UNMEB Center U028)</span>.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap gap-4">
                  <button
                    type="button"
                    onClick={() => setAdmissionsOpen(true)}
                    className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-base shadow-lg transition-colors"
                  >
                    <GraduationCap className="w-5 h-5" />
                    <span>Apply for Admissions</span>
                  </button>
                  <Link
                    to="/courses"
                    className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-base hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
                    className="w-full h-80 sm:h-96 lg:h-[480px] object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                      Official Student Cohort
                    </span>
                    <h3 className="text-xl font-bold">Nursing & Midwifery Trainees at Rakai Campus</h3>
                    <p className="text-sm text-slate-200 mt-1">
                      Enrolled in nationally accredited Certificate and Diploma nursing curricula under UNMEB standards.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Institutional Leadership & Administrative Stewardship */}
        <section id="leadership" className="scroll-mt-28 py-20 lg:py-24 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                Governance & Staff
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                Institutional Leadership & Administration
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
                Meet the dedicated academic and administrative leaders ensuring the highest standards of professional training, ethical conduct, and student welfare.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Card 1: Office of the Principal */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col">
                <div className="h-64 sm:h-72 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-principal-office.webp"
                    alt="The Principal in the Office of the Principal"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Office of the Principal
                    </span>
                  </div>
                </div>
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-[#00873E] tracking-wider block mb-1">
                      Institutional Head
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Office of the Principal
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      Providing strategic institutional leadership, upholding healthcare ethics, overseeing academic and clinical excellence, and nurturing every nursing and midwifery trainee.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500">
                    The Principal • Head of Institution
                  </div>
                </div>
              </div>

              {/* Card 2: Academic Registrar's Office */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col">
                <div className="h-64 sm:h-72 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-academic-registrar-office.webp"
                    alt="The Academic Registrar in the Academic Registrar's Office"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Academic Registrar
                    </span>
                  </div>
                </div>
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-[#00873E] tracking-wider block mb-1">
                      Admissions & Records
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Office of the Academic Registrar
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      Coordinating admissions, student enrollment, academic transcripts, UNEB/UNMEB registration, and certification records for all nursing and midwifery trainees.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500">
                    The Academic Registrar • Academic Registrar's Office
                  </div>
                </div>
              </div>

              {/* Card 3: Academic Administration & Tutors */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col">
                <div className="h-64 sm:h-72 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-faculty-leadership.webp"
                    alt="Academic Leadership and Administration Team outside Administration Block"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Administration Block
                    </span>
                  </div>
                </div>
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-[#00873E] tracking-wider block mb-1">
                      Academic Leadership
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Academic Administration & Tutors
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      Dedicated academic leadership team coordinating curriculum delivery, hospital clinical rotations, and UNMEB national examinations.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500">
                    Deputy Principal • Academic Administration • Director of Studies
                  </div>
                </div>
              </div>

              {/* Card 4: School Bursar */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col">
                <div className="h-64 sm:h-72 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-bursar-office.webp"
                    alt="School Bursar at the Bursar's Office Desk"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Bursar's Office
                    </span>
                  </div>
                </div>
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-[#00873E] tracking-wider block mb-1">
                      Student Accounts
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Bursar's Office & Finance Desk
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      A welcoming and helpful office always ready to assist students and parents with school fees, payment receipts, and financial guidance.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500">
                    Friendly Assistance • Student Inquiries Welcome
                  </div>
                </div>
              </div>

              {/* Card 5: Head Librarian */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col">
                <div className="h-64 sm:h-72 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-librarian-portrait.webp"
                    alt="Head Librarian at the Learning Resource Center"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      School Library
                    </span>
                  </div>
                </div>
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-[#00873E] tracking-wider block mb-1">
                      Study & Research
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Head Librarian & Library Desk
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      Helping students find textbooks, revision materials, and study resources to support their day-to-day classwork and research.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500">
                    Medical Books • Quiet Study Help
                  </div>
                </div>
              </div>

              {/* Card 6: Student Mentorship & Chaplaincy */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col">
                <div className="h-64 sm:h-72 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-chaplain-cohort.webp"
                    alt="Student Cohort with Mentor outside Chaplain's Office"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Chaplain's Office
                    </span>
                  </div>
                </div>
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-xs font-bold uppercase text-[#00873E] tracking-wider block mb-1">
                      Spiritual Care & Guidance
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Chaplaincy & Student Mentorship
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                      Providing guidance, prayer, and personal encouragement to help students grow morally and spiritually as caring healthcare workers.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500">
                    Friendly Counseling • Moral Guidance
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

        {/* Strategic Objectives */}
        <section id="objectives" className="scroll-mt-28 py-20 lg:py-24 bg-emerald-950 text-white">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="max-w-4xl space-y-6">
              <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest block">
                Impact & Contribution
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Strategic Healthcare Objectives
              </h2>
              <p className="text-base sm:text-lg text-emerald-200/90 leading-relaxed">
                Beyond classroom training, RCSN is actively involved in strengthening Uganda's public health delivery:
              </p>

              <div className="space-y-4 pt-2">
                {objectives.map((obj, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 p-5 rounded-2xl bg-emerald-900/60 border border-emerald-800/60"
                  >
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-base text-emerald-100 leading-relaxed">{obj}</span>
                  </div>
                ))}
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
