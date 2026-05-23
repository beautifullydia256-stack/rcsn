import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

type LibraryItem = {
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

const CATEGORIES = ['All', 'Mathematics', 'Science', 'English', 'Social Studies', 'Technology', 'Arts', 'General', 'Other'];

function fmtBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${b} B`;
}

async function handleDownload(item: LibraryItem) {
  const { data } = supabase.storage.from('educational-library').getPublicUrl(item.storage_path);
  if (!data?.publicUrl) { alert('Download link unavailable. Please try again later.'); return; }
  const ext = item.original_filename?.includes('.')
    ? item.original_filename.split('.').pop()
    : item.storage_path.split('.').pop();
  const filename = ext ? `${item.display_name}.${ext}` : item.display_name;
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
    // Increment counter (fire-and-forget)
    void supabase.rpc('increment_library_downloads', { file_id: item.id }).then(() => null, () => null);
  } catch {
    window.open(data.publicUrl, '_blank');
  }
}

export default function Library() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('educational_library')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setItems((data ?? []) as LibraryItem[]);
      } catch (e) {
        console.error('Library fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = items.filter((item) => {
    const matchCat = category === 'All' || item.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || item.title.toLowerCase().includes(q) || (item.description ?? '').toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  return (
    <>
      {/* SEO meta — injected via document for SPA; a proper SSR/SSG setup would put these in <head> */}
      <title>Educational Library — Free Learning Resources | PwezaCore</title>

      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        {/* Nav */}
        <nav className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center">
                <h1 className="text-2xl font-bold text-blue-600">PwezaCore</h1>
              </Link>
              <div className="flex items-center gap-4">
                <Link to="/" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors text-sm">Home</Link>
                <Link to="/jobs" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-colors text-sm">Jobs</Link>
                <Link to="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">Sign In</Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-5xl font-extrabold mb-4"
            >
              Educational Library
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-blue-100 max-w-2xl mx-auto mb-8"
            >
              Free educational resources for students, teachers, and parents — download any time, no account required.
            </motion.p>

            {/* Search bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="max-w-xl mx-auto"
            >
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search resources…"
                className="w-full px-5 py-3 rounded-xl text-gray-900 placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-lg"
              />
            </motion.div>
          </div>
        </div>

        {/* Category filter */}
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-16 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    category === c
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {search || category !== 'All' ? 'No matching resources' : 'No resources yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {search || category !== 'All'
                  ? 'Try a different search term or category.'
                  : 'Educational resources will appear here once they are published.'}
              </p>
            </motion.div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {filtered.length} resource{filtered.length !== 1 ? 's' : ''}
                {category !== 'All' ? ` in ${category}` : ''}
                {search ? ` matching "${search}"` : ''}
              </p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filtered.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 dark:border-slate-700 flex flex-col"
                  >
                    <div className="p-6 flex-1">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 shrink-0">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3 mb-3">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="px-6 pb-5 flex items-center justify-between gap-2">
                      <div className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
                        <div>{fmtBytes(item.file_size_bytes)}</div>
                        <div>{item.downloads} downloads</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDownload(item)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-slate-700 mt-12 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          <p>© {new Date().getFullYear()} PwezaCore · Free educational resources for everyone</p>
          <div className="flex justify-center gap-6 mt-3">
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link to="/privacy-policy" className="hover:text-blue-600 transition-colors">Privacy Policy</Link>
            <Link to="/login" className="hover:text-blue-600 transition-colors">Sign In</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
