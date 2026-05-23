import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, Upload, Download, Trash2, FileText, Loader2, AlertCircle, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

const MAX_FILE_BYTES = 100 * 1024 * 1024;

const CATEGORIES = ['General', 'Mathematics', 'Science', 'English', 'Social Studies', 'Technology', 'Arts', 'Other'];

function fmtBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

type LibraryFile = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  display_name: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number;
  storage_path: string;
  downloads: number;
  created_at: string;
};

async function fetchLibraryFiles(): Promise<LibraryFile[]> {
  const { data, error } = await supabase
    .from('educational_library')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as LibraryFile[];
}

async function downloadLibraryFile(file: LibraryFile) {
  // Public bucket — build direct public URL
  const { data } = supabase.storage.from('educational-library').getPublicUrl(file.storage_path);
  if (!data?.publicUrl) { alert('Could not build download URL.'); return; }
  const ext = file.original_filename?.includes('.')
    ? file.original_filename.split('.').pop()
    : file.storage_path.split('.').pop();
  const filename = ext ? `${file.display_name}.${ext}` : file.display_name;
  try {
    const resp = await fetch(data.publicUrl);
    const blob = await resp.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    // Increment download counter (fire-and-forget)
    void supabase.rpc('increment_library_downloads', { file_id: file.id }).then(() => null, () => null);
  } catch {
    window.open(data.publicUrl, '_blank');
  }
}

export default function EducationalLibraryPage() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState('All');

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['educational-library'],
    queryFn: fetchLibraryFiles,
  });

  const handleUpload = useCallback(async () => {
    setUploadError(null);
    const t = title.trim();
    const dn = displayName.trim();
    if (!t) { setUploadError('Enter a title for this resource.'); return; }
    if (!dn) { setUploadError('Enter a display name (used as the download filename).'); return; }
    const file = fileRef.current?.files?.[0];
    if (!file) { setUploadError('Choose a file to upload.'); return; }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError(`File too large (${fmtBytes(file.size)}). Maximum is 100 MB.`);
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${category.toLowerCase().replace(/\s+/g, '-')}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('educational-library').upload(path, file);
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from('educational_library').insert({
        title: t,
        display_name: dn,
        description: description.trim() || null,
        category,
        storage_path: path,
        original_filename: file.name,
        mime_type: file.type || null,
        file_size_bytes: file.size,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) {
        await supabase.storage.from('educational-library').remove([path]);
        throw insErr;
      }
      setTitle('');
      setDisplayName('');
      setDescription('');
      if (fileRef.current) fileRef.current.value = '';
      void qc.invalidateQueries({ queryKey: ['educational-library'] });
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [title, displayName, description, category, user, qc]);

  const deleteMutation = useMutation({
    mutationFn: async (file: LibraryFile) => {
      setDeletingId(file.id);
      await supabase.storage.from('educational-library').remove([file.storage_path]);
      const { error } = await supabase.from('educational_library').delete().eq('id', file.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['educational-library'] }),
    onError: (err: unknown) => alert(err instanceof Error ? err.message : 'Delete failed.'),
    onSettled: () => setDeletingId(null),
  });

  const displayed = filterCategory === 'All' ? files : files.filter((f) => f.category === filterCategory);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Library className="w-8 h-8 text-violet-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Educational Library</h1>
          <p className="text-sm text-white/50 mt-0.5">
            Upload publicly downloadable educational resources. Anyone can browse and download from the public /library page.
          </p>
        </div>
      </div>

      {/* Upload Form */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-white">Add a new resource</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setUploadError(null); }}
              placeholder="e.g. Introduction to Algebra"
              disabled={uploading}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-40 placeholder:text-white/25"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
              Download filename <span className="normal-case text-white/25">(what users see)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setUploadError(null); }}
              placeholder="e.g. Algebra Guide for Beginners"
              disabled={uploading}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-40 placeholder:text-white/25"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={uploading}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-40"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-gray-900">{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
              File <span className="normal-case text-white/25">(max 100 MB)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              disabled={uploading}
              onChange={() => setUploadError(null)}
              className="w-full text-sm text-white/50 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-600/80 file:text-white hover:file:bg-violet-600 disabled:opacity-40"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">
              Description <span className="normal-case text-white/25">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description shown to users on the public library page…"
              disabled={uploading}
              rows={2}
              className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-40 placeholder:text-white/25 resize-none"
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
          disabled={uploading || !title.trim() || !displayName.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Publish Resource'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {['All', ...CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilterCategory(c)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filterCategory === c
                ? 'bg-violet-600 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* File list */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Published resources</span>
          <span className="text-xs text-white/40">{displayed.length} file{displayed.length !== 1 ? 's' : ''}</span>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-white/50 p-6">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}

        {!isLoading && displayed.length === 0 && (
          <div className="p-10 text-center">
            <Library className="w-10 h-10 text-white/15 mx-auto mb-2" />
            <p className="text-sm text-white/40">No resources yet. Upload one above.</p>
          </div>
        )}

        <AnimatePresence>
          {displayed.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02]"
            >
              <FileText className="w-4 h-4 text-violet-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{f.title}</p>
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-xs text-white/40">{fmtBytes(f.file_size_bytes)}</span>
                  <span className="flex items-center gap-1 text-xs text-violet-400/70">
                    <Tag className="w-2.5 h-2.5" />{f.category}
                  </span>
                  <span className="text-xs text-white/40">
                    {new Date(f.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-white/30">{f.downloads} downloads</span>
                </div>
                {f.description && (
                  <p className="text-xs text-white/35 mt-0.5 truncate">{f.description}</p>
                )}
              </div>
              <button
                type="button"
                title="Download"
                onClick={() => void downloadLibraryFile(f)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-violet-400 transition-colors shrink-0"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                title="Delete"
                onClick={() => {
                  if (window.confirm(`Delete "${f.title}"? This will remove it from the public library permanently.`)) {
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
      </div>
    </div>
  );
}
