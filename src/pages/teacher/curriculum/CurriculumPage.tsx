import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Download, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTeacherContext } from '../useTeacherContext';

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
  const { classNames, isLoading: ctxLoading } = useTeacherContext();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const filesByClass = classNames.reduce<Record<string, CurriculumFile[]>>((acc, cls) => {
    acc[cls] = files.filter((f) => f.class_name === cls);
    return acc;
  }, {});

  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="w-8 h-8 text-indigo-400" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Curriculum</h1>
          <p className="text-sm ac-text-muted mt-0.5">
            Official curriculum documents for your assigned classes — download any time.
          </p>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 ac-text-muted py-8">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading your classes…</span>
        </div>
      )}

      {/* No classes assigned */}
      {!isLoading && classNames.length === 0 && (
        <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-10 text-center">
          <BookOpen className="w-12 h-12 text-indigo-400/40 mx-auto mb-3" />
          <p className="font-semibold ac-text-primary mb-1">No classes assigned yet</p>
          <p className="text-sm ac-text-muted">
            Once you are assigned to classes, their curriculum documents will appear here.
          </p>
        </div>
      )}

      {/* Class curriculum cards */}
      {!isLoading && classNames.length > 0 && (
        <div className="space-y-4">
          {classNames.map((cls, i) => {
            const clsFiles = filesByClass[cls] ?? [];
            return (
              <motion.div
                key={cls}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="ac-glass-card rounded-xl border border-[var(--ac-border)] overflow-hidden"
              >
                {/* Class header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--ac-border)] bg-white/[0.03]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-indigo-400" />
                    </div>
                    <span className="font-semibold ac-text-primary">{cls}</span>
                  </div>
                  <span className="text-xs ac-text-muted">
                    {clsFiles.length} file{clsFiles.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {clsFiles.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <FileText className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-sm ac-text-muted">No curriculum files uploaded yet for this class.</p>
                    <p className="text-xs ac-text-muted mt-1 opacity-60">
                      Files added by the administration will appear here with a download button.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {clsFiles.map((f) => (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-3 px-5 py-3 border-b border-[var(--ac-border)] last:border-0 hover:bg-white/[0.02]"
                      >
                        <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium ac-text-primary truncate">{f.display_name}</p>
                          <p className="text-xs ac-text-muted">
                            {fmtBytes(f.file_size_bytes)}
                            {f.original_filename ? ` · ${f.original_filename}` : ''}
                            {' · '}{new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <button
                          type="button"
                          title="Download"
                          onClick={() => void handleDownload(f)}
                          disabled={downloadingId === f.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 text-xs font-semibold transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {downloadingId === f.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          {downloadingId === f.id ? 'Downloading…' : 'Download'}
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
