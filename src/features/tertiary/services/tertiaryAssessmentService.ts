/**
 * PwezaCore Tertiary Continuous Assessment & Results Service
 * Aligned with national tertiary standards (UHPAB / UNMEB / NCHE):
 * - Direct single score entry out of 100
 * - UHPAB 5.0 Grade Point Scale (A, B+, B, C+, C, D+, D, F)
 * - Strict 50.0% Pass Mark Threshold (Status: PASS >= 50, RETAKE < 50)
 * - Automatic grade and grade point calculation
 * - Exam set linkage for reliable broadsheets and transcripts
 */

import { supabase } from '@/lib/supabase';

export interface TertiaryGradeBand {
  grade: string;
  min_pct: number;
  max_pct: number;
  gp: number;
  remark: string;
}

export interface TertiaryAssessmentScheme {
  catWeight: number; // default 30%
  examWeight: number; // default 70%
  passMark: number; // default 50.0%
}

export interface TraineeAssessmentRow {
  student_id: string;
  name: string;
  admission_number: string;
  current_class: string;
  exam_set_id?: string;
  marks_obtained: number | null; // Direct score out of 100
  grade: string; // Auto-calculated (A, B+, B, C+, C, D+, D, F)
  grade_point: number; // Auto-calculated (5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 0.0)
  status: 'PASS' | 'RETAKE' | '-'; // Status: PASS if >= 50, RETAKE if < 50
  is_retake: boolean;
  result_id?: string;

  // Compatibility fields for legacy consumers
  final_score?: number | null;
  exam_score?: number | null;
  test1?: number | null;
  test2?: number | null;
  cat_score?: number | null;
  remarks?: string;
}

export const DEFAULT_TERTIARY_GRADE_BANDS: TertiaryGradeBand[] = [
  { grade: 'A', min_pct: 80, max_pct: 100, gp: 5.0, remark: 'Distinction' },
  { grade: 'B+', min_pct: 75, max_pct: 79.99, gp: 4.5, remark: 'Very Good' },
  { grade: 'B', min_pct: 70, max_pct: 74.99, gp: 4.0, remark: 'Good Credit' },
  { grade: 'C+', min_pct: 65, max_pct: 69.99, gp: 3.5, remark: 'Credit' },
  { grade: 'C', min_pct: 60, max_pct: 64.99, gp: 3.0, remark: 'Satisfactory Pass' },
  { grade: 'D+', min_pct: 55, max_pct: 59.99, gp: 2.5, remark: 'Pass' },
  { grade: 'D', min_pct: 50, max_pct: 54.99, gp: 2.0, remark: 'Minimum Qualifying Pass' },
  { grade: 'F', min_pct: 0, max_pct: 49.99, gp: 0.0, remark: 'Fail / Retake' },
];

export const DEFAULT_TERTIARY_SCHEME: TertiaryAssessmentScheme = {
  catWeight: 30,
  examWeight: 70,
  passMark: 50.0,
};

/**
 * Fetch tertiary grading bands for school with default fallback
 */
export async function fetchTertiaryGradingBands(schoolId: string): Promise<TertiaryGradeBand[]> {
  try {
    const { data, error } = await supabase
      .from('school_class_uace_grade_bands')
      .select('bands')
      .eq('school_id', schoolId)
      .eq('class_name', '__TERTIARY_GRADING_SCHEME__')
      .maybeSingle();

    if (error || !data || !Array.isArray(data.bands) || data.bands.length === 0) {
      return DEFAULT_TERTIARY_GRADE_BANDS;
    }

    return (data.bands as any[]).map((b) => ({
      grade: String(b.grade || '').trim().toUpperCase(),
      min_pct: Number(b.min_pct ?? 0),
      max_pct: Number(b.max_pct ?? 100),
      gp: Number(b.gp ?? 0),
      remark: String(b.remark || ''),
    }));
  } catch {
    return DEFAULT_TERTIARY_GRADE_BANDS;
  }
}

/**
 * Save tertiary grading bands for school
 */
export async function saveTertiaryGradingBands(
  schoolId: string,
  bands: TertiaryGradeBand[]
): Promise<void> {
  const { error } = await supabase.from('school_class_uace_grade_bands').upsert(
    {
      school_id: schoolId,
      class_name: '__TERTIARY_GRADING_SCHEME__',
      bands: bands as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'school_id,class_name' }
  );

  if (error) throw error;
}

/**
 * Fetch assessment weights and pass mark for school
 */
