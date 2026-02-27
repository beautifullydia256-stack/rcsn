package com.pwezacore.data.local

import org.jetbrains.exposed.sql.Table

/**
 * Exposed table definitions for local sync. Mirror LOCAL_DATABASE_SCHEMA_AND_SYNC.md.
 * Sync columns: created_at, updated_at, deleted_at, version, device_id, synced.
 */
object LocalSchema {

    object Schools : Table("schools") {
        val schoolId = varchar("school_id", 36).primaryKey()
        val name = varchar("name", 512)
        val location = varchar("location", 512).nullable()
        val type = varchar("type", 64).nullable()
        val schoolCode = varchar("school_code", 64).nullable()
        val logoUrl = text("logo_url").nullable()
        val motto = text("motto").nullable()
        val address = text("address").nullable()
        val phone = varchar("phone", 64).nullable()
        val email = varchar("email", 256).nullable()
        val createdAt = long("created_at")
        val updatedAt = long("updated_at")
        val deletedAt = long("deleted_at").nullable()
        val version = integer("version").default(1)
        val deviceId = varchar("device_id", 64).nullable()
        val synced = bool("synced").default(false)
    }

    object SchoolTerms : Table("school_terms") {
        val id = varchar("id", 36).primaryKey()
        val schoolId = varchar("school_id", 36)
        val year = integer("year")
        val term = integer("term")
        val startDate = varchar("start_date", 32).nullable()
        val endDate = varchar("end_date", 32).nullable()
        val isCurrent = bool("is_current").default(false)
        val createdAt = long("created_at")
        val updatedAt = long("updated_at")
        val deletedAt = long("deleted_at").nullable()
        val version = integer("version").default(1)
        val deviceId = varchar("device_id", 64).nullable()
        val synced = bool("synced").default(false)
    }

    object ExamSets : Table("exam_sets") {
        val id = varchar("id", 36).primaryKey()
        val schoolId = varchar("school_id", 36)
        val name = varchar("name", 256)
        val description = text("description").nullable()
        val term = integer("term")
        val year = integer("year")
        val isActive = bool("is_active").default(true)
        val createdAt = long("created_at")
        val updatedAt = long("updated_at")
        val deletedAt = long("deleted_at").nullable()
        val version = integer("version").default(1)
        val deviceId = varchar("device_id", 64).nullable()
        val synced = bool("synced").default(false)
    }

    object ExamResults : Table("exam_results") {
        val id = varchar("id", 36).primaryKey()
        val schoolId = varchar("school_id", 36)
        val examSetId = varchar("exam_set_id", 36)
        val studentId = varchar("student_id", 36)
        val className = varchar("class_name", 128)
        val subject = varchar("subject", 128)
        val marksObtained = double("marks_obtained").default(0.0)
        val totalMarks = double("total_marks").default(100.0)
        val grade = varchar("grade", 16).nullable()
        val remarks = text("remarks").nullable()
        val teacherInitials = varchar("teacher_initials", 32).nullable()
        val teacherComment = text("teacher_comment").nullable()
        val createdAt = long("created_at")
        val updatedAt = long("updated_at")
        val deletedAt = long("deleted_at").nullable()
        val version = integer("version").default(1)
        val deviceId = varchar("device_id", 64).nullable()
        val synced = bool("synced").default(false)
    }

    object ReportSnapshots : Table("report_snapshots") {
        val id = varchar("id", 36).primaryKey()
        val schoolId = varchar("school_id", 36)
        val term = integer("term")
        val year = integer("year")
        val examSetId = varchar("exam_set_id", 36).nullable()
        val templateId = varchar("template_id", 36).nullable()
        val status = varchar("status", 32).default("draft")
        val createdAt = long("created_at")
        val updatedAt = long("updated_at")
        val deletedAt = long("deleted_at").nullable()
        val version = integer("version").default(1)
        val deviceId = varchar("device_id", 64).nullable()
        val synced = bool("synced").default(false)
    }

    object ReportSnapshotData : Table("report_snapshot_data") {
        val id = varchar("id", 36).primaryKey()
        val snapshotId = varchar("snapshot_id", 36)
        val studentId = varchar("student_id", 36)
        val className = varchar("class_name", 128)
        val subject = varchar("subject", 128)
        val marksObtained = double("marks_obtained").nullable()
        val totalMarks = double("total_marks").nullable()
        val grade = varchar("grade", 16).nullable()
        val averagePercentage = double("average_percentage").nullable()
        val aggregate = double("aggregate").nullable()
        val division = varchar("division", 32).nullable()
        val position = integer("position").nullable()
        val classTeacherComment = text("class_teacher_comment").nullable()
        val headteacherComment = text("headteacher_comment").nullable()
        val attendancePercentage = double("attendance_percentage").nullable()
        val feesBalance = double("fees_balance").nullable()
        val feesPaid = double("fees_paid").nullable()
        val frozenData = text("frozen_data").nullable()
        val createdAt = long("created_at")
        val updatedAt = long("updated_at")
        val deletedAt = long("deleted_at").nullable()
        val version = integer("version").default(1)
        val deviceId = varchar("device_id", 64).nullable()
        val synced = bool("synced").default(false)
    }

    object GeneratedReports : Table("generated_reports") {
        val id = varchar("id", 36).primaryKey()
        val snapshotId = varchar("snapshot_id", 36)
        val studentId = varchar("student_id", 36)
        val templateId = varchar("template_id", 36).nullable()
        val reportData = text("report_data")
        val pdfUrl = text("pdf_url").nullable()
        val generatedAt = long("generated_at")
        val createdAt = long("created_at")
        val updatedAt = long("updated_at")
        val deletedAt = long("deleted_at").nullable()
        val version = integer("version").default(1)
        val deviceId = varchar("device_id", 64).nullable()
        val synced = bool("synced").default(false)
    }

    fun createTablesIfNeeded() {
        org.jetbrains.exposed.sql.SchemaUtils.createMissingTablesAndColumns(
            Schools,
            SchoolTerms,
            ExamSets,
            ExamResults,
            ReportSnapshots,
            ReportSnapshotData,
            GeneratedReports
        )
    }
}
