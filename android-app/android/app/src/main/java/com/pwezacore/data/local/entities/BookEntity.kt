package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(
    tableName = "books",
    indices = [Index(value = ["isbn"]), Index(value = ["category_id"])]
)
data class BookEntity(
    @PrimaryKey
    val book_id: String = UUID.randomUUID().toString(),
    val title: String,
    val author: String,
    val isbn: String = "",
    val category_id: String? = null,
    val subject: String = "",
    val class_level: String = "",
    val publisher: String = "",
    val year: Int? = null,
    val quantity: Int = 1,
    val available_quantity: Int = 1,
    val shelf_location: String = "",
    val condition: String = "Good", // New, Good, Damaged
    val barcode: String? = null,
    val lost: Boolean = false,
    val damaged: Boolean = false,
    val created_at: Long = System.currentTimeMillis(),
    val updated_at: Long = System.currentTimeMillis()
)