export async function fetchTertiaryAssessmentScheme(
  schoolId: string
): Promise<TertiaryAssessmentScheme> {
  try {
    const { data, error } = await supabase
      .from('school_class_uace_grade_bands')
      .select('bands')
      .eq('school_id', schoolId)
      .eq('class_name', '__TERTIARY_ASSESSMENT_WEIGHTS__')
      .maybeSingle();

    if (error || !data || !Array.isArray(data.bands) || data.bands.length === 0) {
      return DEFAULT_TERTIARY_SCHEME;
    }

    const map = new Map<string, number>();
    for (const item of data.bands as any[]) {
      if (item && item.name && typeof item.value === 'number') {
        map.set(item.name, item.value);
      }
    }

    return {
      catWeight: map.get('catWeight') ?? DEFAULT_TERTIARY_SCHEME.catWeight,
      examWeight: map.get('examWeight') ?? DEFAULT_TERTIARY_SCHEME.examWeight,
      passMark: map.get('passMark') ?? DEFAULT_TERTIARY_SCHEME.passMark,
    };
  } catch {
    return DEFAULT_TERTIARY_SCHEME;
  }
}

/**
 * Save assessment weights and pass mark for school
 */
export async function saveTertiaryAssessmentScheme(
  schoolId: string,
  scheme: TertiaryAssessmentScheme
): Promise<void> {
  const payload = [
    { name: 'catWeight', value: scheme.catWeight },
    { name: 'examWeight', value: scheme.examWeight },
    { name: 'passMark', value: scheme.passMark },
  ];

  const { error } = await supabase.from('school_class_uace_grade_bands').upsert(
    {
      school_id: schoolId,
      class_name: '__TERTIARY_ASSESSMENT_WEIGHTS__',
      bands: payload as any,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'school_id,class_name' }
  );

  if (error) throw error;
}

/**
 * Direct evaluation of mark out of 100 into Grade, GP, and Pass/Retake Status
 */
export function computeTertiaryMark(
  mark: number | null | undefined,
  bands: TertiaryGradeBand[] = DEFAULT_TERTIARY_GRADE_BANDS
): {
  grade: string;
  grade_point: number;
  status: 'PASS' | 'RETAKE' | '-';
  is_retake: boolean;
  remarks: string;
} {
  if (mark === null || mark === undefined || isNaN(mark)) {
    return {
      grade: '-',
      grade_point: 0.0,
      status: '-',
      is_retake: false,
      remarks: '',
    };
  }

  const clamped = Math.max(0, Math.min(100, Math.round(mark * 10) / 10));
  let matchedBand: TertiaryGradeBand | undefined;

  for (const b of bands) {
    if (clamped >= b.min_pct && clamped <= b.max_pct + 0.001) {
      matchedBand = b;
      break;
    }
  }

  if (!matchedBand) {
    matchedBand = clamped >= 80
      ? bands[0]
      : bands[bands.length - 1] ?? { grade: 'F', min_pct: 0, max_pct: 49.99, gp: 0.0, remark: 'Retake' };
  }

  const isRetake = clamped < 50.0 || matchedBand.grade === 'F' || matchedBand.gp < 2.0;

  return {
    grade: isRetake ? 'F' : matchedBand.grade,
    grade_point: isRetake ? 0.0 : matchedBand.gp,
    status: isRetake ? 'RETAKE' : 'PASS',
    is_retake: isRetake,
    remarks: isRetake ? 'Retake' : 'Pass',
  };
}

/**
 * Calculates CAT score, Final score, Letter Grade, GP, and Remarks
 * (Maintained for backward compatibility)
 */
export function calculateTertiaryMarkRow(
  test1: number | null,
  test2: number | null,
  examScore: number | null,
  bands: TertiaryGradeBand[] = DEFAULT_TERTIARY_GRADE_BANDS,
  _scheme: TertiaryAssessmentScheme = DEFAULT_TERTIARY_SCHEME
): {
  cat_score: number | null;
  final_score: number | null;
  grade: string;
  grade_point: number;
  remarks: string;
  is_retake: boolean;
} {
  if (test1 === null && test2 === null && examScore === null) {
    return {
      cat_score: null,
      final_score: null,
      grade: '-',
      grade_point: 0.0,
      remarks: 'Pending Assessment',
      is_retake: false,
    };
  }

  // If examScore is given directly as the full mark (or only examScore provided)
  const effectiveScore = examScore ?? test1 ?? test2 ?? 0;
  const computed = computeTertiaryMark(effectiveScore, bands);

  return {
    cat_score: null,
    final_score: effectiveScore,
    grade: computed.grade,
    grade_point: computed.grade_point,
    remarks: computed.remarks,
    is_retake: computed.is_retake,
  };
}

