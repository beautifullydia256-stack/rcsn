import DatabaseService from './DatabaseService';
import SupabaseService from './SupabaseService';
// Note: Install @react-native-community/netinfo for network status
// npm install @react-native-community/netinfo
// For now, using a simple check - replace with NetInfo when installed

interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  pendingOperations: number;
  error: string | null;
}

class SyncService {
  private static syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncTime: null,
    pendingOperations: 0,
    error: null,
  };

  private static syncListeners: ((status: SyncStatus) => void)[] = [];

  static initialize() {
    // Check network status and sync when online
    // TODO: Install @react-native-community/netinfo and uncomment
    /*
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.syncStatus.isSyncing) {
        this.performSync();
      }
    });

    // Periodic sync every 5 minutes when online
    setInterval(() => {
      NetInfo.fetch().then(state => {
        if (state.isConnected && !this.syncStatus.isSyncing) {
          this.performSync();
        }
      });
    }, 5 * 60 * 1000);
    */
  }

  static async performSync(): Promise<void> {
    if (this.syncStatus.isSyncing) {
      console.log('Sync already in progress');
      return;
    }

    // TODO: Replace with NetInfo when installed
    // For now, always attempt sync (will fail gracefully if offline)
    // const isConnected = (await NetInfo.fetch()).isConnected;
    // if (!isConnected) {
    //   console.log('No internet connection, skipping sync');
    //   return;
    // }

    this.syncStatus.isSyncing = true;
    this.syncStatus.error = null;
    this.notifyListeners();

    try {
      // 1. Sync pending operations (local -> remote)
      await this.syncPendingOperations();

      // 2. Sync remote changes (remote -> local)
      await this.syncRemoteChanges();

      // 3. Update sync status
      this.syncStatus.lastSyncTime = new Date();
      this.syncStatus.pendingOperations = await this.getPendingOperationsCount();

      console.log('Sync completed successfully');
    } catch (error: any) {
      console.error('Sync error:', error);
      this.syncStatus.error = error.message || 'Sync failed';
    } finally {
      this.syncStatus.isSyncing = false;
      this.notifyListeners();
    }
  }

  private static async syncPendingOperations(): Promise<void> {
    const pendingOps = await DatabaseService.getPendingOperations();

    for (const op of pendingOps) {
      try {
        const data = JSON.parse(op.data);

        switch (op.operation_type) {
          case 'INSERT':
            await SupabaseService.insert(op.table_name, {
          ...data,
          id: op.record_id,
        });
            break;
          case 'UPDATE':
            await SupabaseService.update(op.table_name, op.record_id, data);
            break;
          case 'DELETE':
            await SupabaseService.delete(op.table_name, op.record_id);
            break;
        }

        // Mark as synced and remove from queue
        await DatabaseService.markAsSynced(op.table_name, op.record_id);
        await DatabaseService.clearPendingOperation(op.id);
      } catch (error: any) {
        console.error(`Failed to sync operation ${op.id}:`, error);
        // Increment retry count
        await DatabaseService.executeSql(
          'UPDATE pending_operations SET retry_count = retry_count + 1, error_message = ? WHERE id = ?',
          [error.message, op.id]
        );
      }
    }
  }

  private static async syncRemoteChanges(): Promise<void> {
    const tables = [
      'schools',
      'students',
      'teachers',
      'exam_results',
      'exam_sets',
      'payments',
      'receipts',
      'expenses',
      'attendance',
      'teacher_remarks_settings',
      'class_teacher_comments_settings',
      'library',
      'reports',
      'parents',
    ];

    for (const table of tables) {
      try {
        await this.syncTable(table);
      } catch (error) {
        console.error(`Failed to sync table ${table}:`, error);
      }
    }
  }

  private static async syncTable(table: string): Promise<void> {
    // Get last sync time for this table
    const syncStatus = await DatabaseService.query<{ last_sync: string }>(
      'SELECT last_sync FROM sync_status WHERE table_name = ?',
      [table]
    );

    const lastSync = syncStatus.length > 0 ? syncStatus[0].last_sync : null;

    // Fetch remote data
    const remoteData = await SupabaseService.fetchAll(table);

    // Update local database
    for (const record of remoteData) {
      const existing = await DatabaseService.findById(table, record.id);

      if (existing) {
        // Update existing record if remote is newer
        if (!lastSync || new Date(record.updated_at || record.created_at) > new Date(lastSync)) {
          await DatabaseService.update(table, record.id, record);
          await DatabaseService.markAsSynced(table, record.id);
        }
      } else {
        // Insert new record
        await DatabaseService.insert(table, record);
        await DatabaseService.markAsSynced(table, record.id);
      }
    }

    // Update sync status
    await DatabaseService.executeSql(
      `INSERT OR REPLACE INTO sync_status (table_name, last_sync, pending_changes)
       VALUES (?, CURRENT_TIMESTAMP, 0)`,
      [table]
    );
  }

  private static async getPendingOperationsCount(): Promise<number> {
    const result = await DatabaseService.query<{ count: number }>(
      'SELECT COUNT(*) as count FROM pending_operations'
    );
    return result.length > 0 ? result[0].count : 0;
  }

  static getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  static addSyncListener(listener: (status: SyncStatus) => void) {
    this.syncListeners.push(listener);
  }

  static removeSyncListener(listener: (status: SyncStatus) => void) {
    this.syncListeners = this.syncListeners.filter(l => l !== listener);
  }

  private static notifyListeners() {
    this.syncListeners.forEach(listener => listener(this.syncStatus));
  }
}

export { SyncService };

