'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface DashboardSummary {
  student_name: string;
  current_class: string;
  status: string;
  expected_fee_amount: number;
  total_paid: number;
  balance: number;
  days_present_this_month: number;
  days_absent_this_month: number;
  books_borrowed: number;
  discipline_incidents_30d: number;
  achievements_30d: number;
  unread_notifications: number;
}

interface Notification {
  notification_id: string;
  title: string;
  message: string;
  category: string;
  priority: string;
  read: boolean;
  created_at: string;
}

interface SchoolEvent {
  event_id: string;
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  location: string;
}

interface ExamResult {
  grade_id: string;
  subject: string;
  marks: number;
  term: string;
  created_at: string;
}

interface Payment {
  payment_id: string;
  amount: number;
  payment_method: string;
  description: string;
  created_at: string;
}

interface Report {
  report_id: string;
  template_name: string;
  file_url: string;
  created_at: string;
}

interface DisciplineRecord {
  record_id: string;
  incident_type: string;
  title: string;
  description: string;
  action_taken: string;
  incident_date: string;
}

interface LibraryBook {
  borrow_id: string;
  title: string;
  author: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string;
}

export default function ParentDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [disciplineRecords, setDisciplineRecords] = useState<DisciplineRecord[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?returnUrl=' + encodeURIComponent('/dashboard/parent'));
        return;
      }

      // Get parent's student from users table
      const { data: userData } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', user.id)
        .eq('role', 'parent')
        .single();

      if (!userData) {
        router.push('/login');
        return;
      }

      // Get parent record to find student_id
      const { data: parentData } = await supabase
        .from('parents')
        .select('student_id, school_id')
        .eq('parent_id', user.id)
        .single();

      if (!parentData?.student_id) {
        console.error('No student linked to this parent account');
        setLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [
        summaryResult,
        notificationsResult,
        eventsResult,
        examResultsResult,
        paymentsResult,
        reportsResult,
        disciplineResult,
        libraryResult
      ] = await Promise.all([
        supabase.from('parent_dashboard_summary').select('*').eq('parent_id', user.id).single(),
        supabase.from('notifications').select('*').eq('student_id', parentData.student_id).order('created_at', { ascending: false }).limit(10),
        supabase.from('school_events').select('*').eq('school_id', parentData.school_id).gte('start_date', new Date().toISOString().split('T')[0]).order('start_date', { ascending: true }).limit(5),
        supabase.from('parent_exam_results').select('*').eq('student_id', parentData.student_id).order('created_at', { ascending: false }).limit(20),
        supabase.from('payments').select('*').eq('student_id', parentData.student_id).order('created_at', { ascending: false }),
        supabase.from('reports').select('*').eq('student_id', parentData.student_id).order('created_at', { ascending: false }),
        supabase.from('discipline_records').select('*').eq('student_id', parentData.student_id).order('incident_date', { ascending: false }),
        supabase.from('library_borrows').select(`
          borrow_id,
          borrowed_at,
          due_date,
          returned_at,
          library_book_copies!inner(
            library_books!inner(title, author)
          )
        `).eq('student_id', parentData.student_id).order('borrowed_at', { ascending: false })
      ]);

      if (summaryResult.data) setSummary(summaryResult.data);
      if (notificationsResult.data) setNotifications(notificationsResult.data);
      if (eventsResult.data) setEvents(eventsResult.data);
      if (examResultsResult.data) setExamResults(examResultsResult.data);
      if (paymentsResult.data) setPayments(paymentsResult.data);
      if (reportsResult.data) setReports(reportsResult.data);
      if (disciplineResult.data) setDisciplineRecords(disciplineResult.data);
      if (libraryResult.data) {
        const formattedBooks = libraryResult.data.map((b: any) => ({
          borrow_id: b.borrow_id,
          title: b.library_book_copies?.library_books?.title || 'Unknown',
          author: b.library_book_copies?.library_books?.author || 'Unknown',
          borrowed_at: b.borrowed_at,
          due_date: b.due_date,
          returned_at: b.returned_at
        }));
        setLibraryBooks(formattedBooks);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('notification_id', notificationId);
    
    setNotifications(prev => prev.map(n => 
      n.notification_id === notificationId ? { ...n, read: true } : n
    ));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Student Found</h2>
          <p className="text-gray-600">Please contact your school administrator.</p>
        </div>
      </div>
    );
  }

  const attendancePercentage = summary.days_present_this_month + summary.days_absent_this_month > 0
    ? Math.round((summary.days_present_this_month / (summary.days_present_this_month + summary.days_absent_this_month)) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
            <h1 className="text-2xl font-bold text-blue-600">Parent Dashboard</h1>
              <p className="text-sm text-gray-600">{summary.student_name} - {summary.current_class}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {/* Attendance Card */}
          <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600">Attendance</p>
                <p className="text-3xl font-bold text-gray-900">{attendancePercentage}%</p>
                <p className="text-xs text-gray-500 mt-1">This Month</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Fee Balance Card */}
          <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                <p className="text-3xl font-bold text-gray-900">UGX {summary.balance?.toLocaleString() || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Paid: {summary.total_paid?.toLocaleString() || 0}</p>
            </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
          </div>
        </motion.div>

          {/* Unread Notifications */}
          <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unread Messages</p>
                <p className="text-3xl font-bold text-gray-900">{summary.unread_notifications || 0}</p>
                <p className="text-xs text-gray-500 mt-1">New notifications</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Books Borrowed */}
          <motion.div whileHover={{ y: -2 }} className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Library Books</p>
                <p className="text-3xl font-bold text-gray-900">{summary.books_borrowed || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Currently borrowed</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 px-6 overflow-x-auto">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'academics', name: 'Academics', icon: '📚' },
                { id: 'attendance', name: 'Attendance', icon: '✓' },
                { id: 'fees', name: 'Fees', icon: '💰' },
                { id: 'communication', name: 'Messages', icon: '💬' },
                { id: 'discipline', name: 'Behavior', icon: '⭐' },
                { id: 'events', name: 'Events', icon: '📅' },
                { id: 'library', name: 'Library', icon: '📖' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Quick Stats */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Overview</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Status:</span>
                        <span className="font-semibold text-green-600">{summary.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Present Days (This Month):</span>
                        <span className="font-semibold">{summary.days_present_this_month}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Absent Days (This Month):</span>
                        <span className="font-semibold">{summary.days_absent_this_month}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Recent Achievements:</span>
                        <span className="font-semibold text-green-600">{summary.achievements_30d}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">Discipline Incidents (30d):</span>
                        <span className={`font-semibold ${summary.discipline_incidents_30d > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {summary.discipline_incidents_30d}
                        </span>
                          </div>
                        </div>
                      </div>

                  {/* Upcoming Events */}
                  <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
                    {events.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No upcoming events</p>
                    ) : (
                      <div className="space-y-3">
                        {events.slice(0, 3).map((event) => (
                          <div key={event.event_id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                            <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-xl">
                                {event.event_type === 'exam' ? '📝' : event.event_type === 'holiday' ? '🏖️' : event.event_type === 'meeting' ? '👥' : '📅'}
                              </span>
                          </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{event.title}</p>
                              <p className="text-sm text-gray-600">{new Date(event.start_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Notifications */}
                <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
                    {notifications.length > 3 && (
                      <a 
                        href="/dashboard/parent/notifications" 
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        View all ({notifications.length})
                      </a>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No notifications</p>
                  ) : (
                    <div className="space-y-3">
                      {notifications.slice(0, 3).map((notif) => (
                        <div
                          key={notif.notification_id}
                          className={`p-4 rounded-lg border ${notif.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">{notif.title}</h4>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  notif.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                  notif.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {notif.priority}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                              <p className="text-xs text-gray-500 mt-2">{new Date(notif.created_at).toLocaleString()}</p>
                            </div>
                            {!notif.read && (
                              <button
                                onClick={() => markNotificationAsRead(notif.notification_id)}
                                className="ml-4 text-sm text-blue-600 hover:text-blue-700"
                              >
                                Mark Read
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {notifications.length > 3 && (
                        <div className="mt-4 pt-3 border-t border-gray-200 text-center">
                          <a 
                            href="/dashboard/parent/notifications" 
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            + {notifications.length - 3} more notifications
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Academics Tab */}
            {activeTab === 'academics' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Report Cards */}
                <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Cards</h3>
                {reports.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No report cards available</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reports.map((report) => (
                        <div key={report.report_id} className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{report.template_name}</h4>
                            <p className="text-sm text-gray-600">{new Date(report.created_at).toLocaleDateString()}</p>
                          </div>
                          {report.file_url && (
                            <a
                              href={report.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download
                            </a>
                          )}
                      </div>
                    ))}
                  </div>
                )}
                </div>

                {/* Exam Results */}
                <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Exam Results</h3>
                  {examResults.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No exam results available</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marks</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {examResults.map((result) => (
                            <tr key={result.grade_id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{result.subject}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className={`font-semibold ${result.marks >= 70 ? 'text-green-600' : result.marks >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {result.marks}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{result.term}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(result.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-8 rounded-lg">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Attendance Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow text-center">
                      <p className="text-sm font-medium text-gray-600 mb-2">This Month</p>
                      <p className="text-4xl font-bold text-blue-600">{attendancePercentage}%</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow text-center">
                      <p className="text-sm font-medium text-gray-600 mb-2">Days Present</p>
                      <p className="text-4xl font-bold text-green-600">{summary.days_present_this_month}</p>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow text-center">
                      <p className="text-sm font-medium text-gray-600 mb-2">Days Absent</p>
                      <p className="text-4xl font-bold text-red-600">{summary.days_absent_this_month}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
                  <p className="text-gray-600 text-center">
                    Contact the school for detailed attendance records and teacher remarks.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Fees Tab */}
            {activeTab === 'fees' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Fee Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 mb-2">Expected Fee</p>
                    <p className="text-3xl font-bold text-gray-900">UGX {summary.expected_fee_amount?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-green-50 p-6 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 mb-2">Total Paid</p>
                    <p className="text-3xl font-bold text-green-600">UGX {summary.total_paid?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-red-50 p-6 rounded-lg">
                    <p className="text-sm font-medium text-gray-600 mb-2">Outstanding Balance</p>
                    <p className="text-3xl font-bold text-red-600">UGX {summary.balance?.toLocaleString() || 0}</p>
                  </div>
                </div>

                {/* Payment History */}
                <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
                  {payments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No payment records</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {payments.map((payment) => (
                            <tr key={payment.payment_id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(payment.created_at).toLocaleDateString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">UGX {payment.amount.toLocaleString()}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{payment.payment_method}</td>
                              <td className="px-6 py-4 text-sm text-gray-600">{payment.description || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Online Payment Option */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-lg text-white">
                  <h3 className="text-xl font-semibold mb-2">Make a Payment</h3>
                  <p className="mb-4">Pay school fees online securely</p>
                  <button className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    Pay Now (Coming Soon)
                  </button>
                  </div>
              </motion.div>
            )}

            {/* Communication Tab */}
            {activeTab === 'communication' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Messages & Notifications</h3>
                {notifications.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No messages</p>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notif) => (
                      <div
                        key={notif.notification_id}
                        className={`p-6 rounded-lg border-l-4 ${
                          notif.category === 'academic' ? 'border-blue-500 bg-blue-50' :
                          notif.category === 'attendance' ? 'border-green-500 bg-green-50' :
                          notif.category === 'financial' ? 'border-yellow-500 bg-yellow-50' :
                          notif.category === 'behavior' ? 'border-purple-500 bg-purple-50' :
                          'border-gray-500 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                notif.category === 'academic' ? 'bg-blue-100 text-blue-700' :
                                notif.category === 'attendance' ? 'bg-green-100 text-green-700' :
                                notif.category === 'financial' ? 'bg-yellow-100 text-yellow-700' :
                                notif.category === 'behavior' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {notif.category}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                notif.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                notif.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {notif.priority}
                              </span>
                              {!notif.read && (
                                <span className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white">New</span>
                              )}
                            </div>
                            <h4 className="font-semibold text-gray-900 text-lg mb-2">{notif.title}</h4>
                            <p className="text-gray-700 mb-3">{notif.message}</p>
                            <p className="text-xs text-gray-500">{new Date(notif.created_at).toLocaleString()}</p>
                          </div>
                          {!notif.read && (
                            <button
                              onClick={() => markNotificationAsRead(notif.notification_id)}
                              className="ml-4 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                            >
                              Mark as Read
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Discipline Tab */}
            {activeTab === 'discipline' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
                    <h4 className="text-lg font-semibold text-green-900 mb-2">Achievements (30 days)</h4>
                    <p className="text-4xl font-bold text-green-600">{summary.achievements_30d}</p>
                  </div>
                  <div className="bg-red-50 p-6 rounded-lg border-2 border-red-200">
                    <h4 className="text-lg font-semibold text-red-900 mb-2">Incidents (30 days)</h4>
                    <p className="text-4xl font-bold text-red-600">{summary.discipline_incidents_30d}</p>
                  </div>
                </div>

                {/* Records */}
                <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Behavior Records</h3>
                  {disciplineRecords.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No records</p>
                  ) : (
                    <div className="space-y-4">
                      {disciplineRecords.map((record) => (
                        <div
                          key={record.record_id}
                          className={`p-4 rounded-lg border-l-4 ${
                            record.incident_type === 'achievement' || record.incident_type === 'commendation'
                              ? 'border-green-500 bg-green-50'
                              : 'border-red-500 bg-red-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  record.incident_type === 'achievement' || record.incident_type === 'commendation'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {record.incident_type}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900">{record.title}</h4>
                              <p className="text-sm text-gray-700 mt-1">{record.description}</p>
                              {record.action_taken && (
                                <p className="text-sm text-gray-600 mt-2"><strong>Action:</strong> {record.action_taken}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">{new Date(record.incident_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming School Events</h3>
                {events.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No upcoming events</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.map((event) => (
                      <div key={event.event_id} className="bg-white border-2 border-gray-200 p-6 rounded-lg hover:shadow-lg transition-shadow">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-3xl">
                              {event.event_type === 'exam' ? '📝' :
                               event.event_type === 'holiday' ? '🏖️' :
                               event.event_type === 'meeting' ? '👥' :
                               event.event_type === 'sports' ? '⚽' :
                               event.event_type === 'cultural' ? '🎭' :
                               event.event_type === 'parent_meeting' ? '👨‍👩‍👧' :
                               '📅'}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-lg mb-1">{event.title}</h4>
                            <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>📅 {new Date(event.start_date).toLocaleDateString()}</span>
                              {event.location && <span>📍 {event.location}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Library Tab */}
            {activeTab === 'library' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Currently Borrowed</h3>
                  <p className="text-4xl font-bold text-purple-600">{summary.books_borrowed || 0} Books</p>
                </div>

                <div className="bg-white border-2 border-gray-200 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Borrowed Books</h3>
                  {libraryBooks.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No books borrowed</p>
                  ) : (
                    <div className="space-y-4">
                      {libraryBooks.map((book) => (
                        <div key={book.borrow_id} className={`p-4 rounded-lg border ${book.returned_at ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{book.title}</h4>
                              <p className="text-sm text-gray-600">by {book.author}</p>
                              <div className="mt-2 space-y-1 text-xs text-gray-500">
                                <p>Borrowed: {new Date(book.borrowed_at).toLocaleDateString()}</p>
                                <p>Due: {new Date(book.due_date).toLocaleDateString()}</p>
                                {book.returned_at && (
                                  <p className="text-green-600">Returned: {new Date(book.returned_at).toLocaleDateString()}</p>
                                )}
                                {!book.returned_at && new Date(book.due_date) < new Date() && (
                                  <p className="text-red-600 font-semibold">⚠️ Overdue</p>
                                )}
                              </div>
                            </div>
                            <div>
                              {book.returned_at ? (
                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">Returned</span>
                              ) : (
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Active</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
