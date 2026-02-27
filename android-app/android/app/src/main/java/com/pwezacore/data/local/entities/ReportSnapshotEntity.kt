package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "report_snapshots")
data class ReportSnapshotEntity(
    @PrimaryKey
    val id: String,
    val school_id: String,
    val term: Int,
    val year: Int,
    val exam_set_id: String? = null,
    val template_id: String? = null,
    val status: String = "draft",
    val created_at: Long = System.currentTimeMillis(),
    val updated_at: Long = System.currentTimeMillis(),
    val deleted_at: Long? = null,
    val version: Int = 1,
    val device_id: String? = null,
    val synced: Boolean = false
)
