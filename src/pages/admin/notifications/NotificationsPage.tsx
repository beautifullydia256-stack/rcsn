import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../../components/layout/AdminPageWrapper';

const STALE_TIME_MS = 5 * 60 * 1000;

async function fetchNotificationsPage(userId: string): Promise<{ schoolId: string; classes: string[] }> {
  const { data } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  if (!data?.school_id) return { schoolId: '', classes: [] };
  const { data: classData } = await supabase
    .from('students')
    .select('current_class')
    .eq('school_id', data.school_id)
    .eq('status', 'active');
  const unique = classData ? [...new Set(classData.map((s: any) => s.current_class).filter(Boolean))].sort() : [];
  return { schoolId: data.school_id, classes: unique };
}

export default function NotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('announcement');
  const [priority, setPriority] = useState('medium');
  const [targetClass, setTargetClass] = useState('all');
  const [sending, setSending] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from PwezaCore – test SMS.');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [processingLogs, setProcessingLogs] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'notifications', user?.id ?? ''],
    queryFn: () => fetchNotificationsPage(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  });

  const schoolId = data?.schoolId ?? null;
  const classes = data?.classes ?? [];
  const loading = isLoading;

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

  const sendTestSMS = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      setTestResult({ ok: false, message: 'Enter phone and message.' });
      return;
    }
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/notifications/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone.trim(), message: testMessage.trim() }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore non-JSON
      }

      if (!res.ok || !data?.success) {
        setTestResult({
          ok: false,
          message: data?.error || `SMS test failed (${res.status}). ${raw ? `Server said: ${raw.slice(0, 120)}...` : ''}`,
        });
        return;
      }

      const sandbox = data?.sandbox === true;
      setTestResult({
        ok: true,
        message: sandbox
          ? 'Accepted (sandbox). Sandbox does not deliver to real phones – use production to receive SMS.'
          : 'Sent. If not received: check Africa\'s Talking dashboard, credits, and number format (+254...).',
      });
    } catch (e) {
      setTestResult({ ok: false, message: String(e) });
    } finally {
      setTestSending(false);
    }
  };

  const processPending = async () => {
    setProcessingLogs(true);
    try {
      const res = await fetch('/api/notifications/send', { method: 'POST' });
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore non-JSON
      }
      if (!data) {
        alert(`Process failed (${res.status}). ${raw ? `Server said: ${raw.slice(0, 120)}...` : ''}`);
        return;
      }
      alert(data.success ? `Sent: ${data.sent}, Failed: ${data.failed}` : data.error || `Process failed (${res.status}).`);
    } catch (e) {
      alert(String(e));
    } finally {
      setProcessingLogs(false);
    }
  };

  if (loading) {
    return (
      <AdminPageWrapper title="Notifications">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-green-600" />
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <AdminPageWrapper title="Notifications" subtitle="Send announcements and view notification stats">
      <div className="space-y-6">
        <div className={adminCardClass}>
          <h2 className="text-lg font-semibold text-white mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={sendTestSMS} disabled={testSending} className="rounded-xl border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{testSending ? 'Sending...' : '📱 Send test SMS'}</button>
            <button type="button" onClick={processPending} disabled={processingLogs} className="rounded-xl border border-green-500 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">{processingLogs ? 'Processing...' : '📤 Process Pending'}</button>
          </div>
        </div>
        <div className={`${adminCardClass} border-2 border-blue-500/40`}>
          <h2 className="text-lg font-semibold text-white mb-1">📱 Send test SMS</h2>
          <p className="text-sm text-white/70 mb-3">Phone number and message to test Africa&apos;s Talking.</p>
          <div className="space-y-2">
            <input type="text" value={testPhone} onChange={(e) => { setTestPhone(e.target.value); setTestResult(null); }} placeholder="0712345678 or +254..." className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/50" />
            <textarea value={testMessage} onChange={(e) => { setTestMessage(e.target.value); setTestResult(null); }} rows={2} placeholder="Message" className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/50" />
            {testResult && <p className={testResult.ok ? 'text-green-400 text-sm' : 'text-red-400 text-sm'}>{testResult.message}</p>}
            <button type="button" onClick={sendTestSMS} disabled={testSending || !testPhone.trim() || !testMessage.trim()} className="rounded-xl border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">Send test SMS</button>
          </div>
        </div>
      <div className={`${adminCardClass} space-y-4`}>
        <h2 className="text-lg font-semibold text-white">Send Announcement</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/85 mb-1">Title</label>
            <input
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Announcement title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
          <label className="block text-sm font-medium text-white/85 mb-1">Message</label>
          <textarea
            className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            placeholder="Message content"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/85 mb-1">Target Class</label>
            <select
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
            >
              <option value="all">All Classes</option>
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
          onClick={sendAnnouncement}
          disabled={sending}
          className="rounded-xl border border-green-500 bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send Announcement'}
        </button>
      </div>
      </div>
    </AdminPageWrapper>
  );
}
