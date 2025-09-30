'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notifications Management</h1>
          <p className="text-gray-600 mt-2">Send announcements and manage automated notifications</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          >
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm font-medium text-gray-600">Total Notifications</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="bg-yellow-50 p-6 rounded-lg shadow border border-yellow-200">
              <p className="text-sm font-medium text-yellow-800">Pending</p>
              <p className="text-3xl font-bold text-yellow-900 mt-2">{stats.pending}</p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200">
              <p className="text-sm font-medium text-green-800">Sent</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{stats.sent}</p>
            </div>
            <div className="bg-red-50 p-6 rounded-lg shadow border border-red-200">
              <p className="text-sm font-medium text-red-800">Failed</p>
              <p className="text-3xl font-bold text-red-900 mt-2">{stats.failed}</p>
            </div>
          </motion.div>
        )}

        {/* Stats by Type and Category */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">By Type</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">📧 Email</span>
                  <span className="font-semibold text-gray-900">{stats.byType.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">📱 SMS</span>
                  <span className="font-semibold text-gray-900">{stats.byType.sms}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">💬 WhatsApp</span>
                  <span className="font-semibold text-gray-900">{stats.byType.whatsapp}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">By Category</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">📚 Academic</span>
                  <span className="font-semibold text-gray-900">{stats.byCategory.academic}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">✓ Attendance</span>
                  <span className="font-semibold text-gray-900">{stats.byCategory.attendance}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">💰 Financial</span>
                  <span className="font-semibold text-gray-900">{stats.byCategory.financial}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">⭐ Behavior</span>
                  <span className="font-semibold text-gray-900">{stats.byCategory.behavior}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">📢 Announcements</span>
                  <span className="font-semibold text-gray-900">{stats.byCategory.announcement}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">📅 Events</span>
                  <span className="font-semibold text-gray-900">{stats.byCategory.event}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
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
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Send School Announcement</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="announcement">📢 Announcement</option>
                  <option value="academic">📚 Academic</option>
                  <option value="event">📅 Event</option>
                  <option value="attendance">✓ Attendance</option>
                  <option value="financial">💰 Financial</option>
                  <option value="behavior">⭐ Behavior</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Class</label>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., School Closing Date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your announcement message..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={sendAnnouncement}
              disabled={sending || !title || !message}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-semibold"
            >
              {sending ? 'Sending...' : 'Send Announcement'}
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h4 className="font-semibold text-blue-900 mb-2">ℹ️ How Notifications Work</h4>
          <ul className="text-sm text-blue-800 space-y-2">
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
