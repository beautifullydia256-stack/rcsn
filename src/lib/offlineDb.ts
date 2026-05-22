/**
 * PwezaCore offline-first IndexedDB via Dexie.
 *
 * Stores:
 *  - students, teachers, classes, school_info  (read cache — synced on login/app open)
 *  - sync_queue                                (pending mutations — flushed when online)
 */

import Dexie, { type Table } from 'dexie';

// ─── Cached entity shapes (minimal fields needed offline) ─────────────────────

export interface CachedStudent {
  student_id: string;
  school_id: string;
  student_name: string;
  class_name: string;
  admission_number: string | null;
  status: string;
  gender: string | null;
  photo_url: string | null;
  parent_name: string | null;
  parent_phone: string | null;
}

export interface CachedTeacher {
  teacher_id: string;
  school_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  employee_id: string | null;
}

export interface CachedClass {
  id: string; // class_name used as PK
  school_id: string;
  class_name: string;
  stream: string | null;
  level: string | null;
}

export interface CachedSchoolInfo {
  school_id: string;
  name: string;
  motto: string | null;
  logo_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  location: string | null;
}

export interface CachedPhoto {
  student_id: string;
  school_id: string;
  data_url: string; // base64 data URL — stored for Electron offline use
  cached_at: number;
}

// ─── Sync queue item ──────────────────────────────────────────────────────────

export type SyncAction =
  | { type: 'attendance'; table: 'student_attendance'; rows: AttendanceQueueRow[] }
  | { type: 'payment';    table: 'student_payments';   rows: PaymentQueueRow[]    }
  | { type: 'visitor';    table: 'visitor_log';         rows: VisitorQueueRow[]   };

export interface AttendanceQueueRow {
  student_id: string;
  student_name: string;
  class_name: string;
  school_id: string;
  attendance_date: string;
  present: boolean;
  status: string;
  arrived_late: boolean;
  marked_by: string | null;
}

export interface PaymentQueueRow {
  student_id: string;
  school_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  payment_date: string;
  receipt_number: string | null;
  notes: string | null;
  recorded_by: string | null;
}

export interface VisitorQueueRow {
  visitor_name: string;
  purpose: string;
  host_name: string;
  phone: string | null;
  school_id: string;
  check_in_time: string;
  created_by: string | null;
}

export interface SyncQueueItem {
  id?: number;
  action: SyncAction;
  schoolId: string;
  createdAt: number;
  attempts: number;
  lastError: string | null;
}

// ─── Database ─────────────────────────────────────────────────────────────────

class PwezaOfflineDb extends Dexie {
  students!: Table<CachedStudent, string>;
  teachers!: Table<CachedTeacher, string>;
  classes!: Table<CachedClass, string>;
  schoolInfo!: Table<CachedSchoolInfo, string>;
  photos!: Table<CachedPhoto, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor() {
    super('PwezaCoreOffline');
    this.version(1).stores({
      students:   'student_id, school_id, class_name, status',
      teachers:   'teacher_id, school_id',
      classes:    'id, school_id',
      schoolInfo: 'school_id',
      syncQueue:  '++id, schoolId, createdAt, [action.type+schoolId]',
    });
    this.version(2).stores({
      students:   'student_id, school_id, class_name, status',
      teachers:   'teacher_id, school_id',
      classes:    'id, school_id',
      schoolInfo: 'school_id',
      photos:     'student_id, school_id, cached_at',
      syncQueue:  '++id, schoolId, createdAt, [action.type+schoolId]',
    });
  }
}

export const offlineDb = new PwezaOfflineDb();

// ─── Cache helpers ────────────────────────────────────────────────────────────

export async function cacheStudents(schoolId: string, rows: CachedStudent[]) {
  await offlineDb.students.where('school_id').equals(schoolId).delete();
  if (rows.length) await offlineDb.students.bulkPut(rows);
}

export async function cacheTeachers(schoolId: string, rows: CachedTeacher[]) {
  await offlineDb.teachers.where('school_id').equals(schoolId).delete();
  if (rows.length) await offlineDb.teachers.bulkPut(rows);
}

export async function cacheClasses(schoolId: string, rows: CachedClass[]) {
  await offlineDb.classes.where('school_id').equals(schoolId).delete();
  if (rows.length) await offlineDb.classes.bulkPut(rows);
}

export async function cacheSchoolInfo(info: CachedSchoolInfo) {
  await offlineDb.schoolInfo.put(info);
}

export async function getOfflineStudents(schoolId: string): Promise<CachedStudent[]> {
  return offlineDb.students.where('school_id').equals(schoolId).toArray();
}

export async function getOfflineTeachers(schoolId: string): Promise<CachedTeacher[]> {
  return offlineDb.teachers.where('school_id').equals(schoolId).toArray();
}

export async function getOfflineSchoolInfo(schoolId: string): Promise<CachedSchoolInfo | undefined> {
  return offlineDb.schoolInfo.get(schoolId);
}

export async function cachePhoto(photo: CachedPhoto) {
  await offlineDb.photos.put(photo);
}

export async function getCachedPhoto(studentId: string): Promise<string | null> {
  const row = await offlineDb.photos.get(studentId);
  return row?.data_url ?? null;
}

export async function clearOldPhotos(schoolId: string, keepStudentIds: string[]) {
  const keepSet = new Set(keepStudentIds);
  const all = await offlineDb.photos.where('school_id').equals(schoolId).toArray();
  const toDelete = all.filter((p) => !keepSet.has(p.student_id)).map((p) => p.student_id);
  if (toDelete.length) await offlineDb.photos.bulkDelete(toDelete);
}

// ─── Sync queue helpers ───────────────────────────────────────────────────────

export async function enqueue(item: Omit<SyncQueueItem, 'id' | 'attempts' | 'lastError'>) {
  await offlineDb.syncQueue.add({ ...item, attempts: 0, lastError: null });
  // Ask service worker to register a background sync (if supported)
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const reg = await navigator.serviceWorker.ready;
    try { await (reg as unknown as { sync: { register(tag: string): Promise<void> } }).sync.register('pweza-sync'); } catch { /* not supported */ }
  }
}

export async function getPendingQueue(schoolId: string): Promise<SyncQueueItem[]> {
  return offlineDb.syncQueue.where('schoolId').equals(schoolId).toArray();
}

export async function removeQueueItem(id: number) {
  await offlineDb.syncQueue.delete(id);
}

export async function failQueueItem(id: number, error: string) {
  await offlineDb.syncQueue.update(id, { attempts: (await offlineDb.syncQueue.get(id))!.attempts + 1, lastError: error });
}

export async function queueCount(schoolId: string): Promise<number> {
  return offlineDb.syncQueue.where('schoolId').equals(schoolId).count();
}
