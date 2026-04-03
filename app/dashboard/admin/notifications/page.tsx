'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DashboardBackground from '@/src/components/ui/DashboardBackground';
import { Bell, Check, Inbox } from 'lucide-react';

type InAppRow = {
  id: string;
  title: string;
  body: string | null;
  category: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InAppRow[]>([]);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const { data, error } = await supabase
      .from('user_in_app_notifications')
      .select('id, title, body, category, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) setItems(data as InAppRow[]);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: string) => {
    await supabase
      .from('user_in_app_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  const unread = items.filter((n) => !n.read_at);
  const read = items.filter((n) => n.read_at);

  return (
    <DashboardBackground>
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/30">
            <Inbox className="w-7 h-7 text-amber-200" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Notification center</h1>
            <p className="text-white/70 text-sm">
              New items stay at the top. Open a notification to mark it read.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-white/60">Loading…</div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-300" />
                Unread ({unread.length})
              </h2>
              {unread.length === 0 ? (
                <p className="text-white/50 text-sm">No new notifications.</p>
              ) : (
                <ul className="space-y-2">
                  {unread.map((n) => (
                    <motion.li
                      key={n.id}
                      layout
                      className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <button
                        type="button"
                        className="w-full text-left p-4"
                        onClick={() => markRead(n.id)}
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium text-white">{n.title}</span>
                          <span className="text-xs text-white/45 shrink-0">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                        {n.body ? <p className="text-white/70 text-sm mt-1">{n.body}</p> : null}
                        {n.category ? (
                          <span className="inline-block mt-2 text-[10px] uppercase tracking-wide text-amber-200/80 bg-amber-500/15 px-2 py-0.5 rounded">
                            {n.category}
                          </span>
                        ) : null}
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                <Check className="w-4 h-4 text-white/50" />
                Read
              </h2>
              {read.length === 0 ? (
                <p className="text-white/40 text-sm">No read notifications yet.</p>
              ) : (
                <ul className="space-y-2 opacity-80">
                  {read.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="font-medium text-white/85">{n.title}</span>
                        <span className="text-xs text-white/40 shrink-0">
                          {n.read_at ? new Date(n.read_at).toLocaleString() : ''}
                        </span>
                      </div>
                      {n.body ? <p className="text-white/55 text-sm mt-1">{n.body}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </DashboardBackground>
  );
}
