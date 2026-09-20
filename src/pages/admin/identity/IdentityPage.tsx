import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IdCard, Search, Users, Download, ChevronLeft, ChevronRight, Layers, CheckCircle2, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import PosEmptyState from '@/components/finance/pos/PosEmptyState';
import { generateIdCardPdf, generateBatchIdCardPdf } from './components/idCardPdf';
import type { IDCardStudent, IDCardSchool } from './components/IDCard';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

const PAGE_SIZE = 12;

export default function IdentityPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<IDCardSchool | null>(null);

  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [students, setStudents] = useState<any[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [allClasses, setAllClasses] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
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
        .from('users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();

      if (uErr || !userData?.school_id) {
        setError('No school associated with your account.');
        setLoading(false);
        return;
      }

      setSchoolId(userData.school_id);

      const [{ data: school }, { data: classRows }] = await Promise.all([
        supabase
          .from('schools')
          .select('name,logo_url,address,location,contact_phone,contact_email,motto,pobox')
          .eq('school_id', userData.school_id)
          .single(),
        supabase
          .from('students')
          .select('current_class')
          .eq('school_id', userData.school_id)
          .eq('status', 'active')
          .not('current_class', 'is', null),
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
        .from('students')
        .select(
          'student_id,name,first_name,middle_name,last_name,current_class,admission_number,date_of_birth,gender,guardian_name,guardian_phone,blood_group,medical_condition,address',
          { count: 'exact' }
        )
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .order('name');

      if (classFilter) {
        query = query.eq('current_class', classFilter);
      }

      if (debouncedSearch.trim()) {
        const term = debouncedSearch.trim();
        query = query.or(
          `name.ilike.%${term}%,first_name.ilike.%${term}%,last_name.ilike.%${term}%,admission_number.ilike.%${term}%`
        );
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, count, error: sErr } = await query;

      if (sErr) {
        setError(sErr.message);
        setLoading(false);
        return;
      }

      const studentList = data || [];
      setStudents(studentList);
      setTotalCount(count ?? 0);

      // Fetch primary photos for this page
      if (studentList.length > 0) {
        const studentIds = studentList.map((s: any) => s.student_id);
        const { data: photoRows } = await supabase
          .from('student_photos')
          .select('student_id, photo_url')
          .eq('school_id', schoolId)
          .in('student_id', studentIds)
          .eq('is_primary', true);

        const photoMap: Record<string, string> = {};
        (photoRows || []).forEach((row: any) => {
          if (row.photo_url) photoMap[row.student_id] = row.photo_url;
        });
        setPhotos(photoMap);
      } else {
        setPhotos({});
      }

      setLoading(false);
    };

    fetchPage();
  }, [schoolId, page, debouncedSearch, classFilter]);

  const resolveDisplayName = (student: any): string => {
    const parts = [student.first_name, student.middle_name, student.last_name].filter((x) =>
      x?.trim()
    );
    return parts.length > 0 ? parts.join(' ') : student.name || 'Student';
  };

  const toIdCardStudent = (student: any): IDCardStudent => ({
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
  });

  const handleDownloadId = async (student: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!schoolData) return;
    setDownloadError(null);
    setDownloadingId(student.student_id);
    try {
      await generateIdCardPdf(toIdCardStudent(student), schoolData);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'Failed to generate ID card PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleBatchDownload = async () => {
    if (!schoolData || students.length === 0) return;
    setDownloadError(null);
    setBatchDownloading(true);
    try {
      const cardStudents = students.map(toIdCardStudent);
      await generateBatchIdCardPdf(cardStudents, schoolData);
    } catch (err: unknown) {
      setDownloadError(err instanceof Error ? err.message : 'Batch generation failed.');
    } finally {
      setBatchDownloading(false);
    }
  };

  // 4-card statistics
  const photoCount = useMemo(() => Object.keys(photos).length, [photos]);

  return (
    <AdminPageWrapper
      title="Student Identity &amp; ID Cards"
      subtitle="Issue tamper-evident institutional ID cards with barcodes, emergency medical profiles, and batch print sheets."
    >
      <div className="w-full space-y-6">
        {/* 4-Card Summary Strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'blue'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Enrolled Students
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {totalCount}
            </p>
            <p className="mt-1 text-xs text-blue-400/90 font-medium">
              Total active student roster
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'emerald'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Verified Photos
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <ImageIcon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {photoCount} / {students.length}
            </p>
            <p className="mt-1 text-xs text-emerald-400/90 font-medium">
              Page verified portraits
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'purple'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Class Streams
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {allClasses.length}
            </p>
            <p className="mt-1 text-xs text-purple-400/90 font-medium">
              Distinct class levels
            </p>
          </div>

          <div
            className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
            style={{
              background: cardGrad(t, 'amber'),
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400" style={{ fontFamily: INTER }}>
                Batch Generator
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <IdCard className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {students.length} Ready
            </p>
            <p className="mt-1 text-xs text-amber-400/90 font-medium">
              Grid sheet cards on page
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl p-4"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          {/* Search and class filter */}
          <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
            <div className="relative min-w-[220px] flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or admission #…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border pl-10 pr-3 py-2 text-xs text-slate-100 placeholder-slate-400"
                style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
              />
            </div>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-xl border px-3 py-2 text-xs font-medium text-slate-200"
              style={{ backgroundColor: t.fieldBg, borderColor: t.stroke }}
            >
              <option value="">All Classes</option>
              {allClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Download Button */}
          {students.length > 0 && (
            <button
              type="button"
              onClick={() => void handleBatchDownload()}
              disabled={batchDownloading || !schoolData}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 transition hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60"
            >
              {batchDownloading ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Layers className="h-3.5 w-3.5" />
              )}
              {batchDownloading ? 'Generating Batch Sheet…' : `Download Sheet (${students.length} IDs)`}
            </button>
          )}
        </div>

        {/* Download error alert */}
        {downloadError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            {downloadError}
          </div>
        )}

        {/* Card Grid / List */}
        {error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          </div>
        ) : students.length === 0 ? (
          <div
            className="rounded-2xl p-8"
            style={{
              backgroundColor: t.panel,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <PosEmptyState
              icon={<IdCard className="w-8 h-8 text-teal-400" />}
              title="No Student Records Found"
              description={
                searchQuery || classFilter
                  ? 'Try modifying your search query or class filter.'
                  : 'Enroll active students to automatically generate institutional identity cards.'
              }
              accentColor="mint"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pagination Top Bar */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <p>
                Showing{' '}
                <strong className="text-slate-200">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)}
                </strong>{' '}
                of <strong className="text-slate-200">{totalCount}</strong> students
              </p>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="font-mono text-slate-300">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-300 hover:bg-white/10 disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Students ID Card Previews Grid */}
            <motion.div
              key={`page-${page}-${debouncedSearch}-${classFilter}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {students.map((student, index) => {
                const displayName = resolveDisplayName(student);
                const photoUrl = photos[student.student_id];
                const cardId = student.admission_number || student.student_id?.slice(0, 8);
                const isDownloading = downloadingId === student.student_id;

                return (
                  <motion.div
                    key={student.student_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.15 }}
                    className="flex flex-col justify-between rounded-2xl p-4 transition-all hover:scale-[1.01]"
                    style={{
                      backgroundColor: t.panel,
                      border: `1px solid ${t.stroke}`,
                    }}
                  >
                    <div
                      className="flex cursor-pointer items-start gap-3"
                      onClick={() => navigate(`/dashboard/admin/identity/${student.student_id}`)}
                    >
                      {/* Portrait */}
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-teal-500/30 bg-teal-500/10">
                        {photoUrl ? (
                          <img src={photoUrl} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-700 text-lg font-bold text-white">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <h3
                          className="truncate text-sm font-semibold text-slate-100 hover:text-teal-300 transition-colors"
                          style={{ fontFamily: SORA }}
                        >
                          {displayName}
                        </h3>
                        <span className="mt-1 inline-block rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-teal-300">
                          {cardId}
                        </span>
                        {student.current_class && (
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {student.current_class}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex gap-2 border-t border-white/5 pt-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard/admin/identity/${student.student_id}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition"
                      >
                        <IdCard className="h-3.5 w-3.5" />
                        View ID
                      </button>
                      <button
                        type="button"
                        onClick={(e) => void handleDownloadId(student, e)}
                        disabled={isDownloading || !schoolData}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition disabled:opacity-50"
                      >
                        {isDownloading ? (
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        {isDownloading ? 'PDF…' : 'Download'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}
      </div>
    </AdminPageWrapper>
  );
}
