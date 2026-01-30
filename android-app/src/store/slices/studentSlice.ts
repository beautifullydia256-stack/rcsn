import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import DatabaseService from '../../services/DatabaseService';

export interface Student {
  student_id: string;
  school_id: string;
  name: string;
  current_class: string;
  status: 'active' | 'graduated';
  graduation_year?: number;
  repeat_year: number;
  expected_fee_amount?: number;
  admission_number?: string;
  photo_base64?: string;
  created_at: string;
  updated_at: string;
}

interface StudentState {
  students: Student[];
  selectedStudent: Student | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: StudentState = {
  students: [],
  selectedStudent: null,
  isLoading: false,
  error: null,
};

export const fetchStudents = createAsyncThunk(
  'students/fetchStudents',
  async (schoolId: string) => {
    return await DatabaseService.findAll<Student>('students', 'school_id = ?', [schoolId]);
  }
);

export const addStudent = createAsyncThunk(
  'students/addStudent',
  async (studentData: Omit<Student, 'student_id' | 'created_at' | 'updated_at'>) => {
    const id = await DatabaseService.insert('students', studentData);
    return await DatabaseService.findById<Student>('students', id);
  }
);

export const updateStudent = createAsyncThunk(
  'students/updateStudent',
  async ({ id, data }: { id: string; data: Partial<Student> }) => {
    await DatabaseService.update('students', id, data);
    return await DatabaseService.findById<Student>('students', id);
  }
);

export const deleteStudent = createAsyncThunk(
  'students/deleteStudent',
  async (id: string) => {
    await DatabaseService.delete('students', id);
    return id;
  }
);

const studentSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    setSelectedStudent: (state, action: PayloadAction<Student | null>) => {
      state.selectedStudent = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStudents.fulfilled, (state, action: PayloadAction<Student[]>) => {
        state.isLoading = false;
        state.students = action.payload;
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch students';
      })
      .addCase(addStudent.fulfilled, (state, action: PayloadAction<Student | null>) => {
        if (action.payload) {
          state.students.push(action.payload);
        }
      })
      .addCase(updateStudent.fulfilled, (state, action: PayloadAction<Student | null>) => {
        if (action.payload) {
          const index = state.students.findIndex(s => s.student_id === action.payload!.student_id);
          if (index !== -1) {
            state.students[index] = action.payload;
          }
          if (state.selectedStudent?.student_id === action.payload.student_id) {
            state.selectedStudent = action.payload;
          }
        }
      })
      .addCase(deleteStudent.fulfilled, (state, action: PayloadAction<string>) => {
        state.students = state.students.filter(s => s.student_id !== action.payload);
        if (state.selectedStudent?.student_id === action.payload) {
          state.selectedStudent = null;
        }
      });
  },
});

export const { setSelectedStudent, clearError } = studentSlice.actions;
export default studentSlice.reducer;


