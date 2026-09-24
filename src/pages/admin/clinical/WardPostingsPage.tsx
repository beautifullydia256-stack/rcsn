import React, { useState, useEffect, useMemo } from 'react';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { supabase } from '@/lib/supabase';
import WardPostingManager from '@/features/tertiary/components/WardPostingManager';
import { HospitalWardPosting, TertiaryStudentProfile } from '@/features/tertiary/types';
import { Stethoscope, CheckCircle2, Clock, Building2, BookOpen, ShieldCheck } from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';

const DEFAULT_SAMPLE_POSTINGS: HospitalWardPosting[] = [
  {
    id: 'post-1',
    schoolId: 'current',
    hospitalName: 'Masaka Regional Referral Hospital',
    wardName: 'Maternity / Labour Ward',
    startDate: '2025-02-03',
    endDate: '2025-04-11',
    requiredHours: 160,
    completedHours: 160,
    physicalLogbookVerified: true,
    status: 'cleared',
  },
  {
    id: 'post-2',
    schoolId: 'current',
    hospitalName: 'Masaka Regional Referral Hospital',
    wardName: 'Paediatric Ward (Children)',
    startDate: '2025-04-14',
    endDate: '2025-05-30',
    requiredHours: 120,
    completedHours: 80,
    physicalLogbookVerified: false,
    status: 'in_progress',
  },
  {
    id: 'post-3',
    schoolId: 'current',
    hospitalName: 'Villa Maria Hospital',
    wardName: 'Surgical Ward & Theatre',
    startDate: '2025-06-02',
    endDate: '2025-07-25',
    requiredHours: 120,
    completedHours: 0,
    physicalLogbookVerified: false,
    status: 'scheduled',
  },
];

export default function WardPostingsPage() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);
  const { isTertiary } = useSchoolType();

  const [students, setStudents] = useState<TertiaryStudentProfile[]>([]);
  const [postings, setPostings] = useState<HospitalWardPosting[]>([]);
  const [loading, setLoading] = useState(true);

  const storageKey = `pwezacore_ward_postings_${schoolId || 'default'}`;

  useEffect(() => {
    // Load persisted ward postings
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setPostings(JSON.parse(saved));
      } else {
        setPostings(DEFAULT_SAMPLE_POSTINGS.map((p) => ({ ...p, schoolId: schoolId || 'current' })));
      }
    } catch {
      setPostings(DEFAULT_SAMPLE_POSTINGS);
    }

    // Load enrolled students from Supabase
    async function loadStudents() {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('students')
          .select('student_id, first_name, last_name, admission_number, class_name')
          .eq('school_id', schoolId)
          .limit(100);

        if (!error && data && data.length > 0) {
          const mapped: TertiaryStudentProfile[] = data.map((s) => ({
            id: s.student_id,
            schoolId,
            fullName: `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Student',
            collegeRegNo: s.admission_number || `REG-${s.student_id.slice(0, 6)}`,
            unmebExamNo: `U${s.admission_number || s.student_id.slice(0, 6)}`,
            programmeId: 'prog-1',
            programmeName: s.class_name || 'Diploma in Nursing Extension',
            cohortId: 'cohort-1',
            cohortName: s.class_name || 'March 2024 Intake',
            currentStage: 'Y1S2' as const,
            academicStanding: 'NORMAL_PROGRESS' as const,
            gender: 'female',
          }));
          setStudents(mapped);
        } else {
          setStudents([
            {
              id: 'stud-1',
              schoolId: schoolId || 'school-1',
              fullName: 'Nalubega Sarah',
              collegeRegNo: 'NUR/2024/001',
              unmebExamNo: 'UHPAB/NUR/24/012',
              programmeId: 'prog-1',
              programmeName: 'Diploma in Nursing Extension',
              cohortId: 'cohort-1',
              cohortName: 'Year 1 March Intake',
              currentStage: 'Y1S2' as const,
              academicStanding: 'NORMAL_PROGRESS' as const,
              gender: 'female',
            },
            {
              id: 'stud-2',
              schoolId: schoolId || 'school-1',
              fullName: 'Kato Emmanuel',
              collegeRegNo: 'MID/2024/004',
              unmebExamNo: 'UHPAB/MID/24/048',
              programmeId: 'prog-2',
              programmeName: 'Certificate in Midwifery',
              cohortId: 'cohort-2',
              cohortName: 'Year 1 August Intake',
              currentStage: 'Y1S1' as const,
              academicStanding: 'NORMAL_PROGRESS' as const,
              gender: 'male',
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to load students for ward postings', err);
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, [schoolId, storageKey]);

  const handleUpdatePosting = (postingId: string, updates: Partial<HospitalWardPosting>) => {
    setPostings((prev) => {
      const next = prev.map((p) => (p.id === postingId ? { ...p, ...updates } : p));
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const handleAddPosting = (newPosting: Omit<HospitalWardPosting, 'id'>) => {
    const created: HospitalWardPosting = {
      ...newPosting,
      id: `post-${Date.now()}`,
    };
    setPostings((prev) => {
      const next = [created, ...prev];
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const clearedCount = useMemo(() => postings.filter((p) => p.physicalLogbookVerified).length, [postings]);
  const pendingCount = useMemo(() => postings.filter((p) => !p.physicalLogbookVerified).length, [postings]);
  const totalHours = useMemo(
    () => postings.reduce((sum, p) => sum + (p.requiredHours || 0), 0),
    [postings]
  );

  return (
    <AdminPageWrapper
      eyebrow="Clinical Rotations & Practicum"
      title="Hospital Ward Postings & Clinical Clearance"
      subtitle="Track hospital practicum, clinical hours, and verified physical Uganda Nurses & Midwives Council logbooks."
    >
      <div className="w-full space-y-6">
        {/* Overview 4-Card Stat Strip */}
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
                Total Rotations
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                <Stethoscope className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {postings.length}
            </p>
            <p className="mt-1 text-xs text-blue-400/90 font-medium">
              Hospital ward assignments
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
                Logbooks Cleared
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {clearedCount}
            </p>
            <p className="mt-1 text-xs text-emerald-400/90 font-medium">
              Signed &amp; stamped for OSCE
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
                Pending Sign-off
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {pendingCount}
            </p>
            <p className="mt-1 text-xs text-amber-400/90 font-medium">
              Awaiting In-charge verification
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
                Prescribed Hours
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-100" style={{ fontFamily: SORA }}>
              {totalHours} hrs
            </p>
            <p className="mt-1 text-xs text-purple-400/90 font-medium">
              Total clinical curriculum requirement
            </p>
          </div>
        </div>

        {/* Guidelines Banner */}
        <div
          className="rounded-2xl p-4 flex items-start gap-3 border"
          style={{
            backgroundColor: isDark ? 'rgba(46,111,216,0.08)' : 'rgba(46,111,216,0.05)',
            borderColor: isDark ? 'rgba(46,111,216,0.25)' : 'rgba(46,111,216,0.18)',
          }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="text-xs leading-relaxed text-slate-300">
            <strong className="text-slate-100">UHPAB &amp; Nursing Council Regulatory Requirement:</strong> In Uganda health training institutions, students cannot sit practical OSCE examination stations without verified stamped paper logbooks from Hospital Ward In-charges and approved clinical instructors.
          </div>
        </div>

        {/* Ward Posting Manager Interactive Component */}
        <WardPostingManager
          postings={postings}
          students={students}
          onUpdatePosting={handleUpdatePosting}
          onAddPosting={handleAddPosting}
        />
      </div>
    </AdminPageWrapper>
  );
}
