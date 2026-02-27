package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "schools")
data class SchoolEntity(
    @PrimaryKey
    val school_id: String,
    val name: String,
    val location: String? = null,
    val type: String? = null,
    val school_code: String? = null,
    val logo_url: String? = null,
    val motto: String? = null,
    val address: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val created_at: Long = System.currentTimeMillis(),
    val updated_at: Long = System.currentTimeMillis(),
    val deleted_at: Long? = null,
    val version: Int = 1,
    val device_id: String? = null,
    val synced: Boolean = false
)
