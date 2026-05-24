import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { IdCard, Search, Users, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import AdminPageWrapper, { adminCardClass } from "@/components/layout/AdminPageWrapper";
import { generateIdCardPdf } from "./components/idCardPdf";
import type { IDCardStudent, IDCardSchool } from "./components/IDCard";

const PAGE_SIZE = 12;

export default function IdentityPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<IDCardSchool | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [students, setStudents] = useState<any[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [allClasses, setAllClasses] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, classFilter]);

  // One-time setup: resolve school ID, school data, class list
  useEffect(() => {
    if (!user?.id) return;
    const init = async () => {
      const { data: userData, error: uErr } = await supabase
        .from("users")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (uErr || !userData?.school_id) {
        setError("No school associated with your account.");
        setLoading(false);
        return;
      }

      setSchoolId(userData.school_id);

      const [{ data: school }, { data: classRows }] = await Promise.all([
        supabase
          .from("schools")
          .select("name,logo_url,address,location,contact_phone,contact_email,motto,pobox")
          .eq("school_id", userData.school_id)
          .single(),
        supabase
          .from("students")
          .select("current_class")
          .eq("school_id", userData.school_id)
          .eq("status", "active")
          .not("current_class", "is", null),
      ]);

      setSchoolData(school ?? null);
      const classes = Array.from(
        new Set((classRows || []).map((r: any) => r.current_class).filter(Boolean))
      ).sort() as string[];
      setAllClasses(classes);
    };
    init();
  }, [user]);

  // Fetch page of students + their photos
  useEffect(() => {
    if (!schoolId) return;
    const fetchPage = async () => {
      setLoading(true);

      let query = supabase
        .from("students")
        .select(
          "student_id,name,first_name,middle_name,last_name,current_class,admission_number,date_of_birth,gender,guardian_name,guardian_phone,blood_group,medical_condition,address",
          { count: "exact" }
        )
        .eq("school_id", schoolId)
        .eq("status", "active")
        .order("name", { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (debouncedSearch.trim()) {
        query = query.or(
          `name.ilike.%${debouncedSearch.trim()}%,admission_number.ilike.%${debouncedSearch.trim()}%`
        );
      }
      if (classFilter) {
        query = query.eq("current_class", classFilter);
      }

      const { data, error: fetchErr, count } = await query;

      if (fetchErr) {
        setError(fetchErr.message);
        setLoading(false);
        return;
      }

      setStudents(data || []);
      setTotalCount(count || 0);

      const ids = (data || []).map((s: any) => s.student_id);
      if (ids.length > 0) {
        const { data: photoRows } = await supabase
          .from("student_photos")
          .select("student_id,photo_url")
          .eq("school_id", schoolId)
          .in("student_id", ids);

        const photoMap: Record<string, string> = {};
        for (const row of (photoRows || []) as any[]) {
          if (row.photo_url) photoMap[row.student_id] = row.photo_url;
        }
        setPhotos(photoMap);
      } else {
        setPhotos({});
      }

      setLoading(false);
    };

    fetchPage();
  }, [schoolId, page, debouncedSearch, classFilter]);

  const resolveDisplayName = (s: any) => {
    const parts = [s.first_name, s.middle_name, s.last_name]
      .filter((x) => x?.trim())
      .map((x) => String(x).trim());
    return parts.length ? parts.join(" ") : (s.name || "").trim() || "Unknown";
  };

  const handleDownloadId = async (student: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!schoolData) return;
    setDownloadingId(student.student_id);
    try {
      const cardStudent: IDCardStudent = {
        student_id: student.student_id,
        name: student.name,
        first_name: student.first_name,
        middle_name: student.middle_name,
        last_name: student.last_name,
        current_class: student.current_class,
        admission_number: student.admission_number,
        date_of_birth: student.date_of_birth,
        gender: student.gender,
        guardian_name: student.guardian_name,
        guardian_phone: student.guardian_phone,
        blood_group: student.blood_group,
        medical_condition: student.medical_condition,
        address: student.address,
        photoUrl: photos[student.student_id] ?? null,
      };
      await generateIdCardPdf(cardStudent, schoolData);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AdminPageWrapper
      eyebrow="IDs"
      title="Identity cards"
      subtitle="Generate and download student ID cards."
    >
      <div className="space-y-6">
        {/* Header card */}
        <div
          className={`${adminCardClass} border-emerald-200/50 bg-gradient-to-br from-white to-emerald-50/40 dark:border-emerald-500/20 dark:from-slate-900/80 dark:to-emerald-950/25`}
        >
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
                {totalCount} active student{totalCount !== 1 ? "s" : ""} · Click a card to view
                ID, or download directly
              </p>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-[var(--ac-border)] flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ac-text-muted" />
              <input
                type="text"
                placeholder="Search by name or admission number…"
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
              {allClasses.map((cls) => (
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
            <p className="ac-text-secondary">Loading students…</p>
          </div>
        ) : students.length === 0 ? (
          <div className={`${adminCardClass} text-center py-16`}>
            <Users className="w-12 h-12 ac-text-muted mx-auto mb-3 opacity-50" />
            <p className="ac-text-primary font-medium">No students found</p>
            <p className="text-sm ac-text-secondary mt-1">
              {searchQuery || classFilter
                ? "Try changing your search or filter."
                : "Add students to generate ID cards."}
            </p>
          </div>
        ) : (
          <>
            {/* Top pagination bar */}
            <div className="flex items-center justify-between">
              <p className="text-sm ac-text-secondary">
                Showing{" "}
                <span className="font-medium ac-text-primary">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)}
                </span>{" "}
                of <span className="font-medium ac-text-primary">{totalCount}</span> students
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-xl border border-[var(--ac-border)] ac-text-secondary disabled:opacity-40 hover:bg-emerald-500/10 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm ac-text-secondary tabular-nums">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-xl border border-[var(--ac-border)] ac-text-secondary disabled:opacity-40 hover:bg-emerald-500/10 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <motion.div
              key={`page-${page}-${debouncedSearch}-${classFilter}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
            >
              {students.map((student, index) => {
                const displayName = resolveDisplayName(student);
                const photoUrl = photos[student.student_id];
                const cardId = student.admission_number || student.student_id;
                const isDownloading = downloadingId === student.student_id;

                return (
                  <motion.div
                    key={student.student_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.18 }}
                    className={`${adminCardClass} p-5 group transition-all duration-200 hover:border-emerald-500/35 hover:shadow-lg hover:shadow-emerald-900/10 dark:hover:border-emerald-400/30`}
                  >
                    <div
                      className="flex items-start gap-4 cursor-pointer"
                      onClick={() =>
                        navigate(`/dashboard/admin/identity/${student.student_id}`)
                      }
                    >
                      {/* Photo or initials */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 border-emerald-200/60 dark:border-emerald-500/25">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold ac-text-primary truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {displayName}
                        </h3>
                        <span className="mt-1 inline-block font-mono font-medium text-xs ac-text-primary rounded bg-slate-100 px-2 py-0.5 dark:bg-slate-800/80">
                          {cardId}
                        </span>
                        {student.current_class && (
                          <p className="text-sm ac-text-secondary mt-1">
                            {student.current_class}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() =>
                          navigate(`/dashboard/admin/identity/${student.student_id}`)
                        }
                        className="flex-1 px-3 py-2 rounded-xl border border-emerald-200/70 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <IdCard className="w-4 h-4" />
                        View ID
                      </button>
                      <button
                        onClick={(e) => void handleDownloadId(student, e)}
                        disabled={isDownloading || !schoolData}
                        className="flex-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-emerald-900/20"
                      >
                        {isDownloading ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        {isDownloading ? "Generating…" : "Download ID"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Bottom pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--ac-border)] text-sm ac-text-secondary disabled:opacity-40 hover:bg-emerald-500/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm ac-text-secondary tabular-nums">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--ac-border)] text-sm ac-text-secondary disabled:opacity-40 hover:bg-emerald-500/10 transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminPageWrapper>
  );
}
