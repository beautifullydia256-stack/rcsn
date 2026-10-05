import React, { useState, useEffect, useRef } from 'react';
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
  Filter,
  X,
  AlertCircle
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import AdmissionsModal from '@/components/website/AdmissionsModal';
import SeoHead from '@/components/website/SeoHead';

export default function CoursesPage() {
  const location = useLocation();
  const [admissionsOpen, setAdmissionsOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedCourseId, setHighlightedCourseId] = useState<string | null>(null);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToCourse = (courseId: string) => {
    const el = document.getElementById(courseId);
    if (el) {
      const yOffset = -220; // Accounts for sticky navbar (~120px) + sticky filter bar (~80px) + buffer
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({
        top: Math.max(0, y),
        behavior: 'smooth',
      });

      setHighlightedCourseId(courseId);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedCourseId(null);
      }, 3500);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (location.hash) {
      const rawId = location.hash.replace('#', '');
      const targetCourse = courses.find((c) => c.id === rawId);
      if (targetCourse) {
        setSearchQuery('');
      }
      setTimeout(() => {
        scrollToCourse(rawId);
      }, 250);
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
      entry: 'Uganda Certificate of Education (UCE) with passes in Biology, Chemistry, Physics, Mathematics, and English in one sitting.',
      overview: 'Foundational clinical nursing practice, vital signs assessment, and compassionate bedside patient care.',
      career: 'Enrolled Nurse (Hospitals, Health Center IIIs/IVs, and Community Clinics)',
    },
    {
      id: 'cert-midwifery',
      title: 'Certificate in Midwifery',
      category: 'Certificate',
      duration: '2.5 Years (5 Semesters)',
      intakes: 'August/September & January/February',
      examBody: 'Uganda Nurses and Midwives Examinations Board (UNMEB)',
      accreditation: 'MoES & Uganda Nurses and Midwives Council (UNMC)',
      entry: 'Uganda Certificate of Education (UCE) with passes in Biology, Chemistry, Physics, Mathematics, and English in one sitting.',
      overview: 'Maternal health, safe antenatal care, labor management, and newborn infant welfare.',
      career: 'Enrolled Midwife (Maternity Wards, Antenatal Suites, and Child Health Posts)',
    },
    {
      id: 'dip-nursing-direct',
      title: 'Diploma in Nursing (Direct Entry)',
      category: 'Diploma',
      duration: '3.0 Years (6 Semesters)',
      intakes: 'August/September Intake',
      examBody: 'Uganda Nurses and Midwives Examinations Board (UNMEB)',
      accreditation: 'MoES & UNMC',
      entry: 'UACE Level with a Principal Pass in Biology and two subsidiaries in Chemistry, Physics, or Math, plus UCE science credentials.',
      overview: 'Comprehensive clinical care, advanced diagnosis, patient management, and ward supervision.',
      career: 'Registered Nurse (RN), Clinical Ward Supervisor, and Nursing Officer',
    },
    {
      id: 'dip-midwifery-direct',
      title: 'Diploma in Midwifery (Direct Entry)',
      category: 'Diploma',
      duration: '3.0 Years (6 Semesters)',
      intakes: 'August/September Intake',
      examBody: 'Uganda Nurses and Midwives Examinations Board (UNMEB)',
      accreditation: 'MoES & UNMC',
      entry: 'UACE Level with a Principal Pass in Biology and two subsidiaries in Chemistry, Physics, or Math, plus UCE science credentials.',
      overview: 'Senior obstetric practice, high-risk maternity care, and clinical maternal health leadership.',
      career: 'Registered Midwife (RM), Maternity Ward In-Charge, and Reproductive Health Officer',
    },
    {
      id: 'dip-extension',
      title: 'Diploma in Nursing / Midwifery (Extension)',
      category: 'Extension',
      duration: '1.5 Years (3 Semesters)',
      intakes: 'August/September & January/February',
      examBody: 'Uganda Nurses and Midwives Examinations Board (UNMEB)',
      accreditation: 'MoES & UNMC',
      entry: 'Valid Certificate in Nursing or Midwifery with active UNMC registration and minimum 2 years clinical practice.',
      overview: 'Modular career advancement elevating Enrolled Nurses and Midwives to Registered status.',
      career: 'Registered Nurse or Midwife, Higher Civil Service Scale (U5/U4), and Departmental Head',
    },
  ];

  const getCourseSearchableText = (c: (typeof courses)[0]) => {
    const parts = [
      c.id,
      c.title,
      c.category,
      c.duration,
      c.intakes,
      c.examBody,
      c.accreditation,
      c.entry,
      c.overview,
      c.career,
    ];

    // Numbers & Duration aliases
    if (c.duration.includes('2.5')) {
      parts.push(
        '2.5', '2.5yr', '2.5yrs', '2.5years', '2.5 years',
        '5', '5 semesters', '5semesters',
        'two and a half years', 'certificate'
      );
    }
    if (c.duration.includes('1.5')) {
      parts.push(
        '1.5', '1.5yr', '1.5yrs', '1.5years', '1.5 years',
        '3 semesters', '3semesters',
        'one and a half years', 'extension', 'in-service', 'inservice', 'upgrading', 'upgrade'
      );
    }
    if (c.duration.includes('3 Years')) {
      parts.push(
        '3', '3yr', '3yrs', '3years', '3 years',
        '6', '6 semesters', '6semesters',
        'three years', 'direct', 'direct entry'
      );
    }

    // Role & field aliases
    if (c.title.includes('Midwifery')) {
      parts.push('midwife', 'midwives', 'maternal', 'maternity', 'labor', 'labour', 'delivery', 'antenatal', 'postnatal', 'obstetrics', 'infant');
    }
    if (c.title.includes('Nursing')) {
      parts.push('nurse', 'nurses', 'bedside', 'clinical', 'patient care');
    }

    return parts.join(' ').toLowerCase();
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const queryWords = normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : [];

  const isCourseMatch = (course: (typeof courses)[0], words: string[]) => {
    if (words.length === 0) return true;
    const text = getCourseSearchableText(course);
    return words.every((word) => text.includes(word));
  };

  // Immediate matches for live suggestions dropdown
  const searchMatches = queryWords.length > 0
    ? courses.filter((c) => isCourseMatch(c, queryWords))
    : [];

  // Filtered courses for the main catalog
  const filtered = queryWords.length > 0
    ? courses.filter((c) => isCourseMatch(c, queryWords))
    : courses;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setIsSearchFocused(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const handleSelectCourse = (courseId: string) => {
    setIsSearchFocused(false);
    scrollToCourse(courseId);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <SeoHead
        title="Nursing & Midwifery Diploma & Certificate Courses | UNMEB Center U028 — RCSN"
        description="Explore accredited Certificate & Diploma programs in Nursing and Midwifery at RCSN. Check entry requirements, durations, and career pathways."
        canonicalPath="/courses"
        image="https://www.rcsn.ac.ug/images/rcsn/lecture-hall.webp"
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

        {/* Course Search Bar */}
        <section className="py-4 sm:py-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-[104px] sm:top-[112px] lg:top-[120px] z-30 backdrop-blur-md">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Course Catalog
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {courses.length} Accredited Programs
                </span>
              </div>

              {/* Search Input Container with Dropdown Suggestions */}
              <div ref={searchContainerRef} className="relative w-full sm:w-96 lg:w-[440px]">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsSearchFocused(false);
                    } else if (e.key === 'Enter' && searchMatches.length > 0) {
                      e.preventDefault();
                      handleSelectCourse(searchMatches[0].id);
                    }
                  }}
                  placeholder="Search course, duration (e.g. 2.5), entry..."
                  className="w-full pl-11 pr-20 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                />

                {/* Right Action: Match count badge & Clear (X) button */}
                <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5">
                  {searchQuery.trim().length > 0 && (
                    <>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        title={`${searchMatches.length} matching course${searchMatches.length === 1 ? '' : 's'}`}
                      >
                        {searchMatches.length}
                      </span>
                      <button
                        type="button"
                        onClick={clearSearch}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Clear search"
                        aria-label="Clear search"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Live Search Suggestions Dropdown */}
                {isSearchFocused && searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 sm:right-auto sm:w-[460px] top-full mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      <span>
                        Matching Courses ({searchMatches.length})
                      </span>
                      {searchMatches.length > 0 && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          Click to jump &amp; apply
                        </span>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {searchMatches.length > 0 ? (
                        searchMatches.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCourse(c.id)}
                            className="w-full text-left p-3.5 hover:bg-emerald-50/80 dark:hover:bg-slate-800/90 transition-colors flex items-start gap-3 group"
                          >
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  {c.category}
                                </span>
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  ⏱ {c.duration}
                                </span>
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
                                {c.title}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                {c.overview}
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center text-xs font-bold text-emerald-600 dark:text-emerald-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all mt-2.5">
                              <span>View</span>
                              <ArrowRight className="w-3.5 h-3.5 ml-1" />
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-6 text-center">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            No matching courses found
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Try searching &ldquo;Nursing&rdquo;, &ldquo;Midwifery&rdquo;, &ldquo;2.5&rdquo;, &ldquo;3 Years&rdquo;, or &ldquo;Diploma&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Courses Listing */}
        <section id="courses-catalog" className="scroll-mt-36 py-16 lg:py-20 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            {/* Active Search Summary Pill */}
            {searchQuery.trim().length > 0 && (
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-emerald-900 dark:text-emerald-200">
                  <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Found <strong>{filtered.length}</strong> {filtered.length === 1 ? 'course' : 'courses'} matching &ldquo;<strong>{searchQuery}</strong>&rdquo;
                  </span>
                </div>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 underline underline-offset-4"
                >
                  Clear search &amp; show all {courses.length} programs
                </button>
              </div>
            )}

            {filtered.length > 0 ? (
              <div className="space-y-10">
                {filtered.map((c) => (
                  <div
                    key={c.id}
                    id={c.id}
                    className={`scroll-mt-56 lg:scroll-mt-60 rounded-3xl border bg-white dark:bg-slate-900 p-8 sm:p-10 shadow-sm transition-all duration-500 ${
                      highlightedCourseId === c.id
                        ? 'border-emerald-500 ring-4 ring-emerald-500/60 shadow-2xl scale-[1.01] bg-gradient-to-b from-emerald-50/25 to-white dark:from-emerald-950/20 dark:to-slate-900'
                        : 'border-slate-200 dark:border-slate-800 hover:shadow-xl hover:border-emerald-500/40'
                    }`}
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
                          {highlightedCourseId === c.id && (
                            <span className="px-3 py-1 rounded-md text-xs sm:text-sm font-bold bg-emerald-600 text-white animate-pulse">
                              Selected Course
                            </span>
                          )}
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
                            <span>Admission &amp; Entry Requirements</span>
                          </h4>
                          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
                            {c.entry}
                          </p>
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
            ) : (
              /* Friendly Empty Results State */
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 sm:p-14 text-center max-w-xl mx-auto space-y-5 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    No courses found matching &ldquo;{searchQuery}&rdquo;
                  </h3>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                    We couldn&apos;t find any programs matching your search. Try searching for program names like <strong>Nursing</strong> or <strong>Midwifery</strong>, duration digits like <strong>2.5</strong> or <strong>3</strong>, or qualifications like <strong>Certificate</strong> or <strong>Diploma</strong>.
                  </p>
                </div>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow transition-colors"
                  >
                    <span>Clear Search &amp; View All Courses</span>
                  </button>
                </div>
              </div>
            )}
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
                      onClick={() => scrollToCourse('cert-nursing')}
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
                      onClick={() => scrollToCourse('dip-nursing-direct')}
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
