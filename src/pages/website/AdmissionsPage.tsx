import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  AlertCircle
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import AdmissionsModal from '@/components/website/AdmissionsModal';

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

        {/* Current Intake Alerts & Quick CTA */}
        <section id="intakes" className="scroll-mt-28 py-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="p-8 sm:p-12 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="space-y-4">
                <span className="inline-block px-3.5 py-1.5 rounded-full bg-[#00873E] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
                  Admissions Open
                </span>
                <h2 className="text-3xl sm:text-4xl font-black">
                  August / September 2026 Main Intake
                </h2>
                <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                  Applications are currently being received for Certificate in Nursing, Certificate in Midwifery, and
                  Diploma courses. Applicants may apply for one or more programs on a single application.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setAdmissionsOpen(true)}
                  className="inline-flex items-center justify-center gap-3 px-9 py-4.5 rounded-2xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-base shadow-xl transition-all"
                >
                  <GraduationCap className="w-6 h-6" />
                  <span>Start Online Application</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Requirements & Document Checklist */}
        <section className="py-20 lg:py-24 bg-slate-50 dark:bg-slate-950">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
              {/* Left Column: Required Documents */}
              <div id="requirements" className="scroll-mt-28 lg:col-span-7 space-y-6">
                <div>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                    Application Checklist
                  </span>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                    Documents Required on Interview Day
                  </h3>
                  <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
                    All applicants must present physical originals and certified copies of the following documents during oral interviews:
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  {interviewRequirements.map((req, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-4 shadow-sm"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-base text-slate-800 dark:text-slate-200 leading-relaxed font-medium">{req}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Fees & Payment Guide */}
              <div id="fees" className="scroll-mt-28 lg:col-span-5 space-y-6">
                <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
                  <div>
                    <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest block mb-1">
                      Payment Channels & Fees
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                      Application Fee & Tuition Channels
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Official fees schedule and recognized payment channels for prospective applicants.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Highlighted Application Processing Fee Card */}
                    <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-[#00873E] dark:border-emerald-600">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-black text-base">
                          <CreditCard className="w-5 h-5 text-[#00873E]" />
                          <span>Online Application Fee</span>
                        </div>
                        <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#00873E]/20 text-emerald-900 dark:text-emerald-200 border border-[#00873E]/40">
                          UGX 50,000
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        A non-refundable fee of <strong>UGX 50,000</strong> is paid directly at the end of the online application via <strong>MTN Mobile Money</strong> or <strong>Airtel Money</strong>. Once payment is confirmed, your application reference number and an <strong>official downloadable PDF receipt</strong> are generated instantly.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-base mb-1">
                        <CreditCard className="w-5 h-5 text-amber-500" />
                        <span>MTN Mobile Money (*165#)</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Instant prompt sent to your MTN phone. Enter your MoMo PIN to authorize UGX 50,000 and submit your application automatically.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2.5 text-slate-900 dark:text-white font-bold text-base mb-1">
                        <CreditCard className="w-5 h-5 text-red-500" />
                        <span>Airtel Money (*185#)</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Direct Airtel Money push notification to your phone. Approve with your PIN for instant payment confirmation and application submission.
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                    <div className="flex items-center gap-2 font-bold mb-1.5">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <span>Important Notice on Application Fees:</span>
                    </div>
                    <p>
                      RCSN does NOT accept cash hand payments. Application fees are paid safely through MTN MoMo or Airtel Money on our online admissions portal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Admissions Support: Academic Registrar & Bursar's Office */}
        <section className="py-20 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-8 lg:px-12 xl:px-16">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
              <span className="text-sm font-bold text-[#00873E] dark:text-emerald-400 uppercase tracking-widest block">
                Administrative Assistance
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Admissions Oversight & Financial Inquiries
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Our administrative team is here to assist prospective students and parents through every stage of application, document verification, and tuition scheduling.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Registrar Support Card */}
              <div className="rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-64 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-academic-registrar.webp"
                    alt="Office of the Academic Registrar Desk"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Academic Registrar
                  </span>
                </div>
                <div className="p-7 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Admissions & Application Guidance
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                      Our registrar's office is ready to help you with application requirements, program choices, entry criteria, and admission letters.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500">
                    Admissions Desk • Main Administration Block
                  </div>
                </div>
              </div>

              {/* Bursar Support Card */}
              <div className="rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col group">
                <div className="h-64 overflow-hidden relative">
                  <img
                    src="/images/rcsn/rcsn-bursar-office.webp"
                    alt="School Bursar's Office"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    Bursar's Office
                  </span>
                </div>
                <div className="p-7 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      School Fees & Payment Assistance
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
                      Our bursar and accounts staff are friendly and ready to assist parents and students with fee structures, payment options, and official receipts.
                    </p>
                  </div>
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500">
                    Friendly Assistance • Accounts & Finance Office
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
