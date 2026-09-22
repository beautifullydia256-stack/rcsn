import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Download, FileText, Loader2, Search,
  GraduationCap, Layers, Award, CheckCircle2, FileCheck
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTeacherContext } from '../useTeacherContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';

type CurriculumFile = {
  id: string;
  class_name: string;
  display_name: string;
  original_filename: string | null;
  file_size_bytes: number;
  storage_path: string;
  created_at: string;
};

function fmtBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

async function fetchFilesForClasses(classNames: string[]): Promise<CurriculumFile[]> {
  if (classNames.length === 0) return [];
  const { data, error } = await supabase
    .from('curriculum_files')
    .select('id, class_name, display_name, original_filename, file_size_bytes, storage_path, created_at')
    .in('class_name', classNames)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CurriculumFile[];
}

async function downloadFile(file: CurriculumFile) {
  const { data, error } = await supabase.storage
    .from('curriculum-files')
    .createSignedUrl(file.storage_path, 120);
  if (error || !data?.signedUrl) { alert('Could not generate download link.'); return; }
  const ext = file.original_filename?.includes('.')
    ? file.original_filename.split('.').pop()
    : file.storage_path.split('.').pop();
  const filename = ext ? `${file.display_name}.${ext}` : file.display_name;
  try {
    const resp = await fetch(data.signedUrl);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(data.signedUrl, '_blank');
  }
}

export default function CurriculumPage() {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const { classNames, isLoading: ctxLoading } = useTeacherContext();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const handleDownload = async (file: CurriculumFile) => {
    if (downloadingId) return;
    setDownloadingId(file.id);
    try {
      await downloadFile(file);
    } finally {
      setDownloadingId(null);
    }
  };

  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['curriculum-files-teacher', classNames],
    queryFn: () => fetchFilesForClasses(classNames),
    enabled: classNames.length > 0,
  });

  const isLoading = ctxLoading || filesLoading;

  const filteredClassNames = useMemo(() => {
    if (selectedClass === 'all') return classNames;
    return classNames.filter((c) => c === selectedClass);
  }, [classNames, selectedClass]);

  const filesByClass = classNames.reduce<Record<string, CurriculumFile[]>>((acc, cls) => {
    acc[cls] = files.filter(
      (f) =>
        f.class_name === cls &&
        (!searchQuery.trim() ||
          f.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (f.original_filename && f.original_filename.toLowerCase().includes(searchQuery.toLowerCase())))
    );
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" style={{ color: t.textPrimary }}>
      {/* Header Banner */}
      <div
        className="rounded-2xl p-6 border transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: t.textPrimary }}>
                Curriculum & Syllabus Repository
              </h1>
              <p className="text-sm font-medium mt-0.5" style={{ color: t.textMuted }}>
                Official national curriculum frameworks, competency guides, and syllabi for your assigned classes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5"
              style={{
                background: 'rgba(16, 185, 129, 0.1)',
                borderColor: 'rgba(16, 185, 129, 0.2)',
                color: '#10b981',
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              NCDC / UNEB Aligned
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Assigned Cohorts
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {classNames.length} Classes
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Active teaching streams
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1' }}
          >
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Curriculum Files
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandMint }}>
              {files.length} Docs
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Uploaded guides & syllabi
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: t.brandMint }}
          >
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Syllabus Standard
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandGold }}>
              Competency
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Revised Ugandan curriculum
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: t.brandGold }}
          >
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Access Mode
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandBlue }}>
              Offline Ready
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Download & save locally
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
          >
            <Download className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="rounded-2xl p-4 border flex flex-col sm:flex-row items-center justify-between gap-3 transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedClass('all')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 active:scale-95"
            style={{
              background: selectedClass === 'all' ? t.brandBlue : t.surface,
              borderColor: selectedClass === 'all' ? t.brandBlue : t.border,
              color: selectedClass === 'all' ? '#ffffff' : t.textMuted,
            }}
          >
            All Classes
          </button>
          {classNames.map((cls) => (
            <button
              key={cls}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shrink-0 active:scale-95"
              style={{
                background: selectedClass === cls ? t.brandBlue : t.surface,
                borderColor: selectedClass === cls ? t.brandBlue : t.border,
                color: selectedClass === cls ? '#ffffff' : t.textMuted,
              }}
            >
              {cls}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: t.textSub }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents…"
            className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            style={{
              background: t.surface,
              borderColor: t.border,
              color: t.textPrimary,
            }}
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-12 gap-3" style={{ color: t.textMuted }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: t.brandBlue }} />
          <span className="text-sm font-medium">Loading syllabus guides…</span>
        </div>
      )}

      {/* No Classes State */}
      {!isLoading && classNames.length === 0 && (
        <div
          className="rounded-2xl p-12 border text-center transition-all"
          style={{ background: t.card, borderColor: t.border }}
        >
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: t.textPrimary }} />
          <p className="text-base font-bold" style={{ color: t.textPrimary }}>
            No classes assigned yet
          </p>
          <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: t.textMuted }}>
            Once you are assigned to classes by the school administrator, their syllabus and curriculum documents will appear here.
          </p>
        </div>
      )}

      {/* Class Curriculum Cards */}
      {!isLoading && classNames.length > 0 && (
        <div className="space-y-4">
          {filteredClassNames.map((cls, i) => {
            const clsFiles = filesByClass[cls] ?? [];
            return (
              <motion.div
                key={cls}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border overflow-hidden transition-all"
                style={{ background: t.card, borderColor: t.border }}
              >
                <div
                  className="px-5 py-3.5 border-b flex items-center justify-between"
                  style={{ background: t.surface, borderColor: t.border }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: '#6366f1',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      }}
                    >
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm" style={{ color: t.textPrimary }}>
                      {cls}
                    </span>
                  </div>

                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                    style={{ background: t.card, borderColor: t.border, color: t.textMuted }}
                  >
                    {clsFiles.length} {clsFiles.length === 1 ? 'document' : 'documents'}
                  </span>
                </div>

                {clsFiles.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: t.textPrimary }} />
                    <p className="text-xs font-bold" style={{ color: t.textPrimary }}>
                      No curriculum files published for {cls}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                      Files uploaded by the administration for this class will appear here for download.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: t.border }}>
                    <AnimatePresence>
                      {clsFiles.map((f) => (
                        <motion.div
                          key={f.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="p-4 sm:px-5 flex items-center justify-between gap-4 transition-colors hover:bg-black/5 dark:hover:bg-white/[0.03]"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                              style={{
                                background: 'rgba(99, 102, 241, 0.1)',
                                color: '#6366f1',
                                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                              }}
                            >
                              <FileText className="w-4 h-4" />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate" style={{ color: t.textPrimary }}>
                                {f.display_name}
                              </p>
                              <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: t.textMuted }}>
                                <span className="font-semibold">{fmtBytes(f.file_size_bytes)}</span>
                                {f.original_filename && (
                                  <>
                                    <span>·</span>
                                    <span className="truncate max-w-[220px]">{f.original_filename}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            title="Download document"
                            onClick={() => void handleDownload(f)}
                            disabled={downloadingId === f.id}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                            style={{
                              background: t.surface,
                              borderColor: t.border,
                              color: t.brandBlue,
                            }}
                          >
                            {downloadingId === f.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>{downloadingId === f.id ? 'Downloading…' : 'Download'}</span>
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
