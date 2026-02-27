package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "exam_sets")
data class ExamSetEntity(
    @PrimaryKey
    val id: String,
    val school_id: String,
    val name: String,
    val description: String? = null,
    val term: Int,
    val year: Int,
    val is_active: Boolean = true,
    val created_at: Long = System.currentTimeMillis(),
    val updated_at: Long = System.currentTimeMillis(),
    val deleted_at: Long? = null,
    val version: Int = 1,
    val device_id: String? = null,
    val synced: Boolean = false
)
