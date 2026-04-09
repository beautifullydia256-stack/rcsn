export type TeacherAssignmentRow = {
  id: string;
  teacher_id: string;
  class_name: string;
  subject: string;
  assignment_role?: string | null;
};

export function assignmentRoleLabel(role: string | null | undefined): string {
  if (role === 'co_teacher') return 'Co-teacher';
  return 'Subject teacher';
}

export function buildClassTeacherMap(
  rows: { teacher_id: string; class_name: string | null }[],
): Record<string, string[]> {
  const m: Record<string, string[]> = {};
  for (const row of rows) {
    const tid = row.teacher_id;
    const cn = String(row.class_name || '').trim();
    if (!tid || !cn) continue;
    if (!m[tid]) m[tid] = [];
    if (!m[tid].includes(cn)) m[tid].push(cn);
  }
  for (const tid of Object.keys(m)) {
    m[tid].sort((a, b) => a.localeCompare(b));
  }
  return m;
}

/** Widen to all assignments for teachers who match search (name, class, subject, role, class-teacher classes, or "class teacher"). */
export function filterAssignmentsBySearch(
  assignments: TeacherAssignmentRow[],
  query: string,
  teacherNameById: Record<string, string>,
  classTeacherMap: Record<string, string[]>,
): TeacherAssignmentRow[] {
  const t = query.trim().toLowerCase();
  if (!t) return assignments;

  const hintsClassTeacher = t.includes('class') && t.includes('teacher');
  const allow = new Set<string>();

  for (const a of assignments) {
    const teacherName = (teacherNameById[a.teacher_id] || '').toLowerCase();
    if (teacherName.includes(t)) allow.add(a.teacher_id);
    if ((a.class_name || '').toLowerCase().includes(t)) allow.add(a.teacher_id);
    if ((a.subject || '').toLowerCase().includes(t)) allow.add(a.teacher_id);
    if (assignmentRoleLabel(a.assignment_role).toLowerCase().includes(t)) allow.add(a.teacher_id);
  }

  for (const tid of Object.keys(classTeacherMap)) {
    const classes = classTeacherMap[tid] || [];
    if (classes.some((c) => c.toLowerCase().includes(t))) allow.add(tid);
    if (hintsClassTeacher && classes.length > 0) allow.add(tid);
    if (hintsClassTeacher && (teacherNameById[tid] || '').toLowerCase().includes(t)) allow.add(tid);
  }

  if (allow.size === 0) return [];
  return assignments.filter((a) => allow.has(a.teacher_id));
}

export type GroupedTeacherCard = {
  teacherId: string;
  teacherName: string;
  classTeacherOf: string[];
  byClass: { className: string; rows: TeacherAssignmentRow[] }[];
};

export function groupIntoTeacherCards(
  filteredAssignments: TeacherAssignmentRow[],
  teacherNameById: Record<string, string>,
  classTeacherMap: Record<string, string[]>,
): GroupedTeacherCard[] {
  const byTeacher = new Map<string, Map<string, TeacherAssignmentRow[]>>();
  for (const a of filteredAssignments) {
    const tid = a.teacher_id;
    if (!byTeacher.has(tid)) byTeacher.set(tid, new Map());
    const byClass = byTeacher.get(tid)!;
    const cname = String(a.class_name || '').trim() || '—';
    if (!byClass.has(cname)) byClass.set(cname, []);
    byClass.get(cname)!.push(a);
  }

  const out: GroupedTeacherCard[] = [];
  for (const [teacherId, classMap] of byTeacher) {
    const byClassArr = [...classMap.entries()]
      .sort(([c1], [c2]) => c1.localeCompare(c2))
      .map(([className, rows]) => ({
        className,
        rows: [...rows].sort((a, b) => (a.subject || '').localeCompare(b.subject || '')),
      }));
    out.push({
      teacherId,
      teacherName: teacherNameById[teacherId] || teacherId,
      classTeacherOf: classTeacherMap[teacherId] ? [...classTeacherMap[teacherId]] : [],
      byClass: byClassArr,
    });
  }
  out.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
  return out;
}
