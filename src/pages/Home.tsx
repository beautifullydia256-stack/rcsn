import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  Award,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle2,
  Building2,
  Stethoscope,
  Send,
  ChevronRight
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import AdmissionsModal from '@/components/website/AdmissionsModal';
import VideoAdvertModal from '@/components/website/VideoAdvertModal';
import SeoHead from '@/components/website/SeoHead';
import { submitContactInquiry } from '@/services/schoolPublicService';

export default function Home() {
  const [admissionsOpen, setAdmissionsOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | undefined>(undefined);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactSubmitting, setContactSubmitting] = useState(false);

  const openAdmissionsWith = (programName?: string) => {
    setSelectedProgram(programName);
    setAdmissionsOpen(true);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;
    setContactSubmitting(true);
    try {
      await submitContactInquiry({
        fullName: contactName,
        email: contactEmail,
        phone: contactPhone || undefined,
        subject: contactSubject || 'General Inquiry',
        message: contactMessage,
      });
      setContactSubmitted(true);
      setContactName('');
      setContactEmail('');
      setContactPhone('');
      setContactSubject('');
      setContactMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setContactSubmitting(false);
    }
  };

  const programs = [
    {
      title: 'Certificate in Nursing',
      duration: '2.5 Years',
      entry: 'UCE minimum passes in Biology, Chemistry, Physics, Mathematics, and English in the same sitting.',
      level: 'Certificate Level',
      career: 'Enrolled Nurse in hospitals, health centres, and community clinics.',
    },
    {
      title: 'Certificate in Midwifery',
      duration: '2.5 Years',
      entry: 'UCE minimum passes in Biology, Chemistry, Physics, Mathematics, and English in the same sitting.',
      level: 'Certificate Level',
      career: 'Enrolled Midwife specializing in maternal, antenatal, and neonatal infant care.',
    },
    {
      title: 'Certificate in Comprehensive Nursing',
      duration: '2.5 Years',
      entry: 'UCE passes in Biology, Chemistry, Mathematics, English, Physics, and related science electives.',
      level: 'Certificate Level',
      career: 'Broad-spectrum primary care nurse equipped for diverse clinical environments.',
    },
    {
      title: 'Diploma in Nursing (Direct)',
      duration: '3 Years',
      entry: 'UCE and UACE Level with a Principal Pass in Biology and two subsidiaries in Chemistry, Physics, or Math.',
      level: 'Diploma Level',
      career: 'Registered Nurse (RN), clinical supervisor, and healthcare administrator.',
    },
    {
      title: 'Diploma in Midwifery (Direct)',
      duration: '3 Years',
      entry: 'UCE and UACE Level with a Principal Pass in Biology and two subsidiaries in Chemistry, Physics, or Math.',
      level: 'Diploma Level',
      career: 'Registered Midwife (RM), maternity ward supervisor, and community reproductive specialist.',
    },
    {
      title: 'Diploma in Nursing / Midwifery (Extension)',
      duration: '1.5 Years',
      entry: 'Valid Certificate in Nursing or Midwifery with active UNMC registration and minimum 2 years field practice.',
      level: 'Extension Diploma',
      career: 'Advanced practice nurse or midwife with supervisory and departmental authority.',
    },
  ];

  const hospitalPartners = [
    {
      name: 'Rakai General Hospital',
      location: 'Rakai Town Council (Host Hospital)',
      image: '/images/hospitals/rakai.jpg',
    },
    {
      name: 'Masaka Regional Referral Hospital',
      location: 'Masaka City (Referral Partner)',
      image: '/images/hospitals/masaka.jpg',
    },
    {
      name: 'Kalisizo General Hospital',
      location: 'Kyotera District',
      image: '/images/hospitals/kalisizo.jpg',
    },
    {
      name: 'Lyantonde General Hospital',
      location: 'Lyantonde District',
      image: '/images/hospitals/lyantonde.jpg',
    },
    {
      name: 'Mubende Regional Referral Hospital',
      location: 'Mubende District',
      image: '/images/hospitals/mubende.jpg',
    },
    {
      name: 'Kitovu Hospital (St. Joseph’s)',
      location: 'Masaka District',
      image: '/images/hospitals/kitovu.jpg',
    },
    {
      name: 'Kakuto Health Centre IV',
      location: 'Rakai District',
      image: '/images/hospitals/kakuuto.jpg',
    },
  ];

  const facilities = [
    {
      title: 'Skills Demonstration Laboratory',
      category: 'Practical Skills',
      image: '/images/rcsn/lab.webp',
      desc: 'Equipped with hospital beds, anatomical mannequins, and clinical demonstration equipment for hands-on nursing practice.',
    },
    {
      title: 'Modern Student Hostels',
      category: 'Student Hostels',
      image: '/images/rcsn/rcsn-modern-hostels.webp',
      desc: 'Safe, comfortable on-campus residential accommodation for nursing trainees with paved verandas, resident wardens, and 24/7 security.',
    },
    {
      title: 'Campus Dining Hall & Complex',
      category: 'Dining & Student Hall',
      image: '/images/rcsn/rcsn-dining-hall.webp',
      desc: 'Spacious campus dining hall and assembly center where trainees share nutritious meals and attend daily briefings.',
    },
    {
      title: 'Spacious Lecture Halls',
      category: 'Academic Facilities',
      image: '/images/rcsn/lecture-hall.webp',
      desc: 'Clean, well-ventilated lecture rooms designed for focused academic instruction, seminars, and examinations.',
    },
    {
      title: 'School Compound & Green Environment',
      category: 'Campus Grounds',
      image: '/images/rcsn/compound.webp',
      desc: 'A serene, peaceful campus environment with green lawns and paved walkways conducive to reading and fellowship.',
    },
    {
      title: 'School Library & Study Room',
      category: 'Library & Research',
      image: '/images/rcsn/rcsn-students-library.webp',
      desc: 'A quiet scholarly sanctuary with medical textbooks, study tables, reference journals, and research workstations.',
    },
    {
      title: 'Student Guild Council',
      category: 'Student Leadership',
      image: '/images/rcsn/rcsn-student-guild.webp',
      desc: 'Elected student leaders who represent student interests and organize sports, spiritual devotions, and campus activities.',
    },
    {
      title: 'Volleyball & Student Games',
      category: 'Sports & Wellness',
      image: '/images/rcsn/rcsn-sports-volleyball.webp',
      desc: 'Students enjoy friendly volleyball, netball, and athletics matches on campus to stay active and healthy.',
    },
    {
      title: 'Campus Architecture & Administration',
      category: 'Campus Facilities',
      image: '/images/rcsn/rcsn-campus-architecture.webp',
      desc: 'Modern campus administration blocks, Principal’s office, and student service centers in Rakai Town.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#00873E] selection:text-white">
      <SeoHead
        title="Rakai Community School of Nursing (RCSN) — Health Care Training in Uganda"
        description="Official website of Rakai Community School of Nursing. Accredited Certificate and Diploma programs in Nursing and Midwifery examined by UNMEB (Center U028). Hands-on clinical skills training in Rakai Town, Uganda."
        canonicalPath="/"
        image="https://rcsn.vercel.app/images/rcsn/compound.webp"
        imageAlt="Rakai Community School of Nursing Campus Compound and Walkways"
      />
      {/* Navigation Bar */}
      <RcsnNavbar onOpenAdmissions={() => openAdmissionsWith()} />

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* HERO SECTION - Authentic Campus Background with Generous Layout */}
        {/* ========================================================================= */}
        <section className="relative overflow-hidden bg-slate-950 text-white py-16 lg:py-24">
          {/* Authentic Campus Compound Background Image */}
          <div className="absolute inset-0 z-0">
            <img
              src="/images/rcsn/compound.webp"
              alt="Rakai Community School of Nursing Campus Compound and Walkways"
              loading="eager"
              decoding="async"
              className="w-full h-full object-cover object-center"
            />
            {/* Soft transparent overlay so campus is clearly visible */}
            <div className="absolute inset-0 bg-slate-950/60" />
          </div>

          <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 xl:gap-14 items-center">
              {/* Left Column: Headline, Statement & Credentials */}
              <div className="lg:col-span-7 space-y-6 sm:space-y-7">
                {/* Large, Clear Headline */}
                <h1 className="text-3xl sm:text-5xl xl:text-6xl font-black tracking-tight text-white leading-[1.14] drop-shadow-md">
                  Training Qualified Nurses & Midwives to Serve for Better Health
                </h1>

                {/* Subtitle */}
                <p className="text-lg sm:text-xl xl:text-2xl font-bold text-emerald-400 drop-shadow">
                  Rakai Community School of Nursing — Accredited Certificate & Diploma Health Training
                </p>

                {/* Body Paragraph */}
                <p className="text-base sm:text-lg xl:text-xl text-slate-100 leading-relaxed max-w-3xl font-normal drop-shadow">
                  Founded in 2003 in Rakai District, our institution prepares skilled, compassionate nurses and midwives
                  dedicated to patient care and community wellbeing. We are officially registered by the Ministry of
                  Education and Sports (MoES Reg: ME\VOC\071), accredited by the Uganda Nurses and Midwives Council (UNMC),
                  and an authorized UNMEB Examination Center (U028). Students undergo rigorous academic instruction, clinical
                  simulations in modern skills laboratories, and practical hospital rotations across 7 partner regional hospitals.
                </p>

                {/* Trust Badges */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm sm:text-base font-semibold text-slate-200">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>MoES Reg: ME\VOC\071</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>UNMC Accredited</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>UNMEB Center U028</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Established 2003</span>
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => openAdmissionsWith()}
                    className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-sm sm:text-base tracking-wide shadow-lg transition-colors"
                  >
                    <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Apply for 2026/2027 Intake</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Clean Direct HTML5 Video Player in natural rectangular format */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
                  <video
                    id="rcsn-school-video"
                    controls
                    preload="metadata"
                    poster="/images/rcsn/rcsn-nursing-cohort-main.webp"
                    className="w-full aspect-video object-cover bg-black cursor-pointer"
                    onClick={(e) => {
                      const v = e.currentTarget;
                      if (v.paused) v.play();
                      else v.pause();
                    }}
                  >
                    <source src="/videos/rcsn/school-advert.mp4" type="video/mp4" />
                    Your browser does not support HTML5 video.
                  </video>
                </div>
              </div>
            </div>

            {/* High-Contrast Stats Counter */}
            <div className="mt-16 pt-10 border-t border-slate-700/80 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-1.5">
                <span className="text-4xl sm:text-5xl xl:text-6xl font-black text-emerald-400">10,000+</span>
                <p className="text-sm sm:text-base uppercase tracking-wider font-bold text-slate-100">
                  Health Trainees Educated
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-4xl sm:text-5xl xl:text-6xl font-black text-emerald-400">7</span>
                <p className="text-sm sm:text-base uppercase tracking-wider font-bold text-slate-100">
                  Clinical Partner Hospitals
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-4xl sm:text-5xl xl:text-6xl font-black text-emerald-400">20+</span>
                <p className="text-sm sm:text-base uppercase tracking-wider font-bold text-slate-100">
                  Years of Nursing Heritage
                </p>
              </div>
              <div className="space-y-1.5">
                <span className="text-4xl sm:text-5xl xl:text-6xl font-black text-emerald-400">6+</span>
                <p className="text-sm sm:text-base uppercase tracking-wider font-bold text-slate-100">
                  National Graduations Held
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* PROGRAMS OF STUDY */}
        {/* ========================================================================= */}
        <section id="programs" className="py-20 lg:py-24 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-4xl mx-auto mb-16 space-y-3">
              <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest">
                Academic Courses
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                Programs & Courses of Study
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                RCSN offers accredited Certificate and Diploma programs designed to equip trainees with practical clinical
                competence and professional healthcare ethics.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {programs.map((p) => (
                <div
                  key={p.title}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-lg transition-all"
                >
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs sm:text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
                        {p.level}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                        Duration: {p.duration}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                      {p.title}
                    </h3>

                    <div className="space-y-4 text-sm sm:text-base text-slate-700 dark:text-slate-300 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block mb-1">
                          Entry Requirements:
                        </span>
                        <p className="leading-relaxed text-sm sm:text-base text-slate-600 dark:text-slate-300">{p.entry}</p>
                      </div>

                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block mb-1">
                          Career Pathways:
                        </span>
                        <p className="leading-relaxed text-sm sm:text-base text-slate-600 dark:text-slate-300">{p.career}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => openAdmissionsWith(p.title)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-sm shadow-sm transition-colors"
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>Apply for Course</span>
                    </button>

                    <Link
                      to="/courses"
                      className="text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-[#00873E] dark:hover:text-emerald-400 flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <Link
                to="/courses"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-base font-bold shadow-md hover:border-[#00873E] transition-colors"
              >
                <span>View Full Curriculum & Examination Guidelines</span>
                <ArrowRight className="w-5 h-5 text-[#00873E]" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CLINICAL TRAINING & HOSPITAL PARTNERSHIPS */}
        {/* ========================================================================= */}
        <section className="py-20 lg:py-24 bg-slate-900 text-white">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest block">
                  Clinical Training
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                  Hospital Partnerships & Clinical Attachments
                </h2>
                <p className="text-base sm:text-lg text-slate-200 leading-relaxed">
                  Rakai Community School of Nursing partners with regional referral and district hospitals to provide
                  practical clinical rotations for our students.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-800/90 border border-slate-700">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-white">Supervised Hospital Rotations</h4>
                      <p className="text-sm sm:text-base text-slate-300 mt-1 leading-relaxed">
                        Students participate in clinical ward practice under supervision of medical officers and hospital tutors.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-800/90 border border-slate-700">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-base sm:text-lg font-bold text-white">Skills Simulation Laboratory</h4>
                      <p className="text-sm sm:text-base text-slate-300 mt-1 leading-relaxed">
                        Practical training in nursing and midwifery procedures in the on-campus demonstration lab before hospital attachment.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Exact 7 Hospitals List */}
              <div className="lg:col-span-6">
                <div className="bg-slate-950 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-5 flex items-center gap-2.5">
                    <Building2 className="w-6 h-6 text-emerald-400" />
                    <span>Partner Teaching Hospitals</span>
                  </h3>
                  <div className="space-y-3">
                    {hospitalPartners.map((h) => (
                      <div
                        key={h.name}
                        className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={h.image}
                            alt={h.name}
                            loading="lazy"
                            decoding="async"
                            className="w-16 h-12 rounded-xl object-cover shrink-0 border border-slate-700"
                          />
                          <div className="min-w-0">
                            <span className="text-base font-bold text-slate-100 block truncate">{h.name}</span>
                            <span className="text-xs sm:text-sm text-slate-400 block">{h.location}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center text-sm text-slate-400">
                    <span>Clinical Training Partnerships</span>
                    <Link
                      to="/clinical-training"
                      className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5"
                    >
                      <span>Learn More</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CAMPUS FACILITIES */}
        {/* ========================================================================= */}
        <section className="py-20 lg:py-24 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-4xl mx-auto mb-16 space-y-3">
              <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest">
                Campus Environment
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                School Facilities
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
                At RCSN, we ensure our students are provided with high-quality accommodation, train in clean lecture
                halls, and have access to well-equipped science and computer labs plus games courts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {facilities.map((f) => (
                <div
                  key={f.title}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800/50 shadow-sm hover:shadow-xl transition-all flex flex-col group"
                >
                  <div className="aspect-[16/11] w-full overflow-hidden bg-slate-900 relative">
                    <img
                      src={f.image}
                      alt={f.title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3.5 left-3.5">
                      <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        {f.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-[#00873E] transition-colors">
                        {f.title}
                      </h3>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-14 text-center">
              <Link
                to="/campus-life"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-slate-900 dark:bg-[#00873E] hover:bg-black text-white text-sm sm:text-base font-bold shadow-md transition-colors"
              >
                <span>Learn More About Campus Life</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ADMISSIONS 4-STEP PATHWAY */}
        {/* ========================================================================= */}
        <section className="py-20 lg:py-24 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-4xl mx-auto mb-16 space-y-3">
              <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest">
                Admission Process
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                4 Steps to Join RCSN
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
                Follow our clear enrollment process to join Rakai Community School of Nursing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
              <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-3xl sm:text-4xl font-black text-[#00873E] dark:text-emerald-400 mb-3 block">
                  01
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Check Eligibility
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Verify your UCE science passes (Biology, Chemistry, Physics, Math, English) or UACE principal passes.
                </p>
              </div>

              <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-3xl sm:text-4xl font-black text-[#00873E] dark:text-emerald-400 mb-3 block">
                  02
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Submit Application
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Apply online through our website or pick up an application form from our campus in Rakai Town.
                </p>
              </div>

              <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-3xl sm:text-4xl font-black text-[#00873E] dark:text-emerald-400 mb-3 block">
                  03
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Verification & Interview
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Attend oral screening and document verification with original UNEB result slips and identification.
                </p>
              </div>

              <div className="p-7 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <span className="text-3xl sm:text-4xl font-black text-[#00873E] dark:text-emerald-400 mb-3 block">
                  04
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Acceptance & Reporting
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Receive your official Admission Letter, complete medical examination, and report for orientation.
                </p>
              </div>
            </div>

            <div className="mt-14 text-center">
              <button
                type="button"
                onClick={() => openAdmissionsWith()}
                className="inline-flex items-center gap-3 px-9 py-4 rounded-2xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-base shadow-lg transition-colors"
              >
                <GraduationCap className="w-6 h-6" />
                <span>Start Online Application Now</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* INSTITUTIONAL FOUNDING STORY */}
        {/* ========================================================================= */}
        <section className="py-20 lg:py-24 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                  Who We Are
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Over Two Decades of Health Education
                </h2>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  RCSN was started by the{' '}
                  <span className="font-bold text-slate-900 dark:text-white">SDA Church Community of Rakai</span>, the{' '}
                  <span className="font-bold text-slate-900 dark:text-white">Rakai District Council</span>, and community
                  leaders in 2003. Over the years it has evolved into a reputable fountain of health education in the region.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                      Our Vision
                    </h4>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                      A fountain of health training in the country and region.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                      Our Mission
                    </h4>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                      To impart cognitive, clinical, and professional competencies to health trainees so as to offer
                      comprehensive healthcare to communities they serve.
                    </p>
                  </div>
                </div>

                {/* Core Values */}
                <div className="pt-2">
                  <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Institutional Core Values
                  </h4>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      'God Fearing',
                      'Honesty and Reliability',
                      'Respectfulness',
                      'Accountability',
                      'Ethics and Professionalism',
                    ].map((val) => (
                      <span
                        key={val}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-slate-200"
                      >
                        <ShieldCheck className="w-4 h-4 text-[#00873E]" />
                        <span>{val}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Side: Real Cohort Photo */}
              <div className="lg:col-span-6">
                <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 group relative">
                  <img
                    src="/images/rcsn/rcsn-nursing-cohort-wide.webp"
                    alt="RCSN Nursing and Midwifery Trainee Cohort"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-80 sm:h-96 lg:h-[460px] object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 text-white">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                      Our Student Community
                    </span>
                    <h4 className="text-lg font-bold">Nursing & Midwifery Student Cohort</h4>
                    <p className="text-xs text-slate-200 mt-1">
                      Enrolled across accredited Certificate and Diploma health sciences programs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* LEADERSHIP, ADMINISTRATION & CAMPUS COMMUNITY */}
        {/* ========================================================================= */}
        <section className="py-20 lg:py-24 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
              <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                School Leadership
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                School Leadership & Administration
              </h2>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400">
                Experienced tutors and administrators dedicated to training skilled, compassionate nurses.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
              {/* Leader 1: Office of the Principal */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-60 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-principal-office.webp"
                    alt="The Principal in the Office of the Principal"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Office of the Principal
                  </span>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      Office of the Principal
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Leading the school with dedication and vision, upholding high standards of nursing education, student discipline, and professional healthcare ethics.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500">
                    The Principal • Head of Institution
                  </div>
                </div>
              </div>

              {/* Leader 2: Academic Registrar */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-60 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-academic-registrar-office.webp"
                    alt="The Academic Registrar of Rakai Community School of Nursing"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Academic Registrar
                  </span>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      Academic Registrar's Office
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Assisting students and parents with course admissions, entry requirement verification, curriculum tracking, and official student records.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500">
                    Academic Registrar • Admissions Desk
                  </div>
                </div>
              </div>

              {/* Leader 3: School Bursar */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-60 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-bursar-office.webp"
                    alt="School Bursar's Office"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Bursar's Office
                  </span>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      Bursar's Office & Accounts
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Friendly, helpful staff ready to assist parents and students with school fees inquiries, payment options, and official receipts.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500">
                    Helpful Staff • Student Accounts Desk
                  </div>
                </div>
              </div>

              {/* Leader 4: Academic Leadership & Administration */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-60 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-faculty-leadership.webp"
                    alt="Academic Leadership and Administration Team"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Academic Administration
                  </span>
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      Faculty & Administration
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Experienced academic coordinators and tutors guiding lecture teaching, hospital clinical rotations, and UNMEB national examinations.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs font-semibold text-slate-500">
                    Deputy Principal • Director of Studies • Tutors
                  </div>
                </div>
              </div>
            </div>

            {/* Trainees in Motion Banner */}
            <div className="mt-12 p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col lg:flex-row items-center gap-8">
              <div className="w-full lg:w-1/2 rounded-2xl overflow-hidden shadow-md h-64 sm:h-72">
                <img
                  src="/images/rcsn/rcsn-students-walking.webp"
                  alt="RCSN Students on Campus"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-full lg:w-1/2 space-y-4">
                <span className="text-xs font-bold text-[#00873E] uppercase tracking-wider block">
                  Campus Life & Community
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Join a Dedicated Family of Future Nurses
                </h3>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Our students live, learn, and practice together on a quiet, friendly campus in Rakai Town. From the lecture rooms to the hospital wards, they support one another like family.
                </p>
                <div className="pt-2 flex flex-wrap gap-4">
                  <Link
                    to="/about#leadership"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-emerald-700 hover:bg-black text-white text-sm font-bold shadow-md transition-colors"
                  >
                    <span>Meet Our Full Faculty</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/campus-life"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-600 hover:border-[#00873E] text-slate-800 dark:text-slate-200 text-sm font-bold transition-colors"
                  >
                    <span>Explore Campus Facilities</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* CONTACT & INQUIRY SECTION */}
        {/* ========================================================================= */}
        <section id="contact" className="py-20 lg:py-24 bg-slate-100 dark:bg-slate-950">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
              {/* Left Column: Direct Info */}
              <div className="lg:col-span-5 space-y-6">
                <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                  Get In Touch
                </span>
                <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  Contact Our Office
                </h2>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  The institution's main campus is located off Rakai-Byakabanda Road in Rakai Town Council (Rakai district
                  headquarters). Rakai Hospital is also in proximity.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <MapPin className="w-6 h-6 text-[#00873E] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Location
                      </h4>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1">
                        Rakai – Byakabanda Rd, Rakai Town Council, Rakai District.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Phone className="w-6 h-6 text-[#00873E] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Telephone
                      </h4>
                      <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 mt-1 font-semibold">
                        +256 (0) 772 000 000
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Mail className="w-6 h-6 text-[#00873E] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Postal Address
                      </h4>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1">
                        P.O. Box 321, Kyotera
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Clock className="w-6 h-6 text-[#00873E] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Opening Hours
                      </h4>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1">
                        MON – FRI: 08:00 – 17:00
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Form */}
              <div className="lg:col-span-7">
                <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg">
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
                    Send a Message
                  </h3>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mb-8">
                    Get in touch to learn more about health care training at RCSN.
                  </p>

                  {contactSubmitted ? (
                    <div className="p-8 sm:p-10 text-center space-y-4 bg-emerald-50 dark:bg-slate-800 rounded-2xl border border-emerald-200 dark:border-slate-700">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900 text-[#00873E] dark:text-emerald-300 mx-auto flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                        Your form submitted successfully!
                      </h4>
                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                        Thank you for contacting Rakai Community School of Nursing. We will respond to your inquiry shortly.
                      </p>
                      <button
                        type="button"
                        onClick={() => setContactSubmitted(false)}
                        className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold shadow"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                            Your Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="Your Name"
                            className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-[#00873E] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                            Email *
                          </label>
                          <input
                            type="email"
                            required
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                            placeholder="Email Address"
                            className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-[#00873E] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                            Telephone
                          </label>
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            placeholder="Phone Number"
                            className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-[#00873E] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                            Subject
                          </label>
                          <input
                            type="text"
                            value={contactSubject}
                            onChange={(e) => setContactSubject(e.target.value)}
                            placeholder="Subject"
                            className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-[#00873E] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                          Message *
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={contactMessage}
                          onChange={(e) => setContactMessage(e.target.value)}
                          placeholder="Your Message..."
                          className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-base focus:ring-2 focus:ring-[#00873E] focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={contactSubmitting}
                        className="inline-flex items-center gap-2.5 px-9 py-4 rounded-xl bg-[#00873E] hover:bg-[#007033] disabled:opacity-50 text-white font-bold text-base shadow-lg transition-colors"
                      >
                        <Send className="w-5 h-5" />
                        <span>{contactSubmitting ? 'Submitting...' : 'Submit Message'}</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Institutional Footer */}
      <RcsnFooter />

      {/* Interactive Modals */}
      <AdmissionsModal
        isOpen={admissionsOpen}
        onClose={() => setAdmissionsOpen(false)}
        preselectedProgram={selectedProgram}
      />

      <VideoAdvertModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
      />
    </div>
  );
}
