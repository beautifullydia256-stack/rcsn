/**
 * Offline sync engine.
 *
 * cacheSchoolData()  — call after successful login / app open (primes IndexedDB)
 * flushQueue()        — call when going online (drains pending mutations to Supabase)
 */

import { supabase } from './supabase';
import {
  cacheStudents,
  cacheTeachers,
  cacheClasses,
  cacheSchoolInfo,
  getPendingQueue,
  removeQueueItem,
  failQueueItem,
  type AttendanceQueueRow,
  type PaymentQueueRow,
  type VisitorQueueRow,
} from './offlineDb';

// ─── Prime cache after login ──────────────────────────────────────────────────

export async function cacheSchoolData(schoolId: string): Promise<void> {
  if (!navigator.onLine) return;

  try {
    const [studentsRes, teachersRes, classesRes, schoolRes] = await Promise.all([
      supabase
        .from('students')
        .select('student_id, school_id, student_name, class_name, admission_number, status, gender, photo_url')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .limit(2000),
      supabase
        .from('teachers')
        .select('teacher_id, school_id, name, email, phone, department, employee_id')
        .eq('school_id', schoolId)
        .limit(500),
      supabase
        .from('classes')
        .select('class_id, school_id, class_name, stream, level')
        .eq('school_id', schoolId)
        .limit(200),
      supabase
        .from('schools')
        .select('school_id, name, motto, logo_url, contact_phone, contact_email, location')
        .eq('school_id', schoolId)
        .single(),
    ]);

    if (studentsRes.data) {
      await cacheStudents(
        schoolId,
        (studentsRes.data as Record<string, unknown>[]).map((s) => ({
          student_id: String(s.student_id ?? ''),
          school_id: String(s.school_id ?? ''),
          student_name: String(s.student_name ?? ''),
          class_name: String(s.class_name ?? ''),
          admission_number: s.admission_number ? String(s.admission_number) : null,
          status: String(s.status ?? 'active'),
          gender: s.gender ? String(s.gender) : null,
          photo_url: s.photo_url ? String(s.photo_url) : null,
          parent_name: null,
          parent_phone: null,
        }))
      );
    }

    if (teachersRes.data) {
      await cacheTeachers(
        schoolId,
        (teachersRes.data as Record<string, unknown>[]).map((t) => ({
          teacher_id: String(t.teacher_id ?? ''),
          school_id: String(t.school_id ?? ''),
          name: String(t.name ?? ''),
          email: t.email ? String(t.email) : null,
          phone: t.phone ? String(t.phone) : null,
          department: t.department ? String(t.department) : null,
          employee_id: t.employee_id ? String(t.employee_id) : null,
        }))
      );
    }

    if (classesRes.data) {
      await cacheClasses(
        schoolId,
        (classesRes.data as Record<string, unknown>[]).map((c) => ({
          id: String(c.class_id ?? c.class_name ?? ''),
          school_id: String(c.school_id ?? ''),
          class_name: String(c.class_name ?? ''),
          stream: c.stream ? String(c.stream) : null,
          level: c.level ? String(c.level) : null,
        }))
      );
    }

    if (schoolRes.data) {
      const s = schoolRes.data as Record<string, unknown>;
      await cacheSchoolInfo({
        school_id: String(s.school_id ?? schoolId),
        name: String(s.name ?? ''),
        motto: s.motto ? String(s.motto) : null,
        logo_url: s.logo_url ? String(s.logo_url) : null,
        contact_phone: s.contact_phone ? String(s.contact_phone) : null,
        contact_email: s.contact_email ? String(s.contact_email) : null,
        location: s.location ? String(s.location) : null,
      });
    }
  } catch {
    // Cache failure is non-fatal — app still works online
  }
}

// ─── Flush pending queue ──────────────────────────────────────────────────────

export async function flushQueue(schoolId: string): Promise<{ flushed: number; failed: number }> {
  if (!navigator.onLine) return { flushed: 0, failed: 0 };

  const items = await getPendingQueue(schoolId);
  if (!items.length) return { flushed: 0, failed: 0 };

  let flushed = 0;
  let failed = 0;

  for (const item of items) {
    if (!item.id) continue;
    try {
      const { action } = item;

      if (action.type === 'attendance') {
        const rows = action.rows as AttendanceQueueRow[];
        for (const row of rows) {
          const { error } = await supabase
            .from('student_attendance')
            .upsert(
              {
                student_id: row.student_id,
                school_id: row.school_id,
                class_name: row.class_name,
                attendance_date: row.attendance_date,
                present: row.present,
                status: row.status,
                arrived_late: row.arrived_late,
                marked_by: row.marked_by,
              },
              { onConflict: 'student_id,attendance_date' }
            );
          if (error) throw new Error(error.message);
        }
      } else if (action.type === 'payment') {
        const rows = action.rows as PaymentQueueRow[];
        for (const row of rows) {
          const { error } = await supabase.from('student_payments').insert({
            student_id: row.student_id,
            school_id: row.school_id,
            amount: row.amount,
            currency: row.currency,
            payment_method: row.payment_method,
            payment_date: row.payment_date,
            receipt_number: row.receipt_number,
            notes: row.notes,
            recorded_by: row.recorded_by,
          });
          if (error) throw new Error(error.message);
        }
      } else if (action.type === 'visitor') {
        const rows = action.rows as VisitorQueueRow[];
        for (const row of rows) {
          const { error } = await supabase.from('visitor_log').insert(row);
          if (error) throw new Error(error.message);
        }
      }

      await removeQueueItem(item.id);
      flushed++;
    } catch (err) {
      await failQueueItem(item.id, err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  return { flushed, failed };
}
