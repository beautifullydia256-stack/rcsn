import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SyncService } from '../../services/SyncService';

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  error: string | null;
}

const initialState: SyncState = {
  isSyncing: false,
  lastSyncTime: null,
  pendingOperations: 0,
  error: null,
};

const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setSyncStatus: (state, action: PayloadAction<SyncState>) => {
      return { ...state, ...action.payload };
    },
    startSync: (state) => {
      state.isSyncing = true;
      state.error = null;
    },
    stopSync: (state) => {
      state.isSyncing = false;
    },
    updatePendingOperations: (state, action: PayloadAction<number>) => {
      state.pendingOperations = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setSyncStatus, startSync, stopSync, updatePendingOperations, setError } =
  syncSlice.actions;
export default syncSlice.reducer;

