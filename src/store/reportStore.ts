import { create } from 'zustand';

interface ReportGenerationState {
  currentSnapshot: string | null;
  generationQueue: string[];
  generating: boolean;
  progress: number;
  setCurrentSnapshot: (snapshotId: string | null) => void;
  addToQueue: (jobId: string) => void;
  removeFromQueue: (jobId: string) => void;
  setGenerating: (generating: boolean) => void;
  setProgress: (progress: number) => void;
}

export const useReportStore = create<ReportGenerationState>((set) => ({
  currentSnapshot: null,
  generationQueue: [],
  generating: false,
  progress: 0,
  setCurrentSnapshot: (snapshotId) => set({ currentSnapshot: snapshotId }),
  addToQueue: (jobId) => set((state) => ({ generationQueue: [...state.generationQueue, jobId] })),
  removeFromQueue: (jobId) => set((state) => ({ 
    generationQueue: state.generationQueue.filter(id => id !== jobId) 
  })),
  setGenerating: (generating) => set({ generating }),
  setProgress: (progress) => set({ progress }),
}));




