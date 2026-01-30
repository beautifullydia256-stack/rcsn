package com.pwezacore.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.pwezacore.data.local.entities.PaymentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PaymentDao {
    @Query("SELECT * FROM student_payments WHERE payment_id = :paymentId")
    fun getPaymentById(paymentId: String): Flow<PaymentEntity?>
    
    @Query("SELECT * FROM student_payments WHERE student_id = :studentId")
    fun getPaymentsByStudent(studentId: String): Flow<List<PaymentEntity>>
    
    @Query("SELECT * FROM student_payments WHERE school_id = :schoolId")
    fun getPaymentsBySchool(schoolId: String): Flow<List<PaymentEntity>>
    
    @Query("SELECT * FROM student_payments WHERE term_id = :termId")
    fun getPaymentsByTerm(termId: String): Flow<List<PaymentEntity>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPayment(payment: PaymentEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPayments(payments: List<PaymentEntity>)
    
    @Update
    suspend fun updatePayment(payment: PaymentEntity)
    
    @Query("DELETE FROM student_payments WHERE payment_id = :paymentId")
    suspend fun deletePayment(paymentId: String)
    
    @Query("SELECT * FROM student_payments WHERE is_synced = 0")
    suspend fun getUnsyncedPayments(): List<PaymentEntity>
}




