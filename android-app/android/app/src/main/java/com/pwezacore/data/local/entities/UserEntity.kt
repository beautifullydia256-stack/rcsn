package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey
    val user_id: String = UUID.randomUUID().toString(),
    val role: String, // owner, admin, teacher, parent, student, accountant, librarian, head_teacher
    val email: String,
    val password_hash: String?,
    val school_id: String? = null,
    val student_id: String? = null,
    val name: String,
    val phone: String? = null,
    val department: String? = null,
    val position: String? = null,
    val created_at: Long = System.currentTimeMillis(),
    val updated_at: Long = System.currentTimeMillis(),
    val synced_at: Long? = null,
    val is_synced: Boolean = false,
    val deleted_at: Long? = null,
    val version: Int = 1,
    val device_id: String? = null
)




