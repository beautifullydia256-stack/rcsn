package com.pwezacore.data.sync

import com.pwezacore.data.DesktopSupabase
import com.pwezacore.data.local.DesktopKeyStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Coordinates delta sync: push local unsynced rows, then pull server changes.
 * Uses Sync API contract (docs/SYNC_API.md). When Sync API RPC is available,
 * replace the stub implementation with actual HTTP calls.
 */
object SyncManager {

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
            val client = DesktopSupabase.getClientOrNull() ?: return@withContext Result.failure(Exception("Not logged in"))
            val deviceId = SyncStateStorage.getDeviceId()
            // Push: build payloads from local unsynced rows, call sync_push, then mark synced
            val payloads = SyncApi.buildPushPayloads()
            val payloadKeys = payloads.keys
            if (payloadKeys.isNotEmpty()) {
                val pushResult = SyncApi.push(deviceId, payloads)
                pushResult.fold(
                    onSuccess = { SyncApi.markPushSynced() },
                    onFailure = { lastStatus = SyncStatus.Error(it.message ?: "Push failed"); return@withContext Result.failure(it) }
                )
            }
            // Pull: call sync_pull, apply to local DB, persist last sync timestamp
            val lastSync = SyncStateStorage.getLastSyncTimestamp(schoolId)
            val pullResult = SyncApi.pull(schoolId, lastSync)
            pullResult.fold(
                onSuccess = { response ->
                    SyncApi.applyPullToLocal(response)
                    SyncStateStorage.setLastSyncTimestamp(schoolId, response.serverTimestamp)
                },
                onFailure = { lastStatus = SyncStatus.Error(it.message ?: "Pull failed"); return@withContext Result.failure(it) }
            )
            lastStatus = SyncStatus.Idle
            Result.success(Unit)
        } catch (e: Exception) {
            lastStatus = SyncStatus.Error(e.message ?: "Sync failed")
            Result.failure(e)
        }
    }

    fun isOnline(): Boolean = try {
        DesktopSupabase.getClientOrNull() != null
    } catch (_: Exception) {
        false
    }
}
