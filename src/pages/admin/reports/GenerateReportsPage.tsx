/**
 * Student Report Generator – matches screenshot: Report Configuration card,
 * Report Template (auto-selected), Report Type, Current Term, Class, Student, Preview Report.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { createSnapshotFromExamSet } from '../../../services/snapshotLock';
import { PRIMARY_TEMPLATES, getTemplateForClass } from '../../../templates/primary';
import { getCurrentTerm } from '../../../lib/termStructure';

const STALE_TIME_MS = 5 * 60 * 1000;

type TermOption = { term: number; year: number };

type PageData = {
  schoolId: string;
  currentTerm: TermOption;
  allTerms: TermOption[];
  classes: string[];
  examSets: any[];
};

async function fetchPageData(userId: string): Promise<PageData | null> {
  const { data: u } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!u?.school_id) return null;

  const { data: terms } = await supabase
    .from('school_terms')
    .select('term, year, start_date, end_date')
    .eq('school_id', u.school_id)
    .order('year', { ascending: false })
    .order('term', { ascending: false });
  const todayStr = new Date().toISOString().slice(0, 10);
  const current =
    (terms || []).find(
      (t: { start_date?: string; end_date: string }) =>
        t.start_date && t.end_date && t.start_date <= todayStr && t.end_date >= todayStr
    ) || (terms?.[0] as { term: number; year: number });
  const fallback = getCurrentTerm();
  const currentTerm = current ? { term: current.term, year: current.year } : { term: fallback.term, year: fallback.year };

  const { data: classRows } = await supabase
    .from('classes')
    .select('class_name')
    .eq('school_id', u.school_id)
    .order('class_name');
  let classList: string[] = (classRows || []).map((r: { class_name: string }) => r.class_name);
  if (classList.length === 0) {
    const { data: students } = await supabase.from('students').select('current_class').eq('school_id', u.school_id);
    const set = new Set<string>();
    (students || []).forEach((s: { current_class?: string }) => s.current_class && set.add(s.current_class));
    classList = Array.from(set).sort();
  }

  const { data: sets } = await supabase
    .from('exam_sets')
    .select('id, name, term, year')
    .eq('school_id', u.school_id)
    .eq('is_active', true)
    .order('year', { ascending: false })
    .order('term', { ascending: false });

  const termSet = new Map<string, TermOption>();
  (terms || []).forEach((t: { term: number; year: number }) => {
    const key = `${t.term}-${t.year}`;
    if (!termSet.has(key)) termSet.set(key, { term: t.term, year: t.year });
  });
  (sets || []).forEach((es: { term: number; year: number }) => {
    const key = `${es.term}-${es.year}`;
    if (!termSet.has(key)) termSet.set(key, { term: es.term, year: es.year });
  });
  let allTerms = Array.from(termSet.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.term - a.term;
  });
  if (allTerms.length === 0) allTerms = [currentTerm];

  return {
    schoolId: u.school_id,
    currentTerm,
    allTerms,
    classes: classList,
    examSets: sets || [],
  };
}

async function fetchStudentsInClass(schoolId: string, className: string) {
  const { data } = await supabase
    .from('students')
    .select('student_id, name, admission_number, current_class')
    .eq('school_id', schoolId)
    .eq('current_class', className)
    .eq('status', 'active')
    .order('name');
  return (data || []) as { student_id: string; name: string; admission_number?: string; current_class: string }[];
}

export default function GenerateReportsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [reportType, setReportType] = useState<'single' | 'class'>('single');
  const [selectedTermKey, setSelectedTermKey] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [generatingStep, setGeneratingStep] = useState<'idle' | 'creating' | 'generating' | 'completed' | 'error'>('idle');
  const [completedSnapshotId, setCompletedSnapshotId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState('');

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['admin', 'student-report-generator', user?.id ?? ''],
    queryFn: () => fetchPageData(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const { data: studentsInClass = [] } = useQuery({
    queryKey: ['admin', 'students-in-class', pageData?.schoolId ?? '', selectedClass],
    queryFn: () => fetchStudentsInClass(pageData!.schoolId, selectedClass),
    enabled: !!pageData?.schoolId && !!selectedClass,
    staleTime: STALE_TIME_MS,
  });

  const templateDisplayName = useMemo(() => {
    if (!selectedClass) return 'Report For Baby Class';
    const key = getTemplateForClass(selectedClass);
    const t = PRIMARY_TEMPLATES[key as keyof typeof PRIMARY_TEMPLATES];
    return t?.name ?? 'Report For Baby Class';
  }, [selectedClass]);

  const selectedTerm = useMemo((): TermOption | null => {
    if (!pageData) return null;
    if (selectedTermKey) {
      const [t, y] = selectedTermKey.split('-').map(Number);
      if (!isNaN(t) && !isNaN(y)) return { term: t, year: y };
    }
    return pageData.currentTerm;
  }, [pageData, selectedTermKey]);

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentsInClass;
    const q = studentSearch.toLowerCase();
    return studentsInClass.filter(
      (s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.admission_number || '').toLowerCase().includes(q)
    );
  }, [studentsInClass, studentSearch]);

  const handlePreviewReport = async () => {
    if (!pageData?.schoolId) return;
    if (!selectedClass) {
      setError('Please select a class');
      return;
    }
    const term = selectedTerm || pageData.currentTerm;
    const examSet = pageData.examSets.find(
      (es: any) => es.term === term.term && es.year === term.year
    ) || pageData.examSets[0];
    if (!examSet) {
      setError(`No exam set found for Term ${term.term}, ${term.year}. Create an exam set for that term first.`);
      return;
    }
    if (reportType === 'single' && !selectedStudent) {
      setError('Please select a student');
      return;
    }
    setPreviewing(true);
    setError('');
    setGenerationError('');
    setCompletedSnapshotId(null);
    setGeneratingStep('creating');
    try {
      const snapshotId = await createSnapshotFromExamSet(
        pageData.schoolId,
        examSet.id,
        examSet.term,
        examSet.year
      );
      setGeneratingStep('generating');
      // Send Supabase URL/key so API works even when Vercel env vars are not available
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
      const apiRes = await fetch('/api/generate-reports-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshotId, supabaseUrl, supabaseAnonKey }),
      });
      const data = await apiRes.json().catch(() => ({}));
      if (!apiRes.ok) {
        const msg =
          typeof data?.error === 'string'
            ? data.error
            : apiRes.status === 500
              ? 'Server error. Check Vercel → Project → Settings → Environment Variables: add SUPABASE_URL and SUPABASE_ANON_KEY for Production/Preview, then redeploy.'
              : apiRes.statusText || 'Generation failed';
        throw new Error(msg);
      }
      if (!data?.success) throw new Error(data?.error || 'Generation failed');
      setCompletedSnapshotId(snapshotId);
      setGeneratingStep('completed');
    } catch (err: any) {
      setGenerationError(err.message || 'Failed to generate reports');
      setGeneratingStep('error');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header – exact from screenshot */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold">Student Report Generator</h1>
            <p className="text-white/80 text-sm mt-1">Generate and download student academic reports.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              Customize Header
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/reports')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Reports
            </button>
          </div>
        </div>

        {/* Report Configuration card – exact from screenshot */}
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6">
          <h2 className="text-white text-lg font-medium mb-4">Report Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Report Template – auto-selected, read-only display */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">
                Report Template
                <span className="ml-2 text-xs text-emerald-400 font-normal">✓ Auto-selected</span>
              </label>
              <div className="relative flex items-center rounded-lg border border-white/20 bg-slate-900/40 px-3 py-2 text-white/90">
                <span>{templateDisplayName}</span>
                <span className="ml-2 text-emerald-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
              <p className="mt-1 text-xs text-white/50">
                Template automatically selected based on class section to ensure consistent formatting.
              </p>
            </div>

            {/* Report Type */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value as 'single' | 'class');
                  setSelectedStudent('');
                }}
                className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="single" className="text-black">Single Student</option>
                <option value="class" className="text-black">Entire Class</option>
              </select>
            </div>

            {/* Term – choose any term (defaults to current) */}
            {pageData && pageData.allTerms.length > 0 && (
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Term</label>
                <select
                  value={selectedTermKey || `${pageData.currentTerm.term}-${pageData.currentTerm.year}`}
                  onChange={(e) => setSelectedTermKey(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {pageData.allTerms.map((t) => {
                    const key = `${t.term}-${t.year}`;
                    const isCurrent =
                      t.term === pageData.currentTerm.term && t.year === pageData.currentTerm.year;
                    return (
                      <option key={key} value={key} className="text-black">
                        Term {t.term}, {t.year}{isCurrent ? ' (Current)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1 text-xs text-white/50">
                  Choose the term for which to generate reports.
                </p>
              </div>
            )}

            {/* Class */}
            <div>
              <label className="block text-white/80 text-sm font-medium mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedStudent('');
                  setStudentSearch('');
                }}
                className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="" className="text-white/70">Select Class</option>
                {pageData?.classes.map((c) => (
                  <option key={c} value={c} className="text-black">{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Student – only when Single Student */}
          {reportType === 'single' && (
            <div className="mb-6">
              <label className="block text-white/80 text-sm font-medium mb-2">Student</label>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or admission number"
                className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white placeholder-white/50 focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
              />
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full rounded-lg border border-white/20 bg-slate-900/60 px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="" className="text-white/70">Select Student</option>
                {filteredStudents.map((s) => (
                  <option key={s.student_id} value={s.student_id} className="text-black">
                    {s.name} {s.admission_number ? `(${s.admission_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {generatingStep === 'creating' && (
            <div className="mb-4 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
              Preparing snapshot…
            </div>
          )}
          {generatingStep === 'generating' && (
            <div className="mb-4 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-200">
              Generating reports…
            </div>
          )}
          {generatingStep === 'completed' && completedSnapshotId && (
            <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200 flex items-center justify-between gap-3">
              <span>Reports ready.</span>
              <a
                href={`/dashboard/admin/reports/viewer?snapshot=${completedSnapshotId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
              >
                View reports
              </a>
            </div>
          )}
          {generatingStep === 'error' && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              <p className="font-medium">{generationError}</p>
              <p className="mt-1 text-xs text-red-200/90">
                If it keeps failing: Vercel → Settings → Environment Variables (SUPABASE_URL, SUPABASE_ANON_KEY); redeploy; or check Vercel → Deployments → Functions → Logs.
              </p>
              <button
                type="button"
                onClick={() => { setGeneratingStep('idle'); setGenerationError(''); void handlePreviewReport(); }}
                className="mt-2 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handlePreviewReport}
            disabled={previewing || !selectedClass || (reportType === 'single' && !selectedStudent)}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {previewing ? (generatingStep === 'creating' ? 'Preparing…' : 'Generating…') : 'Preview Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
