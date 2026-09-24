/**
 * PwezaCore Tertiary Continuous Assessment & Results Service
 * Aligned with UHPAB (Uganda Health Professions Assessment Board) / NCHE national standards:
 * - Coursework / CAT (Test 1, Test 2 / OSCE / Clinical Logbook)
 * - Semester Final Examination
 * - UHPAB 5.0 Grade Point Scale (A, B+, B, C+, C, D+, D, F)
 * - Strict 50.0% Pass Mark Threshold
 */

import { supabase } from '@/lib/supabase';
import { UHPAB_STANDARD_GRADING_SCALE, UNMEB_STANDARD_GRADING_SCALE } from '../data/unmebCurriculumDefaults';

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
  test1: number | null;
  test2: number | null;
  cat_score: number | null; // out of catWeight (default 30)
  exam_score: number | null; // raw out of 100 or weighted
  final_score: number | null; // composite mark out of 100
  grade: string;
  grade_point: number;
  remarks: string;
  is_retake: boolean;
  result_id?: string;
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
 * Calculates CAT score, Final score, Letter Grade, GP, and Remarks
 */
export function calculateTertiaryMarkRow(
  test1: number | null,
  test2: number | null,
  examScore: number | null,
  bands: TertiaryGradeBand[] = DEFAULT_TERTIARY_GRADE_BANDS,
  scheme: TertiaryAssessmentScheme = DEFAULT_TERTIARY_SCHEME
): {
  cat_score: number | null;
  final_score: number | null;
  grade: string;
  grade_point: number;
  remarks: string;
  is_retake: boolean;
} {
  // If no scores entered at all
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

  // Calculate Coursework / CAT
  let catScore: number | null = null;
  if (test1 !== null || test2 !== null) {
    const validScores: number[] = [];
    if (test1 !== null) validScores.push(Math.max(0, Math.min(100, test1)));
    if (test2 !== null) validScores.push(Math.max(0, Math.min(100, test2)));
    const avgScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
    // Scale average to catWeight (e.g. 30%)
    catScore = Math.round(((avgScore * scheme.catWeight) / 100) * 10) / 10;
  }

  // Calculate Final Exam weighted
  let examWeighted: number | null = null;
  if (examScore !== null) {
    const clampedExam = Math.max(0, Math.min(100, examScore));
    examWeighted = Math.round(((clampedExam * scheme.examWeight) / 100) * 10) / 10;
  }

  // Composite Final Score (out of 100%)
  let finalScore: number | null = null;
  if (catScore !== null || examWeighted !== null) {
    finalScore = Math.round(((catScore ?? 0) + (examWeighted ?? 0)) * 10) / 10;
    // Clamp to 0 - 100
    finalScore = Math.max(0, Math.min(100, finalScore));
  }

  if (finalScore === null) {
    return {
      cat_score: catScore,
      final_score: null,
      grade: '-',
      grade_point: 0.0,
      remarks: 'Incomplete',
      is_retake: false,
    };
  }

  // UNMEB rule: CAT must be >= 50% of the CAT weight (e.g. >= 15/30) to qualify
  const catPassingThreshold = (scheme.passMark / 100) * scheme.catWeight;
  const failedCatPrerequisite = catScore !== null && catScore < catPassingThreshold;

  // Grade band determination
  const scoreForGrading = finalScore;
  let matchedBand: TertiaryGradeBand | undefined;

  for (const b of bands) {
    if (scoreForGrading >= b.min_pct && scoreForGrading <= b.max_pct + 0.001) {
      matchedBand = b;
      break;
    }
  }

  if (!matchedBand) {
    matchedBand = scoreForGrading >= 80
      ? bands[0]
      : bands[bands.length - 1] ?? { grade: 'F', min_pct: 0, max_pct: 49.99, gp: 0.0, remark: 'Fail / Retake' };
  }

  const isBelowPassMark = finalScore < scheme.passMark;
  const isRetake = isBelowPassMark || failedCatPrerequisite || matchedBand.grade === 'F' || matchedBand.gp < 2.0;

  let remarkText = matchedBand.remark;
  if (failedCatPrerequisite && !isBelowPassMark) {
    remarkText = 'CAT Prerequisite Failed (Retake)';
  } else if (isBelowPassMark) {
    remarkText = 'Retake (Below 50%)';
  }

  return {
    cat_score: catScore,
    final_score: finalScore,
    grade: isRetake ? 'F' : matchedBand.grade,
    grade_point: isRetake ? 0.0 : matchedBand.gp,
    remarks: remarkText,
    is_retake: isRetake,
  };
}

