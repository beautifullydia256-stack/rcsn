import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Save, Loader2, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function WindowsAppPage() {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('platform_config')
        .select('value')
        .eq('key', 'windows_app_url')
        .single();
      setUrl((data as { value?: string } | null)?.value ?? '');
      setLoading(false);
    };
    void load();
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const { error: err } = await supabase
        .from('platform_config')
        .upsert({ key: 'windows_app_url', value: url.trim(), updated_at: new Date().toISOString() });
      if (err) throw err;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Monitor className="w-8 h-8 text-sky-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Windows App</h1>
          <p className="text-sm text-white/50 mt-0.5">
            Paste the download URL for the Windows desktop installer. The /apps page will use this link for the Windows download button.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-white/50 py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Windows installer download URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setSaved(false); setError(null); }}
              placeholder="https://cdn.example.com/pwezacore-setup.exe"
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-white/20"
            />
            <p className="text-xs text-white/35 mt-2">
              Paste a direct link to the .exe or .msi installer (e.g. from GitHub Releases, CDN, or any file host). Anyone who clicks "Download for Windows" on the public apps page will be sent to this URL.
            </p>
          </div>

          {url && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
              <ExternalLink className="w-4 h-4 text-sky-400 shrink-0" />
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-sky-400 hover:underline truncate"
              >
                {url}
              </a>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </p>
          )}

          <motion.button
            type="button"
            onClick={handleSave}
            disabled={saving || !url.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving…' : saved ? 'Saved!' : 'Save URL'}
          </motion.button>
        </div>
      )}

      {/* Info box */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-5 space-y-2 text-sm text-white/50">
        <p className="font-semibold text-white/70">How this works</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Paste your Windows installer URL above and click Save.</li>
          <li>The public <span className="text-sky-400">/apps</span> page fetches this value on load.</li>
          <li>When a visitor clicks "Download for Windows", their browser opens this URL and the file downloads automatically.</li>
          <li>You can update the URL at any time to point to a new version — the public page always reads the latest saved value.</li>
        </ul>
      </div>
    </div>
  );
}
