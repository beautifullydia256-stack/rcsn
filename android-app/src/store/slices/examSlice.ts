import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import DatabaseService from '../../services/DatabaseService';

export interface ExamResult {
  id: string;
  school_id: string;
  exam_set_id: string;
  student_id: string;
  class_name: string;
  subject: string;
  marks_obtained: number;
  total_marks: number;
  grade?: string;
  remarks?: string;
  teacher_initials?: string;
  created_at: string;
  updated_at: string;
}

export interface ExamSet {
  exam_set_id: string;
  school_id: string;
  name: string;
  term: string;
  year: number;
  exam_type?: string;
  created_at: string;
}

interface ExamState {
  examResults: ExamResult[];
  examSets: ExamSet[];
  selectedExamSet: ExamSet | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ExamState = {
  examResults: [],
  examSets: [],
  selectedExamSet: null,
  isLoading: false,
  error: null,
};

export const fetchExamSets = createAsyncThunk(
  'exams/fetchExamSets',
  async (schoolId: string) => {
    return await DatabaseService.findAll<ExamSet>('exam_sets', 'school_id = ?', [schoolId]);
  }
);

export const fetchExamResults = createAsyncThunk(
  'exams/fetchExamResults',
  async ({ examSetId, class_name }: { examSetId: string; class_name?: string }) => {
    const where = class_name
      ? 'exam_set_id = ? AND class_name = ?'
      : 'exam_set_id = ?';
    const params = class_name ? [examSetId, class_name] : [examSetId];
    return await DatabaseService.findAll<ExamResult>('exam_results', where, params);
  }
);

export const addExamResult = createAsyncThunk(
  'exams/addExamResult',
  async (resultData: Omit<ExamResult, 'id' | 'created_at' | 'updated_at'>) => {
    const id = await DatabaseService.insert('exam_results', resultData);
    return await DatabaseService.findById<ExamResult>('exam_results', id);
  }
);

export const updateExamResult = createAsyncThunk(
  'exams/updateExamResult',
  async ({ id, data }: { id: string; data: Partial<ExamResult> }) => {
    await DatabaseService.update('exam_results', id, data);
    return await DatabaseService.findById<ExamResult>('exam_results', id);
  }
);

const examSlice = createSlice({
  name: 'exams',
  initialState,
  reducers: {
    setSelectedExamSet: (state, action: PayloadAction<ExamSet | null>) => {
      state.selectedExamSet = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExamSets.fulfilled, (state, action: PayloadAction<ExamSet[]>) => {
        state.examSets = action.payload;
      })
      .addCase(fetchExamResults.fulfilled, (state, action: PayloadAction<ExamResult[]>) => {
        state.examResults = action.payload;
      })
      .addCase(addExamResult.fulfilled, (state, action: PayloadAction<ExamResult | null>) => {
        if (action.payload) {
          state.examResults.push(action.payload);
        }
      })
      .addCase(updateExamResult.fulfilled, (state, action: PayloadAction<ExamResult | null>) => {
        if (action.payload) {
          const index = state.examResults.findIndex(r => r.id === action.payload!.id);
          if (index !== -1) {
            state.examResults[index] = action.payload;
          }
        }
      });
  },
});

export const { setSelectedExamSet, clearError } = examSlice.actions;
export default examSlice.reducer;


