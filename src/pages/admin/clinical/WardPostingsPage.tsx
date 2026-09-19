import React, { useState, useEffect } from 'react';
import AdminPageWrapper from '@/components/layout/AdminPageWrapper';
import { useAuthStore } from '@/store/authStore';
import { useSchoolType } from '@/hooks/useSchoolType';
import { supabase } from '@/lib/supabase';
import WardPostingManager from '@/features/tertiary/components/WardPostingManager';
import { HospitalWardPosting, TertiaryStudentProfile } from '@/features/tertiary/types';
import { Stethoscope, CheckCircle2, AlertCircle, Building2, BookOpen } from 'lucide-react';

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
              unmebExamNo: 'UNMEB/NUR/24/012',
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
              unmebExamNo: 'UNMEB/MID/24/048',
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

  const clearedCount = postings.filter((p) => p.physicalLogbookVerified).length;
  const pendingCount = postings.filter((p) => !p.physicalLogbookVerified).length;
  const totalHours = postings.reduce((sum, p) => sum + (p.requiredHours || 0), 0);

  return (
    <AdminPageWrapper
      eyebrow="Clinical Rotations & Practicum"
      title="Hospital Ward Postings & Clinical Clearance"
      subtitle="Track hospital practicum, clinical hours, and verified physical Uganda Nurses & Midwives Council logbooks."
    >
      {/* Overview Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="ac-glass-card p-4 rounded-2xl border border-[var(--pw-border)] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--pw-blue,#3d8ef8)]/15 text-[var(--pw-blue,#3d8ef8)] flex items-center justify-center shrink-0">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold ac-text-primary">{postings.length}</div>
            <div className="text-xs ac-text-muted">Total Rotations</div>
          </div>
        </div>

        <div className="ac-glass-card p-4 rounded-2xl border border-[var(--pw-border)] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold ac-text-primary">{clearedCount}</div>
            <div className="text-xs ac-text-muted">Logbooks Cleared</div>
          </div>
        </div>

        <div className="ac-glass-card p-4 rounded-2xl border border-[var(--pw-border)] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold ac-text-primary">{pendingCount}</div>
            <div className="text-xs ac-text-muted">Pending Sign-off</div>
          </div>
        </div>

        <div className="ac-glass-card p-4 rounded-2xl border border-[var(--pw-border)] flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold ac-text-primary">{totalHours} hrs</div>
            <div className="text-xs ac-text-muted">Prescribed Ward Hours</div>
          </div>
        </div>
      </div>

      {/* Guidelines Box */}
      <div className="mb-6 ac-glass-card p-4 rounded-2xl border border-[var(--pw-blue,#3d8ef8)]/30 bg-[var(--pw-blue,#3d8ef8)]/5 text-xs ac-text-secondary flex items-start gap-3">
        <Building2 className="w-4 h-4 text-[var(--pw-blue,#3d8ef8)] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold ac-text-primary">UNMEB & Nursing Council Regulatory Requirement:</span> In Uganda health training institutions, students cannot sit practical OSCE examination stations without verified stamped paper logbooks from Hospital Ward In-charges and approved clinical instructors.
        </div>
      </div>

      {/* Ward Posting Manager Interactive Component */}
      <WardPostingManager
        postings={postings}
        students={students}
        onUpdatePosting={handleUpdatePosting}
        onAddPosting={handleAddPosting}
      />
    </AdminPageWrapper>
  );
}
