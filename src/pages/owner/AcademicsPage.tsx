import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Upload, Download, Trash2, FileText, Loader2, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const ALL_CLASSES = [
  'Baby Class', 'Middle Class', 'Top Class',
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4',
  'Primary 5', 'Primary 6', 'Primary 7',
  'Senior 1', 'Senior 2', 'Senior 3',
  'Senior 4', 'Senior 5', 'Senior 6',
];

const MAX_FILE_BYTES = 50 * 1024 * 1024;

function fmtBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

type CurriculumFile = {
  id: string;
  class_name: string;
  display_name: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number;
  storage_path: string;
  created_at: string;
};

async function fetchCurriculumFiles(): Promise<CurriculumFile[]> {
  const { data, error } = await supabase
    .from('curriculum_files')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CurriculumFile[];
}

async function downloadCurriculumFile(file: CurriculumFile) {
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

export default function AcademicsPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedClass, setSelectedClass] = useState(ALL_CLASSES[0]);
  const [displayName, setDisplayName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['curriculum-files'],
    queryFn: fetchCurriculumFiles,
  });

  const handleUpload = useCallback(async () => {
    setUploadError(null);
    const name = displayName.trim();
    if (!name) { setUploadError('Enter a display name for this file.'); return; }
    const file = fileRef.current?.files?.[0];
    if (!file) { setUploadError('Choose a file to upload.'); return; }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(`File too large (${fmtBytes(file.size)}). Maximum is 50 MB.`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${selectedClass.replace(/\s+/g, '-').toLowerCase()}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('curriculum-files').upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('curriculum_files').insert({
        class_name: selectedClass,
        display_name: name,
        storage_path: path,
        original_filename: file.name,
        mime_type: file.type || null,
        file_size_bytes: file.size,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) {
        await supabase.storage.from('curriculum-files').remove([path]);
        throw insErr;
      }
      setDisplayName('');
      if (fileRef.current) fileRef.current.value = '';
      void qc.invalidateQueries({ queryKey: ['curriculum-files'] });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [displayName, selectedClass, user, qc]);

  const deleteMutation = useMutation({
    mutationFn: async (file: CurriculumFile) => {
      setDeletingId(file.id);
      await supabase.storage.from('curriculum-files').remove([file.storage_path]);
      const { error } = await supabase.from('curriculum_files').delete().eq('id', file.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['curriculum-files'] }),
    onError: (err: unknown) => alert(err instanceof Error ? err.message : 'Delete failed.'),
    onSettled: () => setDeletingId(null),
  });

  const filesByClass = ALL_CLASSES.reduce<Record<string, CurriculumFile[]>>((acc, cls) => {
    acc[cls] = files.filter((f) => f.class_name === cls);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BookOpen className="w-8 h-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Curriculum Management</h1>
          <p className="text-sm text-white/50 mt-0.5">
            Upload official curriculum documents for each class. Teachers can download these from their Curriculum page.
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-white">Upload curriculum file</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={uploading}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-40"
            >
              {ALL_CLASSES.map((cls) => (
                <option key={cls} value={cls} className="bg-gray-900">{cls}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setUploadError(null); }}
              placeholder="e.g. Primary 3 Curriculum 2025"
              disabled={uploading}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-40 placeholder:text-white/25"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
              File <span className="normal-case text-white/25">(max 50 MB)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              disabled={uploading}
              onChange={() => setUploadError(null)}
              className="w-full text-sm text-white/50 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-600/80 file:text-white hover:file:bg-cyan-600 disabled:opacity-40"
            />
          </div>
        </div>

        {uploadError && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{uploadError}
          </p>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !displayName.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {/* Files by class */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-white/50 py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <div className="space-y-3">
          {ALL_CLASSES.map((cls, i) => {
            const clsFiles = filesByClass[cls];
            return (
              <motion.div
                key={cls}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-white">{cls}</span>
                  </div>
                  <span className="text-xs text-white/40">
                    {clsFiles.length} file{clsFiles.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {clsFiles.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-white/30 italic">No files uploaded yet.</div>
                ) : (
                  <AnimatePresence>
                    {clsFiles.map((f) => (
                      <motion.div
                        key={f.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]"
                      >
                        <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{f.display_name}</p>
                          <p className="text-xs text-white/40">
                            {fmtBytes(f.file_size_bytes)}
                            {f.original_filename ? ` · ${f.original_filename}` : ''}
                            {' · '}{new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <button
                          type="button"
                          title="Download"
                          onClick={() => void downloadCurriculumFile(f)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-cyan-400 transition-colors shrink-0"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => {
                            if (window.confirm(`Delete "${f.display_name}" from ${f.class_name}? This cannot be undone.`)) {
                              deleteMutation.mutate(f);
                            }
                          }}
                          disabled={deletingId === f.id}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors shrink-0 disabled:opacity-40"
                        >
                          {deletingId === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
    </div>
  );
}
