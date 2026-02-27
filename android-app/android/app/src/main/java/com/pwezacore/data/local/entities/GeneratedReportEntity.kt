package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "generated_reports")
data class GeneratedReportEntity(
    @PrimaryKey
    val id: String,
    val snapshot_id: String,
    val student_id: String,
    val template_id: String? = null,
    val report_data: String,
    val pdf_url: String? = null,
    val generated_at: Long = System.currentTimeMillis(),
    val created_at: Long = System.currentTimeMillis(),
    val updated_at: Long = System.currentTimeMillis(),
    val deleted_at: Long? = null,
    val version: Int = 1,
    val device_id: String? = null,
    val synced: Boolean = false
)
