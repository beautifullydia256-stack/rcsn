package com.pwezacore.data.local

import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.StdOutSqlLogger
import org.jetbrains.exposed.sql.addLogger
import org.jetbrains.exposed.sql.transactions.transaction
import java.io.File

/**
 * Local SQLite database for the desktop app. Used for offline-first storage and sync.
 * Connects to a single file; create tables on first use.
 *
 * Encryption: Currently uses plain SQLite. For encrypted storage on Windows, see
 * docs/DESKTOP_LOCAL_DB.md (SQLCipher JDBC or sqlite-jdbc-crypt with key from DesktopKeyStorage).
 */
object LocalDatabase {

    private var _db: Database? = null

    fun init(dbFile: File? = null) {
        if (_db != null) return
        val file = dbFile ?: LocalDatabasePath.getDatabaseFile()
        val url = "jdbc:sqlite:${file.absolutePath}"
        _db = Database.connect(url, "org.sqlite.JDBC")
        transaction {
            addLogger(StdOutSqlLogger)
            LocalSchema.createTablesIfNeeded()
        }
    }

    fun get(): Database {
        if (_db == null) init()
        return _db!!
    }

    fun close() {
        _db = null
    }
}
