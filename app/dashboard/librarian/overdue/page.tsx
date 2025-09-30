"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

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

interface BookCopy {
  id: string;
  school_id: string;
  book_id: string;
  copy_number: number;
  barcode: string | null;
  status: string;
  condition: string | null;
  acquired_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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

export default function OverdueItemsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);
  const [bookCopies, setBookCopies] = useState<BookCopy[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDays, setSelectedDays] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

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
        await fetchOverdueData(userData.school_id);
      } catch (err) {
        console.error('Error initializing:', err);
        setError('Failed to load overdue items');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const fetchOverdueData = async (schoolId: string) => {
    try {
      // Fetch overdue items
      const { data: overdueData, error: overdueError } = await supabase
        .from('library_overdue')
        .select('*')
        .eq('school_id', schoolId)
        .order('days_overdue', { ascending: false });

      if (overdueError) {
        console.error('Error fetching overdue items:', overdueError);
        return;
      }

      setOverdueItems(overdueData || []);

      // Fetch book copies for overdue items
      if (overdueData && overdueData.length > 0) {
        const copyIds = overdueData.map(item => item.copy_id);
        const { data: copiesData, error: copiesError } = await supabase
          .from('library_book_copies')
          .select('*')
          .in('id', copyIds);

        if (copiesError) {
          console.error('Error fetching copies:', copiesError);
        } else {
          setBookCopies(copiesData || []);
        }

        // Fetch books for the copies
        if (copiesData && copiesData.length > 0) {
          const bookIds = copiesData.map(copy => copy.book_id);
          const { data: booksData, error: booksError } = await supabase
            .from('library_books')
            .select('*')
            .in('id', bookIds);

          if (booksError) {
            console.error('Error fetching books:', booksError);
          } else {
            setBooks(booksData || []);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching overdue data:', err);
    }
  };

  const handlePostFines = async () => {
    if (!schoolId) return;

    try {
      const { data, error } = await supabase.rpc('post_overdue_fines', {
        daily_cents: 200 // 200 cents = $2.00 per day
      });

      if (error) {
        console.error('Error posting fines:', error);
        setError('Failed to post fines');
        return;
      }

      setError(null);
      alert(`Posted fines for ${data} overdue items`);
      await fetchOverdueData(schoolId);
    } catch (err) {
      console.error('Error posting fines:', err);
      setError('Failed to post fines');
    }
  };

  const getBookForCopy = (copyId: string) => {
    const copy = bookCopies.find(c => c.id === copyId);
    if (!copy) return null;
    return books.find(b => b.id === copy.book_id);
  };

  const getCopyForOverdue = (copyId: string) => {
    return bookCopies.find(c => c.id === copyId);
  };

  const filteredOverdueItems = overdueItems.filter(item => {
    const matchesSearch = item.borrower_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDays = !selectedDays || item.days_overdue >= parseInt(selectedDays);
    return matchesSearch && matchesDays;
  });

  const totalFines = overdueItems.reduce((sum, item) => sum + item.suggested_fine_cents, 0);

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
              <h1 className="text-white text-3xl font-bold">Overdue Items</h1>
              <p className="text-white/80 text-sm mt-1">Manage overdue books and fines</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/dashboard/librarian')}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
              >
                Back to Dashboard
              </button>
              <button
                onClick={handlePostFines}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white"
              >
                Post Fines
              </button>
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/reminders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        school_id: schoolId,
                        items: overdueItems.map(o => ({
                          borrower_name: o.borrower_name,
                          days_overdue: o.days_overdue,
                          suggested_fine_cents: o.suggested_fine_cents,
                        })),
                        channels: ['sms','email','whatsapp'],
                      }),
                    });
                    alert('Reminder dispatch initiated');
                  } catch (e) {
                    alert('Failed to send reminders');
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Send Reminders
              </button>
            </div>
          </div>
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="text-center">
              <p className="text-white/70 text-sm mb-2">Total Overdue Items</p>
              <p className="text-3xl font-bold text-red-400">{overdueItems.length}</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="text-center">
              <p className="text-white/70 text-sm mb-2">Total Suggested Fines</p>
              <p className="text-3xl font-bold text-orange-400">
                ${(totalFines / 100).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="text-center">
              <p className="text-white/70 text-sm mb-2">Average Days Overdue</p>
              <p className="text-3xl font-bold text-yellow-400">
                {overdueItems.length > 0 
                  ? Math.round(overdueItems.reduce((sum, item) => sum + item.days_overdue, 0) / overdueItems.length)
                  : 0
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by borrower name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(e.target.value)}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">All Overdue</option>
              <option value="1">1+ days</option>
              <option value="7">7+ days</option>
              <option value="14">14+ days</option>
              <option value="30">30+ days</option>
            </select>
          </div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Overdue Items List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {filteredOverdueItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70 text-lg">No overdue items found</p>
              <p className="text-white/50 text-sm mt-2">
                {searchTerm || selectedDays ? 'Try adjusting your search criteria' : 'All books are returned on time!'}
              </p>
            </div>
          ) : (
            filteredOverdueItems.map((item) => {
              const book = getBookForCopy(item.copy_id);
              const copy = getCopyForOverdue(item.copy_id);

              return (
                <div
                  key={item.borrow_id}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-lg font-semibold">{item.borrower_name}</h3>
                        <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                          {item.days_overdue} days overdue
                        </span>
                      </div>
                      
                      {book && (
                        <div className="mb-3">
                          <p className="font-medium">{book.title}</p>
                          {book.author && (
                            <p className="text-sm text-white/70">{book.author}</p>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/70">
                        <div>
                          <span className="font-medium">Issued:</span> {new Date(item.issued_at).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Due:</span> {new Date(item.due_at).toLocaleDateString()}
                        </div>
                        {copy && copy.barcode && (
                          <div>
                            <span className="font-medium">Barcode:</span> {copy.barcode}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="mb-2">
                        <p className="text-2xl font-bold text-orange-400">
                          ${(item.suggested_fine_cents / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-white/70">Suggested fine</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/librarian/borrow?return=${copy?.barcode || ''}`)}
                          className="px-3 py-1 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm"
                        >
                          Return
                        </button>
                        <button
                          onClick={() => {
                            // TODO: Implement contact borrower functionality
                            alert('Contact borrower functionality coming soon');
                          }}
                          className="px-3 py-1 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm"
                        >
                          Contact
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </motion.div>
      </div>
    </div>
  );
}
