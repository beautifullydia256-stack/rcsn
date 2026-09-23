export type SchoolEventType =
  | 'exam'
  | 'sports'
  | 'tour'
  | 'term_dates'
  | 'holiday'
  | 'meeting'
  | 'cultural'
  | 'other';

export type TargetAudience = 'all' | 'students' | 'staff' | 'parents';

export interface SchoolEvent {
  event_id: string;
  school_id: string;
  title: string;
  event_type: SchoolEventType;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD (same as start_date for single-day)
  description: string | null;
  location: string | null;
  target_audience: TargetAudience;
  has_exam_timetable: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamTimetableSession {
  id: string;
  event_id: string; // Foreign key linking to parent exam event
  school_id: string;
  paper_name: string; // e.g. "Mathematics Paper 1", "Physics Practical"
  paper_code?: string | null; // e.g. "456/1"
  class_name: string; // e.g. "Senior 4", "Senior 1", "Primary 7", "Semester 1"
  exam_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM (e.g. "09:00")
  end_time: string; // HH:MM (e.g. "11:30")
  room_or_hall: string; // e.g. "Main Exam Hall", "Lab 1"
  invigilator_name?: string | null; // e.g. "Mr. Mukasa John"
  instructions?: string | null;
  created_at: string;
}

export interface CreateSchoolEventInput {
  title: string;
  event_type: SchoolEventType;
  start_date: string;
  end_date: string;
  description?: string | null;
  location?: string | null;
  target_audience?: TargetAudience;
  has_exam_timetable?: boolean;
}

export interface UpdateSchoolEventInput {
  title?: string;
  event_type?: SchoolEventType;
  start_date?: string;
  end_date?: string;
  description?: string | null;
  location?: string | null;
  target_audience?: TargetAudience;
  has_exam_timetable?: boolean;
}

export interface CreateExamSessionInput {
  event_id: string;
  paper_name: string;
  paper_code?: string | null;
  class_name: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room_or_hall: string;
  invigilator_name?: string | null;
  instructions?: string | null;
}

export interface UpdateExamSessionInput {
  paper_name?: string;
  paper_code?: string | null;
  class_name?: string;
  exam_date?: string;
  start_time?: string;
  end_time?: string;
  room_or_hall?: string;
  invigilator_name?: string | null;
  instructions?: string | null;
}

export interface CalendarYearSummary {
  total_events: number;
  exam_periods_count: number;
  total_exam_papers: number;
  sports_and_tours_count: number;
  papers_today_count: number;
}
