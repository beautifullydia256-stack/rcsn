"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface LibraryKPI {
  school_id: string;
  total_books: number;
  total_copies: number;
  copies_available: number;
  copies_issued: number;
  borrows_total: number;
  borrows_issued_today: number;
  borrows_issued_week: number;
  borrows_overdue: number;
  fines_unpaid_cents: number;
}

interface OverdueItem {
  borrow_id: string;
  school_id: string;
  copy_id: string;
  student_id: string | null;
  borrower_name: string;
  issued_at: string;
  due_at: string;
  as_of: string;
  days_overdue: number;
  suggested_fine_cents: number;
}

interface Book {
  id: string;
  school_id: string;
  isbn: string | null;
  title: string;
  author: string | null;
  publisher: string | null;
  published_year: number | null;
  category: string | null;
  shelf_location: string | null;
  cover_url: string | null;
  description: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export default function LibrarianDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  // KPIs
  const [kpis, setKpis] = useState<LibraryKPI | null>(null);
  const [issuedMonth, setIssuedMonth] = useState<number>(0);
  const [studentsBorrowing, setStudentsBorrowing] = useState<number>(0);

  // Overdue items
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);

  // Recent books
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  // Borrowed list
  const [borrowed, setBorrowed] = useState<any[]>([]);
  const [borrowSearch, setBorrowSearch] = useState<string>("");
  const [borrowStatus, setBorrowStatus] = useState<string>("issued");

  useEffect(() => {
    const init = async () => {
      try {
        // Get current user and role
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const userRole = user.user_metadata?.role;
        setRole(userRole);

        if (userRole !== 'librarian' && userRole !== 'admin' && userRole !== 'owner') {
          router.push('/dashboard');
          return;
        }

        // Get school ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();

        if (userError || !userData?.school_id) {
          setError('Unable to determine school');
          return;
        }

        setSchoolId(userData.school_id);
        await fetchDashboardData(userData.school_id);
      } catch (err) {
        console.error('Error initializing dashboard:', err);
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const fetchDashboardData = async (schoolId: string) => {
    try {
      // Fetch KPIs
      const { data: kpiData, error: kpiError } = await supabase
        .from('library_kpis')
        .select('*')
        .eq('school_id', schoolId)
        .single();

      if (kpiError) {
        console.error('Error fetching KPIs:', kpiError);
      } else {
        setKpis(kpiData);
      }

      // Fetch overdue items
      const { data: overdueData, error: overdueError } = await supabase
        .from('library_overdue')
        .select('*')
        .eq('school_id', schoolId)
        .order('days_overdue', { ascending: false })
        .limit(10);

      if (overdueError) {
        console.error('Error fetching overdue items:', overdueError);
      } else {
        setOverdueItems(overdueData || []);
      }

      // Fetch recent books
      const { data: booksData, error: booksError } = await supabase
        .from('library_books')
        .select('*')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (booksError) {
        console.error('Error fetching recent books:', booksError);
      } else {
        setRecentBooks(booksData || []);
      }

      // Borrowed list (current issued/lost/damaged)
      const { data: borrowedData } = await supabase
        .from('library_borrows')
        .select('*')
        .eq('school_id', schoolId)
        .in('status', ['issued','lost','damaged'])
        .order('due_at', { ascending: true })
        .limit(20);
      setBorrowed(borrowedData || []);

      // Issued this month (fallback count)
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { data: monthRows } = await supabase
        .from('library_borrows')
        .select('id')
        .eq('school_id', schoolId)
        .gte('issued_at', monthStart);
      setIssuedMonth((monthRows || []).length);

      // Unique borrowers currently borrowing
      const { data: borrowersRows } = await supabase
        .from('library_borrows')
        .select('student_id, borrower_name')
        .eq('school_id', schoolId)
        .eq('status', 'issued');
      const uniqueBorrowers = new Set((borrowersRows || []).map((b: any) => b.student_id ?? b.borrower_name));
      setStudentsBorrowing(uniqueBorrowers.size);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-lg">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-red-400 text-lg">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white text-3xl font-bold">Library Management</h1>
              <p className="text-white/80 text-sm mt-1">Manage books, borrowers, and library operations</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard/librarian/books')}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
              >
                Manage Books
              </button>
              <button
                onClick={() => router.push('/dashboard/librarian/borrow')}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium"
              >
                Borrow/Return
              </button>
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8"
        >
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Books</p>
                <p className="text-2xl font-bold">{kpis?.total_books || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Available Copies</p>
                <p className="text-2xl font-bold">{kpis?.copies_available || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Issued Today</p>
                <p className="text-2xl font-bold">{kpis?.borrows_issued_today || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Overdue Items</p>
                <p className="text-2xl font-bold text-red-400">{kpis?.borrows_overdue || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Issued This Week</p>
                <p className="text-2xl font-bold">{kpis?.borrows_issued_week || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h4l3 8 4-16 3 8h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Students Borrowing</p>
                <p className="text-2xl font-bold">{studentsBorrowing}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M9 20H4v-2a3 3 0 015.356-1.857M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
        >
          {/* Overdue Items */}
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Overdue Items</h3>
              <span className="text-sm text-white/70">{overdueItems.length} items</span>
            </div>
            <div className="space-y-3">
              {overdueItems.length === 0 ? (
                <p className="text-white/70 text-sm">No overdue items</p>
              ) : (
                overdueItems.slice(0, 5).map((item) => (
                  <div key={item.borrow_id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm font-medium">{item.borrower_name}</p>
                      <p className="text-xs text-white/70">{item.days_overdue} days overdue</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-400">
                        ${(item.suggested_fine_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {overdueItems.length > 5 && (
              <button
                onClick={() => router.push('/dashboard/librarian/overdue')}
                className="w-full mt-3 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm"
              >
                View All Overdue Items
              </button>
            )}
          </div>

          {/* Borrowed Books */}
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Borrowed Books</h3>
              <div className="flex gap-2">
                <input
                  value={borrowSearch}
                  onChange={(e) => setBorrowSearch(e.target.value)}
                  placeholder="Search borrower..."
                  className="px-2 py-1 rounded bg-white/10 border border-white/10 text-white text-sm"
                />
                <select
                  value={borrowStatus}
                  onChange={(e) => setBorrowStatus(e.target.value)}
                  className="px-2 py-1 rounded bg-white/10 border border-white/10 text-white text-sm"
                >
                  <option value="issued">Issued</option>
                  <option value="lost">Lost</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {borrowed
                .filter(b => (borrowStatus ? b.status === borrowStatus : true))
                .filter(b => (borrowSearch ? (b.borrower_name || '').toLowerCase().includes(borrowSearch.toLowerCase()) : true))
                .slice(0, 10)
                .map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm font-medium">{b.borrower_name}</p>
                      <p className="text-xs text-white/70">Due {new Date(b.due_at).toLocaleDateString()} · {b.status}</p>
                    </div>
                    <button
                      onClick={() => router.push('/dashboard/librarian/borrow')}
                      className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/15"
                    >
                      Manage
                    </button>
                  </div>
                ))}
              {borrowed.length === 0 && <p className="text-white/70 text-sm">No recent borrows</p>}
            </div>
          </div>

          {/* Recent Books */}
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Books</h3>
              <span className="text-sm text-white/70">{recentBooks.length} books</span>
            </div>
            <div className="space-y-3">
              {recentBooks.length === 0 ? (
                <p className="text-white/70 text-sm">No books added yet</p>
              ) : (
                recentBooks.map((book) => (
                  <div key={book.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm font-medium">{book.title}</p>
                      <p className="text-xs text-white/70">{book.author}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/70">{book.category}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => router.push('/dashboard/librarian/books')}
              className="w-full mt-3 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm"
            >
              Manage All Books
            </button>
          </div>
        </motion.div>

        {/* Additional Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="text-center">
              <p className="text-white/70 text-sm mb-2">Total Copies</p>
              <p className="text-3xl font-bold">{kpis?.total_copies || 0}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="text-center">
              <p className="text-white/70 text-sm mb-2">Issued This Week</p>
              <p className="text-3xl font-bold">{kpis?.borrows_issued_week || 0}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="text-center">
              <p className="text-white/70 text-sm mb-2">Unpaid Fines</p>
              <p className="text-3xl font-bold text-orange-400">
                ${((kpis?.fines_unpaid_cents || 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Analytics Widgets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Most Borrowed Books</h3>
              <a href="/dashboard/librarian/books" className="text-sm text-white/70 hover:text-white">View</a>
            </div>
            <MostBorrowed schoolId={schoolId} />
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Borrowing Trends (30 days)</h3>
            </div>
            <BorrowTrends schoolId={schoolId} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function MostBorrowed({ schoolId }: { schoolId: string | null }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const run = async () => {
      if (!schoolId) return;
      const { data } = await supabase
        .from('library_most_borrowed')
        .select('*')
        .eq('school_id', schoolId)
        .order('total_borrows', { ascending: false })
        .limit(10);
      setRows(data || []);
    };
    run();
  }, [schoolId]);
  if (!schoolId) return null;
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {rows.length === 0 ? (
        <p className="text-white/70 text-sm">No data</p>
      ) : rows.map(r => (
        <div key={r.book_id} className="flex items-center justify-between p-3 rounded bg-white/5">
          <div>
            <p className="text-sm font-medium">{r.title}</p>
            <p className="text-xs text-white/70">{r.author}</p>
          </div>
          <div className="text-right">
            <p className="text-sm">{r.total_borrows} total</p>
            <p className="text-xs text-white/70">{r.borrows_30d} in 30d</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function BorrowTrends({ schoolId }: { schoolId: string | null }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    const run = async () => {
      if (!schoolId) return;
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data } = await supabase
        .from('library_borrows')
        .select('id, issued_at')
        .eq('school_id', schoolId)
        .gte('issued_at', since.toISOString());
      setRows(data || []);
    };
    run();
  }, [schoolId]);
  if (!schoolId) return null;
  const byDay: Record<string, number> = {};
  rows.forEach(r => {
    const d = new Date(r.issued_at).toISOString().slice(0,10);
    byDay[d] = (byDay[d] || 0) + 1;
  });
  const days = Object.keys(byDay).sort();
  return (
    <div className="space-y-2">
      {days.length === 0 ? (
        <p className="text-white/70 text-sm">No recent activity</p>
      ) : days.map(d => (
        <div key={d} className="flex items-center gap-3">
          <div className="w-24 text-xs text-white/70">{d}</div>
          <div className="flex-1 h-2 rounded bg-white/10">
            <div className="h-2 rounded bg-blue-500" style={{ width: `${Math.min(byDay[d] * 8, 100)}%` }} />
          </div>
          <div className="w-8 text-xs text-white/70 text-right">{byDay[d]}</div>
        </div>
      ))}
    </div>
  );
}
