import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  Download,
  AlertCircle,
  FileText,
  Building2,
  GraduationCap,
  Phone,
  User,
  XCircle,
  ArrowRight,
  Check,
  HelpCircle,
  Loader2,
} from 'lucide-react';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import SeoHead from '@/components/website/SeoHead';
import {
  trackApplication,
  acceptAdmissionOffer,
  type AdmissionApplicationRecord,
} from '@/services/admissionsService';
import { generateInterviewSlipPdf } from '@/lib/generateInterviewSlipPdf';
import { generateAdmissionLetterPdf } from '@/lib/generateAdmissionLetterPdf';

export default function TrackApplicationPage() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id') || searchParams.get('app') || '';

  const [query, setQuery] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [application, setApplication] = useState<AdmissionApplicationRecord | null>(null);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialId.trim()) {
      handleSearch(initialId.trim());
    }
  }, [initialId]);

  const handleSearch = async (targetQuery?: string) => {
    const q = (targetQuery !== undefined ? targetQuery : query).trim();
    if (!q) return;

    setLoading(true);
    setSearched(true);
    setFeedback(null);

    try {
      const res = await trackApplication(q);
      setApplication(res);
    } catch (err) {
      console.error('Tracking query error:', err);
      setApplication(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!application) return;
    setAcceptingOffer(true);
    try {
      const res = await acceptAdmissionOffer(application.id);
      if (res.success && res.updated) {
        setApplication(res.updated);
        setFeedback('Offer accepted! Our admissions desk has noted your intention to report.');
      }
    } catch {
      setFeedback('Could not record your acceptance. Please contact the admissions office.');
    } finally {
      setAcceptingOffer(false);
    }
  };

  const handleDownloadInterviewSlip = async () => {
    if (!application) return;
    setDownloadingDoc('slip');
    try {
      await generateInterviewSlipPdf(application);
    } catch (err) {
      console.error('Failed to generate interview slip:', err);
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleDownloadAdmissionLetter = async () => {
    if (!application) return;
    setDownloadingDoc('letter');
    try {
      await generateAdmissionLetterPdf(application);
    } catch (err) {
      console.error('Failed to generate admission letter:', err);
    } finally {
      setDownloadingDoc(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return { label: 'Application Submitted', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' };
      case 'under_review':
        return { label: 'Under Document Vetting', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' };
      case 'shortlisted':
        return { label: 'Shortlisted for Interview', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' };
      case 'interview_scheduled':
        return { label: 'Interview Scheduled', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' };
      case 'interview_passed':
      case 'admitted':
        return { label: 'Provisional Admission Offered', color: 'bg-emerald-600 text-white' };
      case 'offer_accepted':
        return { label: 'Admission Offer Accepted', color: 'bg-teal-600 text-white' };
      case 'enrolled':
        return { label: 'Enrolled Active Student', color: 'bg-slate-900 text-emerald-400 dark:bg-emerald-950 dark:text-emerald-300' };
      case 'waitlisted':
        return { label: 'Waitlisted', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' };
      case 'interview_failed':
      case 'rejected':
        return { label: 'Application Unsuccessful', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  // Stepper milestones
  const steps = [
    { id: '1', title: 'Submission', desc: 'Application received & fee verified' },
    { id: '2', title: 'Document Vetting', desc: 'UNEB science requirements verified' },
    { id: '3', title: 'Oral Interview', desc: 'Panel vetting at Rakai campus' },
    { id: '4', title: 'Admission Offer', desc: 'Provisional admission letter issued' },
    { id: '5', title: 'Enrolled Student', desc: 'Registration number & matriculation' },
  ];

  const getStepState = (stepIndex: number, currentStatus: string) => {
    const order: Record<string, number> = {
      submitted: 1,
      under_review: 1,
      shortlisted: 2,
      interview_scheduled: 2,
      interview_passed: 3,
      interview_failed: 3,
      waitlisted: 3,
      admitted: 4,
      offer_accepted: 4,
      enrolled: 5,
      rejected: 1,
    };

    const currentOrder = order[currentStatus] || 1;

    if (stepIndex < currentOrder) return 'completed';
    if (stepIndex === currentOrder) return 'current';
    return 'upcoming';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <SeoHead
        title="Application Status | Rakai Community School of Nursing"
        description="Check your online application status, download your official interview invitation slip, view admission decisions, and download your admission letter."
        canonicalPath="/application-status"
      />
      <RcsnNavbar />

      <main className="flex-1 py-12 lg:py-16">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Header Banner */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 dark:text-white tracking-tight">
              Application Status
            </h1>
            <p className="max-w-2xl mx-auto text-base text-slate-600 dark:text-slate-300">
              Enter your Application ID (found on your downloaded application document, SMS, or email) or your registered phone number to check your admission progress.
            </p>
          </div>

          {/* Search Box */}
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. RCSN-2026-104921 or 0701884192"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-base shadow-md disabled:opacity-50 transition-all shrink-0"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                <span>Check Status</span>
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>Example Application IDs: RCSN-2026-104921, RCSN-2026-281903</span>
              <Link to="/contact" className="hover:text-emerald-600 transition-colors">
                Need Help?
              </Link>
            </div>
          </div>

          {/* Feedback Notice */}
          {feedback && (
            <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Search Result Display */}
          {searched && !loading && !application && (
            <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md text-center max-w-2xl mx-auto space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center border border-amber-500/20">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Application Record Not Found</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                No application matches <strong>"{query}"</strong>. Please verify the Application ID sent in your initial SMS or check with the admissions office.
              </p>
              <div className="pt-2">
                <Link
                  to="/admissions#intakes"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-sm font-semibold transition-colors"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Start New Application</span>
                </Link>
              </div>
            </div>
          )}

          {application && (
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* Profile & Current Status Header */}
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {application.application_number}
                    </span>
                    <span className={`text-xs font-bold px-3.5 py-1 rounded-full ${getStatusBadge(application.status).color}`}>
                      {getStatusBadge(application.status).label}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
                    {application.full_name}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {application.admitted_program || application.programs[0]}
                    </span>
                    <span>•</span>
                    <span>{application.intake}</span>
                    <span>•</span>
                    <span>Preferred: {application.residential_preference || 'Resident'}</span>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                  {/* Action 1: Download Interview Slip if scheduled */}
                  {['interview_scheduled', 'interview_passed', 'admitted', 'offer_accepted', 'enrolled'].includes(application.status) && (
                    <button
                      type="button"
                      onClick={handleDownloadInterviewSlip}
                      disabled={downloadingDoc === 'slip'}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-all shadow-sm"
                    >
                      {downloadingDoc === 'slip' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-emerald-600" />}
                      <span>Interview Slip</span>
                    </button>
                  )}

                  {/* Action 2: Download Admission Letter if admitted */}
                  {['admitted', 'offer_accepted', 'enrolled'].includes(application.status) && (
                    <button
                      type="button"
                      onClick={handleDownloadAdmissionLetter}
                      disabled={downloadingDoc === 'letter'}
                      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-sm shadow transition-all"
                    >
                      {downloadingDoc === 'letter' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                      <span>Admission Letter</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Visual Progress Stepper */}
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                  Application Progress
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                  {steps.map((st, i) => {
                    const state = getStepState(i + 1, application.status);
                    return (
                      <div
                        key={st.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          state === 'completed'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                            : state === 'current'
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-transparent shadow-lg'
                            : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono font-bold">0{st.id}</span>
                          {state === 'completed' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : state === 'current' ? (
                            <Clock className="w-4 h-4 text-emerald-400 dark:text-emerald-600 animate-pulse" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700" />
                          )}
                        </div>
                        <h4 className="font-bold text-sm leading-snug">{st.title}</h4>
                        <p className="text-xs mt-1 opacity-80 leading-relaxed">{st.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Specific Action Cards */}
              {application.status === 'interview_scheduled' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-500/30 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                        Interview Confirmed
                      </span>
                      <h4 className="text-xl font-black text-slate-950 dark:text-white">
                        Scheduled for {application.interview_date} at {application.interview_time || '09:00 AM'}
                      </h4>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        Venue: <strong>{application.interview_venue || 'RCSN Main Campus, Rakai Town'}</strong>.
                        Please download your <strong>Interview Slip</strong> and bring original copies of your UNEB result slips, National ID, recommendation letter, and medical form.
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadInterviewSlip}
                      disabled={downloadingDoc === 'slip'}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-sm shadow transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Official Interview Slip</span>
                    </button>
                  </div>
                </div>
              )}

              {application.status === 'admitted' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#00873E] text-white flex items-center justify-center shrink-0 shadow-md">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        Congratulations!
                      </span>
                      <h4 className="text-xl sm:text-2xl font-black text-white">
                        You Have Been Granted Provisional Admission
                      </h4>
                      <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                        The Academic Registrar has approved your admission for <strong>{application.admitted_program || application.programs[0]}</strong>.
                        Please download your official admission letter and confirm your intention to report.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={handleDownloadAdmissionLetter}
                      disabled={downloadingDoc === 'letter'}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 font-bold text-sm shadow transition-all"
                    >
                      <Download className="w-4 h-4 text-emerald-600" />
                      <span>Download Admission Letter & Fees</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAcceptOffer}
                      disabled={acceptingOffer}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-sm shadow transition-all"
                    >
                      {acceptingOffer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>Accept Admission Offer</span>
                    </button>
                  </div>
                </div>
              )}

              {application.status === 'enrolled' && (
                <div className="p-6 sm:p-8 rounded-3xl bg-emerald-950/20 border border-emerald-500/30 text-slate-900 dark:text-slate-100 space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <h4 className="text-lg font-bold">Officially Matriculated Student</h4>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    You have been enrolled into the RCSN active student system. You may log in to the Student Portal using your Student Registration Number.
                  </p>
                  <div>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-sm font-semibold transition-colors"
                    >
                      <span>Proceed to Student Portal Login</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Applicant Particulars Card */}
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
                <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                  Applicant Summary Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Gender & DOB</span>
                    <p className="font-semibold text-slate-900 dark:text-white">{application.gender} • {application.date_of_birth}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Primary Contact</span>
                    <p className="font-semibold text-slate-900 dark:text-white">{application.phone}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Previous School & UNEB</span>
                    <p className="font-semibold text-slate-900 dark:text-white">{application.previous_school || 'N/A'} ({application.index_number || 'N/A'})</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Guardian / Next of Kin</span>
                    <p className="font-semibold text-slate-900 dark:text-white">{application.guardian_name || 'N/A'} ({application.guardian_phone || 'N/A'})</p>
                  </div>
                </div>

                {/* Subject Grades */}
                {application.subject_grades && application.subject_grades.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Submitted Subject Grades
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {application.subject_grades.map((sg, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                        >
                          <strong>{sg.subject}:</strong> {sg.grade}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <RcsnFooter />
    </div>
  );
}
