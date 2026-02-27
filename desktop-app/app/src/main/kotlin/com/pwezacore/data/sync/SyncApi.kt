package com.pwezacore.data.sync

import com.pwezacore.data.DesktopSupabase
import com.pwezacore.data.local.LocalDatabase
import com.pwezacore.data.local.LocalSchema
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.rpc
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction

/**
 * Calls Supabase sync_pull and sync_push RPCs and applies pull results to LocalDatabase.
 */
object SyncApi {

    suspend fun pull(schoolId: String, lastSyncTimestamp: String?): Result<SyncPullResponse> = withContext(Dispatchers.IO) {
        try {
            val response = DesktopSupabase.postgrest.rpc(
                "sync_pull",
                buildMap {
                    put("p_school_id", schoolId)
                    if (lastSyncTimestamp != null) put("p_last_sync_timestamp", lastSyncTimestamp)
                }
            )
            val json = kotlinx.serialization.json.Json.decodeFromString<JsonObject>(response.body<String>())
            val ok = json["ok"]?.jsonPrimitive?.content?.toBoolean() ?: false
            if (!ok) {
                val err = json["error"]?.jsonPrimitive?.content ?: "Unknown error"
                return@withContext Result.failure(Exception(err))
            }
            val data = json["data"]?.jsonObject ?: return@withContext Result.failure(Exception("No data"))
            val serverTs = when (val st = json["server_timestamp"]) {
                is kotlinx.serialization.json.JsonPrimitive -> st.content
                else -> st?.toString()?.trim('"') ?: ""
            }
            Result.success(SyncPullResponse(data, serverTs))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun push(deviceId: String, payloads: JsonObject): Result<JsonObject> = withContext(Dispatchers.IO) {
        try {
            val response = DesktopSupabase.postgrest.rpc(
                "sync_push",
                mapOf(
                    "p_device_id" to deviceId,
                    "p_payloads" to payloads
                )
            )
            val json = kotlinx.serialization.json.Json.decodeFromString<JsonObject>(response.body<String>())
            val ok = json["ok"]?.jsonPrimitive?.content?.toBoolean() ?: false
            if (!ok) {
                val err = json["error"]?.jsonPrimitive?.content ?: "Push failed"
                return@withContext Result.failure(Exception(err))
            }
            Result.success(json)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    data class SyncPullResponse(val data: JsonObject, val serverTimestamp: String)

    /** Apply pull response to local DB: upsert each table's rows. */
    fun applyPullToLocal(response: SyncPullResponse) {
        transaction(LocalDatabase.get()) {
            response.data["schools"]?.jsonArray?.let { applySchools(it) }
            response.data["school_terms"]?.jsonArray?.let { applySchoolTerms(it) }
            response.data["classes"]?.jsonArray?.let { applyClasses(it) }
            response.data["students"]?.jsonArray?.let { applyStudents(it) }
            response.data["teachers"]?.jsonArray?.let { applyTeachers(it) }
            response.data["exam_sets"]?.jsonArray?.let { applyExamSets(it) }
            response.data["exam_results"]?.jsonArray?.let { applyExamResults(it) }
            response.data["report_snapshots"]?.jsonArray?.let { applyReportSnapshots(it) }
        }
    }

    private fun applySchools(arr: JsonArray) {
        val t = LocalSchema.Schools
        for (e in arr) {
            val o = e.jsonObject
            val schoolId = o["school_id"]?.jsonPrimitive?.content ?: continue
            t.upsert(listOf(t.schoolId)) {
                it[t.schoolId] = schoolId
                it[t.name] = o["name"]?.jsonPrimitive?.content ?: ""
                it[t.location] = o["location"]?.jsonPrimitive?.content
                it[t.type] = o["type"]?.jsonPrimitive?.content
                it[t.schoolCode] = o["school_code"]?.jsonPrimitive?.content
                it[t.logoUrl] = o["logo_url"]?.jsonPrimitive?.content
                it[t.motto] = o["motto"]?.jsonPrimitive?.content
                it[t.address] = o["address"]?.jsonPrimitive?.content
                it[t.phone] = o["phone"]?.jsonPrimitive?.content
                it[t.email] = o["email"]?.jsonPrimitive?.content
                it[t.createdAt] = o["created_at"]?.jsonPrimitive?.content?.toLongOrNull() ?: System.currentTimeMillis()
                it[t.updatedAt] = o["updated_at"]?.jsonPrimitive?.content?.toLongOrNull() ?: System.currentTimeMillis()
                it[t.synced] = true
            }
        }
    }

    private fun applySchoolTerms(arr: JsonArray) {
        val t = LocalSchema.SchoolTerms
        for (e in arr) {
            val o = e.jsonObject
            val id = o["id"]?.jsonPrimitive?.content ?: continue
            t.upsert(listOf(t.id)) {
                it[t.id] = id
                it[t.schoolId] = o["school_id"]?.jsonPrimitive?.content ?: ""
                it[t.year] = o["year"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0
                it[t.term] = o["term"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0
                it[t.startDate] = o["start_date"]?.jsonPrimitive?.content
                it[t.endDate] = o["end_date"]?.jsonPrimitive?.content
                it[t.isCurrent] = o["is_current"]?.jsonPrimitive?.content?.toBooleanStrictOrNull() ?: false
                it[t.createdAt] = o["created_at"]?.jsonPrimitive?.content?.toLongOrNull() ?: System.currentTimeMillis()
                it[t.updatedAt] = o["updated_at"]?.jsonPrimitive?.content?.toLongOrNull() ?: System.currentTimeMillis()
                it[t.synced] = true
            }
        }
    }

    private fun applyClasses(arr: JsonArray) {
        // Skip if LocalSchema.Classes not defined; add when we add Classes table
    }

    private fun applyStudents(arr: JsonArray) {
        // Skip if no Students table in LocalSchema yet
    }

    private fun applyTeachers(arr: JsonArray) {
        // Skip
    }

    private fun applyExamSets(arr: JsonArray) {
        val t = LocalSchema.ExamSets
        for (e in arr) {
            val o = e.jsonObject
            val id = o["id"]?.jsonPrimitive?.content ?: continue
            t.upsert(listOf(t.id)) {
                it[t.id] = id
                it[t.schoolId] = o["school_id"]?.jsonPrimitive?.content ?: ""
                it[t.name] = o["name"]?.jsonPrimitive?.content ?: ""
                it[t.description] = o["description"]?.jsonPrimitive?.content
                it[t.term] = o["term"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0
                it[t.year] = o["year"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0
                it[t.isActive] = o["is_active"]?.jsonPrimitive?.content?.toBooleanStrictOrNull() ?: true
                it[t.createdAt] = o["created_at"]?.jsonPrimitive?.content?.toLongOrNull() ?: System.currentTimeMillis()
                it[t.updatedAt] = o["updated_at"]?.jsonPrimitive?.content?.toLongOrNull() ?: System.currentTimeMillis()
                it[t.synced] = true
            }
        }
    }

    private fun applyExamResults(arr: JsonArray) {
        val t = LocalSchema.ExamResults
        for (e in arr) {
            val o = e.jsonObject
            val id = o["id"]?.jsonPrimitive?.content ?: continue
            t.upsert(listOf(t.id)) {
                it[t.id] = id
                it[t.schoolId] = o["school_id"]?.jsonPrimitive?.content ?: ""
                it[t.examSetId] = o["exam_set_id"]?.jsonPrimitive?.content ?: ""
                it[t.studentId] = o["student_id"]?.jsonPrimitive?.content ?: ""
                it[t.className] = o["class_name"]?.jsonPrimitive?.content ?: ""
                it[t.subject] = o["subject"]?.jsonPrimitive?.content ?: ""
                it[t.marksObtained] = o["marks_obtained"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 0.0
                it[t.totalMarks] = o["total_marks"]?.jsonPrimitive?.content?.toDoubleOrNull() ?: 100.0
                it[t.grade] = o["grade"]?.jsonPrimitive?.content
                it[t.remarks] = o["remarks"]?.jsonPrimitive?.content
                it[t.teacherInitials] = o["teacher_initials"]?.jsonPrimitive?.content
                it[t.teacherComment] = o["teacher_comment"]?.jsonPrimitive?.content
                it[t.createdAt] = o["created_at"]?.jsonPrimitive?.content?.toLongOrNull() ?: System.currentTimeMillis()
                it[t.updatedAt] = o["updated_at"]?.jsonPrimitive?.content?.toLongOrNull() ?: System.currentTimeMillis()
                it[t.synced] = true
            }
        }
    }

    private fun applyReportSnapshots(arr: JsonArray) {
        val t = LocalSchema.ReportSnapshots
        for (e in arr) {
            val o = e.jsonObject
            val id = o["id"]?.jsonPrimitive?.content ?: continue
            t.upsert(listOf(t.id)) {
                it[t.id] = id
                it[t.schoolId] = o["school_id"]?.jsonPrimitive?.content ?: ""
                it[t.term] = o["term"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0
                it[t.year] = o["year"]?.jsonPrimitive?.content?.toIntOrNull() ?: 0
                it[t.examSetId] = o["exam_set_id"]?.jsonPrimitive?.content
                it[t.templateId] = o["template_id"]?.jsonPrimitive?.content
                it[t.status] = o["status"]?.jsonPrimitive?.content ?: "draft"
                it[t.createdAt] = o["created_at"]?.jsonPrimitive?.content?.toLongOrNull() ?: System.currentTimeMillis()
                it[t.updatedAt] = o["updated_at"]?.jsonPrimitive?.content?.toLongOrNull() ?: System.currentTimeMillis()
                it[t.synced] = true
            }
        }
    }

    /** Build push payloads from local unsynced rows (report_snapshots, report_snapshot_data, generated_reports). */
    fun buildPushPayloads(): JsonObject {
        return transaction(LocalDatabase.get()) {
            val snapshots = LocalSchema.ReportSnapshots.select { LocalSchema.ReportSnapshots.synced eq false }
                .map { rowToJson(LocalSchema.ReportSnapshots, it) }
            val data = LocalSchema.ReportSnapshotData.select { LocalSchema.ReportSnapshotData.synced eq false }
                .map { rowToJson(LocalSchema.ReportSnapshotData, it) }
            val reports = LocalSchema.GeneratedReports.select { LocalSchema.GeneratedReports.synced eq false }
                .map { rowToJson(LocalSchema.GeneratedReports, it) }
            buildMap<String, JsonElement> {
                if (snapshots.isNotEmpty()) put("report_snapshots", JsonArray(snapshots))
                if (data.isNotEmpty()) put("report_snapshot_data", JsonArray(data))
                if (reports.isNotEmpty()) put("generated_reports", JsonArray(reports))
            }.let { JsonObject(it) }
        }
    }

    private fun rowToJson(table: Table, row: ResultRow): JsonObject {
        val map = table.columns.associate { col ->
            col.name to (row[col]?.toString()?.let { kotlinx.serialization.json.JsonPrimitive(it) }
                ?: kotlinx.serialization.json.JsonNull)
        }
        return JsonObject(map.filterValues { it != kotlinx.serialization.json.JsonNull })
            .mapValues { (_, v) -> v as JsonElement }
            .let { JsonObject(it) }
    }

    /** Mark local rows as synced after successful push (by id list from response or all unsynced). */
    fun markPushSynced() {
        transaction(LocalDatabase.get()) {
            exec("UPDATE report_snapshots SET synced = 1 WHERE synced = 0")
            exec("UPDATE report_snapshot_data SET synced = 1 WHERE synced = 0")
            exec("UPDATE generated_reports SET synced = 1 WHERE synced = 0")
        }
    }
}
