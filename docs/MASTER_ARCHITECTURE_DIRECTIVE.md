# 📌 MASTER ARCHITECTURE DIRECTIVE

## Offline-First Kotlin Architecture (Windows + Android)

### With Encrypted Local Storage + Instant Cloud Sync + Faster Than Web

This document defines the **exact architecture** I want for the Windows and Android native apps.

The goal is:

* ⚡ Native apps must be significantly faster than the web version
* 📴 Apps must fully support offline functionality
* 🔐 All school data must be stored locally and encrypted
* 🔄 When online, the app must automatically sync and update instantly
* ☁ Supabase remains the cloud source of truth and backup
* 🧮 Report generation must work fully offline and be extremely fast

This is an **offline-first system**, not a cloud-dependent system.

---

# 1️⃣ CORE PRINCIPLE

The Windows and Android apps must behave as:

> A secure, encrypted local school server that syncs with the cloud.

The app must NOT depend on constant internet to function.

Cloud is:

* Backup
* Multi-device bridge
* Remote access layer
* Data replication layer

NOT the primary runtime engine.

---

# 2️⃣ LOCAL DATABASE REQUIREMENTS (MANDATORY)

## Canonical Schema

The **exact local database structure** (tables, columns, types) is defined in:

**[LOCAL_DATABASE_SCHEMA_AND_SYNC.md](./LOCAL_DATABASE_SCHEMA_AND_SYNC.md)**

The local schema MUST mirror that document: same tables, same primary keys, same column names and types. Every synced table MUST also include the mandatory sync columns defined there (§2). This ensures offline operation and reliable delta sync when online.

## Database Engine

Use:

* SQLCipher (Encrypted SQLite)
* Room (Android)
* SQLCipher + Exposed or Room (Windows JVM)

## Encryption Requirements

* AES-256 encryption
* Encryption key must NOT be hardcoded
* Key must be stored securely:

  * Android → Android Keystore
  * Windows → OS-protected secure storage (Windows Credential Manager or encrypted file tied to OS user)

The database file must not be readable outside the app.

---

# 3️⃣ DATA THAT MUST BE STORED LOCALLY

The local encrypted DB must contain the **full dataset for that school**. The authoritative list of tables and their sync order is in **[LOCAL_DATABASE_SCHEMA_AND_SYNC.md](./LOCAL_DATABASE_SCHEMA_AND_SYNC.md)** (§3).

In scope (summary):

* **School root:** `schools`, `school_terms`, `classes`, `subjects`, `class_subjects`
* **People:** `users`, `teachers`, `students`, `parents`, `class_teachers`, `teacher_class_subjects`
* **Academics:** `exam_sets`, `exam_results`, `processed_primary_exam_results`, `processed_secondary_exam_results`, `grading_scale`, `report_comments`, comment/remark settings
* **Reports:** `report_templates`, `class_template_settings`, `report_snapshots`, `report_snapshot_data`, `generated_reports`
* **Fees & finance:** `fee_structures`, `school_fee_structure`, `student_invoices`, `student_fees`, `student_balances`, `student_payments`, `receipts`, `receivable_status`, `balance_brought_forward`, sequences, etc.
* **Attendance:** `student_attendance`, teacher attendance tables
* **Other:** notifications, assignments, discipline, timetables, library (books, copies, borrows, fines, reservations), expenses, events, audit/logs, and remaining tables listed in the schema doc.

All data MUST be **school-scoped**: only rows for the school(s) the user can access are stored and synced. The app must be fully usable offline for days or weeks.

---

# 4️⃣ REPORT GENERATION (FULLY LOCAL, VERY FAST)

## Critical Requirement

Report generation in Windows and Android must be 100% local.

No API calls required for:

* Preview
* Final generation
* PDF creation

---

## Report Engine Structure (Kotlin Module)

Create a local module:

```
report/
 ├── ReportDataBuilder.kt
 ├── GradeCalculator.kt
 ├── AggregateCalculator.kt
 ├── PositionCalculator.kt
 ├── SnapshotService.kt
 └── PdfGenerator.kt
```

---

## Report Flow (Offline Mode)

When user clicks Preview:

1. Fetch exam data from local DB
2. Compute:

   * averages
   * aggregate
   * division
   * attendance %
   * class positions (must compute against full class, even if previewing one student)
3. Build reportData objects
4. Render immediately

This must complete in < 1 second for 50 students.

---

## Final Generation (Offline)

When user clicks "Generate & Save":

1. Create local snapshot
2. Mark snapshot as locked locally
3. Store generated reports locally
4. Queue snapshot for sync

