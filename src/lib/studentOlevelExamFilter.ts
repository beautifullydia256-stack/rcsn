/**
 * O-Level exam entry: once any student in the class has rows in `student_olevel_subjects`,
 * only students whose programme includes the selected subject appear (Senior 3–4 subsidiaries).
 * If no one has programme rows yet, show the full class (legacy / migration gaps).
 */
function normSubject(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase();
}

export function studentsVisibleForOlevelExam(
  isSecondary: boolean,
  selectedSubject: string,
  students: { student_id: string; name?: string }[],
  olevelSubjectsByStudent: Record<string, string[]>,
): { student_id: string; name?: string }[] {
  if (!isSecondary) return students;
  const want = normSubject(selectedSubject);
  const classUsesProgrammeRows = Object.values(olevelSubjectsByStudent).some(
    (list) => list && list.length > 0,
  );
  if (!classUsesProgrammeRows || !want) return students;

  return students.filter((st) => {
    const list = olevelSubjectsByStudent[st.student_id];
    return list?.some((s) => normSubject(s) === want) ?? false;
  });
}
