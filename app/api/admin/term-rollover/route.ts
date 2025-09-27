import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

// End-of-term rollover:
// 1) Graduate candidates: Primary 7, Senior 4, Senior 6 → old_students; set students.status='graduated', graduation_year
// 2) Promote other non-repeat students one class up
// 3) Delete auth logins for graduated students (by metadata.student_id)

export async function POST(request: NextRequest) {
  try {
    const { school_id } = await request.json();
    if (!school_id) return NextResponse.json({ error: 'Missing school_id' }, { status: 400 });
    if (!supabaseAdmin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });

    const currentYear = new Date().getFullYear();

    // Guard: Only allow after Term 3 has ended
    const todayStr = new Date().toISOString().slice(0,10);
    const { data: currentTerms } = await supabase
      .from('school_terms')
      .select('*')
      .eq('school_id', school_id)
      .lte('start_date', todayStr)
      .gte('end_date', todayStr)
      .order('year', { ascending: false })
      .order('term', { ascending: false });

    if (currentTerms && currentTerms.length > 0) {
      // We are inside a term period – rollover must NOT run during Term 1 or 2, or during Term 3 before it ends
      const ct = currentTerms[0];
      if (ct.term !== 3) {
        return NextResponse.json({ error: 'Rollover can only run after Term 3 ends.' }, { status: 400 });
      }
      // Inside term 3 but not ended yet
      if (todayStr <= ct.end_date) {
        return NextResponse.json({ error: 'Rollover can only run after Term 3 has ended.' }, { status: 400 });
      }
    } else {
      // Not inside any term window; allow only if the most recent configured term was Term 3 and has ended
      const { data: recent } = await supabase
        .from('school_terms')
        .select('*')
        .eq('school_id', school_id)
        .order('year', { ascending: false })
        .order('term', { ascending: false })
        .limit(1);
      const last = recent && recent.length > 0 ? recent[0] : null;
      if (!last || last.term !== 3 || todayStr <= last.end_date) {
        return NextResponse.json({ error: 'Rollover can only run after Term 3 has ended.' }, { status: 400 });
      }
    }

    // Load school type
    const { data: school } = await supabase.from('schools').select('type').eq('school_id', school_id).single();
    const isPrimary = (school?.type || '') === 'Nursery/Primary';

    // 1) Graduate candidates: collect list
    const candidateClasses = isPrimary ? ['Primary 7'] : ['Senior 4', 'Senior 6'];
    const { data: candidates } = await supabase
      .from('students')
      .select('student_id, name, school_id, current_class, status, repeat_year')
      .eq('school_id', school_id)
      .in('current_class', candidateClasses)
      .eq('status', 'active')
      .eq('repeat_year', false);

    // Move to old_students and mark graduated
    if (candidates && candidates.length > 0) {
      const oldRows = candidates.map(c => ({ student_id: c.student_id, name: c.name, school_id, final_class: c.current_class, graduation_year: currentYear }));
      await supabase.from('old_students').upsert(oldRows, { onConflict: 'student_id' });
      await supabase
        .from('students')
        .update({ status: 'graduated', graduation_year: currentYear })
        .eq('school_id', school_id)
        .in('student_id', candidates.map(c => c.student_id));
    }

    // 2) Promote other non-repeat active students
    // Load all applicable
    const { data: actives } = await supabase
      .from('students')
      .select('student_id, current_class, repeat_year, status')
      .eq('school_id', school_id)
      .eq('status', 'active');

    const nextClass = (c: string): string => {
      if (isPrimary) {
        if (c === 'Nursery') return 'Middle Class';
        if (c === 'Middle Class') return 'Top Class';
        if (c === 'Top Class') return 'Primary 1';
        const pm = c.match(/^Primary\s+(\d)$/);
        if (pm) {
          const n = parseInt(pm[1], 10);
          if (n >= 1 && n <= 6) return `Primary ${n + 1}`;
        }
        return c; // Primary 7 handled as candidates above
      } else {
        const sm = c.match(/^Senior\s+(\d)$/);
        if (sm) {
          const n = parseInt(sm[1], 10);
          if (n >= 1 && n <= 5) return `Senior ${n + 1}`;
        }
        return c; // Senior 4/6 handled as candidates above
      }
    };

    const promoteUpdates: { student_id: string; current_class: string }[] = [];
    (actives || []).forEach(s => {
      if (s.repeat_year) return;
      if (candidateClasses.includes(s.current_class)) return;
      const nc = nextClass(s.current_class);
      if (nc !== s.current_class) promoteUpdates.push({ student_id: s.student_id, current_class: nc });
    });
    if (promoteUpdates.length > 0) {
      // Batch updates
      for (const chunk of chunkArray(promoteUpdates, 200)) {
        await supabase.from('students').upsert(chunk, { onConflict: 'student_id' });
      }
    }

    // 3) Delete auth users for graduated students
    if (candidates && candidates.length > 0) {
      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const users = userList?.users || [];
      const candidateIds = new Set(candidates.map(c => c.student_id));
      const toDelete = users.filter(u => (u.user_metadata?.student_id && candidateIds.has(u.user_metadata.student_id)));
      for (const u of toDelete) {
        await supabaseAdmin.auth.admin.deleteUser(u.id);
      }
    }

    return NextResponse.json({ success: true, graduated: (candidates || []).length, promoted: promoteUpdates.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Rollover failed' }, { status: 500 });
  }
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}


