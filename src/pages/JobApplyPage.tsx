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
  Clock,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
  ImageIcon,
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
  application_deadline?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  submission_address?: string | null;
  poster_url?: string | null;
}

export default function JobApplyPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const [job, setJob] = useState<JobDetails | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'online' | 'email' | 'whatsapp'>('online');
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Online Form Fields
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
            if (isMounted) setJobError('This job vacancy has closed and is no longer accepting submissions.');
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

  // Online Form Submit
  const handleOnlineSubmit = async (e: React.FormEvent) => {
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

  // Pre-filled Email Draft Builder
  const targetEmail = job?.contact_email?.trim() || 'info@rcsn.ac.ug';
  const emailSubject = `Application for ${job?.title || 'Job Vacancy'} - Rakai Community School of Nursing`;
  const emailDraftBody = `Dear Hiring Committee / Human Resources,

I am writing to formally submit my application for the position of "${job?.title || 'Vacancy'}" at Rakai Community School of Nursing.

Please find attached my Curriculum Vitae (CV), certified academic transcripts, and professional nursing registration certificates for your consideration.

Applicant Full Name: [Your Full Name]
Contact Phone Number: [Your Phone Number]
Highest Academic / Clinical Qualification: [e.g. Diploma in Nursing / Midwifery]
Current Location / District: [Your Town / District]

Thank you for reviewing my application. I look forward to hearing from you.

Yours faithfully,
[Your Full Name]`;

  const mailtoLink = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailDraftBody)}`;

  const handleCopyEmailDraft = () => {
    const textToCopy = `To: ${targetEmail}\nSubject: ${emailSubject}\n\n${emailDraftBody}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 3000);
  };

  const cleanPhone = (job?.contact_phone || '').replace(/[^0-9]/g, '');

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
            /* Successful Online Submission Confirmation */
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
                <strong className="text-slate-900 dark:text-white">{job.title}</strong> has been transmitted directly to the Human Resources Registry at Rakai Community School of Nursing.
              </p>
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-slate-800/80 border border-emerald-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                Our HR interview panel reviews applications continuously. If shortlisted, you will be contacted via telephone or email for the interview schedule.
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
            /* Vacancy Details and Multi-Channel Submission */
            <div className="space-y-8">
              {/* Job Header & Overview Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#00873E] dark:text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Actively Recruiting</span>
                    </span>

                    {job.application_deadline && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Deadline: {job.application_deadline}</span>
                      </span>
                    )}
                  </div>

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

                {/* Optional Official Flyer / Picture */}
                {job.poster_url && (
                  <div className="pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Official Vacancy Flyer / Announcement
                    </span>
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-w-lg bg-black/5">
                      <img
                        src={job.poster_url}
                        alt={`${job.title} Official Poster`}
                        className="w-full h-auto object-contain max-h-96"
                      />
                    </div>
                  </div>
                )}

                {job.description && (
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Description &amp; Candidate Requirements
                    </h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {job.description}
                    </p>
                  </div>
                )}

                {job.submission_address && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-slate-900 dark:text-white">Physical Hand-Delivery:</strong>
                      <span>{job.submission_address}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-Channel "How to Apply" Suite */}
              <div className="p-6 sm:p-10 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Choose How You Want to Apply
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Select your preferred application channel below:
                  </p>
                </div>

                {/* Tabs to select method */}
                <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('online')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      activeTab === 'online'
                        ? 'bg-[#00873E] text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Apply Online Directly</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('email')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      activeTab === 'email'
                        ? 'bg-[#00873E] text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Apply via Email (Pre-Filled Draft)</span>
                  </button>

                  {job.contact_phone && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('whatsapp')}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                        activeTab === 'whatsapp'
                          ? 'bg-[#00873E] text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>WhatsApp / Call Inquiry</span>
                    </button>
                  )}
                </div>

                {/* TAB 1: Online Form */}
                {activeTab === 'online' && (
                  <div>
                    {submitError && (
                      <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-center gap-2 mb-5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    <form onSubmit={handleOnlineSubmit} className="space-y-5">
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
                            placeholder="e.g. 3 years in midwifery education"
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00873E]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                            CV / Cloud Document Link (Optional)
                          </label>
                          <input
                            type="url"
                            value={cvUrl}
                            onChange={(e) => setCvUrl(e.target.value)}
                            placeholder="e.g. https://drive.google.com/..."
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00873E]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                          Cover Letter &amp; Statement of Suitability *
                        </label>
                        <textarea
                          rows={5}
                          required
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          placeholder="Outline your background, certifications, UNMC/UHPAB registration status, and why you are interested in joining Rakai Community School of Nursing…"
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
                          <span>{submitting ? 'Submitting Application…' : 'Submit Application Directly'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* TAB 2: Apply via Email with Pre-Filled Draft */}
                {activeTab === 'email' && (
                  <div className="space-y-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-6 border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">
                        Pre-Configured Email Application
                      </span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        Send Your Application Directly via Email
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                        Click the button below to launch your email client with the destination address, job subject line, and structured template pre-filled for you.
                      </p>
                    </div>

                    <div className="space-y-3 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-500 uppercase">To Recipient:</span>
                        <strong className="text-emerald-700 dark:text-emerald-400 font-mono text-sm">{targetEmail}</strong>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-500 uppercase">Subject Line:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{emailSubject}</span>
                      </div>

                      <div>
                        <span className="font-bold text-slate-500 uppercase block mb-1">Pre-filled Draft Body Preview:</span>
                        <pre className="p-3 rounded-lg bg-slate-100 dark:bg-slate-950 font-sans text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                          {emailDraftBody}
                        </pre>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <a
                        href={mailtoLink}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-[0.98]"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Open Email App with Pre-Filled Draft</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleCopyEmailDraft}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold hover:bg-white dark:hover:bg-slate-900 transition-colors"
                      >
                        {copiedDraft ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-600">Draft Details Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Email &amp; Draft Template</span>
                          </>
                        )}
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      * Remember to attach your CV, certified academic transcripts, and nursing certificates before hitting send in your email client.
                    </p>
                  </div>
                )}

                {/* TAB 3: Call / WhatsApp Direct Inquiry */}
                {activeTab === 'whatsapp' && job.contact_phone && (
                  <div className="space-y-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-6 border border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">
                        Telephone &amp; WhatsApp Inquiries
                      </span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        Connect with the Recruitment Desk
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                        You can send your inquiry or credentials directly to the designated recruitment phone number for this role:
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-[#00873E] flex items-center justify-center shrink-0">
                        <Phone className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 font-medium">Recruitment Contact:</span>
                        <h4 className="text-lg font-black text-slate-900 dark:text-white font-mono">
                          {job.contact_phone}
                        </h4>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <a
                        href={`https://wa.me/${cleanPhone}?text=Hello%20RCSN%20Recruitment,%20I%20am%20inquiring%20about%20the%20${encodeURIComponent(
                          job.title
                        )}%20vacancy.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white text-xs sm:text-sm font-bold shadow-md transition-all active:scale-[0.98]"
                      >
                        <MessageSquare className="w-4 h-4 fill-current" />
                        <span>Chat on WhatsApp</span>
                      </a>

                      <a
                        href={`tel:${job.contact_phone}`}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-md transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Call Office Directly</span>
                      </a>
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
