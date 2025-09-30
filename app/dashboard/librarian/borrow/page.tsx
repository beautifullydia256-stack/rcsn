"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

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

interface BorrowRecord {
  id: string;
  school_id: string;
  copy_id: string;
  student_id: string | null;
  borrower_name: string;
  issued_by: string | null;
  issued_at: string;
  due_at: string;
  returned_at: string | null;
  status: string;
  fine_cents: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function BorrowReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'borrow' | 'return'>('borrow');
  const [barcode, setBarcode] = useState("");
  const [borrowerName, setBorrowerName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Student search & history
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentHistory, setStudentHistory] = useState<BorrowRecord[]>([]);

  const [currentBorrows, setCurrentBorrows] = useState<BorrowRecord[]>([]);
  const [availableCopies, setAvailableCopies] = useState<(BookCopy & { book: Book })[]>([]);

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
        await fetchData(userData.school_id);
      } catch (err) {
        console.error('Error initializing:', err);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const fetchData = async (schoolId: string) => {
    try {
      // Fetch current borrows
      const { data: borrowsData, error: borrowsError } = await supabase
        .from('library_borrows')
        .select('*')
        .eq('school_id', schoolId)
        .eq('status', 'issued')
        .order('due_at');

      if (borrowsError) {
        console.error('Error fetching borrows:', borrowsError);
      } else {
        setCurrentBorrows(borrowsData || []);
      }

      // Fetch available copies with book info
      const { data: copiesData, error: copiesError } = await supabase
        .from('library_book_copies')
        .select(`
          *,
          book:library_books(*)
        `)
        .eq('school_id', schoolId)
        .eq('status', 'available')
        .order('created_at');

      if (copiesError) {
        console.error('Error fetching copies:', copiesError);
      } else {
        setAvailableCopies(copiesData || []);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  // Search students by name (assumes table public.students with name field)
  useEffect(() => {
    const run = async () => {
      if (!schoolId) return;
      if (!studentSearch || studentSearch.length < 2) {
        setStudentResults([]);
        return;
      }
      const { data } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('school_id', schoolId)
        .ilike('full_name', `%${studentSearch}%`)
        .limit(10);
      setStudentResults(data || []);
    };
    run();
  }, [studentSearch, schoolId]);

  const loadStudentHistory = async (sid: string) => {
    if (!schoolId) return;
    const { data } = await supabase
      .from('library_borrows')
      .select('*')
      .eq('school_id', schoolId)
      .eq('student_id', sid)
      .order('issued_at', { ascending: false })
      .limit(20);
    setStudentHistory(data || []);
  };

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !barcode || !borrowerName || !dueDate) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('issue_copy_by_barcode', {
        p_school_id: schoolId,
        p_barcode: barcode,
        p_borrower_name: borrowerName,
        p_student_id: studentId || null,
        p_due_at: dueDate
      });

      if (error) {
        console.error('Error borrowing book:', error);
        setError(error.message);
        return;
      }

      setError(null);
      setBarcode("");
      setBorrowerName("");
      setStudentId("");
      setNotes("");
      await fetchData(schoolId);
    } catch (err) {
      console.error('Error borrowing book:', err);
      setError('Failed to borrow book');
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId || !barcode) {
      setError('Please enter a barcode');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('return_copy_by_barcode', {
        p_school_id: schoolId,
        p_barcode: barcode,
        p_returned_at: new Date().toISOString(),
        p_mark_lost: false,
        p_mark_damaged: false
      });

      if (error) {
        console.error('Error returning book:', error);
        setError(error.message);
        return;
      }

      setError(null);
      setBarcode("");
      setNotes("");
      await fetchData(schoolId);
    } catch (err) {
      console.error('Error returning book:', err);
      setError('Failed to return book');
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
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
              <h1 className="text-white text-3xl font-bold">Borrow & Return</h1>
              <p className="text-white/80 text-sm mt-1">Manage book borrowing and returns</p>
            </div>
            <button
              onClick={() => router.push('/dashboard/librarian')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex space-x-1 rounded-lg bg-white/10 p-1">
            <button
              onClick={() => setActiveTab('borrow')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'borrow'
                  ? 'bg-blue-600 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Borrow Book
            </button>
            <button
              onClick={() => setActiveTab('return')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'return'
                  ? 'bg-green-600 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Return Book
            </button>
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

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          {/* Borrow/Return Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="xl:col-span-2 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white"
          >
            <h2 className="text-xl font-semibold mb-6">
              {activeTab === 'borrow' ? 'Borrow a Book' : 'Return a Book'}
            </h2>

            {activeTab === 'borrow' ? (
              <form onSubmit={handleBorrow} className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Barcode *</label>
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan or enter barcode"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">Borrower Name *</label>
                  <input
                    type="text"
                    required
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="Enter borrower's name"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">Student ID (Optional)</label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Enter student ID if applicable"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Additional notes..."
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Issue Book
                </button>
              </form>
            ) : (
              <form onSubmit={handleReturn} className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">Barcode *</label>
                  <input
                    type="text"
                    required
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan or enter barcode"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Return notes, condition, etc..."
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  Return Book
                </button>
              </form>
            )}
          </motion.div>

          {/* Current Borrows */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white"
          >
            <h2 className="text-xl font-semibold mb-6">Current Borrows</h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {currentBorrows.length === 0 ? (
                <p className="text-white/70 text-sm">No active borrows</p>
              ) : (
                currentBorrows.map((borrow) => {
                  const daysUntilDue = getDaysUntilDue(borrow.due_at);
                  const overdue = isOverdue(borrow.due_at);

                  return (
                    <div
                      key={borrow.id}
                      className={`p-4 rounded-lg border ${
                        overdue
                          ? 'bg-red-500/10 border-red-500/30'
                          : daysUntilDue <= 3
                          ? 'bg-yellow-500/10 border-yellow-500/30'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{borrow.borrower_name}</p>
                          <p className="text-sm text-white/70">
                            Due: {new Date(borrow.due_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          {overdue ? (
                            <span className="text-red-400 text-sm font-medium">
                              {Math.abs(daysUntilDue)} days overdue
                            </span>
                          ) : (
                            <span className={`text-sm ${
                              daysUntilDue <= 3 ? 'text-yellow-400' : 'text-white/70'
                            }`}>
                              {daysUntilDue} days left
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>

        {/* Student Search & History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <h2 className="text-xl font-semibold mb-4">Find Student</h2>
            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search student by name..."
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-white placeholder-white/50"
            />
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
              {studentResults.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSelectedStudent(s);
                    setStudentId(s.id);
                    setBorrowerName(s.full_name || borrowerName);
                    loadStudentHistory(s.id);
                  }}
                  className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10"
                >
                  {s.full_name}
                </button>
              ))}
              {studentResults.length === 0 && (
                <p className="text-white/60 text-sm">Type at least 2 characters...</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <h2 className="text-xl font-semibold mb-4">Borrow History {selectedStudent ? `— ${selectedStudent.full_name}` : ''}</h2>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {studentHistory.length === 0 ? (
                <p className="text-white/70 text-sm">No history</p>
              ) : (
                studentHistory.map((h) => (
                  <div key={h.id} className="p-3 rounded bg-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-sm">Issued {new Date(h.issued_at).toLocaleDateString()} → Due {new Date(h.due_at).toLocaleDateString()}</p>
                      {h.returned_at ? (
                        <p className="text-xs text-white/70">Returned {new Date(h.returned_at).toLocaleDateString()}</p>
                      ) : (
                        <p className="text-xs text-yellow-400">{new Date(h.due_at) < new Date() ? 'Overdue' : 'Active'}</p>
                      )}
                    </div>
                    <span className="text-xs text-white/60">{h.status}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Available Books */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white"
        >
          <h2 className="text-xl font-semibold mb-6">Available Books</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableCopies.length === 0 ? (
              <p className="text-white/70 text-sm col-span-full">No available books</p>
            ) : (
              availableCopies.slice(0, 6).map((copy) => (
                <div
                  key={copy.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  <h3 className="font-medium text-sm">{copy.book.title}</h3>
                  {copy.book.author && (
                    <p className="text-xs text-white/70 mt-1">{copy.book.author}</p>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-white/60">
                      Copy #{copy.copy_number}
                    </span>
                    {copy.barcode && (
                      <span className="text-xs text-white/60">
                        {copy.barcode}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {availableCopies.length > 6 && (
            <button
              onClick={() => router.push('/dashboard/librarian/books')}
              className="w-full mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm"
            >
              View All Available Books
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
