import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { IdCard, Search, Users, Hash } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import AdminPageWrapper, { adminCardClass } from "@/components/layout/AdminPageWrapper";

export default function IdentityPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [students, setStudents] = useState<any[]>([]);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.id) {
          setError("No user ID found");
          setLoading(false);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("school_id")
          .eq("user_id", user.id)
          .single();

        if (userError) {
          setError(`Error fetching user data: ${userError.message}`);
          setLoading(false);
          return;
        }

        if (!userData?.school_id) {
          setError("No school ID found for user");
          setLoading(false);
          return;
        }

        const { data: school, error: schoolError } = await supabase
          .from("schools")
          .select("*")
          .eq("school_id", userData.school_id)
          .single();

        if (schoolError) {
          console.error("Identity: Error fetching school:", schoolError);
        }
        setSchoolData(school);

        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("*")
          .eq("school_id", userData.school_id)
          .eq("status", "active")
          .order("name", { ascending: true });

        if (studentsError) {
          setError(`Error fetching students: ${studentsError.message}`);
        } else {
          setStudents(studentsData || []);
        }

        setLoading(false);
      } catch (err: any) {
        setError(`Unexpected error: ${err.message}`);
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const filteredStudents = useMemo(() => {
    let result = students;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(query) ||
          s.admission_number?.toLowerCase().includes(query) ||
          s.current_class?.toLowerCase().includes(query)
      );
    }
    if (classFilter) {
      result = result.filter((s) => s.current_class === classFilter);
    }
    return result;
  }, [students, searchQuery, classFilter]);

  const uniqueClasses = useMemo(() => {
    const classes = students.map((s) => s.current_class).filter(Boolean);
    return Array.from(new Set(classes)).sort();
  }, [students]);

  return (
    <AdminPageWrapper
      eyebrow="IDs"
      title="Identity cards"
      subtitle="View and generate student ID cards. Click a student to open the printable ID."
    >
      <div className="space-y-6">
        {/* Header card */}
        <div
          className={`${adminCardClass} border-emerald-200/50 bg-gradient-to-br from-white to-emerald-50/40 dark:border-emerald-500/20 dark:from-slate-900/80 dark:to-emerald-950/25`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl border border-emerald-200/80 bg-emerald-500/10 dark:border-emerald-500/30">
                <IdCard className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2
                  className="text-lg font-normal tracking-tight ac-text-primary"
                  style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
                >
                  Identity Management
                </h2>
                <p className="text-sm ac-text-secondary mt-0.5">
                  {students.length} active student{students.length !== 1 ? "s" : ""} • Generate and print ID cards
                </p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 pt-5 border-t border-[var(--ac-border)] flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ac-text-muted" />
              <input
                type="text"
                placeholder="Search by name, admission number, or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ac-input w-full pl-10 pr-4 py-2.5 rounded-xl min-h-0"
              />
            </div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="ac-input sm:w-44 px-4 py-2.5 rounded-xl min-h-0"
            >
              <option value="">All classes</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {error ? (
          <div className={`${adminCardClass} border-red-200 bg-red-50/50`}>
            <p className="font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        ) : loading ? (
          <div className={`${adminCardClass} flex flex-col items-center justify-center py-16`}>
            <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
            <p className="ac-text-secondary">Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className={`${adminCardClass} text-center py-16`}>
            <Users className="w-12 h-12 ac-text-muted mx-auto mb-3 opacity-50" />
            <p className="ac-text-primary font-medium">No students found</p>
            <p className="text-sm ac-text-secondary mt-1">
              {searchQuery || classFilter ? "Try changing your search or filter." : "Add students to generate ID cards."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm ac-text-secondary">
                Showing <span className="font-medium ac-text-primary">{filteredStudents.length}</span> student
                {filteredStudents.length !== 1 ? "s" : ""}
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {filteredStudents.map((student, index) => (
                <motion.div
                  key={student.student_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  whileHover={{ y: -2 }}
                  className={`${adminCardClass} p-5 cursor-pointer group transition-all duration-200 hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/10 dark:hover:border-emerald-400/30`}
                  onClick={() => navigate(`/dashboard/admin/identity/${student.student_id}`)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-sm">
                      {student.name?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold ac-text-primary truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {student.name}
                      </h3>
                      <div className="mt-2 flex items-center gap-1.5 ac-text-secondary text-sm">
                        <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-mono font-medium ac-text-primary rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800/80">
                          {student.admission_number || student.student_id}
                        </span>
                      </div>
                      {student.current_class && (
                        <p className="text-sm ac-text-secondary mt-1">{student.current_class}</p>
                      )}
                    </div>
                  </div>

                  {/* Prominent ID block */}
                  <div className="mt-4 pt-4 border-t border-[var(--ac-border)]">
                    <p className="text-xs font-medium ac-text-muted uppercase tracking-wider mb-1">
                      Admission / ID
                    </p>
                    <p className="font-mono text-base font-semibold ac-text-primary tracking-wide break-all">
                      {student.admission_number || student.student_id}
                    </p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard/admin/identity/${student.student_id}`);
                    }}
                    className="mt-4 w-full px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 dark:bg-emerald-500 dark:hover:bg-emerald-400"
                  >
                    <IdCard className="w-4 h-4" />
                    View ID Card
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </AdminPageWrapper>
  );
}
