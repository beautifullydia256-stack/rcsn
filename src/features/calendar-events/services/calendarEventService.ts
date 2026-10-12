import { supabase } from '@/lib/supabase';
import type {
  SchoolEvent,
  ExamTimetableSession,
  CreateSchoolEventInput,
  UpdateSchoolEventInput,
  CreateExamSessionInput,
  UpdateExamSessionInput,
  CalendarYearSummary,
} from '../types';

const LOCAL_STORAGE_KEY_EVENTS = 'rcsn_tertiary_events_v4';
const LOCAL_STORAGE_KEY_EXAM_SESSIONS = 'rcsn_tertiary_exam_sessions_v4';

function purgeLegacySecondarySchoolCache() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('pweza_') || k.includes('school_events_v2') || k.includes('exam_sessions_v2'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
}

function getSeedSchoolEvents(schoolId: string, year: number): SchoolEvent[] {
  const now = new Date().toISOString();
  return [
    {
      event_id: `ev-seed-sem1-open-${year}`,
      school_id: schoolId,
      title: 'Semester 1 Commencement & Clinical Orientation',
      event_type: 'Academic Calendar',
      start_date: `${year}-01-19`,
      end_date: `${year}-01-20`,
      description: 'Reporting date for nursing and midwifery trainees. Clinical skills laboratory orientation and semester registration.',
      location: 'Main Auditorium & Skills Lab',
      target_audience: 'all',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-cat1-${year}`,
      school_id: schoolId,
      title: 'Continuous Assessment Tests (CAT 1) & OSPE Practicals',
      event_type: 'Examination',
      start_date: `${year}-03-09`,
      end_date: `${year}-03-13`,
      description: 'Mid-semester continuous assessments and Objective Structured Clinical Examination (OSCE) in foundational nursing.',
      location: 'Skills Laboratory & Lecture Halls',
      target_audience: 'students',
      has_exam_timetable: true,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-capping-${year}`,
      school_id: schoolId,
      title: 'Student Nurses Capping, Striping & Dedication Ceremony',
      event_type: 'Ceremony',
      start_date: `${year}-04-10`,
      end_date: `${year}-04-10`,
      description: 'Official dedication and striping ceremony for student nurses and midwives prior to hospital ward deployments.',
      location: 'Campus Pavilion',
      target_audience: 'all',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-sem1-exams-${year}`,
      school_id: schoolId,
      title: 'Semester 1 Final Modular Examinations',
      event_type: 'Examination',
      start_date: `${year}-05-04`,
      end_date: `${year}-05-15`,
      description: 'Comprehensive semester examinations covering theory and practical nursing sciences.',
      location: 'Examination Halls & Anatomy Lab',
      target_audience: 'students',
      has_exam_timetable: true,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-clinical-rotations-${year}`,
      school_id: schoolId,
      title: 'Hospital Clinical Placement & Ward Rotations',
      event_type: 'Clinical Practicum',
      start_date: `${year}-06-01`,
      end_date: `${year}-07-10`,
      description: 'Hands-on ward training at Masaka Regional Referral Hospital, Rakai General Hospital, and Kyotera Health Center IV.',
      location: 'Affiliated Teaching Hospitals',
      target_audience: 'students',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-sem2-open-${year}`,
      school_id: schoolId,
      title: 'Semester 2 Commencement & Lectures',
      event_type: 'Academic Calendar',
      start_date: `${year}-07-27`,
      end_date: `${year}-07-27`,
      description: 'Commencement of Semester 2 modular teaching for all certificate and diploma cohorts.',
      location: 'Campus Lecture Halls',
      target_audience: 'all',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-community-health-${year}`,
      school_id: schoolId,
      title: 'Community Health & Primary Healthcare Field Attachment',
      event_type: 'Community Practicum',
      start_date: `${year}-09-07`,
      end_date: `${year}-09-18`,
      description: 'Rural community health diagnostics, immunization outreaches, and maternal child health clinics across Rakai District.',
      location: 'Rakai District Health Centers',
      target_audience: 'students',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-unmeb-exams-${year}`,
      school_id: schoolId,
      title: 'UNMEB National Licensure Board Examinations',
      event_type: 'National Board Exam',
      start_date: `${year}-11-09`,
      end_date: `${year}-11-20`,
      description: 'Uganda Nurses and Midwives Examinations Board (UNMEB) state practical and theoretical licensure papers.',
      location: 'National Center Examination Hall',
      target_audience: 'students',
      has_exam_timetable: true,
      created_at: now,
      updated_at: now,
    },
  ];
}

function getSeedExamSessions(schoolId: string, year: number): ExamTimetableSession[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'sess-001',
      event_id: `ev-seed-sem1-exams-${year}`,
      school_id: schoolId,
      paper_name: 'Anatomy & Physiology for Nurses (Paper 1)',
      paper_code: 'NR-111',
      class_name: 'Certificate in Nursing (Year 1)',
      exam_date: `${year}-05-04`,
      start_time: '09:00',
      end_time: '12:00',
      room_or_hall: 'Main Examination Hall',
      invigilator_name: null,
      instructions: null,
      created_at: now,
    },
    {
      id: 'sess-002',
      event_id: `ev-seed-sem1-exams-${year}`,
      school_id: schoolId,
      paper_name: 'Foundations of Nursing Practice & First Aid',
      paper_code: 'NR-112',
      class_name: 'Certificate in Nursing (Year 1)',
      exam_date: `${year}-05-05`,
      start_time: '09:00',
      end_time: '12:00',
      room_or_hall: 'Main Examination Hall',
      invigilator_name: null,
      instructions: null,
      created_at: now,
    },
    {
      id: 'sess-003',
      event_id: `ev-seed-sem1-exams-${year}`,
      school_id: schoolId,
      paper_name: 'Microbiology, Parasitology & Infection Control',
      paper_code: 'NR-113',
      class_name: 'Certificate in Nursing (Year 1)',
      exam_date: `${year}-05-06`,
      start_time: '09:00',
      end_time: '12:00',
      room_or_hall: 'Science Laboratory',
      invigilator_name: null,
      instructions: null,
      created_at: now,
    },
    {
      id: 'sess-004',
      event_id: `ev-seed-sem1-exams-${year}`,
      school_id: schoolId,
      paper_name: 'Normal Pregnancy, Antenatal Care & Midwifery Skills',
      paper_code: 'MW-121',
      class_name: 'Certificate in Midwifery (Year 1)',
      exam_date: `${year}-05-07`,
      start_time: '09:00',
      end_time: '12:00',
      room_or_hall: 'Skills Lab A',
      invigilator_name: null,
      instructions: null,
      created_at: now,
    },
    {
      id: 'sess-005',
      event_id: `ev-seed-unmeb-exams-${year}`,
      school_id: schoolId,
      paper_name: 'UNMEB State Paper 1: General Nursing & Medical-Surgical Theory',
      paper_code: 'UNMEB-NR1',
      class_name: 'Qualifying Nursing Trainees',
      exam_date: `${year}-11-09`,
      start_time: '09:00',
      end_time: '12:00',
      room_or_hall: 'National Exam Center Hall',
      invigilator_name: null,
      instructions: null,
      created_at: now,
    },
    {
      id: 'sess-006',
      event_id: `ev-seed-unmeb-exams-${year}`,
      school_id: schoolId,
      paper_name: 'UNMEB State Paper 2: Midwifery, Reproductive Health & Pediatrics',
      paper_code: 'UNMEB-MW2',
      class_name: 'Qualifying Midwifery Trainees',
      exam_date: `${year}-11-10`,
      start_time: '09:00',
      end_time: '12:00',
      room_or_hall: 'National Exam Center Hall',
      invigilator_name: null,
      instructions: null,
      created_at: now,
    },
  ];
}

// Local storage caching helpers
function loadLocalEvents(schoolId: string, year: number): SchoolEvent[] {
  purgeLegacySecondarySchoolCache();
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_EVENTS}_${schoolId}`);
    if (raw) {
      const parsed: SchoolEvent[] = JSON.parse(raw);
      // Validate that old secondary school placeholders are not in the cache
      const isOutdated = parsed.some(
        (e) =>
          e.title.includes('Term 1') ||
          e.title.includes('Cross-Country') ||
          e.title.includes('Speech Day') ||
          e.title.includes('Senior')
      );
      if (!isOutdated && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Could not read local school events:', err);
  }
  const seeds = getSeedSchoolEvents(schoolId, year);
  saveLocalEvents(schoolId, seeds);
  return seeds;
}

function saveLocalEvents(schoolId: string, events: SchoolEvent[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_EVENTS}_${schoolId}`, JSON.stringify(events));
  } catch (err) {
    console.warn('Could not save local school events:', err);
  }
}

function loadLocalSessions(schoolId: string, year: number): ExamTimetableSession[] {
  purgeLegacySecondarySchoolCache();
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_EXAM_SESSIONS}_${schoolId}`);
    if (raw) {
      const parsed: ExamTimetableSession[] = JSON.parse(raw);
      // Validate that old secondary school placeholders are not in the cache
      const isOutdated = parsed.some(
        (s) =>
          s.class_name.includes('Senior') ||
          s.paper_name.includes('Senior') ||
          s.paper_name.includes('MTH-456')
      );
      if (!isOutdated && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Could not read local exam sessions:', err);
  }
  const seeds = getSeedExamSessions(schoolId, year);
  saveLocalSessions(schoolId, seeds);
  return seeds;
}

function saveLocalSessions(schoolId: string, sessions: ExamTimetableSession[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_EXAM_SESSIONS}_${schoolId}`, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Could not save local exam sessions:', err);
  }
}

/**
 * Fetch all events and exam timetable sessions for a given school and academic year
 */
export async function fetchYearCalendar(
  schoolId: string,
  year = new Date().getFullYear()
): Promise<{
  events: SchoolEvent[];
  examSessions: ExamTimetableSession[];
  summary: CalendarYearSummary;
}> {
  let events: SchoolEvent[] = [];
  let examSessions: ExamTimetableSession[] = [];

  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  // 1. Fetch events from Supabase
  try {
    const { data: dbEvents, error: eErr } = await supabase
      .from('school_events')
      .select('*')
      .eq('school_id', schoolId)
      .gte('start_date', startOfYear)
      .lte('start_date', endOfYear)
      .order('start_date', { ascending: true });

    if (!eErr && dbEvents && dbEvents.length > 0) {
      events = dbEvents.map((ev) => ({
        event_id: ev.event_id,
        school_id: ev.school_id,
        title: ev.title,
        event_type: ev.event_type || 'other',
        start_date: ev.start_date || ev.event_date,
        end_date: ev.end_date || ev.start_date || ev.event_date,
        description: ev.description,
        location: ev.location || null,
        target_audience: ev.target_audience || 'all',
        has_exam_timetable: Boolean(ev.has_exam_timetable || ev.event_type === 'exam'),
        created_by: ev.created_by,
        created_at: ev.created_at || new Date().toISOString(),
        updated_at: ev.updated_at || new Date().toISOString(),
      }));
    } else {
      events = loadLocalEvents(schoolId, year);
    }
  } catch {
    events = loadLocalEvents(schoolId, year);
  }

  // 2. Fetch exam timetable sessions
  try {
    const { data: dbSessions, error: sErr } = await supabase
      .from('school_exam_timetable_sessions')
      .select('*')
      .eq('school_id', schoolId)
      .gte('exam_date', startOfYear)
      .lte('exam_date', endOfYear)
      .order('exam_date', { ascending: true });

    if (!sErr && dbSessions && dbSessions.length > 0) {
      examSessions = dbSessions;
    } else {
      examSessions = loadLocalSessions(schoolId, year);
    }
  } catch {
    examSessions = loadLocalSessions(schoolId, year);
  }

  // Compute summary metrics
  const todayIso = new Date().toISOString().slice(0, 10);
  const examPeriods = events.filter((e) => e.event_type === 'exam');
  const sportsAndTours = events.filter((e) => e.event_type === 'sports' || e.event_type === 'tour');
  const papersToday = examSessions.filter((s) => s.exam_date === todayIso);

  const summary: CalendarYearSummary = {
    total_events: events.length,
    exam_periods_count: examPeriods.length,
    total_exam_papers: examSessions.length,
    sports_and_tours_count: sportsAndTours.length,
    papers_today_count: papersToday.length,
  };

  return { events, examSessions, summary };
}

/**
 * Create a new school event
 */
export async function createSchoolEvent(
  schoolId: string,
  input: CreateSchoolEventInput,
  userId?: string
): Promise<SchoolEvent> {
  const now = new Date().toISOString();
  const eventId = `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newEvent: SchoolEvent = {
    event_id: eventId,
    school_id: schoolId,
    title: input.title.trim(),
    event_type: input.event_type,
    start_date: input.start_date,
    end_date: input.end_date || input.start_date,
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
    target_audience: input.target_audience || 'all',
    has_exam_timetable: Boolean(input.has_exam_timetable || input.event_type === 'exam'),
    created_by: userId || null,
    created_at: now,
    updated_at: now,
  };

  try {
    const { data, error } = await supabase
      .from('school_events')
      .insert([
        {
          event_id: eventId,
          school_id: schoolId,
          title: newEvent.title,
          event_type: newEvent.event_type,
          event_date: newEvent.start_date, // compatibility with legacy schema
          start_date: newEvent.start_date,
          end_date: newEvent.end_date,
          description: newEvent.description,
          location: newEvent.location,
          target_audience: newEvent.target_audience,
          has_exam_timetable: newEvent.has_exam_timetable,
          created_by: userId || null,
        },
      ])
      .select()
      .single();

    if (!error && data) {
      // Sync local cache
      const current = loadLocalEvents(schoolId, new Date(newEvent.start_date).getFullYear());
      saveLocalEvents(schoolId, [newEvent, ...current]);
      return newEvent;
    }
  } catch (err) {
    console.warn('Supabase event insert error, saving locally:', err);
  }

  const current = loadLocalEvents(schoolId, new Date(newEvent.start_date).getFullYear());
  const updated = [newEvent, ...current];
  saveLocalEvents(schoolId, updated);
  return newEvent;
}

/**
 * Update an existing school event
 */
export async function updateSchoolEvent(
  schoolId: string,
  eventId: string,
  input: UpdateSchoolEventInput
): Promise<void> {
  const now = new Date().toISOString();
  const payload: Partial<SchoolEvent> = {
    ...input,
    updated_at: now,
  };

  try {
    await supabase
      .from('school_events')
      .update(payload)
      .eq('event_id', eventId)
      .eq('school_id', schoolId);
  } catch (err) {
    console.warn('Supabase event update failed:', err);
  }

  const year = new Date().getFullYear();
  const current = loadLocalEvents(schoolId, year);
  const updated = current.map((ev) => (ev.event_id === eventId ? { ...ev, ...payload } : ev));
  saveLocalEvents(schoolId, updated);
}

/**
 * Delete a school event and its associated timetable sessions
 */
export async function deleteSchoolEvent(schoolId: string, eventId: string): Promise<void> {
  try {
    await supabase
      .from('school_events')
      .delete()
      .eq('event_id', eventId)
      .eq('school_id', schoolId);

    await supabase
      .from('school_exam_timetable_sessions')
      .delete()
      .eq('event_id', eventId)
      .eq('school_id', schoolId);
  } catch (err) {
    console.warn('Supabase event deletion failed:', err);
  }

  const year = new Date().getFullYear();
  const currentEvents = loadLocalEvents(schoolId, year);
  saveLocalEvents(schoolId, currentEvents.filter((ev) => ev.event_id !== eventId));

  const currentSessions = loadLocalSessions(schoolId, year);
  saveLocalSessions(schoolId, currentSessions.filter((s) => s.event_id !== eventId));
}

/**
 * Create an exam timetable paper session
 */
export async function createExamTimetableSession(
  schoolId: string,
  input: CreateExamSessionInput
): Promise<ExamTimetableSession> {
  const now = new Date().toISOString();
  const id = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newSession: ExamTimetableSession = {
    id,
    event_id: input.event_id,
    school_id: schoolId,
    paper_name: input.paper_name.trim(),
    paper_code: input.paper_code?.trim() || null,
    class_name: input.class_name.trim(),
    exam_date: input.exam_date,
    start_time: input.start_time,
    end_time: input.end_time,
    room_or_hall: input.room_or_hall.trim(),
    invigilator_name: input.invigilator_name?.trim() || null,
    instructions: input.instructions?.trim() || null,
    created_at: now,
  };

  try {
    await supabase.from('school_exam_timetable_sessions').insert([newSession]);
  } catch (err) {
    console.warn('Supabase session insert failed, saving locally:', err);
  }

  const year = new Date(input.exam_date).getFullYear();
  const current = loadLocalSessions(schoolId, year);
  saveLocalSessions(schoolId, [newSession, ...current]);
  return newSession;
}

/**
 * Update an existing exam timetable paper session
 */
export async function updateExamTimetableSession(
  schoolId: string,
  id: string,
  input: UpdateExamSessionInput
): Promise<void> {
  try {
    await supabase
      .from('school_exam_timetable_sessions')
      .update(input)
      .eq('id', id)
      .eq('school_id', schoolId);
  } catch (err) {
    console.warn('Supabase session update failed:', err);
  }

  const year = new Date().getFullYear();
  const current = loadLocalSessions(schoolId, year);
  const updated = current.map((s) => (s.id === id ? { ...s, ...input } : s));
  saveLocalSessions(schoolId, updated);
}

/**
 * Delete an exam timetable paper session
 */
export async function deleteExamTimetableSession(schoolId: string, id: string): Promise<void> {
  try {
    await supabase
      .from('school_exam_timetable_sessions')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
  } catch (err) {
    console.warn('Supabase session delete failed:', err);
  }

  const year = new Date().getFullYear();
  const current = loadLocalSessions(schoolId, year);
  saveLocalSessions(schoolId, current.filter((s) => s.id !== id));
}
