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

const LOCAL_STORAGE_KEY_EVENTS = 'pweza_school_events_v2';
const LOCAL_STORAGE_KEY_EXAM_SESSIONS = 'pweza_exam_sessions_v2';

function getSeedSchoolEvents(schoolId: string, year: number): SchoolEvent[] {
  const now = new Date().toISOString();
  return [
    // Term 1
    {
      event_id: `ev-seed-t1-open-${year}`,
      school_id: schoolId,
      title: 'Term 1 Official Opening Date',
      event_type: 'term_dates',
      start_date: `${year}-02-02`,
      end_date: `${year}-02-02`,
      description: 'All boarders and day students report. Mandatory general school assembly at 8:30 AM.',
      location: 'Main School Assembly Quadrangle',
      target_audience: 'all',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-cross-country-${year}`,
      school_id: schoolId,
      title: 'Inter-House Cross-Country Marathon',
      event_type: 'sports',
      start_date: `${year}-02-14`,
      end_date: `${year}-02-14`,
      description: 'Annual 10km inter-house cross-country race across campus and surrounding community circuits.',
      location: 'Main Sports Grounds',
      target_audience: 'students',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-midterm-1-${year}`,
      school_id: schoolId,
      title: 'Mid-Term 1 Assessment Week',
      event_type: 'exam',
      start_date: `${year}-03-09`,
      end_date: `${year}-03-13`,
      description: 'Continuous assessment tests covering topics taught in the first half of Term 1.',
      location: 'Respective Classrooms & Exam Rooms',
      target_audience: 'all',
      has_exam_timetable: true,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-visitation-1-${year}`,
      school_id: schoolId,
      title: 'Parent-Teacher Visitation & Consultation Day',
      event_type: 'meeting',
      start_date: `${year}-04-04`,
      end_date: `${year}-04-04`,
      description: 'Parents visit students, review mid-term academic progress with class teachers, and attend the AGM.',
      location: 'Campus Dining Hall & Classrooms',
      target_audience: 'parents',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-end-term-1-${year}`,
      school_id: schoolId,
      title: 'End of Term 1 Examinations',
      event_type: 'exam',
      start_date: `${year}-04-20`,
      end_date: `${year}-04-30`,
      description: 'Comprehensive end-of-term examinations for all academic streams and cohorts.',
      location: 'Main Examination Hall & Labs',
      target_audience: 'students',
      has_exam_timetable: true,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-t1-close-${year}`,
      school_id: schoolId,
      title: 'Term 1 Official Closing Day',
      event_type: 'term_dates',
      start_date: `${year}-05-08`,
      end_date: `${year}-05-08`,
      description: 'Term 1 concludes. Distribution of report cards and student holiday departure.',
      location: 'Campus Gates & Administration',
      target_audience: 'all',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },

    // Term 2
    {
      event_id: `ev-seed-t2-open-${year}`,
      school_id: schoolId,
      title: 'Term 2 Official Opening Date',
      event_type: 'term_dates',
      start_date: `${year}-05-25`,
      end_date: `${year}-05-25`,
      description: 'All students report for Term 2. Registration and lesson commencement.',
      location: 'Main Assembly Hall',
      target_audience: 'all',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-jinja-tour-${year}`,
      school_id: schoolId,
      title: 'Geography & Ecology Field Tour to Jinja & Entebbe',
      event_type: 'tour',
      start_date: `${year}-06-19`,
      end_date: `${year}-06-21`,
      description: '3-day educational study trip to the Source of the Nile, Bujagali Falls, and Entebbe Botanical Gardens.',
      location: 'Jinja & Entebbe Protected Sites',
      target_audience: 'students',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-sports-gala-${year}`,
      school_id: schoolId,
      title: 'Annual Inter-House Sports Gala & Championship',
      event_type: 'sports',
      start_date: `${year}-07-20`,
      end_date: `${year}-07-25`,
      description: 'Track, field, football, netball, and swimming competitions between the four school houses.',
      location: 'School Stadium & Sports Complex',
      target_audience: 'all',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-end-term-2-${year}`,
      school_id: schoolId,
      title: 'End of Term 2 Examinations',
      event_type: 'exam',
      start_date: `${year}-08-10`,
      end_date: `${year}-08-21`,
      description: 'Term 2 promotional assessment series.',
      location: 'Main Exam Hall & Science Labs',
      target_audience: 'students',
      has_exam_timetable: true,
      created_at: now,
      updated_at: now,
    },

    // Term 3
    {
      event_id: `ev-seed-t3-open-${year}`,
      school_id: schoolId,
      title: 'Term 3 Official Opening Date',
      event_type: 'term_dates',
      start_date: `${year}-09-14`,
      end_date: `${year}-09-14`,
      description: 'Term 3 commences for all classes and candidate examination classes.',
      location: 'Main Assembly Hall',
      target_audience: 'all',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-uneb-mocks-${year}`,
      school_id: schoolId,
      title: 'National Mock Examinations (UNEB / UNMEB Mocks)',
      event_type: 'exam',
      start_date: `${year}-10-05`,
      end_date: `${year}-10-16`,
      description: 'Strict mock examinations simulating national board conditions for candidate classes.',
      location: 'National Exam Center Hall',
      target_audience: 'students',
      has_exam_timetable: true,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-cultural-gala-${year}`,
      school_id: schoolId,
      title: 'Annual Cultural Gala, Music & Drama Festival',
      event_type: 'cultural',
      start_date: `${year}-11-06`,
      end_date: `${year}-11-07`,
      description: 'Traditional dances, folk songs, instrumental performances, and drama presentations.',
      location: 'Main School Auditorium',
      target_audience: 'all',
      has_exam_timetable: false,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-final-exams-${year}`,
      school_id: schoolId,
      title: 'End of Year Promotional Examinations',
      event_type: 'exam',
      start_date: `${year}-11-09`,
      end_date: `${year}-11-20`,
      description: 'Final academic promotional examinations determining advancement to the next academic level.',
      location: 'Main Examination Halls',
      target_audience: 'students',
      has_exam_timetable: true,
      created_at: now,
      updated_at: now,
    },
    {
      event_id: `ev-seed-speech-day-${year}`,
      school_id: schoolId,
      title: 'Speech Day, Graduation & Prize Giving Ceremony',
      event_type: 'cultural',
      start_date: `${year}-12-04`,
      end_date: `${year}-12-04`,
      description: 'Celebrating student academic excellence, sports triumphs, and graduating cohorts.',
      location: 'Campus Grand Pavilion',
      target_audience: 'all',
      has_exam_timetable: false,
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
      event_id: `ev-seed-end-term-1-${year}`,
      school_id: schoolId,
      paper_name: 'Mathematics Paper 1 (Algebra & Geometry)',
      paper_code: 'MTH-456/1',
      class_name: 'Senior 4',
      exam_date: `${year}-04-20`,
      start_time: '09:00',
      end_time: '11:30',
      room_or_hall: 'Main Examination Hall A',
      invigilator_name: 'Mr. Mukasa John',
      instructions: 'Scientific calculators allowed. Bring full mathematical geometry set.',
      created_at: now,
    },
    {
      id: 'sess-002',
      event_id: `ev-seed-end-term-1-${year}`,
      school_id: schoolId,
      paper_name: 'English Language Paper 2 (Grammar & Summary)',
      paper_code: 'ENG-112/2',
      class_name: 'Senior 4',
      exam_date: `${year}-04-20`,
      start_time: '14:00',
      end_time: '16:30',
      room_or_hall: 'Main Examination Hall A',
      invigilator_name: 'Mrs. Nalubega Sarah',
      instructions: 'Dictionaries are not permitted in the exam hall.',
      created_at: now,
    },
    {
      id: 'sess-003',
      event_id: `ev-seed-end-term-1-${year}`,
      school_id: schoolId,
      paper_name: 'Physics Practical (Mechanics & Optics)',
      paper_code: 'PHY-535/3',
      class_name: 'Senior 4',
      exam_date: `${year}-04-21`,
      start_time: '09:00',
      end_time: '11:45',
      room_or_hall: 'Physics Science Laboratory',
      invigilator_name: 'Mr. Okello David',
      instructions: 'Wear laboratory coats. Experimental apparatus will be distributed individually.',
      created_at: now,
    },
    {
      id: 'sess-004',
      event_id: `ev-seed-end-term-1-${year}`,
      school_id: schoolId,
      paper_name: 'Chemistry Theory Paper 1',
      paper_code: 'CHM-545/1',
      class_name: 'Senior 4',
      exam_date: `${year}-04-22`,
      start_time: '09:00',
      end_time: '11:30',
      room_or_hall: 'Main Examination Hall A',
      invigilator_name: 'Dr. Byaruhanga Patrick',
      instructions: 'Periodic tables are provided inside the question booklet.',
      created_at: now,
    },
    {
      id: 'sess-005',
      event_id: `ev-seed-end-term-1-${year}`,
      school_id: schoolId,
      paper_name: 'Mathematics Paper 1',
      paper_code: 'MTH-S1',
      class_name: 'Senior 1',
      exam_date: `${year}-04-20`,
      start_time: '09:00',
      end_time: '11:00',
      room_or_hall: 'Block B - Room 102',
      invigilator_name: 'Ms. Atuhaire Brenda',
      instructions: 'Calculators are not permitted for Lower Secondary S.1 Paper.',
      created_at: now,
    },
    {
      id: 'sess-006',
      event_id: `ev-seed-end-term-1-${year}`,
      school_id: schoolId,
      paper_name: 'Integrated Science & Biology',
      paper_code: 'BIO-S1',
      class_name: 'Senior 1',
      exam_date: `${year}-04-21`,
      start_time: '14:00',
      end_time: '16:00',
      room_or_hall: 'Block B - Room 102',
      invigilator_name: 'Mr. Kigozi Charles',
      instructions: 'Bring sharp HB pencils for biological specimen diagrams.',
      created_at: now,
    },
    {
      id: 'sess-007',
      event_id: `ev-seed-uneb-mocks-${year}`,
      school_id: schoolId,
      paper_name: 'UNEB Mock Mathematics Paper 1',
      paper_code: 'UNEB-MTH-1',
      class_name: 'Senior 4',
      exam_date: `${year}-10-05`,
      start_time: '09:00',
      end_time: '11:30',
      room_or_hall: 'National Exam Center Hall',
      invigilator_name: 'Mr. Mukasa John',
      instructions: 'National index numbers required on all scripts.',
      created_at: now,
    },
    {
      id: 'sess-008',
      event_id: `ev-seed-uneb-mocks-${year}`,
      school_id: schoolId,
      paper_name: 'UNEB Mock English Paper 1',
      paper_code: 'UNEB-ENG-1',
      class_name: 'Senior 4',
      exam_date: `${year}-10-06`,
      start_time: '09:00',
      end_time: '11:30',
      room_or_hall: 'National Exam Center Hall',
      invigilator_name: 'Mrs. Nalubega Sarah',
      instructions: 'Essay composition and comprehension.',
      created_at: now,
    },
  ];
}

// Local storage caching helpers
function loadLocalEvents(schoolId: string, year: number): SchoolEvent[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_EVENTS}_${schoolId}`);
    if (raw) {
      const parsed: SchoolEvent[] = JSON.parse(raw);
      if (parsed && parsed.length > 0) return parsed;
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
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_EXAM_SESSIONS}_${schoolId}`);
    if (raw) {
      const parsed: ExamTimetableSession[] = JSON.parse(raw);
      if (parsed && parsed.length > 0) return parsed;
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
