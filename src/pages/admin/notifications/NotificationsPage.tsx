import { useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Inbox, Send } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

const INBOX_QUERY_KEY = (userId: string) => ['admin', 'notifications', 'inbox', userId] as const;

export async function fetchNotificationsPage(userId: string): Promise<{ schoolId: string; classes: string[] }> {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return { schoolId: '', classes: [] };
  const { data: classData } = await supabase
    .from('students')
    .select('current_class')
    .eq('school_id', data.school_id)
    .eq('status', 'active');
  const unique = classData
    ? [...new Set(classData.map((s: { current_class?: string }) => s.current_class).filter((c): c is string => Boolean(c)))].sort()
    : [];
  return { schoolId: data.school_id, classes: unique };
}

export type InAppNotificationRow = {
  id: string;
  title: string;
  body: string | null;
  category: string | null;
  read_at: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
};

export async function fetchInAppNotificationsInbox(userId: string): Promise<InAppNotificationRow[]> {
  const { data, error } = await supabase
    .from('user_in_app_notifications')
    .select('id, title, body, category, read_at, created_at, metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []) as InAppNotificationRow[];
}

type TabId = 'inbox' | 'tools';

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabId>('inbox');
  const [markingAll, setMarkingAll] = useState(false);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('announcement');
  const [priority, setPriority] = useState('medium');
  const [targetClass, setTargetClass] = useState('all');
  const [sending, setSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testSubject, setTestSubject] = useState('PwezaCore test');
  const [testMessage, setTestMessage] = useState('Hello from PwezaCore – test email.');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('Hello from PwezaCore – test WhatsApp.');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [processingLogs, setProcessingLogs] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'notifications', user?.id ?? ''],
    queryFn: () => fetchNotificationsPage(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const {
    data: inboxItems = [],
    isLoading: inboxLoading,
  } = useQuery({
    queryKey: user?.id ? INBOX_QUERY_KEY(user.id) : ['admin', 'notifications', 'inbox', ''],
    queryFn: () => fetchInAppNotificationsInbox(user!.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  const schoolId = data?.schoolId ?? null;
  const classes = data?.classes ?? [];
  const loading = isLoading;

  const refreshInbox = () => {
    if (user?.id) queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY(user.id) });
  };

  const markRead = async (id: string) => {
    const readAt = new Date().toISOString();
    const { error } = await supabase.from('user_in_app_notifications').update({ read_at: readAt }).eq('id', id);
    if (!error) {
      queryClient.setQueryData<InAppNotificationRow[]>(INBOX_QUERY_KEY(user!.id), (prev) =>
        (prev || []).map((n) => (n.id === id ? { ...n, read_at: readAt } : n))
      );
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    setMarkingAll(true);
    try {
      const readAt = new Date().toISOString();
      const { error } = await supabase
        .from('user_in_app_notifications')
        .update({ read_at: readAt })
        .eq('user_id', user.id)
        .is('read_at', null);
      if (!error) refreshInbox();
    } finally {
      setMarkingAll(false);
    }
  };

  const unread = inboxItems.filter((n) => !n.read_at);
  const readList = inboxItems.filter((n) => n.read_at);

  const sendAnnouncement = async () => {
    if (!schoolId || !title || !message) {
      alert('Please fill in title and message');
      return;
    }
    setSending(true);
    try {
      let studentsQuery = supabase
        .from('students')
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('status', 'active');
      if (targetClass !== 'all') studentsQuery = studentsQuery.eq('current_class', targetClass);
      const { data: students, error: studentsError } = await studentsQuery;
      if (studentsError) throw studentsError;
      if (!students?.length) {
        alert('No students found for the selected criteria');
        setSending(false);
        return;
      }
      let successCount = 0;
      for (const student of students) {
        const { error } = await supabase.rpc('send_notification', {
          p_school_id: schoolId,
          p_student_id: student.student_id,
          p_category: category,
          p_title: title,
          p_message: message,
          p_priority: priority,
        });
        if (!error) successCount++;
      }
      alert(`Announcement queued. Sent to ${successCount} students.`);
      setTitle('');
      setMessage('');
      setCategory('announcement');
      setPriority('medium');
      setTargetClass('all');
    } catch (e) {
      console.error(e);
      alert('Error sending announcement. The send_notification RPC may not be set up.');
    } finally {
      setSending(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.trim() || !testMessage.trim()) {
      setTestResult({ ok: false, message: 'Enter email address and message.' });
      return;
    }
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail.trim(),
          subject: testSubject.trim() || 'PwezaCore test',
          message: testMessage.trim(),
        }),
      });

      const raw = await res.text();
      let parsed: { success?: boolean; error?: string; id?: string } | null = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore non-JSON
      }

      if (!res.ok || !parsed?.success) {
        setTestResult({
          ok: false,
          message: parsed?.error || `Email test failed (${res.status}). ${raw ? `Server said: ${raw.slice(0, 120)}...` : ''}`,
        });
        return;
      }

      setTestResult({
        ok: true,
        message: parsed?.id
          ? `Sent. Resend id: ${parsed.id}. Check inbox and Resend → Logs.`
          : 'Sent. Check inbox and Resend → Logs.',
      });
    } catch (e) {
      setTestResult({ ok: false, message: String(e) });
    } finally {
      setTestSending(false);
    }
  };

  const sendTestWhatsApp = async () => {
    if (!waPhone.trim() || !waMessage.trim()) {
      setWaResult({ ok: false, message: 'Enter phone and message.' });
      return;
    }
    setWaSending(true);
    setWaResult(null);
    try {
      const res = await fetch('/api/notifications/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: waPhone.trim(), message: waMessage.trim() }),
      });
      const raw = await res.text();
      let parsed: { success?: boolean; error?: string; status?: string } | null = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore non-JSON
      }
      if (!res.ok || !parsed?.success) {
        setWaResult({
          ok: false,
          message: parsed?.error || `Request failed (${res.status}). ${raw ? raw.slice(0, 100) : ''}`,
        });
        return;
      }
      setWaResult({
        ok: true,
        message: `Accepted. Status: ${parsed.status || 'SENT'}. Uganda (+256) only.`,
      });
    } catch (e) {
      setWaResult({ ok: false, message: String(e) });
    } finally {
      setWaSending(false);
    }
  };

  const processPending = async () => {
    setProcessingLogs(true);
    try {
      const res = await fetch('/api/notifications/send', { method: 'POST' });
      const raw = await res.text();
      let parsed: { success?: boolean; sent?: number; failed?: number; error?: string } | null = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore non-JSON
      }
      if (!parsed) {
        alert(`Process failed (${res.status}). ${raw ? `Server said: ${raw.slice(0, 120)}...` : ''}`);
        return;
      }
      alert(parsed.success ? `Sent: ${parsed.sent}, Failed: ${parsed.failed}` : parsed.error || `Process failed (${res.status}).`);
    } catch (e) {
      alert(String(e));
    } finally {
      setProcessingLogs(false);
    }
  };

  if (loading && tab === 'tools') {
    return (
      <AdminPageWrapper title="Notifications">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-green-600" />
        </div>
      </AdminPageWrapper>
    );
  }

  const tabBtn = (id: TabId, label: string, icon: ReactNode) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      className={[
        'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
        tab === id
          ? 'bg-[#10d9a8]/20 text-[#14f0bb] border border-[#10d9a8]/40'
          : 'ac-text-secondary border border-transparent hover:ac-text-primary hover:bg-white/5',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <AdminPageWrapper
      title="Notifications"
      subtitle="Your in-app inbox and tools to broadcast to parents or test delivery channels"
    >
      <div className="flex flex-wrap gap-2 mb-6">
        {tabBtn('inbox', 'Inbox', <Inbox className="h-4 w-4 shrink-0" />)}
        {tabBtn('tools', 'Send & test', <Send className="h-4 w-4 shrink-0" />)}
      </div>

      {tab === 'inbox' && (
        <div className="space-y-6">
          <div className={`${adminCardClass} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <h2 className="text-lg font-semibold ac-text-primary">In-app notification center</h2>
              <p className="text-sm ac-text-secondary mt-0.5">
                New items stay at the top. Open a notification to mark it read.
              </p>
            </div>
            {unread.length > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                disabled={markingAll}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium ac-text-primary hover:bg-white/10 disabled:opacity-50"
              >
                {markingAll ? 'Marking…' : `Mark all read (${unread.length})`}
              </button>
            )}
          </div>

          {inboxLoading ? (
            <div className="ac-text-muted py-8">Loading…</div>
          ) : (
            <div className="space-y-8">
              <section>
                <h2 className="text-sm font-semibold ac-text-primary mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  Unread ({unread.length})
                </h2>
                {unread.length === 0 ? (
                  <p className="text-sm ac-text-muted">No new notifications.</p>
                ) : (
                  <ul className="space-y-2">
                    {unread.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                      >
                        <button
                          type="button"
                          className="w-full text-left p-4"
                          onClick={() => void markRead(n.id)}
                        >
                          <div className="flex justify-between gap-2">
                            <span className="font-medium ac-text-primary">{n.title}</span>
                            <span className="text-xs ac-text-muted shrink-0">
                              {new Date(n.created_at).toLocaleString()}
                            </span>
                          </div>
                          {n.body ? <p className="text-sm ac-text-secondary mt-1">{n.body}</p> : null}
                          {n.category ? (
                            <span className="inline-block mt-2 text-[10px] uppercase tracking-wide text-amber-400/90 bg-amber-500/15 px-2 py-0.5 rounded">
                              {n.category}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h2 className="text-sm font-semibold ac-text-secondary mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  Read
                </h2>
                {readList.length === 0 ? (
                  <p className="text-sm ac-text-muted">No read notifications yet.</p>
                ) : (
                  <ul className="space-y-2 opacity-90">
                    {readList.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium ac-text-primary">{n.title}</span>
                          <span className="text-xs ac-text-muted shrink-0">
                            {n.read_at ? new Date(n.read_at).toLocaleString() : ''}
                          </span>
                        </div>
                        {n.body ? <p className="text-sm ac-text-secondary mt-1">{n.body}</p> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>
      )}

      {tab === 'tools' && (
        <div className="space-y-6">
          <div className={adminCardClass}>
            <h2 className="text-lg font-semibold ac-text-primary mb-3">Quick actions</h2>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => void sendTestEmail()} disabled={testSending} className="rounded-xl border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{testSending ? 'Sending…' : 'Send test email'}</button>
              <button type="button" onClick={() => void sendTestWhatsApp()} disabled={waSending} className="rounded-xl border border-green-500 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">{waSending ? 'Sending…' : 'Send test WhatsApp'}</button>
              <button type="button" onClick={() => void processPending()} disabled={processingLogs} className="rounded-xl border border-green-500 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">{processingLogs ? 'Processing…' : 'Process pending'}</button>
            </div>
          </div>
          <div className={`${adminCardClass} border-2 border-blue-500/40`}>
            <h2 className="text-lg font-semibold ac-text-primary mb-1">Send test email</h2>
            <p className="text-sm ac-text-secondary mb-3">Uses Resend with your verified domain. Set RESEND_API_KEY and RESEND_FROM on the server (e.g. Vercel).</p>
            <div className="space-y-2">
              <input type="email" value={testEmail} onChange={(e) => { setTestEmail(e.target.value); setTestResult(null); }} placeholder="recipient@example.com" className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 ac-text-primary placeholder:text-white/50" />
              <input type="text" value={testSubject} onChange={(e) => { setTestSubject(e.target.value); setTestResult(null); }} placeholder="Subject (optional)" className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 ac-text-primary placeholder:text-white/50" />
              <textarea value={testMessage} onChange={(e) => { setTestMessage(e.target.value); setTestResult(null); }} rows={2} placeholder="Message" className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 ac-text-primary placeholder:text-white/50" />
              {testResult && <p className={testResult.ok ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>{testResult.message}</p>}
              <button type="button" onClick={() => void sendTestEmail()} disabled={testSending || !testEmail.trim() || !testMessage.trim()} className="rounded-xl border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Send test email</button>
            </div>
          </div>
          <div className={`${adminCardClass} border-2 border-green-500/40`}>
            <h2 className="text-lg font-semibold ac-text-primary mb-1">Send test WhatsApp</h2>
            <p className="text-sm ac-text-secondary mb-3">Uganda (+256) only. Set AFRICASTALKING_WHATSAPP_NUMBER in Vercel.</p>
            <div className="space-y-2">
              <input type="text" value={waPhone} onChange={(e) => { setWaPhone(e.target.value); setWaResult(null); }} placeholder="0712345678 or +256…" className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 ac-text-primary placeholder:text-white/50" />
              <textarea value={waMessage} onChange={(e) => { setWaMessage(e.target.value); setWaResult(null); }} rows={2} placeholder="Message" className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 ac-text-primary placeholder:text-white/50" />
              {waResult && <p className={waResult.ok ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>{waResult.message}</p>}
              <button type="button" onClick={() => void sendTestWhatsApp()} disabled={waSending || !waPhone.trim() || !waMessage.trim()} className="rounded-xl border border-green-500 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">Send test WhatsApp</button>
            </div>
          </div>
          <div className={`${adminCardClass} space-y-4`}>
            <h2 className="text-lg font-semibold ac-text-primary">Send announcement</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium ac-text-secondary mb-1">Title</label>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 ac-text-primary placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Announcement title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium ac-text-secondary mb-1">Category</label>
                <select
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 ac-text-primary focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="announcement">Announcement</option>
                  <option value="academic">Academic</option>
                  <option value="attendance">Attendance</option>
                  <option value="financial">Financial</option>
                  <option value="event">Event</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium ac-text-secondary mb-1">Message</label>
              <textarea
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 ac-text-primary placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                placeholder="Message content"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium ac-text-secondary mb-1">Priority</label>
                <select
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 ac-text-primary focus:outline-none focus:ring-2 focus:ring-green-500"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium ac-text-secondary mb-1">Target class</label>
                <select
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 ac-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                >
                  <option value="all">All classes</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void sendAnnouncement()}
              disabled={sending}
              className="rounded-xl border border-green-500 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Send announcement'}
            </button>
          </div>
        </div>
      )}
    </AdminPageWrapper>
  );
}
