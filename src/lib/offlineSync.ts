/**
 * Offline sync engine.
 *
 * cacheSchoolData()  — call immediately after login (primes IndexedDB with all school data)
 * flushQueue()        — call when going online (drains pending mutations to Supabase)
 */

import { supabase } from './supabase';
import { isDesktopApp } from './isDesktopApp';
import {
  cacheStudents,
  cacheTeachers,
  cacheClasses,
  cacheSchoolInfo,
  cacheParents,
  cachePhoto,
  clearOldPhotos,
  offlineDb,
  getPendingQueue,
  removeQueueItem,
  failQueueItem,
  type CachedStudent,
  type AttendanceQueueRow,
  type PaymentQueueRow,
  type VisitorQueueRow,
  type ExpenseQueueRow,
  type NewStudentQueueRow,
  type NewTeacherQueueRow,
} from './offlineDb';

// ─── Prime cache after login ──────────────────────────────────────────────────

export type CacheProgressCallback = (progress: number) => void;

export async function cacheSchoolData(
  schoolId: string,
  onProgress?: CacheProgressCallback
): Promise<void> {
  if (!navigator.onLine) return;

  try {
    onProgress?.(5);
    const [studentsRes, teachersRes, classesRes, schoolRes, parentsRes] = await Promise.all([
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
      supabase
        .from('parents')
        .select('parent_id, student_id, school_id, name, phone, email')
        .eq('school_id', schoolId)
        .limit(5000),
    ]);

    onProgress?.(40);

    let studentRows: CachedStudent[] = [];
    if (studentsRes.data) {
      studentRows = (studentsRes.data as Record<string, unknown>[]).map((s) => ({
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
      }));
      await cacheStudents(schoolId, studentRows);
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

    if (parentsRes.data) {
      await cacheParents(
        schoolId,
        (parentsRes.data as Record<string, unknown>[]).map((p) => ({
          parent_id: String(p.parent_id ?? ''),
          student_id: String(p.student_id ?? ''),
          school_id: String(p.school_id ?? schoolId),
          name: String(p.name ?? ''),
          phone: p.phone ? String(p.phone) : null,
          email: p.email ? String(p.email) : null,
        }))
      );
    }

    onProgress?.(70);

    if (isDesktopApp && studentRows.length > 0) {
      await cacheStudentPhotos(schoolId, studentRows, onProgress);
    } else {
      onProgress?.(100);
    }
  } catch {
    // Cache failure is non-fatal — app still works online
  }
}

// ─── Electron: download student photos into IndexedDB ────────────────────────

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function cacheStudentPhotos(
  schoolId: string,
  students: CachedStudent[],
  onProgress?: CacheProgressCallback
): Promise<void> {
  const withPhotos = students.filter((s) => s.photo_url);
  if (!withPhotos.length) {
    onProgress?.(100);
    return;
  }

  void clearOldPhotos(schoolId, withPhotos.map((s) => s.student_id));

  const BATCH = 5;
  const total = withPhotos.length;
  let done = 0;

  for (let i = 0; i < withPhotos.length; i += BATCH) {
    const batch = withPhotos.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async (s) => {
        const dataUrl = await fetchAsDataUrl(s.photo_url!);
        if (dataUrl) {
          await cachePhoto({ student_id: s.student_id, school_id: schoolId, data_url: dataUrl, cached_at: Date.now() });
        }
        done++;
        // Progress from 70 to 99 during photo downloads
        onProgress?.(70 + Math.floor((done / total) * 29));
      })
    );
  }

  onProgress?.(100);
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
        for (const row of action.rows as AttendanceQueueRow[]) {
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
        for (const row of action.rows as PaymentQueueRow[]) {
          const { error } = await supabase.from('student_payments').insert({
            student_id: row.student_id,
            school_id: row.school_id,
            amount: row.amount,
            payment_method: row.payment_method,
            payment_date: row.payment_date,
            receipt_number: row.receipt_number,
            notes: row.notes,
            recorded_by: row.recorded_by,
          });
          if (error) throw new Error(error.message);
        }
      } else if (action.type === 'visitor') {
        for (const row of action.rows as VisitorQueueRow[]) {
          const { error } = await supabase.from('visitor_log').insert(row);
          if (error) throw new Error(error.message);
        }
      } else if (action.type === 'expense') {
        for (const row of action.rows as ExpenseQueueRow[]) {
          const { _offline_id: _, ...payload } = row;
          const { error } = await supabase.from('school_expenses').insert(payload);
          if (error) throw new Error(error.message);
        }
      } else if (action.type === 'new_student') {
        for (const row of action.rows as NewStudentQueueRow[]) {
          const { _temp_id, ...payload } = row;
          const { data: inserted, error } = await supabase
            .from('students')
            .insert(payload)
            .select('student_id')
            .single();
          if (error) throw new Error(error.message);
          // Replace the temp record in IndexedDB with the real server ID
          if (inserted?.student_id && _temp_id) {
            await offlineDb.students.delete(_temp_id);
            await offlineDb.students.put({
              student_id: inserted.student_id,
              school_id: row.school_id,
              student_name: row.name,
              class_name: row.current_class,
              admission_number: null,
              status: row.status,
              gender: row.gender,
              photo_url: null,
              parent_name: null,
              parent_phone: null,
            });
          }
        }
      } else if (action.type === 'new_teacher') {
        for (const row of action.rows as NewTeacherQueueRow[]) {
          const { _temp_id, ...payload } = row;
          const { data: inserted, error } = await supabase
            .from('teachers')
            .insert(payload)
            .select('teacher_id')
            .single();
          if (error) throw new Error(error.message);
          if (inserted?.teacher_id && _temp_id) {
            await offlineDb.teachers.delete(_temp_id);
            await offlineDb.teachers.put({
              teacher_id: inserted.teacher_id,
              school_id: row.school_id,
              name: row.name,
              email: row.email,
              phone: row.phone,
              department: null,
              employee_id: null,
            });
          }
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
