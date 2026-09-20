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
  cacheStudentBalances,
  cacheSchoolTerms,
  cacheSchoolFeeStructure,
  cacheStudentInvoices,
  cacheExpenseMainCategories,
  cacheExpenseSubcategories,
  cacheExpenseLegacyCategories,
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
    const [
      studentsRes,
      teachersRes,
      classesRes,
      schoolRes,
      parentsRes,
      balancesRes,
      termsRes,
      feeStructureRes,
      invoicesRes,
      expenseMainRes,
      expenseSubRes,
      expenseLegacyRes,
    ] = await Promise.all([
      supabase
        .from('students')
        .select('student_id, school_id, name, current_class, admission_number, status, gender, profile_photo_url')
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
        .select('class_id, school_id, class_name')
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
      supabase
        .from('student_balances')
        .select('student_id, school_id, term_id, term, year, total_fees, total_paid, balance')
        .eq('school_id', schoolId)
        .limit(10000),
      supabase
        .from('school_terms')
        .select('id, school_id, term, year, start_date, end_date')
        .eq('school_id', schoolId)
        .limit(200),
      supabase
        .from('school_fee_structure')
        .select('school_id, class_name, tuition_amount, boarding_amount')
        .eq('school_id', schoolId)
        .limit(500),
      supabase
        .from('student_invoices')
        .select('invoice_id, school_id, student_id, term_id, status, is_supplementary')
        .eq('school_id', schoolId)
        .neq('status', 'cancelled')
        .limit(10000),
      supabase
        .from('expense_main_categories')
        .select('code, label_en, sort_order')
        .order('sort_order', { ascending: true }),
      supabase
        .from('expense_subcategories')
        .select('subcategory_id, school_id, main_category_code, name, is_salary, sort_order')
        .eq('school_id', schoolId)
        .limit(500),
      supabase
        .from('expense_categories')
        .select('category_id, school_id, category_name')
        .eq('school_id', schoolId)
        .limit(500),
    ]);

    onProgress?.(40);

    let studentRows: CachedStudent[] = [];
    if (studentsRes.data) {
      studentRows = (studentsRes.data as Record<string, unknown>[]).map((s) => ({
        student_id: String(s.student_id ?? ''),
        school_id: String(s.school_id ?? ''),
        student_name: String(s.name ?? ''),
        class_name: String(s.current_class ?? ''),
        admission_number: s.admission_number ? String(s.admission_number) : null,
        status: String(s.status ?? 'active'),
        gender: s.gender ? String(s.gender) : null,
        photo_url: s.profile_photo_url ? String(s.profile_photo_url) : null,
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

    if (balancesRes.data) {
      await cacheStudentBalances(
        schoolId,
        (balancesRes.data as Record<string, unknown>[]).map((b) => ({
          id: `${String(b.student_id ?? '')}_${String(b.term_id ?? '')}`,
          student_id: String(b.student_id ?? ''),
          school_id: String(b.school_id ?? schoolId),
          term_id: String(b.term_id ?? ''),
          term: Number(b.term ?? 0),
          year: Number(b.year ?? 0),
          total_fees: b.total_fees != null ? Number(b.total_fees) : null,
          total_paid: b.total_paid != null ? Number(b.total_paid) : null,
          balance: b.balance != null ? Number(b.balance) : null,
        }))
      );
    }

    if (termsRes.data) {
      await cacheSchoolTerms(
        schoolId,
        (termsRes.data as Record<string, unknown>[]).map((t) => ({
          id: String(t.id ?? ''),
          school_id: String(t.school_id ?? schoolId),
          term: Number(t.term ?? 0),
          year: Number(t.year ?? 0),
          start_date: t.start_date ? String(t.start_date) : null,
          end_date: t.end_date ? String(t.end_date) : null,
        }))
      );
    }

    if (feeStructureRes.data) {
      await cacheSchoolFeeStructure(
        schoolId,
        (feeStructureRes.data as Record<string, unknown>[]).map((f) => ({
          id: `${schoolId}_${String(f.class_name ?? '')}`,
          school_id: String(f.school_id ?? schoolId),
          class_name: String(f.class_name ?? ''),
          tuition_amount: f.tuition_amount != null ? Number(f.tuition_amount) : null,
          boarding_amount: f.boarding_amount != null ? Number(f.boarding_amount) : null,
        }))
      );
    }

    if (invoicesRes.data) {
      await cacheStudentInvoices(
        schoolId,
        (invoicesRes.data as Record<string, unknown>[]).map((i) => ({
          invoice_id: String(i.invoice_id ?? ''),
          school_id: String(i.school_id ?? schoolId),
          student_id: String(i.student_id ?? ''),
          term_id: String(i.term_id ?? ''),
          status: String(i.status ?? ''),
          is_supplementary: Boolean(i.is_supplementary),
        }))
      );
    }

    if (expenseMainRes.data) {
      await cacheExpenseMainCategories(
        (expenseMainRes.data as Record<string, unknown>[]).map((c) => ({
          code: String(c.code ?? ''),
          label_en: String(c.label_en ?? ''),
          sort_order: Number(c.sort_order ?? 0),
        }))
      );
    }

    if (expenseSubRes.data) {
      await cacheExpenseSubcategories(
        schoolId,
        (expenseSubRes.data as Record<string, unknown>[]).map((c) => ({
          subcategory_id: String(c.subcategory_id ?? ''),
          school_id: String(c.school_id ?? schoolId),
          main_category_code: String(c.main_category_code ?? ''),
          name: String(c.name ?? ''),
          is_salary: Boolean(c.is_salary),
          sort_order: Number(c.sort_order ?? 0),
        }))
      );
    }

    if (expenseLegacyRes.data) {
      await cacheExpenseLegacyCategories(
        schoolId,
        (expenseLegacyRes.data as Record<string, unknown>[]).map((c) => ({
          category_id: String(c.category_id ?? ''),
          school_id: String(c.school_id ?? schoolId),
          category_name: String(c.category_name ?? ''),
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

  // Pull fresh server-authoritative state back down (e.g. recalculated balances
  // after synced payments) so the local cache reflects what the server now has.
  if (flushed > 0) {
    await cacheSchoolData(schoolId);
  }

  return { flushed, failed };
}
