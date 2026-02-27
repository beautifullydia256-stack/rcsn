# Desktop Local Database

This document describes the Windows desktop app’s local SQLite database used for offline-first sync.

## Current setup

- **Path:** `%USERPROFILE%\PwezaCore\pwezacore_local.db` (see `LocalDatabasePath.getDatabaseFile()`).
- **Driver:** Plain SQLite via `org.sqlite.JDBC` and Exposed.
- **Tables:** Defined in `LocalSchema` (schools, school_terms, exam_sets, exam_results, report_snapshots, report_snapshot_data, generated_reports). Schema matches [LOCAL_DATABASE_SCHEMA_AND_SYNC.md](../LOCAL_DATABASE_SCHEMA_AND_SYNC.md).

## Encrypted database option

The architecture directive requires an **encrypted local DB on Windows**. Right now the app uses **plain SQLite**. To add encryption:

1. **Key source**  
   Use the same key material as the rest of the app, e.g. from `DesktopKeyStorage.getDeviceId()` or a dedicated key derived/stored via Windows Credential Manager or DPAPI (see `DesktopKeyStorage`).

2. **Options**
   - **SQLCipher for JDBC** (Zetetic): Commercial; supports `jdbc:sqlite:file` with key via `getConnection(url, null, key)` or `PRAGMA key`.
   - **sqlite-jdbc-crypt** (e.g. [Willena/sqlite-jdbc-crypt](https://github.com/Willena/sqlite-jdbc-crypt)): Open-source fork of sqlite-jdbc with encryption; use the same key when opening the connection.

3. **Integration**
   - Replace the current `Database.connect(url, "org.sqlite.JDBC")` in `LocalDatabase.init()` with a connection that uses the chosen driver and passes the key (e.g. from step 1).
   - Ensure the key is stable so the same DB file can be reopened after restart.

4. **Exposed**  
   Exposed works with any JDBC `Connection`; no schema changes are required. Only the way the connection is created (URL + driver + key) needs to change.

Once encryption is enabled, the local DB file will be encrypted at rest while keeping the same schema and sync behavior.
