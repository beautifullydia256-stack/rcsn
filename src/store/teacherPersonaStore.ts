import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SimulatedTeacher {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  subjects?: string[];
  role?: string | null;
}

interface TeacherPersonaState {
  simulatedTeacher: SimulatedTeacher | null;
  isSimulating: boolean;
  setSimulatedTeacher: (teacher: SimulatedTeacher | null) => void;
  clearSimulatedTeacher: () => void;
}

export const useTeacherPersonaStore = create<TeacherPersonaState>()(
  persist(
    (set) => ({
      simulatedTeacher: null,
      isSimulating: false,
      setSimulatedTeacher: (teacher) =>
        set({
          simulatedTeacher: teacher,
          isSimulating: !!teacher,
        }),
      clearSimulatedTeacher: () =>
        set({
          simulatedTeacher: null,
          isSimulating: false,
        }),
    }),
    {
      name: 'pweza_teacher_persona_simulation',
    }
  )
);
