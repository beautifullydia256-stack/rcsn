package com.pwezacore.data.sync

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.pwezacore.data.local.DatabaseKeyProvider
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "sync_state")

/**
 * Persists sync state for the Android app. Used by the sync engine for delta push/pull.
 */
class SyncStateStorage(private val context: Context) {

    private val lastSyncKey = stringPreferencesKey("last_sync_timestamp")

    suspend fun getLastSyncTimestamp(schoolId: String): String? {
        return context.dataStore.data.map { prefs ->
            prefs[stringPreferencesKey("last_sync_$schoolId")] ?: prefs[lastSyncKey]
        }.first()
    }

    suspend fun setLastSyncTimestamp(schoolId: String, isoTimestamp: String) {
        context.dataStore.edit { prefs ->
            prefs[stringPreferencesKey("last_sync_$schoolId")] = isoTimestamp
            prefs[lastSyncKey] = isoTimestamp
        }
    }

    fun getDeviceId(): String = DatabaseKeyProvider.getDeviceId(context)
}
