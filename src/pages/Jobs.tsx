import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  MapPin,
  Calendar,
  Search,
  ArrowRight,
  CheckCircle2,
  Share2,
  Check,
  Building2,
  Mail,
  ShieldCheck,
  Award,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import RcsnNavbar from '@/components/website/RcsnNavbar';
import RcsnFooter from '@/components/website/RcsnFooter';
import SeoHead from '@/components/website/SeoHead';

interface Job {
  job_id: string;
  school_id: string;
  title: string;
  location: string | null;
  description: string | null;
  posted_by: string | null;
  status: string;
  created_at: string;
}

export default function Jobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return jobs;
    const q = searchQuery.toLowerCase();
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        (j.location && j.location.toLowerCase().includes(q)) ||
        (j.description && j.description.toLowerCase().includes(q))
    );
  }, [jobs, searchQuery]);

  const handleShare = (jobId: string) => {
    const origin = window.location.origin;
    const url = `${origin}/jobs/${jobId}/apply`;
    navigator.clipboard.writeText(url);
    setCopiedId(jobId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      <SeoHead
        title="Careers & Job Vacancies | Rakai Community School of Nursing"
        description="Explore career opportunities at Rakai Community School of Nursing. Apply online for clinical instructor, nurse tutor, medical lecturer, and staff positions."
      />

      <RcsnNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#004720] via-[#005C29] to-[#007033] text-white py-16 sm:py-20 lg:py-24">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs sm:text-sm font-bold uppercase tracking-wider">
              <Briefcase className="w-4 h-4 text-emerald-300" />
              <span>Institutional Careers & Vacancies</span>
            </span>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
              Work With Rakai Community School of Nursing
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-emerald-100/90 max-w-3xl mx-auto leading-relaxed">
              Join our dedicated team of healthcare educators, clinical preceptors, tutors, and administrative leaders. Shape the future of compassionate patient care in Uganda.
            </p>

            {/* Quick Stats Pills */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-emerald-200 font-medium">
              <span className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10">
                <Building2 className="w-4 h-4 text-emerald-300" />
                <span>Rakai Town Campus</span>
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>MoES & UNMEB Center: U028</span>
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-white/10">
                <Award className="w-4 h-4 text-amber-300" />
                <span>20+ Years Excellence</span>
              </span>
            </div>
          </div>
        </section>

        {/* Content & Job Listings Area */}
        <section className="py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by job title, department, or keyword…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00873E]"
                />
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                <span>
                  Showing <strong className="text-slate-900 dark:text-white">{filteredJobs.length}</strong> {filteredJobs.length === 1 ? 'vacancy' : 'vacancies'}
                </span>
              </div>
            </div>

            {/* List / Grid of Jobs */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-slate-500">Loading current vacancies from RCSN Registry…</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-10 sm:p-16 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center max-w-2xl mx-auto space-y-5"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#00873E] dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <Briefcase className="w-8 h-8" />
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {searchQuery ? 'No Openings Match Your Search' : 'No Open Vacancies Currently Advertised'}
                </h3>
                
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                  {searchQuery
                    ? `No vacancies found matching "${searchQuery}". Please try another keyword or clear your search.`
                    : 'Our team is fully staffed at this time. All new positions for nurse tutors, laboratory instructors, clinical mentors, and support personnel are posted live directly from our administrative panel.'}
                </p>

                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs sm:text-sm font-bold shadow hover:bg-black transition-colors"
                    >
                      Clear Search
                    </button>
                  ) : (
                    <>
                      <Link
                        to="/contact"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00873E] text-white text-xs sm:text-sm font-bold shadow hover:bg-[#007033] transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Inquire with HR Office</span>
                      </Link>
                      <Link
                        to="/"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <span>Return to Home</span>
                      </Link>
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="space-y-5">
                {filteredJobs.map((job, index) => (
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

                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                        {job.description || 'Join our clinical instructors and educators shaping healthcare practice in Uganda.'}
                      </p>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                      <Link
                        to={`/jobs/${job.job_id}/apply`}
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
