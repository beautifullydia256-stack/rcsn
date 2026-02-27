package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "school_terms")
data class SchoolTermEntity(
    @PrimaryKey
    val id: String,
    val school_id: String,
    val year: Int,
    val term: Int,
    val start_date: String? = null,
    val end_date: String? = null,
    val is_current: Boolean = false,
    val created_at: Long = System.currentTimeMillis(),
    val updated_at: Long = System.currentTimeMillis(),
    val deleted_at: Long? = null,
    val version: Int = 1,
    val device_id: String? = null,
    val synced: Boolean = false
)
