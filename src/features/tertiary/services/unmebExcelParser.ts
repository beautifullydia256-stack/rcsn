/**
 * PwezaCore - Automated UHPAB (formerly UNMEB) Excel Results Importer & Parser
 * Ingests official UHPAB / UNMEB semester examination spreadsheets (Excel/CSV),
 * auto-matches candidates by UHPAB/UNMEB Exam Number / NSIN / Name,
 * extracts GP, AG, computes GPA & progressive CGPA, and flags retakes.
 */

import * as XLSX from 'xlsx';
import {
  UhpabResultRecord,
  UnmebResultRecord,
  TertiaryStudentProfile,
  SemesterStage,
  AlphabeticalGrade,
} from '../types';
import {
  calculateGradeAndGP,
  calculateSemesterGPA,
  calculateCumulativeCGPA,
} from './gradingEngine';

export interface ParsedUhpabRow {
  rawName?: string;
  uhpabExamNo?: string;
  unmebExamNo?: string;
  nsinNumber?: string;
  courseCode: string;
  courseTitle?: string;
  gradePoint: number;
  letterGrade: AlphabeticalGrade;
  scorePercent?: number;
  rawRow: Record<string, unknown>;
}

export type ParsedUnmebRow = ParsedUhpabRow;

export interface UhpabImportResult {
  totalRowsProcessed: number;
  matchedCount: number;
  unmatchedCount: number;
  unmatchedRows: { rowNumber: number; examNo?: string; name?: string; details: string }[];
  matchedStudents: {
    student: TertiaryStudentProfile;
    records: Omit<UhpabResultRecord, 'id'>[];
    semesterGPA: number;
    hasRetake: boolean;
    retakeCourseCodes: string[];
  }[];
  retakeCount: number;
}

export type UnmebImportResult = UhpabImportResult;

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Normalizes grade string to AlphabeticalGrade
 */
function normalizeGrade(rawGrade: string, gp: number): AlphabeticalGrade {
  const g = String(rawGrade || '').trim().toUpperCase();
  if (['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F'].includes(g)) {
    return g as AlphabeticalGrade;
  }
  if (gp >= 5.0) return 'A';
  if (gp >= 4.5) return 'B+';
  if (gp >= 4.0) return 'B';
  if (gp >= 3.5) return 'C+';
  if (gp >= 3.0) return 'C';
  if (gp >= 2.5) return 'D+';
  if (gp >= 2.0) return 'D';
  return 'F';
}

/**
 * Parses an uploaded UHPAB / UNMEB Excel/CSV file buffer and matches it against enrolled students.
 */
