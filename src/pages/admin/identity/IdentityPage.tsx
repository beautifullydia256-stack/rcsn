import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { IdCard, Search } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import AdminPageWrapper, { adminCardClass } from "@/components/layout/AdminPageWrapper";

export default function IdentityPage() {
  const navigate = useNavigate();
  const { user, schoolId, setSchoolId } = useAuthStore();
  const [students, setStudents] = useState<any[]>([]);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // If schoolId is not in store, fetch it
      let currentSchoolId = schoolId;
      if (!currentSchoolId && user) {
        const { data: userData } = await supabase
          .from("users")
          .select("school_id")
          .eq("user_id", user.id)
          .single();
        
        if (userData?.school_id) {
          currentSchoolId = userData.school_id;
          setSchoolId(currentSchoolId);
        }
      }

      if (!currentSchoolId) {
        setLoading(false);
        return;
      }

      // Fetch school data
      const { data: school } = await supabase
        .from("schools")
        .select("*")
        .eq("school_id", currentSchoolId)
        .single();

      setSchoolData(school);

      // Fetch students
      const { data: studentsData } = await supabase
        .from("students")
        .select("*")
        .eq("school_id", currentSchoolId)
        .eq("status", "active")
        .order("name", { ascending: true });

      setStudents(studentsData || []);
      setLoading(false);
    };

    fetchData();
  }, [schoolId, user, setSchoolId]);

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
    <AdminPageWrapper title="Student Identity Cards">
      <div className="space-y-6">
        {/* Header */}
        <div className={`${adminCardClass} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-blue-500/20 border border-blue-500/30">
              <IdCard className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Identity Management</h2>
              <p className="text-white/70 text-sm">Generate and manage student ID cards</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input
                type="text"
                placeholder="Search by name, admission number, or class..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-4 py-3 rounded-xl border border-white/10 bg-white/10 text-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Classes</option>
              {uniqueClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Students Grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {loading ? (
            <div className="col-span-full text-center py-12 text-white/70">
              Loading students...
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="col-span-full text-center py-12 text-white/70">
              No students found
            </div>
          ) : (
            filteredStudents.map((student) => (
              <motion.div
                key={student.student_id}
                whileHover={{ scale: 1.02 }}
                className={`${adminCardClass} p-4 cursor-pointer`}
                onClick={() =>
                  navigate(`/dashboard/admin/identity/${student.student_id}`)
                }
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                    {student.name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">
                      {student.name}
                    </h3>
                    <p className="text-white/70 text-sm">
                      {student.admission_number}
                    </p>
                    <p className="text-white/60 text-sm">{student.current_class}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard/admin/identity/${student.student_id}`);
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <IdCard className="w-4 h-4" />
                    View ID Card
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </AdminPageWrapper>
  );
}
