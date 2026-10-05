import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  GraduationCap,
  Calendar,
  FileText,
  CheckCircle2,
  Download,
  Phone,
  Building2,
  CreditCard,
  ShieldCheck,
  Award,
  ArrowRight,
  Clock,
  AlertCircle,
  Search,
  Check,
  UserCheck
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import AdmissionsModal from '@/components/website/AdmissionsModal';
import SeoHead from '@/components/website/SeoHead';

export default function AdmissionsPage() {
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

  const interviewRequirements = [
    'Original Uganda Certificate of Education (UCE) Result Slip and Certificate (plus 3 photocopies).',
    'Original UACE Result Slip (for Direct Diploma applicants, plus 3 photocopies).',
    'Original UNMC Registration Certificate and practicing license (for In-Service Extension applicants).',
    'Certified Copy of National Identification Card (NIN) or Birth Certificate.',
    '4 recent color passport-size photographs (white background, professional attire).',
    'Recommendation letter from Local Council (LC1) or Religious Leader / SDA Pastor.',
    'Completed Medical Examination Report from a recognized Government or General Hospital.',
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      <SeoHead
        title="Nursing & Midwifery Admissions 2026/2027 | Entry Requirements — RCSN"
        description="Apply for Certificate and Diploma in Nursing & Midwifery at Rakai Community School of Nursing. View UCE/UACE entry criteria, interview checklist, and apply online."
        canonicalPath="/admissions"
        image="https://www.rcsn.ac.ug/images/rcsn/rcsn-students-walking.webp"
        imageAlt="RCSN Nursing Students on Campus"
      />
      <RcsnNavbar onOpenAdmissions={() => setAdmissionsOpen(true)} />

      <main className="flex-1">
        {/* Header */}
        <section className="bg-slate-950 text-white py-16 lg:py-24 relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="/images/rcsn/rcsn-students-walking.webp"
              alt="RCSN Nursing Students on Campus"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/65 to-slate-950/45" />
          </div>

          <div className="relative z-10 w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="max-w-4xl space-y-4">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                Admissions & Enrollment
              </h1>
              <p className="text-lg sm:text-xl text-slate-200 leading-relaxed font-normal drop-shadow">
                Step-by-step guidelines for prospective nursing and midwifery candidates. Apply online or visit our
                admissions office at Rakai Town campus.
              </p>
            </div>
          </div>
        </section>

        {/* Current Intake Alerts & Dual CTA */}
        <section id="intakes" className="scroll-mt-28 py-12 lg:py-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-3">
                <span className="inline-block px-3.5 py-1.5 rounded-full bg-[#00873E] text-white text-xs font-bold uppercase tracking-wider">
                  Admissions Open
                </span>
                <h2 className="text-2xl sm:text-4xl font-black">
                  August / September 2026 Main Intake
                </h2>
                <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
                  Certificate and Diploma courses in Nursing and Midwifery. Apply online or track an existing application in real time.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3.5 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setAdmissionsOpen(true)}
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-base shadow-lg transition-all"
                >
                  <GraduationCap className="w-5 h-5" />
                  <span>Start Online Application</span>
                </button>
                <Link
                  to="/admissions/track"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl border-2 border-slate-600 hover:border-slate-400 bg-slate-800 hover:bg-slate-700 text-white font-bold text-base shadow-sm transition-all"
                >
                  <Search className="w-5 h-5 text-emerald-400" />
                  <span>Track Application</span>
                </Link>
              </div>
            </div>

            {/* 4-Step Visual Journey Stepper */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 font-black text-xs flex items-center justify-center">1</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Step 1</span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Submit Application</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">Complete the 5-minute online form with your UNEB details and pay UGX 50,000 via MoMo.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 font-black text-xs flex items-center justify-center">2</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Step 2</span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Attend Interview</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">Download your Interview Invitation Slip and report to campus with physical academic slips.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 font-black text-xs flex items-center justify-center">3</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Step 3</span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Admission Letter</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">Successful candidates receive an instant SMS and download their official provisional admission letter.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 font-black text-xs flex items-center justify-center">4</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Step 4</span>
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Report & Matriculate</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">The Academic Registrar issues your Student Registration Number and assigns your hostel wing.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Requirements & Document Checklist */}
        <section className="py-16 lg:py-20 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
              {/* Left Column: Required Documents */}
              <div id="requirements" className="scroll-mt-28 lg:col-span-7 space-y-5">
                <div>
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                    Application Checklist
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    Documents Required on Interview Day
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Present physical originals and 3 photocopies during oral interviews:
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {interviewRequirements.map((req, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Fees & Payment Channels */}
              <div id="fees" className="scroll-mt-28 lg:col-span-5 space-y-5">
                <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                      Payment Channels & Fees
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      Official Fees Structure
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {/* Application Processing Fee */}
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-[#00873E] dark:border-emerald-600 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                          <CreditCard className="w-4 h-4 text-[#00873E]" />
                          <span>Application Processing Fee</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Paid online via MTN MoMo (*165#) or Airtel Money (*185#)</p>
                      </div>
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-[#00873E] text-white shrink-0">
                        UGX 50,000
                      </span>
                    </div>

                    {/* Bank Tuition Accounts */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                        <Building2 className="w-4 h-4 text-emerald-600" />
                        <span>Official Tuition Bank Accounts</span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                        <p>• <strong>Centenary Bank:</strong> Rakai Branch — Account Name: Rakai Community School of Nursing</p>
                        <p>• <strong>Stanbic Bank:</strong> Kyotera Branch — School Pay Code Available</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>RCSN does NOT accept cash in hand. All payments are strictly through MTN MoMo, Airtel Money, or bank accounts.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Admissions Support Team: Photo Cards */}
        <section className="py-16 lg:py-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <span className="text-xs font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                Admissions Support
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Here to Guide Your Application
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Contact our admissions and finance desk for instant guidance on forms, interviews, and fees.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Principal */}
              <div className="rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-52 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-principal-office.webp"
                    alt="The Principal in the Office of the Principal"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Office of Principal
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Principal's Office</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Welcoming trainees and approving candidate admissions.</p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500">
                    The Principal
                  </div>
                </div>
              </div>

              {/* Academic Registrar */}
              <div className="rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-52 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-academic-registrar-office.webp"
                    alt="The Academic Registrar in the Academic Registrar's Office"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Academic Registrar
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Admissions & Records</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Validating UCE/UACE results and issuing official letters.</p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500">
                    Academic Registrar
                  </div>
                </div>
              </div>

              {/* Bursar */}
              <div className="rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-52 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-bursar-office.webp"
                    alt="School Bursar's Office"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Bursar's Office
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">School Bursar</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Providing tuition structures and termly payment guidance.</p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500">
                    The Bursar
                  </div>
                </div>
              </div>

              {/* Accounts Desk */}
              <div className="rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-52 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-accounts-desk.webp"
                    alt="Student Accounts Officer at the Finance Desk"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Accounts Desk
                  </span>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Finance Officer</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">Assisting with bank deposits and issuing school receipts.</p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500">
                    Accounts Officer
                  </div>
                </div>
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
