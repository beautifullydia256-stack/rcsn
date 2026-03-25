import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/** Strip to digits for phone comparison (handles +256… vs 07…). */
export function digitsOnly(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/\D/g, '');
}

function phonesMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const tail = (x: string) => x.slice(-9);
  return tail(a) === tail(b) && tail(a).length >= 9;
}

/**
 * Map the logged-in user to `teachers.teacher_id` for this school.
 * Tries email first (teachers.email ↔ auth / public.users), then phone when the staff row has no email
 * or the school never saved email on the teacher record (common in admin UI).
 */
export async function resolveTeacherIdForSchool(schoolId: string, user: User): Promise<string | null> {
  const emails = new Set<string>();
  if (user.email?.trim()) emails.add(user.email.trim().toLowerCase());

  const { data: profile } = await supabase
    .from('users')
    .select('email, phone')
    .eq('user_id', user.id)
    .maybeSingle();
  const pr = profile as { email?: string | null; phone?: string | null } | null;
  if (pr?.email?.trim()) emails.add(pr.email.trim().toLowerCase());

  for (const em of emails) {
    const { data } = await supabase
      .from('teachers')
      .select('teacher_id')
      .eq('school_id', schoolId)
      .ilike('email', em)
      .maybeSingle();
    const tid = (data as { teacher_id?: string } | null)?.teacher_id;
    if (tid) return tid;
  }

  const phoneCandidates: string[] = [];
  const uPhone = user.phone ?? (user.user_metadata?.phone as string | undefined);
  if (uPhone) phoneCandidates.push(digitsOnly(uPhone));
  if (pr?.phone) phoneCandidates.push(digitsOnly(pr.phone));

  const uniquePhones = [...new Set(phoneCandidates.filter(Boolean))];
  if (uniquePhones.length === 0) return null;

  const { data: teachers } = await supabase
    .from('teachers')
    .select('teacher_id, phone')
    .eq('school_id', schoolId)
    .not('phone', 'is', null);

  for (const row of teachers ?? []) {
    const r = row as { teacher_id?: string; phone?: string | null };
    const td = digitsOnly(r.phone);
    if (!td || !r.teacher_id) continue;
    for (const pc of uniquePhones) {
      if (phonesMatch(td, pc)) return r.teacher_id;
    }
  }

  return null;
}