export async function parseUhpabResultsExcel(
  fileBuffer: ArrayBuffer | Uint8Array,
  enrolledStudents: TertiaryStudentProfile[],
  targetSemesterStage: SemesterStage,
  academicYearSession: string = ''
): Promise<UhpabImportResult> {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('The uploaded Excel file contains no worksheets.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    throw new Error('Unable to read worksheet data.');
  }

  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!rows || rows.length === 0) {
    throw new Error('The spreadsheet is empty. Please upload a sheet containing examination results.');
  }

  // Pre-index enrolled students by UHPAB / UNMEB Exam No, NSIN, and normalized name for fast O(1) matching
  const studentsByExamNo = new Map<string, TertiaryStudentProfile>();
  const studentsByNsin = new Map<string, TertiaryStudentProfile>();
  const studentsByName = new Map<string, TertiaryStudentProfile>();

  for (const s of enrolledStudents) {
    if (s.uhpabExamNo) {
      studentsByExamNo.set(normalizeKey(s.uhpabExamNo), s);
    }
    if (s.unmebExamNo) {
      studentsByExamNo.set(normalizeKey(s.unmebExamNo), s);
    }
    if (s.nsinNumber) {
      studentsByNsin.set(normalizeKey(s.nsinNumber), s);
    }
    if (s.fullName) {
      studentsByName.set(normalizeKey(s.fullName), s);
    }
  }

  const studentResultMap = new Map<
    string,
    {
      student: TertiaryStudentProfile;
      records: Omit<UhpabResultRecord, 'id'>[];
      retakeUnits: string[];
    }
  >();

  const unmatchedRows: { rowNumber: number; examNo?: string; name?: string; details: string }[] = [];
  let rowNumber = 1;

  for (const row of rows) {
    rowNumber++;
    // Identify Candidate Identifier columns
    let candidateExamNo = '';
    let candidateNsin = '';
    let candidateName = '';

    for (const [colName, val] of Object.entries(row)) {
      const nKey = normalizeKey(colName);
      const strVal = String(val).trim();
      if (!strVal) continue;

      if (nKey.includes('examno') || nKey.includes('uhpabno') || nKey.includes('unmebno') || nKey.includes('indexno') || nKey.includes('htin') || nKey === 'examno') {
        candidateExamNo = strVal;
      } else if (nKey.includes('nsin')) {
        candidateNsin = strVal;
      } else if (nKey.includes('candidatename') || nKey.includes('studentname') || nKey === 'name') {
        candidateName = strVal;
      }
    }

    // Match candidate
    let matchedStudent: TertiaryStudentProfile | undefined;
    if (candidateExamNo) {
      matchedStudent = studentsByExamNo.get(normalizeKey(candidateExamNo));
    }
    if (!matchedStudent && candidateNsin) {
      matchedStudent = studentsByNsin.get(normalizeKey(candidateNsin));
    }
    if (!matchedStudent && candidateName) {
      matchedStudent = studentsByName.get(normalizeKey(candidateName));
    }

    if (!matchedStudent) {
      unmatchedRows.push({
        rowNumber,
        examNo: candidateExamNo || undefined,
        name: candidateName || undefined,
        details: 'No enrolled student found matching this Exam No / NSIN / Name.',
      });
      continue;
    }

    // Now extract Course Units from this row
    // Support two common UNMEB formats:
    // Format A: Wide format - Course Codes are columns (e.g., "CN 111 GP", "CN 111 Grade" or "CN 111")
    // Format B: Long format - Row has explicit "Course Code", "GP", "Grade"
    const isLongFormat =
      Object.keys(row).some((k) => normalizeKey(k).includes('coursecode')) &&
      Object.keys(row).some((k) => normalizeKey(k).includes('gp') || normalizeKey(k).includes('gradepoint'));

    if (!studentResultMap.has(matchedStudent.id)) {
      studentResultMap.set(matchedStudent.id, {
        student: matchedStudent,
        records: [],
        retakeUnits: [],
      });
    }

    const currentEntry = studentResultMap.get(matchedStudent.id)!;

    if (isLongFormat) {
      // Long format row
      let courseCode = '';
      let courseTitle = '';
      let gp = 0.0;
      let gradeStr = '';

      for (const [colName, val] of Object.entries(row)) {
        const nKey = normalizeKey(colName);
        const strVal = String(val).trim();
        if (nKey.includes('coursecode')) courseCode = strVal;
        if (nKey.includes('coursetitle') || nKey.includes('subjectname')) courseTitle = strVal;
        if (nKey === 'gp' || nKey.includes('gradepoint')) gp = parseFloat(strVal) || 0.0;
        if (nKey === 'ag' || nKey.includes('grade') || nKey === 'lettergrade') gradeStr = strVal;
      }

      if (courseCode) {
        const letterGrade = normalizeGrade(gradeStr, gp);
        const isRetake = gp < 2.0 || letterGrade === 'F';
        if (isRetake) currentEntry.retakeUnits.push(courseCode);

        currentEntry.records.push({
          studentId: matchedStudent.id,
          schoolId: matchedStudent.schoolId,
          uhpabExamNo: matchedStudent.uhpabExamNo || matchedStudent.unmebExamNo || candidateExamNo,
          unmebExamNo: matchedStudent.unmebExamNo || candidateExamNo,
          nsinNumber: matchedStudent.nsinNumber || candidateNsin,
          semesterStage: targetSemesterStage,
          courseUnitCode: courseCode,
          courseUnitTitle: courseTitle || courseCode,
          creditUnits: 4.0, // default UNMEB weight
          gradePoint: gp,
          letterGrade,
          isRetake,
          academicYearSession,
          importedAt: new Date().toISOString(),
        });
      }
    } else {
      // Wide format row (columns like CN 111, CN 112, etc.)
      for (const [colName, val] of Object.entries(row)) {
        const strVal = String(val).trim();
        if (!strVal) continue;

        // Skip candidate demographic columns
        const nKey = normalizeKey(colName);
        if (
          nKey.includes('examno') ||
          nKey.includes('nsin') ||
          nKey.includes('name') ||
          nKey.includes('serial') ||
          nKey.includes('gender') ||
          nKey.includes('school')
        ) {
          continue;
        }

        // Check if column is a course code (e.g. "CN 111", "CN111", "CM 121")
        const courseMatch = colName.match(/([A-Za-z]{2,3}\s*\d{3})/i);
        if (courseMatch) {
          const courseCode = courseMatch[1]!.toUpperCase().replace(/\s+/, ' ');
          let gp = 0.0;
          let gradeStr = '';

          // If the cell is numeric (e.g. 5.0 or 4.5 or 85)
          const numVal = parseFloat(strVal);
          if (!isNaN(numVal)) {
            if (numVal <= 5.0) {
              gp = numVal;
              gradeStr = normalizeGrade('', gp);
            } else {
              // Percentage score out of 100
              const calc = calculateGradeAndGP(numVal);
              gp = calc.gradePoint;
              gradeStr = calc.grade;
            }
          } else {
            // Cell contains grade letter (e.g. "A", "B+", "F")
            gradeStr = strVal.toUpperCase();
            if (gradeStr === 'A') gp = 5.0;
            else if (gradeStr === 'B+') gp = 4.5;
            else if (gradeStr === 'B') gp = 4.0;
            else if (gradeStr === 'C+') gp = 3.5;
            else if (gradeStr === 'C') gp = 3.0;
            else if (gradeStr === 'D+') gp = 2.5;
            else if (gradeStr === 'D') gp = 2.0;
            else gp = 0.0;
          }

          const letterGrade = normalizeGrade(gradeStr, gp);
          const isRetake = gp < 2.0 || letterGrade === 'F';
          if (isRetake) currentEntry.retakeUnits.push(courseCode);

          // Avoid duplicate unit entries for the same student
          if (!currentEntry.records.some((r) => r.courseUnitCode === courseCode)) {
            currentEntry.records.push({
              studentId: matchedStudent.id,
              schoolId: matchedStudent.schoolId,
              uhpabExamNo: matchedStudent.uhpabExamNo || matchedStudent.unmebExamNo || candidateExamNo,
              unmebExamNo: matchedStudent.unmebExamNo || candidateExamNo,
              nsinNumber: matchedStudent.nsinNumber || candidateNsin,
              semesterStage: targetSemesterStage,
              courseUnitCode: courseCode,
              courseUnitTitle: courseCode,
              creditUnits: 4.0,
              gradePoint: gp,
              letterGrade,
              isRetake,
              academicYearSession,
              importedAt: new Date().toISOString(),
            });
          }
        }
      }
    }
  }

  // Compile final results & GPA calculations for each matched student
  const matchedStudents = Array.from(studentResultMap.values()).map((entry) => {
    const semesterGPA = calculateSemesterGPA(
      entry.records.map((r) => ({ creditUnits: r.creditUnits, gradePoint: r.gradePoint }))
    );

    return {
      student: entry.student,
      records: entry.records,
      semesterGPA,
      hasRetake: entry.retakeUnits.length > 0,
      retakeCourseCodes: entry.retakeUnits,
    };
  });

  const retakeCount = matchedStudents.filter((s) => s.hasRetake).length;

  return {
    totalRowsProcessed: rows.length,
    matchedCount: matchedStudents.length,
    unmatchedCount: unmatchedRows.length,
    unmatchedRows,
    matchedStudents,
    retakeCount,
  };
}

export const parseUnmebResultsExcel = parseUhpabResultsExcel;
