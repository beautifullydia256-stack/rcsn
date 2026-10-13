import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Share2,
  Check,
  Users,
  Clock,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import SeoHead from '@/components/website/SeoHead';
import { parseJobDescription } from '@/lib/parseJobDescription';

interface Job {
  job_id: string;
  school_id?: string;
  title: string;
  location: string | null;
  description: string | null;
  posted_by: string | null;
  status: string;
  created_at: string;
  application_deadline?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  submission_address?: string | null;
  poster_url?: string | null;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .in('status', ['Open', 'open', 'Active', 'active'])
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (isMounted) {
          setJobs(data || []);
        }
      } catch (e) {
        console.error('Error fetching jobs:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchJobs();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleShare = (jobId: string) => {
    const origin = window.location.origin;
    const url = `${origin}/careers/${jobId}/apply`;
    navigator.clipboard.writeText(url);
    setCopiedId(jobId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <SeoHead
        title="Careers | Rakai Community School of Nursing"
        description="Explore career opportunities and open vacancies at Rakai Community School of Nursing. Apply online for academic, administrative, and support staff positions."
      />

      <RcsnNavbar />

      <main className="flex-1">
        {/* Compact Careers Header */}
        <section className="bg-gradient-to-r from-[#004720] via-[#005C29] to-[#007033] text-white py-6 sm:py-8 border-b border-emerald-800/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Careers
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 max-w-lg mx-auto">
              Current job openings and career opportunities at RCSN.
            </p>
          </div>
        </section>

        {/* Content & Job Listings Area */}
        <section className="py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            {/* List / Grid of Jobs */}
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-slate-500">Loading vacancies…</p>
              </div>
            ) : jobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-10 sm:p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center max-w-2xl mx-auto space-y-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#00873E] dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <Briefcase className="w-8 h-8" />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  No Open Vacancies Currently Advertised
                </h3>
                
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                  There are currently no open vacancies. Please check back regularly for new postings.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-5">
                {jobs.map((job, index) => (
                  <motion.div
                    key={job.job_id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-emerald-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="space-y-3.5 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Actively Recruiting</span>
                        </span>

                        {job.application_deadline && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 text-xs font-bold border border-amber-500/20">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              Deadline: {new Date(job.application_deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </span>
                        )}

                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                        {job.title}
                      </h2>

                      <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{job.location || 'RCSN Main Campus, Rakai Town'}</span>
                        </span>
                        {job.posted_by && (
                          <span className="flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>HR Recruitment Desk</span>
                          </span>
                        )}
                      </div>

                      {/* Structured or fallback description */}
                      {(() => {
                        const parsed = parseJobDescription(job.description);
                        if (parsed.isStructured) {
                          return (
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              {/* Job Title line */}
                              <div className="flex flex-wrap items-baseline gap-2 text-xs sm:text-sm">
                                <span className="font-bold text-slate-900 dark:text-white shrink-0">JOB TITLE:</span>
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {parsed.jobTitle || job.title}
                                </span>
                              </div>

                              {/* Reports To line */}
                              {parsed.reportsTo && (
                                <div className="flex flex-wrap items-baseline gap-2 text-xs sm:text-sm">
                                  <span className="font-bold text-slate-900 dark:text-white shrink-0">REPORTS TO:</span>
                                  <span className="font-medium text-slate-800 dark:text-slate-200">
                                    {parsed.reportsTo}
                                  </span>
                                </div>
                              )}

                              {/* Job Purpose line / paragraph */}
                              {parsed.jobPurpose && (
                                <div className="text-xs sm:text-sm pt-0.5 space-y-0.5">
                                  <span className="block font-bold text-slate-900 dark:text-white">JOB PURPOSE</span>
                                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                    {parsed.jobPurpose}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        }

                        return (
                          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                            {job.description || 'Join our clinical instructors and educators shaping healthcare practice in Uganda.'}
                          </p>
                        );
                      })()}
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      <Link
                        to={`/careers/${job.job_id}/apply`}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white text-sm font-bold shadow-md transition-all active:scale-[0.98] w-full sm:w-auto"
                      >
                        <span>Apply Online</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleShare(job.job_id)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Copy Application Link"
                      >
                        {copiedId === job.job_id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600 font-bold">Link Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Share Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <RcsnFooter />
    </div>
  );
}
