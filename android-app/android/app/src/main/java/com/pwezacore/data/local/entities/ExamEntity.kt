package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "exam_results")
data class ExamEntity(
    @PrimaryKey
    val result_id: String = UUID.randomUUID().toString(),
    val student_id: String,
    val school_id: String,
    val exam_set_id: String,
    val term_id: String,
    val class_name: String,
    val subject: String,
    val marks: Double,
    val grade: String? = null,
    val position: Int? = null,
    val created_at: Long = System.currentTimeMillis(),
    val updated_at: Long = System.currentTimeMillis(),
    val synced_at: Long? = null,
    val is_synced: Boolean = false
)




