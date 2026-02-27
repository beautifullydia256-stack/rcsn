package com.pwezacore.data.sync

import com.pwezacore.data.remote.SupabaseClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Coordinates delta sync on Android: push local unsynced rows, then pull server changes.
 * See docs/SYNC_API.md. When Sync API RPC is available, implement push/pull HTTP calls.
 */
@Singleton
class SyncManager @Inject constructor(
    private val supabaseClient: SupabaseClient,
    private val syncStateStorage: SyncStateStorage
) {

    sealed class SyncStatus {
        object Idle : SyncStatus()
        object Syncing : SyncStatus()
        data class Error(val message: String) : SyncStatus()
    }

    var lastStatus: SyncStatus = SyncStatus.Idle
        private set

    suspend fun pushThenPull(schoolId: String): Result<Unit> = withContext(Dispatchers.IO) {
        lastStatus = SyncStatus.Syncing
        try {
            val deviceId = syncStateStorage.getDeviceId()
            // TODO: Collect unsynced rows from Room DAOs (synced = false), call Sync API push
            // TODO: Call Sync API pull with school_id and last_sync_timestamp, apply to Room
            // syncStateStorage.setLastSyncTimestamp(schoolId, response.server_timestamp)
            lastStatus = SyncStatus.Idle
            Result.success(Unit)
        } catch (e: Exception) {
            lastStatus = SyncStatus.Error(e.message ?: "Sync failed")
            Result.failure(e)
        }
    }
}
