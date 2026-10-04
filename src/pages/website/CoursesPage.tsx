import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Clock,
  Award,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Search,
  Filter
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import AdmissionsModal from '@/components/website/AdmissionsModal';
import SeoHead from '@/components/website/SeoHead';

export default function CoursesPage() {
  const location = useLocation();
  const [admissionsOpen, setAdmissionsOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | undefined>(undefined);
  const [filterType, setFilterType] = useState<'All' | 'Certificate' | 'Diploma' | 'Extension'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (location.hash) {
      const rawId = location.hash.replace('#', '');
      const targetCourse = courses.find((c) => c.id === rawId);
      if (targetCourse) {
        setFilterType('All');
        setSearchQuery('');
      }
      setTimeout(() => {
        const el = document.getElementById(rawId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    }
  }, [location.hash]);

  const openAdmissionsFor = (programName: string) => {
    setSelectedProgram(programName);
    setAdmissionsOpen(true);
  };

  const courses = [
    {
      id: 'cert-nursing',
      title: 'Certificate in Nursing',
      category: 'Certificate',
      duration: '2.5 Years (5 Semesters)',
      intakes: 'August/September & January/February',
      examBody: 'Uganda Nurses and Midwives Examinations Board (UNMEB)',
      accreditation: 'MoES & Uganda Nurses and Midwives Council (UNMC)',
      entry: 'Uganda Certificate of Education (UCE) with minimum passes in Biology, Chemistry, Physics, Mathematics, and English obtained in the same sitting (or recognized equivalent).',
      overview: 'Prepares learners with foundational clinical knowledge, vital signs monitoring, patient hygiene, pharmacological basics, wound dressing, and bedside patient care.',
      curriculum: [
        'Anatomy and Physiology',
        'Foundations of Nursing Practice',
        'Microbiology and Infection Control',
        'First Aid and Emergency Procedures',
        'Pharmacology for Nurses',
        'Medical-Surgical Nursing I & II',
        'Community Health Nursing and Primary Health Care',
      ],
      career: 'Enrolled Nurse in public and private hospitals, health center IIIs/IVs, maternity homes, and community outreach health posts.',
    },
    {
      id: 'cert-midwifery',
      title: 'Certificate in Midwifery',
      category: 'Certificate',
      duration: '2.5 Years (5 Semesters)',
      intakes: 'August/September & January/February',
      examBody: 'Uganda Nurses and Midwives Examinations Board (UNMEB)',
      accreditation: 'MoES & Uganda Nurses and Midwives Council (UNMC)',
      entry: 'Uganda Certificate of Education (UCE) with minimum passes in Biology, Chemistry, Physics, Mathematics, and English obtained in the same sitting.',
      overview: 'Focuses on the reproductive health of women during pregnancy, childbirth, and the postpartum period, plus neonatal resuscitation and infant welfare.',
      curriculum: [
        'Anatomy and Physiology of Reproduction',
        'Normal Pregnancy and Antenatal Care',
        'Labor and Delivery Management',
        'Postnatal and Neonatal Infant Care',
        'Obstetric Emergencies and Referrals',
        'Reproductive Health and Family Planning',
        'Immunization and Child Health Surveillance',
      ],
      career: 'Enrolled Midwife in labor suites, antenatal clinics, health center maternity wards, and maternal-child health clinics.',
    },
    {
      id: 'cert-comp-nursing',
      title: 'Certificate in Comprehensive Nursing',
      category: 'Certificate',
      duration: '2.5 Years (5 Semesters)',
      intakes: 'August/September & January/February',
      examBody: 'Uganda Nurses and Midwives Examinations Board (UNMEB)',
      accreditation: 'MoES & UNMC',
      entry: 'UCE minimum pass in Biology, Chemistry, Mathematics, English, Physics, and related science electives (e.g. Agriculture, Food & Nutrition, Geography).',
      overview: 'An integrated curriculum combining nursing, basic midwifery, and community health to produce versatile frontline health professionals for primary care facilities.',
      curriculum: [
        'General Nursing Practice and Ward Procedures',
        'Basic Midwifery and Maternal Health',
        'Pediatric Nursing and Child Welfare',
        'Community Health and Preventive Medicine',
        'Epidemiology and Health Education',
        'Basic Mental Health and Psychiatric Nursing',
      ],
      career: 'Comprehensive Primary Care Nurse capable of staffing rural and district health center IVs across Uganda.',
    },
    {
      id: 'dip-nursing-direct',
      title: 'Diploma in Nursing (Direct Entry)',
      category: 'Diploma',
      duration: '3 Years (6 Semesters)',
      intakes: 'August/September Intake',
      examBody: 'Uganda Nurses and Midwives Examinations Board (UNMEB)',
      accreditation: 'MoES & UNMC',
      entry: 'Uganda Advanced Certificate of Education (UACE) with at least one Principal Pass in Biology and two subsidiaries in Chemistry, Physics, or Mathematics, plus UCE passes in sciences and English.',
      overview: 'Advanced clinical training designed for direct school leavers, emphasizing clinical diagnosis, complex inpatient management, pharmacology, and ward administration.',
      curriculum: [
        'Advanced Pathophysiology and Clinical Diagnosis',
        'Advanced Medical-Surgical Nursing',
        'Critical Care and Emergency Nursing',
        'Healthcare Administration and Ward Management',
        'Biostatistics and Clinical Research Methodology',
        'Bioethics and Health Law',
        'Advanced Pharmacology and Therapeutics',
      ],
      career: 'Registered Nurse (RN), Nursing Officer, Clinical Ward Manager, or entry into Bachelor of Science in Nursing (BSN) completion programs.',
    },
    {
      id: 'dip-midwifery-direct',
      title: 'Diploma in Midwifery (Direct Entry)',
      category: 'Diploma',
      duration: '3 Years (6 Semesters)',
      intakes: 'August/September Intake',
      examBody: 'Uganda Nurses and Midwives Examinations Board (UNMEB)',
      accreditation: 'MoES & UNMC',
      entry: 'UACE Level with a Principal Pass in Biology and two subsidiaries in Chemistry, Physics, or Math, plus UCE science credentials.',
      overview: 'Prepares senior midwives with comprehensive clinical leadership in high-risk obstetrics, complicated deliveries, maternal surgical nursing, and reproductive policy.',
      curriculum: [
        'Advanced Obstetrics and Fetal Surveillance',
        'Management of Complicated Deliveries and Dystocia',
        'Operative Obstetrics Pre/Post-Op Nursing',
        'Advanced Neonatology and Special Care Baby Unit (SCBU)',
        'Maternal Mortality Reduction Strategies',
        'Reproductive Health Program Leadership',
      ],
      career: 'Registered Midwife (RM), Maternity Ward In-Charge, Reproductive Health Officer in referral hospitals.',
    },
    {
      id: 'dip-extension',
      title: 'Diploma in Nursing / Midwifery (Extension / In-Service)',
      category: 'Extension',
      duration: '1.5 Years (3 Semesters)',
      intakes: 'August/September & January/February',
      examBody: 'Uganda Nurses and Midwives Examinations Board (UNMEB)',
      accreditation: 'MoES & UNMC',
      entry: 'Valid Certificate in Nursing (CN), Midwifery (CM), or Comprehensive Nursing (CNN) from an accredited institution, registration certificate with UNMC, and at least 2 years active clinical practicing experience.',
      overview: 'Tailored for working enrolled nurses and midwives seeking to elevate their professional credentials to Registered Nurse/Midwife status through intensive modular and clinical study.',
      curriculum: [
        'Clinical Nursing Leadership and Supervision',
        'Advanced Pharmacotherapeutics',
        'Health Systems Management and Quality Assurance',
        'Applied Clinical Research Project',
        'Complex Clinical Practicum in Regional Referral Hospitals',
      ],
      career: 'Registered Nurse or Midwife, promotion to higher civil service salary bands (U5/U4 in Uganda Public Service), eligibility for postgraduate health degrees.',
    },
  ];

  const filtered = courses.filter((c) => {
    const matchesCategory = filterType === 'All' || c.category === filterType;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.overview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.entry.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <SeoHead
        title="Programs & Courses | Rakai Community School of Nursing (RCSN)"
        description="Explore accredited Certificate and Diploma nursing and midwifery programs in Uganda. UNMEB Center U028, MoES accredited, with clinical rotations at Rakai General Hospital."
        canonicalPath="/courses"
        image="https://rcsn.vercel.app/images/rcsn/lecture-hall.webp"
        imageAlt="Spacious Lecture Halls at Rakai Community School of Nursing"
      />
      <RcsnNavbar onOpenAdmissions={() => openAdmissionsFor('Certificate in Nursing')} />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/rcsn/lecture-hall.webp"
              alt="Spacious Lecture Halls at Rakai Community School of Nursing"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/65 to-slate-950/45" />
          </div>

          <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="max-w-4xl space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                Programs & Courses of Study
              </h1>
              <p className="text-lg sm:text-xl text-slate-200 leading-relaxed font-normal drop-shadow">
                Explore recognized Certificate and Diploma courses certified by the Uganda Nurses and Midwives
                Examinations Board (UNMEB) and the Ministry of Education and Sports.
              </p>
            </div>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <section className="py-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-20 z-30 backdrop-blur-md">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              {/* Category Pills */}
              <div className="flex items-center gap-2.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
                {(['All', 'Certificate', 'Diploma', 'Extension'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterType(cat)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0 ${
                      filterType === cat
                        ? 'bg-emerald-700 text-white shadow'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat === 'All' ? 'All Programs (6)' : `${cat} Programs`}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search course or requirement..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Courses Listing */}
        <section id="courses-catalog" className="scroll-mt-28 py-20 lg:py-24 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="space-y-10">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  id={c.id}
                  className="scroll-mt-28 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all"
                >
                  <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5 mb-3">
                        <span className="px-3 py-1 rounded-md text-xs sm:text-sm font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          {c.category}
                        </span>
                        <span className="px-3 py-1 rounded-md text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          Duration: {c.duration}
                        </span>
                        <span className="px-3 py-1 rounded-md text-xs sm:text-sm font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                          UNMEB Certified
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                        {c.title}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => openAdmissionsFor(c.title)}
                      className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm sm:text-base shadow-md transition-all shrink-0"
                    >
                      <GraduationCap className="w-5 h-5" />
                      <span>Apply for this Course</span>
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="pt-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Left: Overview & Requirements */}
                    <div className="lg:col-span-2 space-y-6">
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Program Overview
                        </h4>
                        <p className="text-base sm:text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                          {c.overview}
                        </p>
                      </div>

                      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-sm font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5" />
                          <span>Admission & Entry Requirements</span>
                        </h4>
                        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                          {c.entry}
                        </p>
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Core Curriculum & Practical Modules
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {c.curriculum.map((mod, i) => (
                            <div key={i} className="flex items-center gap-2.5 text-sm sm:text-base text-slate-700 dark:text-slate-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{mod}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Career & Examination Info */}
                    <div className="space-y-5 lg:border-l lg:border-slate-100 lg:dark:border-slate-800 lg:pl-10">
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Career Prospects
                        </h4>
                        <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                          {c.career}
                        </p>
                      </div>

                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Available Intakes
                        </h4>
                        <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 font-semibold">
                          {c.intakes}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Certificate & Diploma Student Cohorts Showcase */}
        <section id="trainee-cohorts" className="py-20 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                Student Cohorts in Training
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Our Certificate &amp; Diploma Trainees
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                From foundational bedside patient care to advanced clinical diagnostics and ward leadership, RCSN prepares both certificate and diploma students for real-world medical practice.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
              {/* Card 1: Certificate in Nursing Students */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col group hover:shadow-xl transition-all duration-300">
                <div className="h-72 sm:h-80 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-certificate-cohort.webp"
                    alt="Certificate in Nursing Students in Clinical Scrubs on Campus"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3.5 py-1.5 rounded-full bg-emerald-700/90 backdrop-blur-md text-white text-xs font-black tracking-wide uppercase shadow-md">
                      Certificate Cohort
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md rounded-xl p-3 text-white">
                    <p className="text-xs font-semibold text-emerald-300">
                      Certificate Trainees in Clinical Uniforms on Campus Grounds
                    </p>
                  </div>
                </div>
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Certificate in Nursing &amp; Midwifery Trainees
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Our Certificate trainees undergo intensive clinical preparation in patient hygiene, vital signs monitoring, wound dressing, medication administration, and primary community healthcare. Under the mentorship of experienced clinical tutors, these students develop compassionate bedside care and professional discipline.
                    </p>
                    <div className="pt-2 grid grid-cols-2 gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>2.5-Year UNMEB Program</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Bedside Nursing Focus</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>UCE Science Entry</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg p-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Hospital Ward Rotations</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('Certificate');
                        const el = document.getElementById('courses-catalog');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors"
                    >
                      <span>Explore Certificate Programs</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Diploma in Nursing & Midwifery Students */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col group hover:shadow-xl transition-all duration-300">
                <div className="h-72 sm:h-80 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-diploma-cohort.webp"
                    alt="Diploma in Nursing Students in Clinical White Lab Coats"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3.5 py-1.5 rounded-full bg-blue-700/90 backdrop-blur-md text-white text-xs font-black tracking-wide uppercase shadow-md">
                      Diploma Cohort
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md rounded-xl p-3 text-white">
                    <p className="text-xs font-semibold text-blue-300">
                      Diploma Scholars in Clinical White Coats Outside Academic Block
                    </p>
                  </div>
                </div>
                <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                      Diploma in Nursing &amp; Midwifery Scholars
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Pictured in crisp white clinical coats outside the lecture block, our Diploma scholars engage in advanced diagnostic skills, critical care management, complicated obstetric procedures, and ward leadership. The program admits direct UACE science holders and upgrading enrolled certificate nurses.
                    </p>
                    <div className="pt-2 grid grid-cols-2 gap-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg p-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>3-Year Direct / Extension</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg p-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Advanced Diagnostics</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg p-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>UACE / Upgrade Entry</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-lg p-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Ward Leadership</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFilterType('Diploma');
                        const el = document.getElementById('courses-catalog');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    >
                      <span>Explore Diploma Programs</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Academic Learning Environment Gallery */}
        <section className="py-20 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                Academic Environment
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Where Academic Theory Meets Clinical Practice
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Our programs are supported by dedicated medical reference stacks, simulation laboratories, and close-knit study circles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Photo 1: Students in Library */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-60 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-students-library.webp"
                    alt="Nursing Students in Modern Library"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Library Reading Room
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                    Peer Study & Medical References
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Students reviewing anatomy, pharmacology, and surgical case studies in our peaceful, well-resourced campus library.
                  </p>
                </div>
              </div>

              {/* Photo 2: Practical Skills Lab */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-60 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-skills-lab-practical.webp"
                    alt="Clinical Skills Simulation Laboratory"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Skills Demonstration Lab
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                    Practical Simulation Equipment
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Mastering maternal delivery, injection techniques, patient bed hygiene, and diagnostic procedures under tutor supervision.
                  </p>
                </div>
              </div>

              {/* Photo 3: Trainee Cohort */}
              <div className="rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-60 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-nursing-cohort-main.webp"
                    alt="RCSN Nursing and Midwifery Cohort"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Uniformed Trainees
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1.5">
                    Professional Nursing Identity
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Instilling Christian ethical discipline, clinical uniform etiquette, and compassionate dedication from day one.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <RcsnFooter />
      <AdmissionsModal
        isOpen={admissionsOpen}
        onClose={() => setAdmissionsOpen(false)}
        preselectedProgram={selectedProgram}
      />
    </div>
  );
}
