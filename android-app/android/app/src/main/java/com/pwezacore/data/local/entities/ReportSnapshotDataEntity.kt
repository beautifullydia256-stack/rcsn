package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "report_snapshot_data")
data class ReportSnapshotDataEntity(
    @PrimaryKey
    val id: String,
    val snapshot_id: String,
    val student_id: String,
    val class_name: String,
    val subject: String,
    val marks_obtained: Double? = null,
    val total_marks: Double? = null,
    val grade: String? = null,
    val average_percentage: Double? = null,
    val aggregate: Double? = null,
    val division: String? = null,
    val position: Int? = null,
    val class_teacher_comment: String? = null,
    val headteacher_comment: String? = null,
    val attendance_percentage: Double? = null,
    val fees_balance: Double? = null,
    val fees_paid: Double? = null,
    val frozen_data: String? = null,
    val created_at: Long = System.currentTimeMillis(),
    val updated_at: Long = System.currentTimeMillis(),
    val deleted_at: Long? = null,
    val version: Int = 1,
    val device_id: String? = null,
    val synced: Boolean = false
)
