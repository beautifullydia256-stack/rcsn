"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function InventoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [rows, setRows] = useState<any[]>([]);
  const [onlyNeedsRestock, setOnlyNeedsRestock] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
        if (!u?.school_id) { setError('Unable to determine school'); return; }
        setSchoolId(u.school_id);
        await fetchInventory(u.school_id);
      } catch (e) {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const fetchInventory = async (sid: string) => {
    const { data } = await supabase
      .from('library_inventory_check')
      .select('*')
      .eq('school_id', sid)
      .order('needs_restock', { ascending: false })
      .order('borrows_last_90d', { ascending: true })
      .order('last_borrowed_at', { ascending: true, nullsFirst: true });
    setRows(data || []);
  };

  const filtered = rows
    .filter(r => (onlyNeedsRestock ? r.needs_restock : true))
    .filter(r => (category ? r.category === category : true))
    .filter(r => (search ? (r.title?.toLowerCase().includes(search.toLowerCase()) || r.author?.toLowerCase().includes(search.toLowerCase())) : true));

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64"><div className="text-white">Loading...</div></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white text-3xl font-bold">Inventory</h1>
              <p className="text-white/80 text-sm mt-1">Check availability and restock needs</p>
            </div>
            <button onClick={() => router.push('/dashboard/librarian')} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15">Back</button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 flex flex-wrap gap-3 items-center">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title/author" className="px-3 py-2 rounded bg-white/10 border border-white/10 text-white" />
          <label className="flex items-center gap-2 text-white/80 text-sm">
            <input type="checkbox" checked={onlyNeedsRestock} onChange={(e) => setOnlyNeedsRestock(e.target.checked)} />
            Needs restock
          </label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded bg-white/10 border border-white/10 text-white">
            <option value="">All categories</option>
            {[...new Set(rows.map(r => r.category).filter(Boolean))].map((c: any) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-white/70 text-sm">No items</p>
          ) : filtered.map(r => (
            <div key={r.book_id} className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-white/70">{r.author}</p>
                <p className="text-xs text-white/60 mt-1">Copies: {r.available_copies}/{r.total_copies} · Last borrowed: {r.last_borrowed_at ? new Date(r.last_borrowed_at).toLocaleDateString() : '—'}</p>
              </div>
              {r.needs_restock && (
                <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs">Needs restock</span>
              )}
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}


