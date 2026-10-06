import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  CheckCircle2,
  AlertCircle,
  User,
  Heart,
  Loader2,
} from 'lucide-react';
import {
  matriculateApplicantToStudent,
  type AdmissionApplicationRecord,
} from '@/services/admissionsService';
import { TERTIARY_COURSES } from '@/pages/admin/students/AddStudentForm';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

interface MatriculateStudentModalProps {
  application: AdmissionApplicationRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MatriculateStudentModal({
  application,
  isOpen,
  onClose,
  onSuccess,
}: MatriculateStudentModalProps) {
  if (!isOpen || !application) return null;

  const currentYear = new Date().getFullYear();
  const admittedCourse = application.admitted_program || application.programs[0] || 'Certificate in Nursing';

  // Determine course abbreviation code
  const getCourseCode = (courseName: string): string => {
    const lower = courseName.toLowerCase();
    if (lower.includes('midwifery') && lower.includes('diploma')) return 'DM';
    if (lower.includes('midwifery')) return 'CM';
    if (lower.includes('diploma')) return 'DN';
    return 'CN';
  };

  const courseCode = getCourseCode(admittedCourse);
  const defaultRegNo = `RCSN/${currentYear}/AUG/${courseCode}/${application.application_number.slice(-3)}`;

  // Default starting class
  const defaultClass =
    TERTIARY_COURSES.find((c) => c.startsWith(`${courseCode} – Year 1 Semester 1`)) ||
    `${courseCode} – Year 1 Semester 1`;

  // Form State
  const [registrationNumber, setRegistrationNumber] = useState(defaultRegNo);
  const [boardingType, setBoardingType] = useState<'Resident' | 'Non-Resident'>(
    application.residential_preference || 'Resident'
  );
  const [currentClass, setCurrentClass] = useState(defaultClass);
  const [stream, setStream] = useState('Stream A');
  const [bloodGroup, setBloodGroup] = useState('');
  const [allergies, setAllergies] = useState('');
  const [medicalCondition, setMedicalCondition] = useState('');
  const [initialTuitionPaid, setInitialTuitionPaid] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationNumber.trim()) {
      setError('Registration Number is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await matriculateApplicantToStudent(application, {
        registrationNumber: registrationNumber.trim(),
        boardingType,
        currentClass,
        stream,
        bloodGroup: bloodGroup.trim() || undefined,
        allergies: allergies.trim() || undefined,
        medicalCondition: medicalCondition.trim() || undefined,
        initialTuitionPaid: initialTuitionPaid > 0 ? initialTuitionPaid : undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to complete matriculation. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Matriculation error';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <NativeModal
      isOpen={isOpen}
      onClose={onClose}
      title="1-Click Student Matriculation"
      subtitle="Admitting candidate to Active Student Directory & Student Portal"
      icon={GraduationCap}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5 text-white flex flex-col">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pre-Filled Candidate Summary Banner */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-white/60">
              Ref: {application.application_number}
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
              Interview: {application.interview_score ?? 'N/A'}/100
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Candidate</span>
              <span className="font-bold text-white text-sm">
                {application.full_name}
              </span>
            </div>
            <div>
              <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Admitted Program</span>
              <span className="font-bold text-emerald-400 text-sm">
                {admittedCourse}
              </span>
            </div>
            <div>
              <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Bio Details</span>
              <span className="font-medium text-white/80">
                {application.gender} • {application.date_of_birth}
              </span>
            </div>
            <div>
              <span className="text-white/50 block text-[10px] uppercase font-bold tracking-wider">Phone Contact</span>
              <span className="font-medium text-white/80">
                {application.phone}
              </span>
            </div>
          </div>
        </div>

        {/* Residential Status */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block">
            Residential Status (Required for Fee Billing & Accommodation) *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setBoardingType('Resident')}
              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all backdrop-blur-sm ${
                boardingType === 'Resident'
                  ? 'border-emerald-400/80 bg-emerald-500/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Building2
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  boardingType === 'Resident' ? 'text-emerald-400' : 'text-white/40'
                }`}
              />
              <div>
                <div className="font-bold text-xs text-white">
                  Resident (Full Boarder)
                </div>
                <div className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                  Accommodated on campus. Automatically bills boarding rate and opens room allocation.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBoardingType('Non-Resident')}
              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all backdrop-blur-sm ${
                boardingType === 'Non-Resident'
                  ? 'border-emerald-400/80 bg-emerald-500/20 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <User
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  boardingType === 'Non-Resident' ? 'text-emerald-400' : 'text-white/40'
                }`}
              />
              <div>
                <div className="font-bold text-xs text-white">
                  Non-Resident (Day Scholar)
                </div>
                <div className="text-[11px] text-white/60 mt-0.5 leading-relaxed">
                  Commuter student off-campus. Automatically bills day-scholar tuition structure.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Registration Number & Class Cohort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-[35] focus-within:z-[50]">
          <div>
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1">
              College Registration Number *
            </label>
            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white font-mono text-xs font-semibold placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] outline-none"
            />
            <span className="text-[10px] text-white/50 block mt-1">
              Auto-formatted in RCSN sequence
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Class / Semester Stage *
            </label>
            <LiquidGlassSelect
              value={currentClass}
              onChange={(val) => setCurrentClass(val)}
              options={TERTIARY_COURSES.map((c) => ({ value: c, label: c }))}
            />
          </div>
        </div>

        {/* Stream & Initial Tuition Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-[30] focus-within:z-[50]">
          <div>
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Class Stream / Batch
            </label>
            <LiquidGlassSelect
              value={stream}
              onChange={(val) => setStream(val)}
              options={[
                { value: 'Stream A', label: 'Stream A' },
                { value: 'Stream B', label: 'Stream B' },
                { value: 'Main Cohort', label: 'Main Cohort' },
                { value: 'Extension Group', label: 'Extension Group' },
              ]}
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1">
              Initial Tuition Deposit (UGX, Optional)
            </label>
            <input
              type="number"
              value={initialTuitionPaid || ''}
              onChange={(e) => setInitialTuitionPaid(Number(e.target.value))}
              placeholder="0"
              min="0"
              step="50000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/20 bg-black/25 text-white text-xs placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] outline-none"
            />
          </div>
        </div>

        {/* Health & Medical Fitness */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-sm space-y-3">
          <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>Medical Fitness Record (From Interview Medical Form)</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-white/60 block text-[11px] mb-1">Blood Group</label>
              <input
                type="text"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                placeholder="e.g. O+, A+, B+"
                className="w-full px-3 py-2 rounded-xl border border-white/20 bg-black/25 text-white text-xs placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none"
              />
            </div>
            <div>
              <label className="text-white/60 block text-[11px] mb-1">Known Allergies</label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, None"
                className="w-full px-3 py-2 rounded-xl border border-white/20 bg-black/25 text-white text-xs placeholder-white/40 focus:border-emerald-400/80 focus:bg-black/35 backdrop-blur-sm outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-white/15 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-white/80 hover:text-white text-xs font-semibold backdrop-blur-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Matriculating Student...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Enrollment</span>
              </>
            )}
          </button>
        </div>
      </form>
    </NativeModal>
  );
}
