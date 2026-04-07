/**
 * A-Level exam entry: once any student in the class has UACE profile rows, only students
 * who take the selected subject appear. If no one has a profile yet, show the full class (legacy).
 */
export function studentsVisibleForAlevelExam(
  isALevel: boolean,
  selectedSubject: string,
  students: { student_id: string; name?: string }[],
  alevelSubjectsByStudent: Record<string, string[]>,
): { student_id: string; name?: string }[] {
  if (!isALevel) return students;
  const subj = (selectedSubject || '').trim();
  const classUsesUaceProfiles = Object.values(alevelSubjectsByStudent).some(
    (list) => list && list.length > 0,
  );
  if (!classUsesUaceProfiles || !subj) return students;
  return students.filter((st) => {
    const list = alevelSubjectsByStudent[st.student_id];
    return list?.some((s) => s.trim() === subj) ?? false;
  });
}
