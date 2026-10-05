import React, { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import { supabase } from '@/lib/supabase';
import {
  fetchStudentCourseRegistrations,
  fetchStudentOutstandingRetakes,
  submitStudentCourseRegistration,
  CourseUnitRegistration,
  OutstandingRetake,
} from '@/features/tertiary/services/courseRegistrationService';
import { UHPAB_CERTIFICATE_NURSING_UNITS } from '@/features/tertiary/data/unmebCurriculumDefaults';
import {
  GraduationCap,
  Repeat,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';

export default function StudentCourseRegistrationPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) || 'e1b10000-0000-4000-a000-000000000001';
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [studentDetails, setStudentDetails] = useState<{
    id: string;
    name: string;
    admission_number: string;
    current_class: string;
  } | null>(null);

  const [existingRegistrations, setExistingRegistrations] = useState<CourseUnitRegistration[]>([]);
  const [outstandingRetakes, setOutstandingRetakes] = useState<OutstandingRetake[]>([]);
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [currentSemester, setCurrentSemester] = useState('Semester 1');

  // Track regular unit selection status (enrolled vs deferred)
  // Map of course_code -> { selected: boolean, deferred: boolean }
  const [unitSelection, setUnitSelection] = useState<Record<string, { selected: boolean; deferred: boolean }>>({});

  // Track retake selection (array of course_codes chosen to retake)
  const [selectedRetakeCodes, setSelectedRetakeCodes] = useState<string[]>([]);

  // Banner message
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadStudentInfoAndCourses = async () => {
    setLoading(true);
    try {
      let stId = user?.id;

      // Check if user is linked to a student record
      const { data: stRow } = await supabase
        .from('students')
        .select('student_id, name, admission_number, current_class')
        .or(`student_id.eq.${stId},user_id.eq.${stId}`)
        .maybeSingle();

      const studentId = stRow?.student_id || stId || '';
      setStudentDetails({
        id: studentId,
        name: stRow?.name || user?.user_metadata?.name || 'Trainee Nurse',
        admission_number: stRow?.admission_number || 'RCSN/2026/001',
        current_class: stRow?.current_class || 'Year 1 Semester 1',
      });

      if (studentId) {
        // Fetch existing registrations
        const regData = await fetchStudentCourseRegistrations(studentId);
        setExistingRegistrations(regData);

        // Fetch outstanding retakes (< 50% fails)
        const retakes = await fetchStudentOutstandingRetakes(studentId);
        setOutstandingRetakes(retakes);

        // Pre-select any retakes already registered
        const alreadyRegisteredRetakes = regData
          .filter((r) => r.registration_type === 'retake' && r.offering_semester === currentSemester)
          .map((r) => r.course_unit_code);
        setSelectedRetakeCodes(alreadyRegisteredRetakes);
      }
    } catch (err: any) {
      console.error('Error loading student course registration data:', err);
      showMsg('Failed to load course details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStudentInfoAndCourses();
  }, [user, schoolId]);

  // Determine prescribed course units for student's current cohort
  const cohortUnits = useMemo(() => {
    const rawClass = studentDetails?.current_class || 'Year 1 Semester 1';
    // Match against UNMEB defaultSemester strings like 'Y1S1', 'Y1S2', 'Y2S1'
    let matched = UHPAB_CERTIFICATE_NURSING_UNITS.filter((u) => {
      const semNorm = u.defaultSemester.toLowerCase();
      const rawNorm = rawClass.toLowerCase();
      return (
        rawNorm.includes(semNorm) ||
        (semNorm === 'y1s1' && rawNorm.includes('year 1 semester 1')) ||
        (semNorm === 'y1s2' && rawNorm.includes('year 1 semester 2')) ||
        (semNorm === 'y2s1' && rawNorm.includes('year 2 semester 1')) ||
        (semNorm === 'y2s2' && rawNorm.includes('year 2 semester 2')) ||
        (semNorm === 'y3s1' && rawNorm.includes('year 3 semester 1'))
      );
    });
    if (matched.length === 0) {
      matched = UHPAB_CERTIFICATE_NURSING_UNITS.filter((u) => u.defaultSemester === 'Y1S1');
    }
    return matched;
  }, [studentDetails]);

  // Initialize unitSelection when cohortUnits or existingRegistrations change
  useEffect(() => {
    const initialMap: Record<string, { selected: boolean; deferred: boolean }> = {};
    cohortUnits.forEach((unit) => {
      const existing = existingRegistrations.find(
        (r) => r.course_unit_code === unit.code && r.offering_semester === currentSemester
      );
      if (existing) {
        initialMap[unit.code] = {
          selected: existing.registration_type === 'regular',
          deferred: existing.registration_type === 'deferred',
        };
      } else {
        // By default, regular units are enrolled
        initialMap[unit.code] = { selected: true, deferred: false };
      }
    });
    setUnitSelection(initialMap);
  }, [cohortUnits, existingRegistrations, currentSemester]);

  // Toggle Defer / Push-back for a regular unit
  const handleToggleDefer = (courseCode: string) => {
    setUnitSelection((prev) => {
      const current = prev[courseCode] || { selected: true, deferred: false };
      if (current.selected) {
        // Switching to deferred
        return {
          ...prev,
          [courseCode]: { selected: false, deferred: true },
        };
      } else {
        // Switching back to enrolled
        return {
          ...prev,
          [courseCode]: { selected: true, deferred: false },
        };
      }
    });
  };

  // Toggle retake checkbox
  const handleToggleRetake = (courseCode: string) => {
    setSelectedRetakeCodes((prev) =>
      prev.includes(courseCode) ? prev.filter((c) => c !== courseCode) : [...prev, courseCode]
    );
  };

  // Calculate total Credit Units selected this semester
  const totalCreditUnits = useMemo(() => {
    let cu = 0;
    // Regular units
    cohortUnits.forEach((u) => {
      if (unitSelection[u.code]?.selected) {
        cu += u.creditUnits;
      }
    });
    // Retake units
    outstandingRetakes.forEach((r) => {
      if (selectedRetakeCodes.includes(r.course_unit_code)) {
        const u = UHPAB_CERTIFICATE_NURSING_UNITS.find((x) => x.code === r.course_unit_code);
        cu += u?.creditUnits || 3;
      }
    });
    return cu;
  }, [cohortUnits, unitSelection, outstandingRetakes, selectedRetakeCodes]);

  // Submit all selections
  const handleSubmitRegistrations = async () => {
    if (!studentDetails?.id) return;
    setSubmitting(true);
    try {
      const selections: Array<{
        course_unit_code: string;
        course_unit_title: string;
        offering_semester: string;
        cohort_class: string;
        registration_type: 'regular' | 'retake' | 'deferred';
        previous_score?: number | null;
        previous_grade?: string | null;
      }> = [];

      // 1. Submit regular units
      for (const unit of cohortUnits) {
        const status = unitSelection[unit.code];
        if (status?.selected) {
          selections.push({
            course_unit_code: unit.code,
            course_unit_title: unit.title,
            cohort_class: studentDetails.current_class,
            offering_semester: currentSemester,
            registration_type: 'regular',
          });
        } else if (status?.deferred) {
          selections.push({
            course_unit_code: unit.code,
            course_unit_title: unit.title,
            cohort_class: studentDetails.current_class,
            offering_semester: currentSemester,
            registration_type: 'deferred',
          });
        }
      }

      // 2. Submit retake units
      for (const retake of outstandingRetakes) {
        if (selectedRetakeCodes.includes(retake.course_unit_code)) {
          selections.push({
            course_unit_code: retake.course_unit_code,
            course_unit_title: retake.course_unit_title,
            cohort_class: studentDetails.current_class,
            offering_semester: currentSemester,
            registration_type: 'retake',
            previous_score: retake.failed_score,
            previous_grade: retake.failed_grade,
          });
        }
      }

      await submitStudentCourseRegistration(studentDetails.id, selections);

      showMsg('Course registration submitted successfully to Academic Registrar for verification!');
      void loadStudentInfoAndCourses();
    } catch (err: any) {
      console.error(err);
      showMsg(err.message || 'Submission failed.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isY1S1 = studentDetails?.current_class.toLowerCase().includes('year 1 semester 1');

  return (
    <div
      className="p-4 sm:p-6 lg:p-8 min-h-screen"
      style={{
        background: t.screenBg,
        color: t.textPrimary,
        fontFamily: "'Instrument Sans', 'Cabinet Grotesk', system-ui, sans-serif",
      }}
    >
      {/* Banner */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between shadow-lg ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs uppercase font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
              Student Academic Portal
            </span>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400">
              {studentDetails?.current_class || 'Nursing Cohort'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Semester Course Registration & Retakes
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Select your course units for the upcoming semester, manage unit deferrals, or enroll to sit cross-cohort retakes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs text-gray-400 block">Total Credit Load</span>
            <span
              className={`text-xl font-bold ${
                totalCreditUnits > 26 ? 'text-rose-400' : 'text-purple-400'
              }`}
            >
              {totalCreditUnits} <span className="text-xs text-gray-400 font-normal">/ 24 CU Normal</span>
            </span>
          </div>
          <button
            onClick={handleSubmitRegistrations}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md shadow-purple-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>Submit Registration</span>
          </button>
        </div>
      </div>

      {/* Student & Session Info Bar */}
      <div
        className="p-4 rounded-2xl border mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-lg">
            {studentDetails?.name
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'ST'}
          </div>
          <div>
            <div className="font-bold text-base text-white">{studentDetails?.name}</div>
            <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
              <span>Adm No: <strong className="text-gray-200">{studentDetails?.admission_number}</strong></span>
              <span>•</span>
              <span>Cohort: <strong className="text-purple-300">{studentDetails?.current_class}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Academic Year</label>
            <div className="px-3 py-1.5 rounded-lg border text-sm font-medium" style={{ background: t.screenBg, borderColor: t.border }}>
              {academicYear}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Semester</label>
            <div className="px-3 py-1.5 rounded-lg border text-sm font-medium" style={{ background: t.screenBg, borderColor: t.border }}>
              {currentSemester}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: OUTSTANDING RETAKES ALERT & ENROLMENT */}
      {outstandingRetakes.length > 0 && (
        <div className="mb-6 p-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-rose-200">
                  Outstanding Retake Course Units Detected ({outstandingRetakes.length})
                </h3>
                <p className="text-xs text-rose-300/80">
                  You have course units with a score below the 50.0% UNMEB pass mark. You can enroll to sit these retakes this semester alongside junior cohorts.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {outstandingRetakes.map((retake) => {
              const isSelected = selectedRetakeCodes.includes(retake.course_unit_code);
              return (
                <div
                  key={retake.course_unit_code}
                  onClick={() => handleToggleRetake(retake.course_unit_code)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-rose-500/25 border-rose-500 text-white shadow-sm'
                      : 'bg-black/20 border-rose-500/20 text-gray-300 hover:border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent onClick
                      className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400"
                    />
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        <span className="font-mono text-rose-300">{retake.course_unit_code}</span>
                        <span>{retake.course_unit_title}</span>
                      </div>
                      <div className="text-xs text-rose-300/70 mt-0.5">
                        Failed in {retake.failed_semester} • Prev Score: {retake.failed_score}% ({retake.failed_grade})
                      </div>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isSelected ? 'bg-rose-500 text-white' : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {isSelected ? 'ENROLLED FOR RETAKE' : 'CLICK TO ENROLL'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: PRESCRIBED REGULAR COURSE UNITS */}
      <div
        className="rounded-2xl border overflow-hidden shadow-sm mb-6"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ borderColor: t.border }}>
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <span>Prescribed Course Units for {studentDetails?.current_class}</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {isY1S1
                ? 'Freshers (Year 1 Semester 1) are automatically required to sit all core foundation units.'
                : 'Select the units you will take this semester. If pushing back/deferring a unit, mark it as deferred so you do not appear on attendance sheets.'}
            </p>
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: t.border }}>
          {cohortUnits.map((unit) => {
            const status = unitSelection[unit.code] || { selected: true, deferred: false };
            return (
              <div
                key={unit.code}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-purple-500/5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 font-mono font-bold text-xs mt-0.5">
                    {unit.code}
                  </div>
                  <div>
                    <h4 className="font-semibold text-base text-white">{unit.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
                      <span className="font-medium text-purple-300">{unit.creditUnits} Credit Units (CU)</span>
                      <span>•</span>
                      <span>Pass Mark: 50.0%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center">
                  {status.selected ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Enrolled (Active)
                      </span>
                      {!isY1S1 && (
                        <button
                          type="button"
                          onClick={() => handleToggleDefer(unit.code)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg text-gray-400 hover:text-amber-400 border border-gray-700 hover:border-amber-500/40 transition-colors"
                        >
                          Defer / Push Back
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Deferred / Pushed Back
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleDefer(unit.code)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg text-gray-400 hover:text-emerald-400 border border-gray-700 hover:border-emerald-500/40 transition-colors"
                      >
                        Re-enroll
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: RECENT REGISTRATION HISTORY */}
      {existingRegistrations.length > 0 && (
        <div
          className="rounded-2xl border overflow-hidden shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: t.border }}>
            <h3 className="font-bold text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Current Registration Records</span>
            </h3>
            <span className="text-xs text-gray-400">{existingRegistrations.length} unit records logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead
                className="text-xs uppercase tracking-wider font-semibold border-b text-gray-400"
                style={{ background: isDark ? '#1e2430' : '#f8fafc', borderColor: t.border }}
              >
                <tr>
                  <th className="py-3 px-4">Course Unit</th>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: t.border }}>
                {existingRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-purple-500/5 transition-colors">
                    <td className="py-3 px-4 font-semibold text-white">
                      <span className="font-mono text-purple-400 mr-2">{reg.course_unit_code}</span>
                      <span>{reg.course_unit_title}</span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-300">
                      {reg.offering_semester} ({reg.academic_year})
                    </td>
                    <td className="py-3 px-4">
                      {reg.registration_type === 'retake' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          RETAKE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                          REGULAR
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                          reg.status === 'approved'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : reg.status === 'pending'
                            ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {reg.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">{reg.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