No internet required.

---

## PDF Generation (Offline)

PDF must be generated locally.

Android:

* PdfDocument or iText

Windows:

* iText or PDFBox

PDF must not require server.

---

# 5️⃣ SYNC ENGINE (AUTOMATIC, REAL-TIME WHEN ONLINE)

This is critical.

When device is online:

The app must automatically sync in background.

---

## Sync Strategy: Delta-Based Sync

Each synced table MUST include the following columns (see **[LOCAL_DATABASE_SCHEMA_AND_SYNC.md](./LOCAL_DATABASE_SCHEMA_AND_SYNC.md)** §2 for full definition):

* **id** (UUID) — primary key; same as Supabase
* **created_at**
* **updated_at**
* **deleted_at** (nullable) — soft delete
* **version** (integer)
* **device_id**
* **synced** (boolean) — local-only; false until pushed

Supabase tables must have these columns added (via migration) where missing; the local schema MUST include them on every synced table. Push and pull MUST follow the **table dependency order** defined in the schema doc so that parent rows exist before children.

---

## Sync Flow

When internet is detected:

### Step 1 — Push Local Changes

Send all records where:

```
synced = false
```

Server applies changes.

Server returns success + updated version.

Mark them synced.

---

### Step 2 — Pull Cloud Changes

App sends:

```
last_sync_timestamp
```

Server returns all records updated since that timestamp.

App applies changes locally.

Update last_sync_timestamp.

---

## Conflict Resolution

Default rule:

Last write wins (based on updated_at or version).

If conflict detected:

Server version overrides unless local version is newer.

This must be deterministic.

**Implementation:** Use the table list and apply order in [LOCAL_DATABASE_SCHEMA_AND_SYNC.md](./LOCAL_DATABASE_SCHEMA_AND_SYNC.md) (§3 and §5) for initial pull, delta pull, and push so that foreign keys are satisfied and sync is reliable.

---

When online, changes made in Supabase must reflect in the app automatically.

Implement:

* Supabase Realtime subscriptions (if possible)
  OR
* Polling every X seconds (fallback)

When remote change detected:

* Update local DB
* Update UI immediately

User should not need to refresh manually.

---

# 7️⃣ PERFORMANCE REQUIREMENTS

Target performance:

| Action                         | Target    |
| ------------------------------ | --------- |
| Preview single student         | < 0.5 sec |
| Preview 50 students            | < 1 sec   |
| Final generation (50 students) | < 1 sec   |
| PDF generation                 | < 2 sec   |
| Full sync (normal school)      | < 3 sec   |

Native apps must feel noticeably faster than web.

---

# 8️⃣ UI REQUIREMENTS FOR SYNC

Display:

* Sync status indicator

  * 🟢 Synced
  * 🟡 Syncing
  * 🔴 Offline

Sync must be automatic.
No manual "Sync" button required (optional advanced button allowed).

---

# 9️⃣ SECURITY REQUIREMENTS

* Database encrypted
* App login required
* Auto-lock after inactivity
* Optional PIN/biometric unlock
* No raw DB access outside app
* No unencrypted export

If device is stolen, data must remain protected.

---

# 🔟 SERVER SIDE ROLE (SUPABASE)

Supabase remains:

* Master backup
* Multi-device sync hub
* Remote access provider
* Web platform backend

It must NOT be required for:

* Daily report generation
* Basic data access
* PDF generation

---

# 1️⃣1️⃣ CONSISTENCY REQUIREMENT

Report calculations must match:

* Web version
* Android version
* Windows version

To ensure consistency:

Define a shared "Report Calculation Specification" document.

All platforms must follow same formulas.

**Specification:** [REPORT_CALCULATION_SPECIFICATION.md](./REPORT_CALCULATION_SPECIFICATION.md) — primary grades (D1–F9), division, aggregate, class position, attendance. Web `reportUtils.ts`, Kotlin report module, and `ReportUtils.kt` must align with this doc.

---

# 1️⃣2️⃣ EXPECTED FINAL ARCHITECTURE

Windows App:

* Primary offline school system
* Full DB local
* Full report engine local
* Sync to cloud

Android App:

* Offline-capable
* Sync frequently
* Teacher-friendly access

Web App:

* Cloud-first
* Remote access

All share same cloud database.

---

# FINAL STATEMENT

The native apps must:

* Be faster than web
* Work fully offline
* Encrypt all local data
* Sync automatically when online
* Update instantly when cloud changes
* Generate reports locally without server delay

This is not optional.
This is the required architecture.

Please design and implement accordingly.

---