import { fetchRegisteredStudentsForCourseUnit } from './courseRegistrationService';

/**
 * Fetch trainees in cohort with their existing results for the chosen course unit.
 * Unified Roster: Includes both regular cohort students and cross-cohort retake trainees
 * on the exact same marksheet, clearly badged with [RETAKE].
 */
export async function fetchCohortAssessmentData(
  schoolId: string,
  className: string,
  subjectName: string,
  bands: TertiaryGradeBand[],
  examSetId?: string
): Promise<TraineeAssessmentRow[]> {
  // 1. Extract course unit code from subjectName (e.g. "NUR 1101: Anatomy & Physiology" -> "NUR 1101")
  const codeMatch = subjectName.match(/^([A-Z]{2,4}\s*\d{3,4})/i);
  const courseCode = codeMatch ? codeMatch[1].trim() : subjectName.trim();

  // 2. Fetch registered trainees for this course unit (approved regular + cross-cohort retakers)
  const registeredTrainees = await fetchRegisteredStudentsForCourseUnit(courseCode, className);

  // Map of student_id -> details
  const traineeMap = new Map<string, { name: string; admission_number: string; current_class: string; is_retake: boolean }>();

  registeredTrainees.forEach((st) => {
    traineeMap.set(st.student_id, {
      name: st.name,
      admission_number: st.admission_number,
      current_class: st.home_cohort,
      is_retake: st.is_retake,
    });
  });

  // 3. Query existing results for this subject / course unit
  let query = supabase
    .from('exam_results')
    .select('id, exam_set_id, student_id, marks_obtained, final_score, exam_score, grade, uace_points, remarks, is_retake, class_name')
    .eq('school_id', schoolId)
    .or(`subject.eq."${subjectName}",subject.ilike."%${courseCode}%"`);

  if (examSetId) {
    query = query.eq('exam_set_id', examSetId);
  }

  const { data: results, error: resErr } = await query;
  if (resErr) {
    console.error('Error fetching exam results:', resErr);
  }

  const resultsByStudent = new Map<string, any>();
  const studentsWithResults = new Set<string>();

  (results || []).forEach((r) => {
    studentsWithResults.add(r.student_id);
    if (!resultsByStudent.has(r.student_id) || (examSetId && r.exam_set_id === examSetId)) {
      resultsByStudent.set(r.student_id, r);
    }
  });

  // If any students have exam results for this course unit/exam set but were not in registeredTrainees, load their details too!
  const missingStudentIds = Array.from(studentsWithResults).filter((id) => !traineeMap.has(id));
  if (missingStudentIds.length > 0) {
    const { data: missingStudents } = await supabase
      .from('students')
      .select('student_id, name, admission_number, current_class')
      .in('student_id', missingStudentIds);

    (missingStudents || []).forEach((s) => {
      const r = resultsByStudent.get(s.student_id);
      const isRetake = Boolean(r?.is_retake || (className && s.current_class !== className));
      traineeMap.set(s.student_id, {
        name: s.name,
        admission_number: s.admission_number || '',
        current_class: s.current_class || 'General',
        is_retake: isRetake,
      });
    });
  }

  // If still empty (e.g. no registrations logged yet), fallback to active cohort students
  if (traineeMap.size === 0 && className) {
    const { data: fallbackStudents } = await supabase
      .from('students')
      .select('student_id, name, admission_number, current_class')
      .eq('school_id', schoolId)
      .eq('current_class', className)
      .eq('status', 'active')
      .order('name');

    (fallbackStudents || []).forEach((s) => {
      traineeMap.set(s.student_id, {
        name: s.name,
        admission_number: s.admission_number || '',
        current_class: s.current_class,
        is_retake: false,
      });
    });
  }

  // 4. Map trainees to unified TraineeAssessmentRows
  const rows: TraineeAssessmentRow[] = Array.from(traineeMap.entries()).map(([stId, st]) => {
    const r = resultsByStudent.get(stId);

    // Read mark from marks_obtained first, then final_score, then exam_score
    let mark: number | null = null;
    if (r?.marks_obtained !== undefined && r?.marks_obtained !== null) {
      mark = Number(r.marks_obtained);
    } else if (r?.final_score !== undefined && r?.final_score !== null) {
      mark = Number(r.final_score);
    } else if (r?.exam_score !== undefined && r?.exam_score !== null) {
      mark = Number(r.exam_score);
    }

    const computed = computeTertiaryMark(mark, bands);
    const isRetakeSitting = Boolean(st.is_retake || r?.is_retake);

    return {
      student_id: stId,
      name: st.name,
      admission_number: st.admission_number,
      current_class: st.current_class,
      exam_set_id: r?.exam_set_id || examSetId,
      marks_obtained: mark,
      final_score: mark,
      exam_score: mark,
      grade: computed.grade,
      grade_point: computed.grade_point,
      status: computed.status,
      is_retake: isRetakeSitting,
      remarks: computed.remarks,
      result_id: r?.id,
    };
  });

  // Sort rows: regular students first (alphabetical), then retake trainees (alphabetical)
  return rows.sort((a, b) => {
    if (a.is_retake === b.is_retake) {
      return a.name.localeCompare(b.name);
    }
    return a.is_retake ? 1 : -1;
  });
}

