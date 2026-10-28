import React, { useState, useEffect, useMemo } from 'react';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { supabase } from '@/lib/supabase';
import WardPostingManager from '@/features/tertiary/components/WardPostingManager';
import { HospitalWardPosting, TertiaryStudentProfile } from '@/features/tertiary/types';
import { Stethoscope, CheckCircle2, Clock, Building2, BookOpen, ShieldCheck, Printer } from 'lucide-react';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';
import '@/styles/government-system.css';

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
    <AdminPageWrapper>
      <div className="space-y-4">
        {/* ── 1. TOP HEADER (GOVERNMENT DESIGN SYSTEM STANDARD) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans m-0">
              Ward Postings &amp; Clinical Rotations
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
              {postings.length} {postings.length === 1 ? 'ROTATION' : 'ROTATIONS'}
            </span>
          </div>

          {/* Action Button Group */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => window.print()}
              className="gov-btn gov-btn-sm"
              title="Print Roster"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Roster</span>
            </button>
          </div>
        </div>

        {/* ── 2. METRIC SUMMARY BOXES (PLAIN, HIGH-DENSITY, NO FLUFF) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Total Rotations
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {postings.length}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Logbooks Cleared
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {clearedCount}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Pending Sign-Off
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {pendingCount}
            </div>
          </div>

          <div className="gov-card p-3 rounded-lg text-center border border-[#CCCCCC]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#555555]">
              Prescribed Hours
            </div>
            <div className="text-2xl font-mono font-bold text-[#111111] mt-1">
              {totalHours} hrs
            </div>
          </div>
        </div>

        {/* ── 3. WARD POSTING MANAGER COMPONENT ── */}
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
