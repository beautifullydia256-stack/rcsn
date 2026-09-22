import { useState, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Upload, Download, Trash2, FileText, Loader2,
  AlertCircle, HardDrive, Search, FileSpreadsheet, FileCode,
  Image as ImageIcon, File, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';

const MAX_FILE_BYTES = 30 * 1024 * 1024;   // 30 MB per file
const QUOTA_BYTES    = 200 * 1024 * 1024;  // 200 MB total per teacher

function fmtBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024)        return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

function getFileIcon(filename: string | null, mime: string | null) {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || mime?.startsWith('image/')) {
    return { icon: ImageIcon, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' };
  }
  if (['xls', 'xlsx', 'csv'].includes(ext) || mime?.includes('spreadsheet') || mime?.includes('excel')) {
    return { icon: FileSpreadsheet, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
  }
  if (['pdf'].includes(ext) || mime?.includes('pdf')) {
    return { icon: FileText, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
  }
  if (['doc', 'docx'].includes(ext) || mime?.includes('word')) {
    return { icon: FileText, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
  }
  if (['html', 'js', 'json', 'py', 'ts'].includes(ext)) {
    return { icon: FileCode, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
  }
  return { icon: File, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' };
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
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const user      = useAuthStore((s) => s.user);
  const schoolId  = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? '';
  const teacherId = user?.id ?? '';

  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ['teacher-resources', teacherId, schoolId],
    queryFn: () => fetchResources(teacherId, schoolId),
    enabled: !!teacherId && !!schoolId,
  });

  const usedBytes   = resources.reduce((s, r) => s + r.file_size_bytes, 0);
  const usedPct     = Math.min(100, Math.round((usedBytes / QUOTA_BYTES) * 100));
  const remainingBytes = Math.max(0, QUOTA_BYTES - usedBytes);
  const quotaFull   = usedBytes >= QUOTA_BYTES;

  const filteredResources = useMemo(() => {
    if (!searchQuery.trim()) return resources;
    const q = searchQuery.toLowerCase();
    return resources.filter(
      (r) =>
        r.display_name.toLowerCase().includes(q) ||
        (r.original_filename && r.original_filename.toLowerCase().includes(q))
    );
  }, [resources, searchQuery]);

  const handleUpload = useCallback(async () => {
    setUploadError(null);
    setUploadSuccess(false);
    const name = displayName.trim();
    if (!name) { setUploadError('Please enter a display name for this file.'); return; }
    const file = fileRef.current?.files?.[0];
    if (!file) { setUploadError('Please choose a file to upload.'); return; }
    if (file.size > MAX_FILE_BYTES) { setUploadError(`File is too large (${fmtBytes(file.size)}). Maximum allowed is 30 MB.`); return; }
    if (usedBytes + file.size > QUOTA_BYTES) {
      setUploadError(`Not enough storage quota remaining. You have ${fmtBytes(remainingBytes)} free.`);
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
        await supabase.storage.from('teacher-resources').remove([path]);
        throw insErr;
      }
      setDisplayName('');
      if (fileRef.current) fileRef.current.value = '';
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 4000);
      void qc.invalidateQueries({ queryKey: ['teacher-resources', teacherId, schoolId] });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please check network connectivity.');
    } finally {
      setUploading(false);
    }
  }, [displayName, usedBytes, remainingBytes, teacherId, schoolId, qc]);

  const handleDownload = useCallback(async (resource: Resource) => {
    const { data, error } = await supabase.storage
      .from('teacher-resources')
      .createSignedUrl(resource.storage_path, 120);
    if (error || !data?.signedUrl) { alert('Could not generate secure download link.'); return; }
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
      alert(err instanceof Error ? err.message : 'Delete operation failed.');
    },
    onSettled: () => setDeletingId(null),
  });

  const gaugeRatio = Math.min(1, Math.max(0, usedPct / 100));
  const gaugeDashOffset = 113.1 * (1 - gaugeRatio);

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
              style={{ background: 'rgba(59, 130, 246, 0.15)', color: t.brandBlue }}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: t.textPrimary }}>
                Teacher Cloud Storage
              </h1>
              <p className="text-sm font-medium mt-0.5" style={{ color: t.textMuted }}>
                Secure teaching materials, syllabi, schemes of work, and student worksheets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5"
              style={{
                background: quotaFull ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                borderColor: quotaFull ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: quotaFull ? '#ef4444' : '#10b981',
              }}
            >
              <HardDrive className="w-3.5 h-3.5" />
              {quotaFull ? 'Quota Full' : `${fmtBytes(remainingBytes)} Free`}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid with 180-deg Semi-circle Progress Gauge */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Storage Gauge */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between transition-all"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Storage Usage
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {usedPct}%
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              {fmtBytes(usedBytes)} of {fmtBytes(QUOTA_BYTES)}
            </span>
          </div>
          {/* Calibrated 180° semi-circle SVG */}
          <div className="relative w-20 h-12 flex items-end justify-center">
            <svg viewBox="0 0 84 46" className="w-20 h-12 overflow-visible">
              <path
                d="M 6 42 A 36 36 0 0 1 78 42"
                fill="none"
                stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                strokeWidth="7"
                strokeLinecap="round"
              />
              <path
                d="M 6 42 A 36 36 0 0 1 78 42"
                fill="none"
                stroke={usedPct > 85 ? '#ef4444' : usedPct > 60 ? '#f59e0b' : t.brandBlue}
                strokeWidth="7"
                strokeDasharray="113.1"
                strokeDashoffset={gaugeDashOffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Total Files */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Files Stored
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.textPrimary }}>
              {resources.length}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Class notes & worksheets
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}
          >
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Free Capacity */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Free Quota
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandMint }}>
              {fmtBytes(remainingBytes)}
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Available capacity
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: t.brandMint }}
          >
            <HardDrive className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Max File Size Limit */}
        <div
          className="rounded-xl p-5 border flex items-center justify-between"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider block" style={{ color: t.textMuted }}>
              Max File Limit
            </span>
            <div className="text-2xl font-black mt-1" style={{ color: t.brandGold }}>
              30 MB
            </div>
            <span className="text-xs mt-1 block font-medium" style={{ color: t.textSub }}>
              Per individual document
            </span>
          </div>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(245, 158, 11, 0.12)', color: t.brandGold }}
          >
            <Upload className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Upload Zone & Form */}
      <div
        className="rounded-2xl p-6 border transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-4 h-4" style={{ color: t.brandBlue }} />
          <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
            Upload Teaching Resource
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
              Resource Title / Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setUploadError(null); }}
              placeholder="e.g. Primary 5 Science Term 2 Revision Notes"
              disabled={uploading || quotaFull}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
              style={{
                background: t.surface,
                borderColor: t.border,
                color: t.textPrimary,
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: t.textMuted }}>
              File Selection (PDF, Word, Excel, Images · max 30 MB) *
            </label>
            <input
              ref={fileRef}
              type="file"
              disabled={uploading || quotaFull}
              onChange={() => setUploadError(null)}
              className="w-full text-sm font-medium rounded-xl border px-3 py-1.5 focus:outline-none file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50 transition-all cursor-pointer"
              style={{
                background: t.surface,
                borderColor: t.border,
                color: t.textMuted,
              }}
            />
          </div>
        </div>

        {uploadError && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>File uploaded successfully to cloud repository!</span>
          </div>
        )}

        {quotaFull && (
          <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Your 200 MB storage quota is completely full. Delete older files to free space.</span>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading || quotaFull || !displayName.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all shadow-md active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: t.brandBlue }}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? 'Uploading to Cloud…' : 'Upload Resource'}</span>
          </button>
        </div>
      </div>

      {/* Files Section with Search & Action Controls */}
      <div
        className="rounded-2xl border overflow-hidden transition-all"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div
          className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ borderColor: t.border, background: t.surface }}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
              Your Uploaded Files
            </h2>
            <span
              className="text-xs font-bold px-2.5 py-0.5 rounded-full"
              style={{ background: t.border, color: t.textMuted }}
            >
              {resources.length}
            </span>
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
                background: t.card,
                borderColor: t.border,
                color: t.textPrimary,
              }}
            />
          </div>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center p-12 gap-3" style={{ color: t.textMuted }}>
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: t.brandBlue }} />
            <span className="text-sm font-medium">Loading your cloud documents…</span>
          </div>
        )}

        {!isLoading && filteredResources.length === 0 && (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: t.textPrimary }} />
            <p className="text-base font-bold" style={{ color: t.textPrimary }}>
              {resources.length === 0 ? 'No files uploaded yet' : 'No matching files found'}
            </p>
            <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: t.textMuted }}>
              {resources.length === 0
                ? 'Upload lesson plans, syllabus guidelines, and worksheets to access them anywhere.'
                : 'Try adjusting your search keywords.'}
            </p>
          </div>
        )}

        {!isLoading && filteredResources.length > 0 && (
          <div className="divide-y" style={{ borderColor: t.border }}>
            <AnimatePresence>
              {filteredResources.map((r) => {
                const typeInfo = getFileIcon(r.original_filename, r.mime_type);
                const IconComponent = typeInfo.icon;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 sm:px-5 flex items-center justify-between gap-4 transition-colors hover:bg-black/5 dark:hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{
                          background: typeInfo.bg,
                          color: typeInfo.color,
                          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: t.textPrimary }}>
                          {r.display_name}
                        </p>
                        <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap" style={{ color: t.textMuted }}>
                          <span className="font-semibold">{fmtBytes(r.file_size_bytes)}</span>
                          {r.original_filename && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[200px]">{r.original_filename}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>
                            {new Date(r.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        title="Download file"
                        onClick={() => handleDownload(r)}
                        className="p-2 rounded-xl border transition-all active:scale-95"
                        style={{
                          background: t.surface,
                          borderColor: t.border,
                          color: t.brandBlue,
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        title="Delete file"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${r.display_name}"?`)) {
                            deleteMutation.mutate(r);
                          }
                        }}
                        disabled={deletingId === r.id}
                        className="p-2 rounded-xl border transition-all active:scale-95 text-red-400 hover:bg-red-500/10 border-red-500/20 disabled:opacity-40"
                      >
                        {deletingId === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
