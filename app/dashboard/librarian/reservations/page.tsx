"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ReservationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);

  const [reservations, setReservations] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Create reservation form
  const [bookSearch, setBookSearch] = useState("");
  const [bookResults, setBookResults] = useState<any[]>([]);
  const [selectedBook, setSelectedBook] = useState<any | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentResults, setStudentResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [expiresAt, setExpiresAt] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }
        const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
        if (!u?.school_id) { setError('Unable to determine school'); return; }
        setSchoolId(u.school_id);
        await fetchReservations(u.school_id);
      } catch (e) {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const fetchReservations = async (sid: string) => {
    const { data, error } = await supabase
      .from('library_reservations_view')
      .select('*')
      .eq('school_id', sid)
      .order('reserved_at', { ascending: false });
    if (!error) setReservations(data || []);
  };

  // Simple searches
  useEffect(() => {
    const run = async () => {
      if (!schoolId) return;
      // Books
      if (bookSearch && bookSearch.length >= 2) {
        const { data } = await supabase
          .from('library_books')
          .select('id, title, author')
          .eq('school_id', schoolId)
          .ilike('title', `%${bookSearch}%`)
          .limit(10);
        setBookResults(data || []);
      } else {
        setBookResults([]);
      }
      // Students
      if (studentSearch && studentSearch.length >= 2) {
        const { data } = await supabase
          .from('students')
          .select('id, full_name')
          .eq('school_id', schoolId)
          .ilike('full_name', `%${studentSearch}%`)
          .limit(10);
        setStudentResults(data || []);
      } else {
        setStudentResults([]);
      }
    };
    run();
  }, [bookSearch, studentSearch, schoolId]);

  const placeReservation = async () => {
    try {
      if (!schoolId || !selectedBook?.id || !selectedStudent?.id) { setError('Pick book and student'); return; }
      const { error } = await supabase.rpc('reserve_book', {
        p_school_id: schoolId,
        p_book_id: selectedBook.id,
        p_student_id: selectedStudent.id,
        p_expires_at: expiresAt || null,
      });
      if (error) { setError(error.message); return; }
      setError(null);
      setSelectedBook(null);
      setSelectedStudent(null);
      setBookSearch("");
      setStudentSearch("");
      setExpiresAt("");
      await fetchReservations(schoolId);
      alert('Reservation placed');
    } catch (e: any) {
      setError(e?.message || 'Failed to reserve');
    }
  };

  const fulfillReservation = async (reservationId: string) => {
    try {
      if (!schoolId) return;
      const due = new Date();
      due.setDate(due.getDate() + 14);
      const { error } = await supabase.rpc('fulfill_reservation', {
        p_school_id: schoolId,
        p_reservation_id: reservationId,
        p_due_at: due.toISOString(),
      });
      if (error) { setError(error.message); return; }
      await fetchReservations(schoolId);
      alert('Reservation fulfilled');
    } catch (e: any) {
      setError(e?.message || 'Failed to fulfill');
    }
  };

  const cancelReservation = async (reservationId: string) => {
    try {
      const { error } = await supabase
        .from('library_reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservationId);
      if (error) { setError(error.message); return; }
      if (schoolId) await fetchReservations(schoolId);
    } catch (e: any) {
      setError(e?.message || 'Failed to cancel');
    }
  };

  const filtered = reservations
    .filter(r => (statusFilter ? r.status === statusFilter : true))
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

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-white text-3xl font-bold">Reservations</h1>
              <p className="text-white/80 text-sm mt-1">Create, fulfill, and manage book reservations</p>
            </div>
            <button onClick={() => router.push('/dashboard/librarian')} className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15">Back</button>
          </div>
        </motion.div>

        {/* Create Reservation */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white mb-8">
          <h2 className="text-xl font-semibold mb-4">Create Reservation</h2>
          {error && <div className="mb-3 p-2 rounded bg-red-500/20 border border-red-500/30 text-red-300 text-sm">{error}</div>}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">Book</label>
              <input value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} placeholder="Search title..." className="w-full px-3 py-2 rounded bg-white/10 border border-white/10 text-white placeholder-white/50" />
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {bookResults.map(b => (
                  <button key={b.id} onClick={() => { setSelectedBook(b); setBookSearch(b.title); }} className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-sm">
                    {b.title} {b.author ? <span className="text-white/60">— {b.author}</span> : null}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Student</label>
              <input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Search student..." className="w-full px-3 py-2 rounded bg-white/10 border border-white/10 text-white placeholder-white/50" />
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {studentResults.map(s => (
                  <button key={s.id} onClick={() => { setSelectedStudent(s); setStudentSearch(s.full_name); }} className="w-full text-left px-3 py-2 rounded bg-white/5 hover:bg-white/10 text-sm">
                    {s.full_name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Expires (optional)</label>
              <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full px-3 py-2 rounded bg-white/10 border border-white/10 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <button onClick={placeReservation} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white">Reserve</button>
          </div>
        </motion.div>

        {/* List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Reservations</h2>
            <div className="flex gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title/author" className="px-3 py-2 rounded bg-white/10 border border-white/10 text-white text-sm" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded bg-white/10 border border-white/10 text-white text-sm">
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-white/70 text-sm">No reservations</p>
            ) : filtered.map(r => (
              <div key={r.reservation_id} className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-white/70">{r.author}</p>
                  <p className="text-xs text-white/60 mt-1">Status: {r.status} · Reserved {new Date(r.reserved_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {r.status === 'active' && (
                    <>
                      <button onClick={() => fulfillReservation(r.reservation_id)} className="px-3 py-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm">Fulfill</button>
                      <button onClick={() => cancelReservation(r.reservation_id)} className="px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm">Cancel</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}


