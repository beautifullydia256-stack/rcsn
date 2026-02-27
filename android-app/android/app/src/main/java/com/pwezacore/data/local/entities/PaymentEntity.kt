package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "student_payments")
data class PaymentEntity(
    @PrimaryKey
    val payment_id: String = UUID.randomUUID().toString(),
    val student_id: String,
    val school_id: String,
    val term_id: String? = null,
    val class_id: String? = null,
    val amount_paid: Double,
    val payment_method: String? = null, // cash, bank, mobile_money, cheque, other
    val transaction_ref: String? = null,
    val payment_date: Long = System.currentTimeMillis(),
    val recorded_by: String? = null,
    val notes: String? = null,
    val created_at: Long = System.currentTimeMillis(),
    val updated_at: Long = System.currentTimeMillis(),
    val synced_at: Long? = null,
    val is_synced: Boolean = false,
    val deleted_at: Long? = null,
    val version: Int = 1,
    val device_id: String? = null
)