/**
 * Save single trainee assessment to exam_results table
 */
export async function saveTraineeAssessment(
  schoolId: string,
  teacherId: string | null,
  className: string,
  subjectName: string,
  examSetId: string,
  row: TraineeAssessmentRow,
  bands: TertiaryGradeBand[] = DEFAULT_TERTIARY_GRADE_BANDS
): Promise<string> {
  let activeExamSetId = examSetId || row.exam_set_id;
  if (!activeExamSetId) {
    const { data: set } = await supabase
      .from('exam_sets')
      .select('id')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    activeExamSetId = set?.id || '';
  }

  const mark =
    row.marks_obtained !== null && row.marks_obtained !== undefined
      ? Math.max(0, Math.min(100, Number(row.marks_obtained)))
      : null;

  const computed = computeTertiaryMark(mark, bands);

  const payload: any = {
    school_id: schoolId,
    exam_set_id: activeExamSetId,
    student_id: row.student_id,
    class_name: className,
    subject: subjectName,
    marks_obtained: mark,
    total_marks: 100,
    exam_score: mark,
    final_score: mark,
    grade: computed.grade !== '-' ? computed.grade : null,
    uace_points: computed.grade !== '-' ? computed.grade_point : null,
    remarks: computed.status === 'RETAKE' ? 'Retake' : computed.status === 'PASS' ? 'Pass' : null,
    is_retake: Boolean(row.is_retake),
    updated_at: new Date().toISOString(),
  };

  if (teacherId) {
    payload.teacher_id = teacherId;
  }

  if (row.result_id) {
    const { error } = await supabase.from('exam_results').update(payload).eq('id', row.result_id);
    if (error) throw error;
    return row.result_id;
  } else {
    // Check if record already exists first to prevent duplicate rows
    let query = supabase
      .from('exam_results')
      .select('id')
      .eq('school_id', schoolId)
      .eq('student_id', row.student_id)
      .eq('subject', subjectName);

    if (activeExamSetId) {
      query = query.eq('exam_set_id', activeExamSetId);
    }

    const { data: existingRows } = await query.limit(1);
    const existing = existingRows?.[0];

    if (existing?.id) {
      const { error } = await supabase.from('exam_results').update(payload).eq('id', existing.id);
      if (error) throw error;
      return existing.id;
    } else {
      const { data: inserted, error } = await supabase
        .from('exam_results')
        .insert([payload])
        .select('id')
        .single();
      if (error) throw error;
      return inserted.id;
    }
  }
}

/**
 * High-performance batch saving for multiple trainee scores with per-trainee error isolation
 */
export async function saveBatchTraineeAssessments(
  schoolId: string,
  teacherId: string | null,
  className: string,
  subjectName: string,
  examSetId: string,
  rows: TraineeAssessmentRow[],
  bands: TertiaryGradeBand[] = DEFAULT_TERTIARY_GRADE_BANDS
): Promise<Map<string, string>> {
  const resultMap = new Map<string, string>();
  const chunkSize = 5;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (row) => {
        try {
          const id = await saveTraineeAssessment(schoolId, teacherId, className, subjectName, examSetId, row, bands);
          resultMap.set(row.student_id, id);
        } catch (err) {
          console.error(`Failed to save mark for student ${row.student_id}:`, err);
        }
      })
    );
  }
  return resultMap;
}
