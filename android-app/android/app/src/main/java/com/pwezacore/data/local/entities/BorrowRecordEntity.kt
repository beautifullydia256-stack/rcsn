package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(
    tableName = "borrow_records",
    indices = [Index(value = ["book_id"]), Index(value = ["borrower_id"]), Index(value = ["status"])]
)
data class BorrowRecordEntity(
    @PrimaryKey
    val record_id: String = UUID.randomUUID().toString(),
    val book_id: String,
    val borrower_id: String,
    val borrower_type: String, // "student", "teacher"
    val issued_at: Long = System.currentTimeMillis(),
    val due_date: Long,
    val returned_at: Long? = null,
    val fine_amount: Double = 0.0,
    val fine_paid_at: Long? = null,
    val status: String = "issued" // issued, returned, lost
)
