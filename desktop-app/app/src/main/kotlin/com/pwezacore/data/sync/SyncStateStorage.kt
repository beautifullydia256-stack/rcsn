package com.pwezacore.data.sync

import com.pwezacore.data.local.DesktopKeyStorage
import java.util.prefs.Preferences

/**
 * Persists sync state for the desktop app. Used by the sync engine for delta push/pull.
 * See docs/SYNC_API.md.
 */
object SyncStateStorage {

    private const val PREFS_NODE = "com.pwezacore.desktop.sync"
    private const val KEY_LAST_SYNC = "last_sync_timestamp"

    fun getLastSyncTimestamp(schoolId: String): String? {
        val prefs = Preferences.userRoot().node(PREFS_NODE)
        return prefs.get("${KEY_LAST_SYNC}_$schoolId", null)
    }

    fun setLastSyncTimestamp(schoolId: String, isoTimestamp: String) {
        val prefs = Preferences.userRoot().node(PREFS_NODE)
        prefs.put("${KEY_LAST_SYNC}_$schoolId", isoTimestamp)
    }

    fun getDeviceId(): String = DesktopKeyStorage.getDeviceId()
}
