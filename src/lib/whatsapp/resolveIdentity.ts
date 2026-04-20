import type { SupabaseClient } from '@supabase/supabase-js';
import { getDistinctClassNamesFromTimetableForTeacher } from './queries';
import { phoneLast9 } from './normalizePhone';

export type ParentSchoolGroup = {
  school_id: string;
  school_name: string;
  parent_id: string;
  students: { student_id: string; name: string; current_class: string }[];
};

export type StaffSchoolContext = {
  school_id: string;
  school_name: string;
  teacher_id: string | null;
  user_id: string | null;
  role: string | null;
  teacher_classes: string[];
  canVerifyReceipts: boolean;
  canViewSchoolAttendance: boolean;
};

export type ResolvedIdentity = {
  last9: string;
  hasParent: boolean;
  hasStaff: boolean;
  /** Guardian / parent name from profile (for WhatsApp greetings). */
  greetingNameParent: string | null;
  /** Staff user or teacher name from profile (for WhatsApp greetings). */
  greetingNameStaff: string | null;
  parentSchools: ParentSchoolGroup[];
  staffSchools: StaffSchoolContext[];
};

function firstDistinctName(names: string[]): string | null {
  const seen = new Set<string>();
  for (const n of names) {
    const t = (n || '').trim();
    if (t) seen.add(t);
  }
  if (seen.size === 0) return null;
  return [...seen].sort((a, b) => a.localeCompare(b))[0] ?? null;
}

async function fetchSchoolNames(client: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await client.from('schools').select('school_id, name').in('school_id', ids);
  const m = new Map<string, string>();
  for (const r of data || []) {
    const row = r as { school_id: string; name: string };
    m.set(row.school_id, row.name || 'School');
  }
  return m;
}

export function roleCanVerifyReceipts(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'accountant' || role === 'owner' || role === 'head_teacher';
}

export function roleCanViewBroadAttendance(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'accountant' || role === 'owner' || role === 'head_teacher';
}

/**
 * Resolve parent rows (by phone last9) into school groups with student names.
 */
export async function resolveIdentity(client: SupabaseClient, rawPhoneDigits: string): Promise<ResolvedIdentity | null> {
  const last9 = phoneLast9(rawPhoneDigits);
  if (!last9) return null;

  const { data: parentRows, error: pErr } = await client.rpc('find_parents_by_phone_last9', {
    p_last9: last9,
  });
  if (pErr) throw new Error(pErr.message);

  const { data: teacherRows, error: tErr } = await client.rpc('find_teachers_by_phone_last9', {
    p_last9: last9,
  });
  if (tErr) throw new Error(tErr.message);

  const { data: userRows, error: uErr } = await client.rpc('find_staff_users_by_phone_last9', {
    p_last9: last9,
  });
  if (uErr) throw new Error(uErr.message);

  const parents = (parentRows || []) as {
    parent_id: string;
    school_id: string;
    student_id: string;
    name: string;
  }[];
  const teachers = (teacherRows || []) as {
    teacher_id: string;
    school_id: string;
    name: string;
  }[];
  const users = (userRows || []) as {
    user_id: string;
    school_id: string;
    role: string;
    name: string;
  }[];

  const schoolIdSet = new Set<string>();
  parents.forEach((p) => schoolIdSet.add(p.school_id));
  teachers.forEach((t) => schoolIdSet.add(t.school_id));
  users.forEach((u) => {
    if (u.school_id) schoolIdSet.add(u.school_id);
  });

  const schoolNames = await fetchSchoolNames(client, [...schoolIdSet]);

  const grouped = new Map<string, { parent_id: string; student_ids: Set<string> }>();
  for (const p of parents) {
    const key = `${p.school_id}::${p.parent_id}`;
    if (!grouped.has(key)) {
      grouped.set(key, { parent_id: p.parent_id, student_ids: new Set() });
    }
    grouped.get(key)!.student_ids.add(p.student_id);
  }

  const parentSchools: ParentSchoolGroup[] = [];
  for (const [key, g] of grouped) {
    const schoolId = key.split('::')[0]!;
    const studentIds = [...g.student_ids];
    const { data: studs } = await client
      .from('students')
      .select('student_id, name, current_class')
      .eq('school_id', schoolId)
      .in('student_id', studentIds);
    const list = (studs || []) as { student_id: string; name: string; current_class: string }[];
    parentSchools.push({
      school_id: schoolId,
      school_name: schoolNames.get(schoolId) || 'School',
      parent_id: g.parent_id,
      students: list.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  const staffSchoolIds = new Set<string>();
  teachers.forEach((t) => staffSchoolIds.add(t.school_id));
  users.forEach((u) => {
    if (u.school_id) staffSchoolIds.add(u.school_id);
  });

  const staffSchools: StaffSchoolContext[] = [];
  for (const schoolId of staffSchoolIds) {
    const t = teachers.find((x) => x.school_id === schoolId) || null;
    const u = users.find((x) => x.school_id === schoolId) || null;

    let teacher_classes: string[] = [];
    if (t) {
      const { data: tFull } = await client
        .from('teachers')
        .select('classes')
        .eq('teacher_id', t.teacher_id)
        .maybeSingle();
      const cl = (tFull as { classes?: string[] } | null)?.classes;
      teacher_classes = Array.isArray(cl) ? cl : [];
      const fromTimetable = await getDistinctClassNamesFromTimetableForTeacher(
        client,
        schoolId,
        t.teacher_id
      );
      const merged = new Set<string>();
      for (const c of teacher_classes) {
        const x = (c || '').trim();
        if (x) merged.add(x);
      }
      for (const c of fromTimetable) merged.add(c);
      teacher_classes = [...merged].sort((a, b) => a.localeCompare(b));
    }

    const role = u?.role ?? null;
    const canVerify = roleCanVerifyReceipts(role);
    const broad = role ? roleCanViewBroadAttendance(role) : false;
    const canAttend = broad || role === 'teacher' || role === 'librarian' || !!t;

    staffSchools.push({
      school_id: schoolId,
      school_name: schoolNames.get(schoolId) || 'School',
      teacher_id: t?.teacher_id ?? null,
      user_id: u?.user_id ?? null,
      role,
      teacher_classes,
      canVerifyReceipts: canVerify,
      canViewSchoolAttendance: canAttend,
    });
  }

  staffSchools.sort((a, b) => a.school_name.localeCompare(b.school_name));

  const greetingNameParent = firstDistinctName(parents.map((p) => p.name));
  const greetingNameStaff = firstDistinctName([
    ...teachers.map((t) => t.name),
    ...users.map((u) => u.name),
  ]);

  return {
    last9,
    hasParent: parentSchools.length > 0,
    hasStaff: staffSchools.length > 0,
    greetingNameParent,
    greetingNameStaff,
    parentSchools,
    staffSchools,
  };
}
