package com.pwezacore.data.local

import java.io.File

/**
 * Resolves the path for the local SQLite database file.
 * Uses user's app data directory so the DB persists and is per-user.
 */
object LocalDatabasePath {

    fun getDatabaseFile(): File {
        val userHome = System.getProperty("user.home") ?: "."
        val appData = File(userHome, "PwezaCore")
        if (!appData.exists()) appData.mkdirs()
        return File(appData, "pwezacore_local.db")
    }
}