/**
 * Fetch trainees in cohort with their existing continuous assessment results
 */
export async function fetchCohortAssessmentData(
  schoolId: string,
  className: string,
  subjectName: string,
  bands: TertiaryGradeBand[],
  scheme: TertiaryAssessmentScheme
): Promise<TraineeAssessmentRow[]> {
  // 1. Fetch active students in cohort
  const { data: students, error: stErr } = await supabase
    .from('students')
    .select('student_id, name, admission_number, current_class')
    .eq('school_id', schoolId)
    .eq('current_class', className)
    .eq('status', 'active')
    .order('name');

  if (stErr) throw stErr;
  if (!students || students.length === 0) return [];

  // 2. Fetch existing results for this cohort and course unit
  const { data: results, error: resErr } = await supabase
    .from('exam_results')
    .select('*')
    .eq('school_id', schoolId)
    .eq('class_name', className)
    .eq('subject', subjectName);

  if (resErr) throw resErr;

  const resultsByStudent = new Map<string, any>();
  (results || []).forEach((r) => {
    resultsByStudent.set(r.student_id, r);
  });

  // 3. Map students to assessment rows
  return students.map((s) => {
    const r = resultsByStudent.get(s.student_id);

    // If an existing record has scores:
    // activity_score: CAT coursework mark (out of 30)
    // exam_score: Final Exam mark (out of 70)
    // formative_score: can store test1
    // topic: can store test2
    const test1 = r?.formative_score !== undefined && r?.formative_score !== null ? Number(r.formative_score) : null;
    const test2 = r?.topic ? Number(r.topic) : null;
    
    // Exam score can be stored in exam_score
    const examScore = r?.exam_score !== undefined && r?.exam_score !== null ? Number(r.exam_score) : null;

    // Run reactive calculations
    const computed = calculateTertiaryMarkRow(test1, test2, examScore, bands, scheme);

    return {
      student_id: s.student_id,
      name: s.name,
      admission_number: s.admission_number || '',
      current_class: s.current_class,
      test1,
      test2,
      cat_score: computed.cat_score,
      exam_score: examScore,
      final_score: computed.final_score,
      grade: computed.grade,
      grade_point: computed.grade_point,
      remarks: computed.remarks,
      is_retake: computed.is_retake,
      result_id: r?.id,
    };
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
  row: TraineeAssessmentRow
): Promise<string> {
  const payload: any = {
    school_id: schoolId,
    student_id: row.student_id,
    class_name: className,
    subject: subjectName,
    formative_score: row.test1, // Test 1
    topic: row.test2 !== null ? String(row.test2) : null, // Test 2 / OSCE
    activity_score: row.cat_score, // CAT total (30%)
    exam_score: row.exam_score, // Exam score (70%)
    final_score: row.final_score, // Final mark (100%)
    marks_obtained: row.final_score ?? 0,
    total_marks: 100,
    grade: row.grade,
    uace_points: row.grade_point, // Grade Point (5.0 scale)
    remarks: row.remarks,
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
    const { data: existing } = await supabase
      .from('exam_results')
      .select('id')
      .eq('school_id', schoolId)
      .eq('student_id', row.student_id)
      .eq('class_name', className)
      .eq('subject', subjectName)
      .maybeSingle();

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
