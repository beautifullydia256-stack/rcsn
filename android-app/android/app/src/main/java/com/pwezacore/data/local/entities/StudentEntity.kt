package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "students")
data class StudentEntity(
    @PrimaryKey
    val student_id: String = UUID.randomUUID().toString(),
    val school_id: String,
    val name: String,
    val current_class: String,
    val status: String = "active", // active, graduated
    val graduation_year: Int? = null,
    val repeat_year: Boolean = false,
    val expected_fee_amount: Double? = null,
    val admission_number: String? = null,
    val photo_base64: String? = null,
    val created_at: Long = System.currentTimeMillis(),
    val updated_at: Long = System.currentTimeMillis(),
    val synced_at: Long? = null,
    val is_synced: Boolean = false,
    val deleted_at: Long? = null,
    val version: Int = 1,
    val device_id: String? = null
)




