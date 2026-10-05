import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Phone,
  MapPin,
  Clock,
  GraduationCap,
  Calendar,
  ChevronDown,
  ArrowRight,
  BookOpen,
  Award,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Baby,
  Building2,
  Hospital,
  Users,
  Trophy,
  Send,
  Coins,
  Compass,
  FileText,
  CheckCircle2,
  MessageCircle,
  Search,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

interface RcsnNavbarProps {
  onOpenAdmissions?: () => void;
}

export default function RcsnNavbar({ onOpenAdmissions }: RcsnNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/', hasDropdown: false },
    { name: 'About RCSN', path: '/about', hasDropdown: true },
    { name: 'Programs & Courses', path: '/courses', hasDropdown: true },
    { name: 'Admissions & Fees', path: '/admissions', hasDropdown: true },
    { name: 'Clinical Training', path: '/clinical-training', hasDropdown: true },
    { name: 'Contact & Location', path: '/contact', hasDropdown: true },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleMouseEnter = (name: string, hasDropdown: boolean) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!hasDropdown || name === 'Home') {
      setActiveDropdown(null);
      return;
    }
    setActiveDropdown(name);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const handleDropdownEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleDropdownLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 180);
  };

  const closeDropdown = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(null);
    setMobileMenuOpen(false);
  };

  const handleAnchorClick = (pathWithHash: string) => {
    closeDropdown();
    const [path, hash] = pathWithHash.split('#');
    if (location.pathname === path && hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
    }
  };

  // Close dropdown on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDropdown();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full shadow-md transition-shadow duration-200" onMouseLeave={handleMouseLeave}>
      {/* Top Utility Ribbon - Solid Institutional Green */}
      <div className="bg-[#005C29] text-white text-xs py-2 px-3 sm:px-4 lg:px-6 border-b border-[#004720]">
        <div className="max-w-screen-2xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 font-medium text-emerald-100">
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              <span>Admissions Ongoing for 2026/2027 Intakes</span>
            </span>
            <span className="hidden md:inline-flex items-center gap-1 text-emerald-200">
              <MapPin className="w-3.5 h-3.5 text-emerald-300" />
              <span>Rakai Town Council, Byakabanda Rd</span>
            </span>
            <span className="hidden lg:inline-flex items-center gap-1 text-emerald-200">
              <Clock className="w-3.5 h-3.5 text-emerald-300" />
              <span>Mon – Fri: 08:00 – 17:00</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="tel:+256392878552"
              className="hidden sm:inline-flex items-center gap-1 text-emerald-100 hover:text-white font-semibold transition-colors"
              title="Call RCSN Admissions Desk"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-300" />
              <span>0392 878 552</span>
            </a>
            <a
              href="https://wa.me/256783399322?text=Hello%20Rakai%20Community%20School%20of%20Nursing,%20I%20would%20like%20to%20inquire%20about%20admissions"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white text-[11px] font-bold shadow-sm transition-all"
              title="Chat on WhatsApp: +256 783 399 322"
            >
              <MessageCircle className="w-3 h-3 fill-current" />
              <span>WhatsApp: +256 783 399 322</span>
            </a>
            <span className="inline-block h-3 w-px bg-emerald-600" />
            <span className="text-[11px] font-bold tracking-wider text-amber-300 uppercase">
              UNMEB Center: U028
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar - Solid White Institutional Bar */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200 relative">
        <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-18 sm:h-20 lg:h-22 gap-2 lg:gap-3">
            {/* School Crest / Branding - Protected with shrink-0 so it NEVER gets compressed or covered */}
            <Link
              to="/"
              onClick={() => {
                closeDropdown();
                if (location.pathname === '/') {
                  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                }
              }}
              className="shrink-0 flex items-center gap-2 sm:gap-2.5 lg:gap-3 group z-10"
            >
              <div className="w-[52px] h-[52px] sm:w-14 sm:h-14 lg:w-16 lg:h-16 shrink-0 flex items-center justify-center overflow-hidden">
                <img
                  src="/images/rcsn/logo.png"
                  alt="Rakai Community School of Nursing Crest"
                  loading="eager"
                  decoding="async"
                  className="w-[52px] h-[52px] sm:w-14 sm:h-14 lg:w-16 lg:h-16 object-contain drop-shadow-sm filter contrast-105 shrink-0"
                />
              </div>
              <div className="flex flex-col shrink-0">
                <span className="text-[13px] sm:text-base lg:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                  RAKAI COMMUNITY
                </span>
                <span className="text-[10px] sm:text-xs lg:text-xs font-bold text-[#00873E] dark:text-emerald-400 tracking-wider uppercase">
                  School of Nursing
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links with Hover Detectors */}
            <div className="hidden xl:flex items-center space-x-1 2xl:space-x-2">
              {navLinks.map((link) => {
                const active = isActive(link.path);
                const isHovered = activeDropdown === link.name;
                return (
                  <div
                    key={link.path}
                    className="relative py-4"
                    onMouseEnter={() => handleMouseEnter(link.name, link.hasDropdown)}
                  >
                    <Link
                      to={link.path}
                      onClick={() => {
                        closeDropdown();
                        if (location.pathname === link.path) {
                          window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                        }
                      }}
                      className={`inline-flex items-center px-2 py-1.5 2xl:px-3 2xl:py-2 rounded-lg text-xs xl:text-[13px] 2xl:text-sm font-semibold whitespace-nowrap transition-colors ${
                        active || isHovered
                          ? 'text-[#00873E] dark:text-emerald-400 bg-emerald-50 dark:bg-slate-800 font-bold'
                          : 'text-slate-700 dark:text-slate-200 hover:text-[#00873E] dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{link.name}</span>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Right Side Actions - Always visible, perfectly fitted */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <ThemeToggle />

              {/* Track Application Button */}
              <Link
                to="/admissions/track"
                onClick={closeDropdown}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-xs lg:text-sm transition-colors whitespace-nowrap"
                title="Track Application Status"
              >
                <Search className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Track Status</span>
              </Link>

              {/* Apply Online Button (Always visible on desktop!) */}
              {onOpenAdmissions ? (
                <button
                  type="button"
                  onClick={() => {
                    closeDropdown();
                    onOpenAdmissions();
                  }}
                  className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-lg bg-[#00873E] hover:bg-[#007033] text-white font-bold text-xs lg:text-sm shadow-sm transition-colors whitespace-nowrap"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Apply Now</span>
                </button>
              ) : (
                <Link
                  to="/admissions"
                  onClick={closeDropdown}
                  className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-lg bg-[#00873E] hover:bg-[#007033] text-white font-bold text-xs lg:text-sm shadow-sm transition-colors whitespace-nowrap"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Apply Now</span>
                </Link>
              )}

              {/* LOGIN (Always visible on all screens!) */}
              <Link
                to="/login"
                onClick={closeDropdown}
                className="inline-flex items-center justify-center px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-xs lg:text-sm shadow transition-colors whitespace-nowrap"
                title="Login"
              >
                <span>Login</span>
              </Link>

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-slate-800 dark:text-white" />}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP HOVER MEGA MENUS / PREVIEW DROPDOWNS */}
        {/* ========================================================================= */}
        {activeDropdown && (
          <div
            className="hidden xl:block absolute top-full left-0 right-0 w-full bg-white dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 shadow-2xl z-50 transition-all animate-in fade-in slide-in-from-top-1 duration-150"
            onMouseEnter={handleDropdownEnter}
            onMouseLeave={handleDropdownLeave}
          >
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
              {/* DROPDOWN 1: ABOUT RCSN */}
              {activeDropdown === 'About RCSN' && (
                <div className="grid grid-cols-12 gap-8 items-start">
                  <div className="col-span-4 border-r border-slate-200 dark:border-slate-800 pr-6 space-y-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Institutional Profile</span>
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                      About Rakai Community School of Nursing
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Established to bridge the healthcare human resource gap in Southwestern Uganda. Fully accredited by MoES, MoH, and UNMEB (Center Code: U028).
                    </p>
                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-800/40">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block">
                        School Motto
                      </span>
                      <span className="text-xs font-black text-[#00873E] dark:text-emerald-300 italic block mt-0.5">
                        "We Serve for Better Health"
                      </span>
                    </div>
                    <Link
                      to="/about"
                      onClick={closeDropdown}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00873E] dark:text-emerald-400 hover:underline pt-1"
                    >
                      <span>Read Complete School Profile</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="col-span-8 grid grid-cols-2 gap-3">
                    <Link
                      to="/about#history"
                      onClick={() => handleAnchorClick('/about#history')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          History & Founding
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Origins of RCSN and our mandate to uplift health standards in Rakai District.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/about#vision-mission"
                      onClick={() => handleAnchorClick('/about#vision-mission')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Vision & Mission
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Our commitment to quality, patient-centered, and ethical clinical education.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/about#values"
                      onClick={() => handleAnchorClick('/about#values')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Core Institutional Values
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Integrity, Compassion, Professional Competence, and Community Empathy.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/about#objectives"
                      onClick={() => handleAnchorClick('/about#objectives')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Institutional Objectives
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Practical clinical mastery, research literacy, and top UNMEB pass rates.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/about#geography"
                      onClick={() => handleAnchorClick('/about#geography')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3 col-span-2"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Location & Campus Setting
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Serene grounds off Rakai–Byakabanda Road in Rakai Town Council near Rakai General Hospital.
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}

              {/* DROPDOWN 2: PROGRAMS & COURSES (Clicking takes directly to course and scrolls down!) */}
              {activeDropdown === 'Programs & Courses' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-[#00873E] uppercase tracking-wider block">
                        Government Accredited Medical Courses • UNMEB Center: U028
                      </span>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        Academic Programs & Specializations
                      </h3>
                    </div>
                    <Link
                      to="/courses"
                      onClick={closeDropdown}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-[#00873E] transition-colors"
                    >
                      <span>View All 6 Programs Overview</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-12 gap-6">
                    {/* Certificate Column (3 courses) */}
                    <div className="col-span-6 space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Certificate Programs
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">UCE Science Entry • 2.5 Years</span>
                      </div>

                      {/* Course 1 */}
                      <Link
                        to="/courses#cert-nursing"
                        onClick={() => handleAnchorClick('/courses#cert-nursing')}
                        className="group block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Certificate in Nursing</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400">
                            2.5 Yrs • UNMEB
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          Bedside patient care, clinical pharmacology, vital signs monitoring, wound care & community health.
                        </p>
                      </Link>

                      {/* Course 2 */}
                      <Link
                        to="/courses#cert-midwifery"
                        onClick={() => handleAnchorClick('/courses#cert-midwifery')}
                        className="group block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            <Baby className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Certificate in Midwifery</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400">
                            2.5 Yrs • UNMEB
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          Maternal care, antenatal screening, labor ward delivery management & neonatal infant resuscitation.
                        </p>
                      </Link>

                      {/* Course 3 */}
                    </div>

                    {/* Diploma Column (3 courses) */}
                    <div className="col-span-6 space-y-2.5">
                      <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Diploma & Extension Programs
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold">Direct (UACE) & In-Service</span>
                      </div>

                      {/* Course 4 */}
                      <Link
                        to="/courses#dip-nursing-direct"
                        onClick={() => handleAnchorClick('/courses#dip-nursing-direct')}
                        className="group block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                            <span>Diploma in Nursing (Direct Entry)</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            3 Years • UACE
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          Advanced clinical diagnosis, medical-surgical nursing, critical care, biostatistics & ward administration.
                        </p>
                      </Link>

                      {/* Course 5 */}
                      <Link
                        to="/courses#dip-midwifery-direct"
                        onClick={() => handleAnchorClick('/courses#dip-midwifery-direct')}
                        className="group block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            <Baby className="w-3.5 h-3.5 text-blue-600" />
                            <span>Diploma in Midwifery (Direct Entry)</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            3 Years • UACE
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          Complicated deliveries, operative obstetric nursing, advanced SCBU neonatology & maternal mortality reduction.
                        </p>
                      </Link>

                      {/* Course 6 */}
                      <Link
                        to="/courses#dip-extension"
                        onClick={() => handleAnchorClick('/courses#dip-extension')}
                        className="group block p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-amber-600" />
                            <span>Diploma in Nursing / Midwifery (Extension)</span>
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            1.5 Yrs • In-Service
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          Upgrading enrolled nurses/midwives to Registered Nurse (RN/RM) credentials via intensive modular study.
                        </p>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* DROPDOWN 3: ADMISSIONS & FEES */}
              {activeDropdown === 'Admissions & Fees' && (
                <div className="grid grid-cols-12 gap-8 items-start">
                  <div className="col-span-4 border-r border-slate-200 dark:border-slate-800 pr-6 space-y-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Admissions Desk</span>
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                      Admissions, Requirements & Fees
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Admissions are open for March/April and August/September Intakes. Transparent government-aligned fee structure with flexible installment options.
                    </p>
                    {onOpenAdmissions ? (
                      <button
                        type="button"
                        onClick={() => {
                          closeDropdown();
                          onOpenAdmissions();
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white text-xs font-bold shadow-sm transition-colors"
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>Start Online Application</span>
                      </button>
                    ) : (
                      <Link
                        to="/admissions"
                        onClick={closeDropdown}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white text-xs font-bold shadow-sm transition-colors"
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span>Start Online Application</span>
                      </Link>
                    )}
                  </div>

                  <div className="col-span-8 grid grid-cols-2 gap-3">
                    <Link
                      to="/admissions#intakes"
                      onClick={() => handleAnchorClick('/admissions#intakes')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Intakes & Academic Calendar
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          March/April and August/September intake cycles, deadline dates, and interview schedules.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/admissions#requirements"
                      onClick={() => handleAnchorClick('/admissions#requirements')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Minimum Entry Requirements
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Passes in Biology, Chemistry, Physics, Math, and English for Certificates & Diplomas.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/admissions#fees"
                      onClick={() => handleAnchorClick('/admissions#fees')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Tuition & Accommodation Fees
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Semester fee structure covering tuition, accommodation, meals, and practical supplies.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/admissions#fees"
                      onClick={() => handleAnchorClick('/admissions#fees')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Official Bank Payment Channels
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Verified Centenary Bank and Stanbic Bank school fee collection accounts.
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}

              {/* DROPDOWN 4: CLINICAL TRAINING */}
              {activeDropdown === 'Clinical Training' && (
                <div className="grid grid-cols-12 gap-8 items-start">
                  <div className="col-span-4 border-r border-slate-200 dark:border-slate-800 pr-6 space-y-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                      <Stethoscope className="w-3.5 h-3.5" />
                      <span>Bedside Excellence</span>
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                      Practical Skills & Hospital Rotations
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Hands-on clinical exposure is at the heart of our curriculum. Students rotate across 7 public and private teaching hospitals in the region.
                    </p>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        7 Teaching Hospitals
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Including neighboring Rakai General Hospital (300m) and Masaka Regional Referral.
                      </span>
                    </div>
                    <Link
                      to="/clinical-training"
                      onClick={closeDropdown}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00873E] dark:text-emerald-400 hover:underline pt-1"
                    >
                      <span>Explore Hospital Rotations</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="col-span-8 grid grid-cols-2 gap-3">
                    <Link
                      to="/clinical-training#skills-lab"
                      onClick={() => handleAnchorClick('/clinical-training#skills-lab')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Skills Demonstration Lab
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Modern anatomical mannequins, mock ward beds, delivery models & surgical instruments.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/clinical-training#hospitals"
                      onClick={() => handleAnchorClick('/clinical-training#hospitals')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Hospital className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Rakai General Hospital (300m)
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Primary bedside rotation ground for inpatient care, triage, and maternal labor wards.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/clinical-training#hospitals"
                      onClick={() => handleAnchorClick('/clinical-training#hospitals')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Masaka Regional Referral Hospital
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Advanced clinical practicum in intensive care, major surgery, psychiatry, and pediatrics.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/clinical-training#skills-lab"
                      onClick={() => handleAnchorClick('/clinical-training#skills-lab')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Clinical Preceptor Mentorship
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Close bedside mentorship guided by seasoned nurse tutors and hospital medical officers.
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}

              {/* DROPDOWN 5: CONTACT & LOCATION */}
              {activeDropdown === 'Contact & Location' && (
                <div className="grid grid-cols-12 gap-8 items-start">
                  <div className="col-span-4 border-r border-slate-200 dark:border-slate-800 pr-6 space-y-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                      <Phone className="w-3.5 h-3.5" />
                      <span>Admissions Helpdesk</span>
                    </span>
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                      Get In Touch With RCSN
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Have questions about entry requirements, fee structures, or campus visits? Contact our registry directly.
                    </p>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">Telephone:</div>
                        <a href="tel:+256392878552" className="font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600">
                          0392 878 552
                        </a>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                        Email: info@rcsn.ac.ug • admissions@rcsn.ac.ug
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                      <a
                        href="https://wa.me/256783399322?text=Hello%20Rakai%20Community%20School%20of%20Nursing,%20I%20would%20like%20to%20inquire%20about%20admissions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold transition-all shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span>Chat on WhatsApp: +256 783 399 322</span>
                      </a>
                      <Link
                        to="/contact"
                        onClick={closeDropdown}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00873E] dark:text-emerald-400 hover:underline"
                      >
                        <span>Open Full Contact Page</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="col-span-8 grid grid-cols-2 gap-3">
                    <Link
                      to="/contact#contact-info"
                      onClick={() => handleAnchorClick('/contact#contact-info')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Campus Physical Address
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Rakai Town Council, Byakabanda Road, Rakai District, Southwestern Uganda.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/contact#message"
                      onClick={() => handleAnchorClick('/contact#message')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Send Message to Admissions
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Submit an instant inquiry online. Our administrative team will respond within 24 hours.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/contact#map"
                      onClick={() => handleAnchorClick('/contact#map')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          School Grounds & Buildings Map
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Official school map showing real campus buildings, hostels, and driving directions.
                        </p>
                      </div>
                    </Link>

                    <Link
                      to="/contact#contact-info"
                      onClick={() => handleAnchorClick('/contact#contact-info')}
                      className="group p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-slate-800/80 transition-all flex items-start gap-3"
                    >
                      <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#00873E] dark:group-hover:text-emerald-400 transition-colors">
                          Registry Working Hours
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                          Monday – Friday: 08:00 – 17:00 EAT (Closed on weekends and public holidays).
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer - 100% Solid White, Renders Cleanly Below Navigation Bar */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-white dark:bg-slate-900 border-t border-b border-slate-200 dark:border-slate-800 px-5 pt-3 pb-6 space-y-2 shadow-2xl animate-in slide-in-from-top-1 duration-150">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (location.pathname === link.path) {
                      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`block px-4 py-3 rounded-xl text-base font-bold transition-colors ${
                    active
                      ? 'text-[#00873E] dark:text-emerald-400 bg-emerald-50 dark:bg-slate-800 font-black'
                      : 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2.5">
              {onOpenAdmissions ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAdmissions();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-base shadow-md transition-all active:scale-[0.98]"
                >
                  <GraduationCap className="w-5 h-5" />
                  <span>Apply Online</span>
                </button>
              ) : (
                <Link
                  to="/admissions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-base shadow-md transition-all active:scale-[0.98]"
                >
                  <GraduationCap className="w-5 h-5" />
                  <span>Apply Online</span>
                </Link>
              )}

              <Link
                to="/admissions/track"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Search className="w-4 h-4 text-emerald-600" />
                <span>Track Application Status</span>
              </Link>

              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center py-3.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-base shadow-md transition-all active:scale-[0.98]"
              >
                <span>Login</span>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
