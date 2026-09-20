import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, IdCard, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { IDCardFront, IDCardBack, type IDCardStudent, type IDCardSchool } from './components/IDCard';
import { generateIdCardPdf } from './components/idCardPdf';
import { getTokens, SORA } from '@/styles/posThemeTokens';

export default function StudentIDCardPage() {
  const navigate = useNavigate();
  const { id: studentId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const [cardStudent, setCardStudent] = useState<IDCardStudent | null>(null);
  const [cardSchool, setCardSchool] = useState<IDCardSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !studentId) return;

    const fetchData = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('school_id')
        .eq('user_id', user.id)
        .single();

      if (!userData?.school_id) {
        setLoading(false);
        return;
      }

      const schoolId = userData.school_id;

      const [{ data: schoolData }, { data: studentData }, { data: photoRow }] =
        await Promise.all([
          supabase
            .from('schools')
            .select('name,logo_url,address,location,contact_phone,contact_email,motto,pobox')
            .eq('school_id', schoolId)
            .single(),
          supabase.from('students').select('*').eq('student_id', studentId).single(),
          supabase
            .from('student_photos')
            .select('photo_url')
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .eq('is_primary', true)
            .maybeSingle(),
        ]);

      setCardSchool(schoolData ?? null);

      if (studentData) {
        setCardStudent({
          student_id: studentData.student_id,
          name: studentData.name,
          first_name: studentData.first_name,
          middle_name: studentData.middle_name,
          last_name: studentData.last_name,
          current_class: studentData.current_class,
          admission_number: studentData.admission_number,
          date_of_birth: studentData.date_of_birth,
          gender: studentData.gender,
          guardian_name: studentData.guardian_name,
          guardian_phone: studentData.guardian_phone,
          blood_group: studentData.blood_group,
          medical_condition: studentData.medical_condition,
          address: studentData.address,
          photoUrl: (photoRow as any)?.photo_url ?? null,
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [user, studentId]);

  const handleDownloadPdf = async () => {
    if (!cardStudent || !cardSchool) return;
    setDownloadError(null);
    setDownloading(true);
    try {
      await generateIdCardPdf(cardStudent, cardSchool);
    } catch (e: unknown) {
      setDownloadError(e instanceof Error ? e.message : 'Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <AdminPageWrapper title="Student ID Preview" subtitle="Loading credential data…">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
        </div>
      </AdminPageWrapper>
    );
  }

  if (!cardStudent || !cardSchool) {
    return (
      <AdminPageWrapper title="Student Not Found" subtitle="ID record unavailable">
        <div
          className="rounded-2xl p-8 text-center space-y-4"
          style={{ backgroundColor: t.panel, border: `1px solid ${t.stroke}` }}
        >
          <p className="text-sm text-slate-400">The requested student record could not be found.</p>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/identity')}
            className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-500"
          >
            Back to Identity Directory
          </button>
        </div>
      </AdminPageWrapper>
    );
  }

  const displayName =
    [cardStudent.first_name, cardStudent.middle_name, cardStudent.last_name]
      .filter((x) => x?.trim())
      .join(' ') ||
    cardStudent.name ||
    'Student';

  return (
    <AdminPageWrapper
      title={`ID Card — ${displayName}`}
      subtitle="Preview front and reverse faces of student institutional identity card."
    >
      <div className="w-full space-y-6">
        {/* Action Toolbar */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
          style={{
            backgroundColor: t.panel,
            border: `1px solid ${t.stroke}`,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/identity')}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Directory
          </button>

          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={downloading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-500 hover:to-teal-500 transition disabled:opacity-50"
          >
            {downloading ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {downloading ? 'Generating PDF…' : 'Download High-Res PDF'}
          </button>
        </div>

        {downloadError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
            {downloadError}
          </div>
        )}

        {/* Card Previews */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-8 py-6"
        >
          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-400">
              Front Side
            </span>
            <div className="rounded-2xl shadow-2xl p-1 bg-white/5 border border-white/10">
              <IDCardFront student={cardStudent} school={cardSchool} />
            </div>
          </div>

          <div className="text-center space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-400">
              Reverse Side &amp; Emergency Info
            </span>
            <div className="rounded-2xl shadow-2xl p-1 bg-white/5 border border-white/10">
              <IDCardBack student={cardStudent} school={cardSchool} />
            </div>
          </div>
        </motion.div>
      </div>
    </AdminPageWrapper>
  );
}
