import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Upload, Download, Trash2, FileText, Loader2, AlertCircle, HardDrive, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const MAX_FILE_BYTES = 30 * 1024 * 1024;   // 30 MB per file
const QUOTA_BYTES    = 200 * 1024 * 1024;  // 200 MB total per teacher

function fmtBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024)        return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

type Resource = {
  id: string;
  display_name: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number;
  storage_path: string;
  created_at: string;
};

async function fetchResources(teacherId: string, schoolId: string): Promise<Resource[]> {
  const { data, error } = await supabase
    .from('teacher_resources')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Resource[];
}

export default function ResourcesPage() {
  const user      = useAuthStore((s) => s.user);
  const schoolId  = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? '';
  const teacherId = user?.id ?? '';

  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['teacher-resources', teacherId, schoolId],
    queryFn: () => fetchResources(teacherId, schoolId),
    enabled: !!teacherId && !!schoolId,
  });

  const usedBytes   = resources.reduce((s, r) => s + r.file_size_bytes, 0);
  const usedPct     = Math.min(100, (usedBytes / QUOTA_BYTES) * 100);
  const quotaFull   = usedBytes >= QUOTA_BYTES;
  const quotaColor  = usedPct > 85 ? 'bg-red-500' : usedPct > 60 ? 'bg-amber-500' : 'bg-emerald-500';

  const handleUpload = useCallback(async () => {
    setUploadError(null);
    const name = displayName.trim();
    if (!name) { setUploadError('Enter a name for this file first.'); return; }
    const file = fileRef.current?.files?.[0];
    if (!file) { setUploadError('Choose a file to upload.'); return; }
    if (file.size > MAX_FILE_BYTES) { setUploadError(`File is too large (${fmtBytes(file.size)}). Maximum is 30 MB.`); return; }
    if (usedBytes + file.size > QUOTA_BYTES) {
      setUploadError(`Not enough storage. You have ${fmtBytes(QUOTA_BYTES - usedBytes)} remaining.`);
      return;
    }
    setUploading(true);
    try {
      const ext   = file.name.split('.').pop() ?? 'bin';
      const path  = `${teacherId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('teacher-resources').upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('teacher_resources').insert({
        school_id: schoolId,
        teacher_id: teacherId,
        display_name: name,
        storage_path: path,
        original_filename: file.name,
        mime_type: file.type || null,
        file_size_bytes: file.size,
      });
      if (insErr) {
        // Cleanup orphan from storage
        await supabase.storage.from('teacher-resources').remove([path]);
        throw insErr;
      }
      setDisplayName('');
      if (fileRef.current) fileRef.current.value = '';
      void qc.invalidateQueries({ queryKey: ['teacher-resources', teacherId, schoolId] });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [displayName, usedBytes, teacherId, schoolId, qc]);

  const handleDownload = useCallback(async (resource: Resource) => {
    const { data, error } = await supabase.storage
      .from('teacher-resources')
      .createSignedUrl(resource.storage_path, 120);
    if (error || !data?.signedUrl) { alert('Could not generate download link.'); return; }
    const ext = resource.original_filename?.includes('.')
      ? resource.original_filename.split('.').pop()
      : resource.storage_path.split('.').pop();
    const filename = ext ? `${resource.display_name}.${ext}` : resource.display_name;
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
      // Fallback: open in new tab (still hides the storage path somewhat)
      window.open(data.signedUrl, '_blank');
    }
  }, []);

  const deleteMutation = useMutation({
    mutationFn: async (resource: Resource) => {
      setDeletingId(resource.id);
      await supabase.storage.from('teacher-resources').remove([resource.storage_path]);
      const { error } = await supabase.from('teacher_resources').delete().eq('id', resource.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['teacher-resources', teacherId, schoolId] });
    },
    onError: (err: unknown) => {
      alert(err instanceof Error ? err.message : 'Delete failed.');
    },
    onSettled: () => setDeletingId(null),
  });

  return (
    <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Book className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold ac-text-primary">Resources</h1>
          <p className="text-sm ac-text-muted mt-0.5">Upload teaching materials your students and colleagues can access.</p>
        </div>
      </div>

      {/* Storage quota bar */}
      <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold ac-text-primary">
            <HardDrive className="w-4 h-4 text-blue-400" />
            Storage used
          </div>
          <span className="text-sm ac-text-muted">{fmtBytes(usedBytes)} / {fmtBytes(QUOTA_BYTES)}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${quotaColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${usedPct}%` }}
            transition={{ duration: 0.6 }}
          />
        </div>
        {quotaFull && (
          <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Storage full — delete files to free space before uploading.
          </p>
        )}
      </div>

      {/* Upload form */}
      <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] p-5 space-y-3">
        <p className="text-sm font-semibold ac-text-primary">Upload a new resource</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setUploadError(null); }}
              placeholder="e.g. Mathematics Notes Term 2"
              disabled={uploading || quotaFull}
              className="w-full bg-white/5 border border-[var(--ac-border)] ac-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold ac-text-muted uppercase tracking-wider mb-1">
              File <span className="normal-case text-white/30">(max 30 MB)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              disabled={uploading || quotaFull}
              onChange={() => setUploadError(null)}
              className="w-full text-sm ac-text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600/80 file:text-white hover:file:bg-blue-600 disabled:opacity-40"
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
          disabled={uploading || quotaFull || !displayName.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
      </div>

      {/* File list */}
      <div className="ac-glass-card rounded-xl border border-[var(--ac-border)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--ac-border)] bg-white/[0.03] flex items-center justify-between">
          <span className="text-sm font-semibold ac-text-primary">Your files</span>
          <span className="text-xs ac-text-muted">{resources.length} file{resources.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 ac-text-muted p-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!isLoading && resources.length === 0 && (
          <div className="p-10 text-center">
            <FileText className="w-10 h-10 text-white/15 mx-auto mb-2" />
            <p className="text-sm ac-text-muted">No files uploaded yet. Use the form above to add your first resource.</p>
          </div>
        )}

        <AnimatePresence>
          {resources.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 px-5 py-3 border-b border-[var(--ac-border)] last:border-0 hover:bg-white/[0.02]"
            >
              <FileText className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium ac-text-primary truncate">{r.display_name}</p>
                <p className="text-xs ac-text-muted">
                  {fmtBytes(r.file_size_bytes)}
                  {r.original_filename ? ` · ${r.original_filename}` : ''}
                  {' · '}{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                title="Download"
                onClick={() => handleDownload(r)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-blue-400 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Delete"
                onClick={() => {
                  if (window.confirm(`Delete "${r.display_name}"? This cannot be undone.`)) {
                    deleteMutation.mutate(r);
                  }
                }}
                disabled={deletingId === r.id}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors shrink-0 disabled:opacity-40"
              >
                {deletingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
