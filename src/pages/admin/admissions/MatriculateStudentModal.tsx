import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Phone,
  ShieldCheck,
  Heart,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import {
  matriculateApplicantToStudent,
  type AdmissionApplicationRecord,
} from '@/services/admissionsService';
import { useSchoolType } from '@/hooks/useSchoolType';
import { TERTIARY_COURSES } from '@/pages/admin/students/AddStudentForm';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                1-Click Student Matriculation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Admitting candidate to Active Student Directory & Student Portal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Pre-Filled Candidate Summary Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                Application Ref: {application.application_number}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                Interview Score: {application.interview_score ?? 'N/A'}/100
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Candidate Name</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {application.full_name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Admitted Program</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                  {admittedCourse}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Gender & Date of Birth</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {application.gender} • {application.date_of_birth}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400 block">Primary Phone</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {application.phone}
                </span>
              </div>
            </div>
          </div>

          {/* Decision 1: Residential Status (Resident vs Non-Resident) */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Residential Status (Required for Fee Billing & Accommodation) *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBoardingType('Resident')}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  boardingType === 'Resident'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Building2
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    boardingType === 'Resident' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    Resident (Full Boarder)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Accommodated on campus. Automatically bills boarding tuition rate and opens hostel room allocation.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBoardingType('Non-Resident')}
                className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  boardingType === 'Non-Resident'
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-500 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <User
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    boardingType === 'Non-Resident' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  }`}
                />
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    Non-Resident (Day Scholar)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Commuter student residing off-campus. Automatically bills day-scholar tuition structure.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Decision 2: Registration Number & Class Cohort */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                College Registration Number *
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Auto-formatted in RCSN sequence
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Class / Semester Stage *
              </label>
              <select
                value={currentClass}
                onChange={(e) => setCurrentClass(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {TERTIARY_COURSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stream & Initial Tuition Payment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Class Stream / Batch
              </label>
              <select
                value={stream}
                onChange={(e) => setStream(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Stream A">Stream A</option>
                <option value="Stream B">Stream B</option>
                <option value="Main Cohort">Main Cohort</option>
                <option value="Extension Group">Extension Group</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Initial Tuition Deposit (UGX, Optional)
              </label>
              <input
                type="number"
                value={initialTuitionPaid || ''}
                onChange={(e) => setInitialTuitionPaid(Number(e.target.value))}
                placeholder="0"
                min="0"
                step="50000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Optional Health & Medical Information */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Medical Fitness Record (From Interview Medical Form)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">Blood Group</label>
                <input
                  type="text"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  placeholder="e.g. O+, A+, B+"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>
              <div>
                <label className="text-slate-500 dark:text-slate-400 block mb-1">Known Allergies</label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, None"
                  className="w-full px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
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
      </div>
    </div>
  );
}
