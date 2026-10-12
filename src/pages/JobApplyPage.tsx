import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  MapPin,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  Building2,
  FileText,
  User,
  Mail,
  Phone,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import SeoHead from '@/components/website/SeoHead';

interface JobDetails {
  job_id: string;
  school_id: string;
  title: string;
  location: string | null;
  description: string | null;
  status: string;
  created_at: string;
}

export default function JobApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const [job, setJob] = useState<JobDetails | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [cvUrl, setCvUrl] = useState('');

  // Submit State
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setLoadingJob(false);
      setJobError('Invalid job vacancy reference.');
      return;
    }

    let isMounted = true;
    const fetchJob = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('job_id', jobId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          if (isMounted) setJobError('This job vacancy was removed or no longer exists.');
        } else {
          const isOpen = ['open', 'active'].includes(String(data.status || '').toLowerCase());
          if (!isOpen) {
            if (isMounted) setJobError('This job vacancy has been closed and is no longer accepting submissions.');
          } else if (isMounted) {
            setJob(data as JobDetails);
          }
        }
      } catch (err: any) {
        if (isMounted) setJobError(err.message || 'Unable to retrieve job vacancy details.');
      } finally {
        if (isMounted) setLoadingJob(false);
      }
    };

    void fetchJob();
    return () => {
      isMounted = false;
    };
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId || !job) return;

    if (!fullName.trim() || !email.trim() || !phone.trim() || !coverLetter.trim()) {
      setSubmitError('Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const compiledNotes = [
        qualification.trim() ? `Highest Qualification: ${qualification.trim()}` : null,
        experience.trim() ? `Relevant Experience: ${experience.trim()}` : null,
        '',
        '--- Motivation & Cover Letter ---',
        coverLetter.trim(),
      ]
        .filter((line) => line !== null)
        .join('\n');

      const { error: insErr } = await supabase.from('hr_job_applications').insert({
        job_id: jobId,
        school_id: job.school_id || 'e1b10000-0000-4000-a000-000000000001',
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        cover_letter: compiledNotes,
        cv_url: cvUrl.trim() || null,
        status: 'new',
      });

      if (insErr) throw insErr;
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <SeoHead
        title={job ? `Apply for ${job.title} | RCSN Careers` : 'Apply for Job Vacancy | Rakai Community School of Nursing'}
        description="Submit your application for nursing faculty and healthcare educator positions at Rakai Community School of Nursing."
      />

      <RcsnNavbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Back Navigation */}
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#00873E] dark:text-emerald-400 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Careers</span>
          </Link>

          {loadingJob ? (
            <div className="p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-500">Loading vacancy details…</p>
            </div>
          ) : jobError || !job ? (
            <div className="p-10 sm:p-14 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Vacancy Unavailable</h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                {jobError || 'The job you are looking for is no longer active.'}
              </p>
              <div className="pt-2">
                <Link
                  to="/jobs"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white text-sm font-bold shadow-md transition-all"
                >
                  <span>Explore Open Positions</span>
                </Link>
              </div>
            </div>
          ) : submitted ? (
            /* Successful Submission Confirmation */
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 sm:p-14 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-lg text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest block">
                Submission Received
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Application Received Successfully!
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                Thank you, <strong className="text-slate-900 dark:text-white">{fullName}</strong>. Your candidate dossier for{' '}
                <strong className="text-slate-900 dark:text-white">{job.title}</strong> has been transmitted directly to the Human Resources Recruitment Registry at Rakai Community School of Nursing.
              </p>
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-slate-800/80 border border-emerald-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                Our HR interview panel evaluates candidates continuously. If shortlisted, you will be contacted via telephone or email for the interview schedule.
              </div>
              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <Link
                  to="/jobs"
                  className="px-6 py-3 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white text-sm font-bold shadow-md transition-colors"
                >
                  View Other Vacancies
                </Link>
                <Link
                  to="/"
                  className="px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Return to Home
                </Link>
              </div>
            </motion.div>
          ) : (
            /* Application Form */
            <div className="space-y-8">
              {/* Job Header Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Open Position</span>
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {job.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{job.location || 'RCSN Main Campus, Rakai Town'}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Rakai Community School of Nursing</span>
                  </span>
                </div>

                {job.description && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Job Description & Responsibilities
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {job.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Application Form Card */}
              <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Submit Candidate Application
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Fill in your verified details below. Fields marked with an asterisk (*) are mandatory.
                  </p>
                </div>

                {submitError && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Full Legal Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Namusoke Sarah"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00873E]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. sarah@example.com"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00873E]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Telephone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +256 700 123 456"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00873E]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Highest Qualification
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={qualification}
                          onChange={(e) => setQualification(e.target.value)}
                          placeholder="e.g. Bachelor of Science in Nursing / Diploma"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00873E]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Years of Experience
                      </label>
                      <input
                        type="text"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="e.g. 3 years in clinical mentoring"
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00873E]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        CV / Portfolio Link (Optional)
                      </label>
                      <input
                        type="url"
                        value={cvUrl}
                        onChange={(e) => setCvUrl(e.target.value)}
                        placeholder="e.g. https://drive.google.com/file/..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00873E]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Cover Letter & Statement of Suitability *
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                      placeholder="Outline your background, certifications, UNMC/UNMEB registration status, and why you are interested in joining Rakai Community School of Nursing…"
                      className="w-full px-4 py-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00873E]"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-[#00873E] hover:bg-[#007033] disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submitting ? 'Submitting Application…' : 'Submit Application'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <RcsnFooter />
    </div>
  );
}
