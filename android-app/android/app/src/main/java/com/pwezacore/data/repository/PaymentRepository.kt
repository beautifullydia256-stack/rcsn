package com.pwezacore.data.repository

import com.pwezacore.data.local.dao.PaymentDao
import com.pwezacore.data.local.entities.PaymentEntity
import com.pwezacore.data.remote.SupabaseClient
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PaymentRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
    private val paymentDao: PaymentDao
) {
    fun getPaymentsByStudent(studentId: String): Flow<List<PaymentEntity>> {
        return paymentDao.getPaymentsByStudent(studentId)
    }
    
    fun getPaymentsBySchool(schoolId: String): Flow<List<PaymentEntity>> {
        return paymentDao.getPaymentsBySchool(schoolId)
    }
    
    fun getPaymentsByTerm(termId: String): Flow<List<PaymentEntity>> {
        return paymentDao.getPaymentsByTerm(termId)
    }
    
    suspend fun syncPayments(schoolId: String) {
        try {
            val payments = supabaseClient.postgrest.from("student_payments")
                .select {
                    filter {
                        eq("school_id", schoolId)
                    }
                }
                .decodeList<PaymentEntity>()
            
            paymentDao.insertPayments(payments)
        } catch (e: Exception) {
            // Handle error
        }
    }
    
    suspend fun insertPayment(payment: PaymentEntity) {
        paymentDao.insertPayment(payment)
        // TODO: Sync to remote
    }
    
    suspend fun updatePayment(payment: PaymentEntity) {
        paymentDao.updatePayment(payment)
        // TODO: Sync to remote
    }
}




