'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DashboardBackground from '@/src/components/ui/DashboardBackground';

interface NotificationStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  byType: {
    email: number;
    sms: number;
    whatsapp: number;
  };
  byCategory: {
    academic: number;
    attendance: number;
    financial: number;
    behavior: number;
    announcement: number;
    event: number;
  };
}

export default function NotificationsPage() {
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [processingLogs, setProcessingLogs] = useState(false);
  const router = useRouter();

  // Test SMS state
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Hello from PwezaCore – this is a test SMS.');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [waPhone, setWaPhone] = useState('');
  const [waMessage, setWaMessage] = useState('Hello from PwezaCore – test WhatsApp.');
  const [waSending, setWaSending] = useState(false);
  const [waResult, setWaResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Form state for sending announcements
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('announcement');
  const [priority, setPriority] = useState('medium');
  const [targetClass, setTargetClass] = useState('all');
  const [classes, setClasses] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();

      if (!userData?.school_id) {
        router.push('/login');
        return;
      }

      setSchoolId(userData.school_id);

      // Get distinct classes
      const { data: classData } = await supabase
        .from('students')
        .select('current_class')
        .eq('school_id', userData.school_id)
        .eq('status', 'active');

      if (classData) {
        const uniqueClasses = [...new Set(classData.map(s => s.current_class))].sort();
        setClasses(uniqueClasses);
      }

      // Load notification stats
      await loadStats(userData.school_id);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (sid: string) => {
    try {
      const response = await fetch(`/api/notifications/send?school_id=${sid}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const sendAnnouncement = async () => {
    if (!schoolId || !title || !message) {
      alert('Please fill in all required fields');
      return;
    }

    setSending(true);
    try {
      // Get target students
      let studentsQuery = supabase
        .from('students')
        .select('student_id')
        .eq('school_id', schoolId)
        .eq('status', 'active');

      if (targetClass !== 'all') {
        studentsQuery = studentsQuery.eq('current_class', targetClass);
      }

      const { data: students, error: studentsError } = await studentsQuery;

      if (studentsError) throw studentsError;

      if (!students || students.length === 0) {
        alert('No students found for the selected criteria');
        setSending(false);
        return;
      }

      // Send notification to each student
      let successCount = 0;
      for (const student of students) {
        const { error } = await supabase.rpc('send_notification', {
          p_school_id: schoolId,
          p_student_id: student.student_id,
          p_category: category,
          p_title: title,
          p_message: message,
          p_priority: priority
        });

        if (!error) successCount++;
      }

      alert(`Announcement queued successfully! Sent to ${successCount} students.`);
      
      // Clear form
      setTitle('');
      setMessage('');
      setCategory('announcement');
      setPriority('medium');
      setTargetClass('all');

      // Reload stats
      await loadStats(schoolId);
    } catch (error) {
      console.error('Error sending announcement:', error);
      alert('Error sending announcement: ' + String(error));
    } finally {
      setSending(false);
    }
  };

  const sendTestSMS = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      setTestResult({ ok: false, message: 'Enter phone number and message.' });
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

      // Read the body once (prevents "body stream already read"), then parse if possible.
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        // Non-JSON response (e.g. HTML error page)
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
          ? 'Accepted (sandbox). No credits used; messages don\'t reach real phones. Set AFRICASTALKING_SANDBOX=false and redeploy for production.'
          : 'Accepted by Africa\'s Talking. Final delivery depends on the telco – check the delivery report in your dashboard (Submitted, Buffered, Success, Failed, or Rejected). Credits deduct on delivery.',
      });
    } catch (e) {
      setTestResult({ ok: false, message: String(e) });
    } finally {
      setTestSending(false);
    }
  };

  const sendTestWhatsApp = async () => {
    if (!waPhone.trim() || !waMessage.trim()) {
      setWaResult({ ok: false, message: 'Enter phone number and message.' });
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
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        // ignore non-JSON
      }
      if (!res.ok || !data?.success) {
        setWaResult({
          ok: false,
          message: data?.error || `Request failed (${res.status}). ${raw ? raw.slice(0, 100) : ''}`,
        });
        return;
      }
      setWaResult({
        ok: true,
        message: `Accepted. Status: ${data.status || 'SENT'}. Check WhatsApp for delivery. Uganda (+256) only.`,
      });
    } catch (e) {
      setWaResult({ ok: false, message: String(e) });
    } finally {
      setWaSending(false);
    }
  };

  const processPendingNotifications = async () => {
    setProcessingLogs(true);
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`Processed ${data.processed} notifications:\n✅ Sent: ${data.sent}\n❌ Failed: ${data.failed}`);
        if (schoolId) await loadStats(schoolId);
      } else {
        alert('Error processing notifications: ' + data.error);
      }
    } catch (error) {
      console.error('Error processing notifications:', error);
      alert('Error: ' + String(error));
    } finally {
      setProcessingLogs(false);
    }
  };

  const sendFeeReminders = async () => {
    if (!schoolId) return;
    
    if (!confirm('Send fee balance reminders to all parents with outstanding balances?')) {
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_fee_balance_reminders');
      
      if (error) throw error;
      
      alert(`Fee reminders sent successfully! Notifications queued: ${data}`);
      await loadStats(schoolId);
    } catch (error) {
      console.error('Error sending fee reminders:', error);
      alert('Error: ' + String(error));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <DashboardBackground />
        <div className="relative z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 border-t-white"></div>
          <p className="text-white/80 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <DashboardBackground />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Notifications Management</h1>
          <p className="text-white/70 mt-2">Send announcements and manage automated notifications</p>
        </div>

        {/* Test SMS — first so admins can send test SMS without scrolling */}
        <div className="rounded-xl border-2 border-blue-500/40 bg-blue-500/5 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white mb-8">
          <h3 className="text-xl font-semibold text-white mb-1">📱 Send test SMS</h3>
          <p className="text-sm text-white/70 mb-5">Uganda (+256) numbers only. Enter the phone number and message, then click &quot;Send test SMS&quot; to test your Africa&apos;s Talking setup. &quot;Success&quot; here means the API accepted the message; actual delivery is in your Africa&apos;s Talking delivery report (Submitted, Buffered, Success, Failed, Rejected). Credits deduct on delivery.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Phone number to send to</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => { setTestPhone(e.target.value); setTestResult(null); }}
                placeholder="Uganda only: 0712345678 or +256712345678"
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Message to send</label>
              <textarea
                value={testMessage}
                onChange={(e) => { setTestMessage(e.target.value); setTestResult(null); }}
                placeholder="Type your test message here..."
                rows={4}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-400 resize-y"
              />
            </div>
            {testResult && (
              <div className={`px-4 py-3 rounded-lg ${testResult.ok ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                {testResult.message}
              </div>
            )}
            <button
              onClick={sendTestSMS}
              disabled={testSending || !testPhone.trim() || !testMessage.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testSending ? 'Sending...' : 'Send test SMS'}
            </button>
          </div>
        </div>

        {/* Test WhatsApp */}
        <div className="rounded-xl border-2 border-green-500/40 bg-green-500/5 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white mb-8">
          <h3 className="text-xl font-semibold text-white mb-1">💬 Send test WhatsApp</h3>
          <p className="text-sm text-white/70 mb-5">Uganda (+256) only. Set AFRICASTALKING_WHATSAPP_NUMBER (your WhatsApp business number) in Vercel. Same API key and username as SMS.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">Phone number</label>
              <input
                type="text"
                value={waPhone}
                onChange={(e) => { setWaPhone(e.target.value); setWaResult(null); }}
                placeholder="0712345678 or +256712345678"
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:ring-2 focus:ring-green-500 focus:border-green-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Message</label>
              <textarea
                value={waMessage}
                onChange={(e) => { setWaMessage(e.target.value); setWaResult(null); }}
                placeholder="Test message..."
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:ring-2 focus:ring-green-500 focus:border-green-400 resize-y"
              />
            </div>
            {waResult && (
              <div className={`px-4 py-3 rounded-lg ${waResult.ok ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                {waResult.message}
              </div>
            )}
            <button
              onClick={sendTestWhatsApp}
              disabled={waSending || !waPhone.trim() || !waMessage.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {waSending ? 'Sending...' : 'Send test WhatsApp'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
              <p className="text-sm font-medium text-white/70">Total Notifications</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.total}</p>
            </div>
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
              <p className="text-sm font-medium text-yellow-300">Pending</p>
              <p className="text-3xl font-bold text-yellow-400 mt-2">{stats.pending}</p>
            </div>
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
              <p className="text-sm font-medium text-green-300">Sent</p>
              <p className="text-3xl font-bold text-green-400 mt-2">{stats.sent}</p>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
              <p className="text-sm font-medium text-red-300">Failed</p>
              <p className="text-3xl font-bold text-red-400 mt-2">{stats.failed}</p>
            </div>
          </motion.div>
        )}

        {/* Stats by Type and Category */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
              <h3 className="text-lg font-semibold text-white mb-4">By Type</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/80">📧 Email</span>
                  <span className="font-semibold text-white">{stats.byType.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">📱 SMS</span>
                  <span className="font-semibold text-white">{stats.byType.sms}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">💬 WhatsApp</span>
                  <span className="font-semibold text-white">{stats.byType.whatsapp}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
              <h3 className="text-lg font-semibold text-white mb-4">By Category</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/80">📚 Academic</span>
                  <span className="font-semibold text-white">{stats.byCategory.academic}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">✓ Attendance</span>
                  <span className="font-semibold text-white">{stats.byCategory.attendance}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">💰 Financial</span>
                  <span className="font-semibold text-white">{stats.byCategory.financial}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">⭐ Behavior</span>
                  <span className="font-semibold text-white">{stats.byCategory.behavior}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">📢 Announcements</span>
                  <span className="font-semibold text-white">{stats.byCategory.announcement}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80">📅 Events</span>
                  <span className="font-semibold text-white">{stats.byCategory.event}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 mb-8 text-white">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={processPendingNotifications}
              disabled={processingLogs}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
            >
              {processingLogs ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>Process Pending Notifications</span>
                </>
              )}
            </button>

            <button
              onClick={sendFeeReminders}
              disabled={sending}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center space-x-2"
            >
              <span>💰</span>
              <span>Send Fee Reminders</span>
            </button>

            <button
              onClick={() => router.push('/dashboard/admin')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>

        {/* Send Announcement Form */}
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
          <h3 className="text-lg font-semibold text-white mb-4">Send School Announcement</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="announcement" className="bg-slate-900">📢 Announcement</option>
                  <option value="academic" className="bg-slate-900">📚 Academic</option>
                  <option value="event" className="bg-slate-900">📅 Event</option>
                  <option value="attendance" className="bg-slate-900">✓ Attendance</option>
                  <option value="financial" className="bg-slate-900">💰 Financial</option>
                  <option value="behavior" className="bg-slate-900">⭐ Behavior</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low" className="bg-slate-900">Low</option>
                  <option value="medium" className="bg-slate-900">Medium</option>
                  <option value="high" className="bg-slate-900">High</option>
                  <option value="urgent" className="bg-slate-900">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Target Class</label>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all" className="bg-slate-900">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls} className="bg-slate-900">{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., School Closing Date"
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/60 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your announcement message..."
                rows={6}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/60 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={sendAnnouncement}
              disabled={sending || !title || !message}
              className="w-full px-6 py-3 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg disabled:bg-gray-600/50 disabled:opacity-50 transition-colors font-semibold"
            >
              {sending ? 'Sending...' : 'Send Announcement'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 rounded-xl border border-blue-500/30 bg-blue-500/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
          <h4 className="font-semibold text-blue-300 mb-2">ℹ️ How Notifications Work</h4>
          <ul className="text-sm text-white/80 space-y-2">
            <li>• Notifications are automatically triggered when events occur (new reports, absences, payments, etc.)</li>
            <li>• All notifications are queued and sent based on parent preferences</li>
            <li>• Click "Process Pending Notifications" to send queued messages via Email/SMS/WhatsApp</li>
            <li>• Parents can manage their notification preferences in their dashboard</li>
            <li>• Email/SMS/WhatsApp integrations need to be configured in production</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
