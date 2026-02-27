package com.pwezacore.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.pwezacore.data.local.entities.BorrowRecordEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BorrowRecordDao {
    @Query("SELECT * FROM borrow_records WHERE record_id = :recordId")
    fun getRecordById(recordId: String): Flow<BorrowRecordEntity?>

    @Query("SELECT * FROM borrow_records WHERE status = 'issued' AND due_date < :now ORDER BY due_date ASC")
    fun getOverdueRecords(now: Long = System.currentTimeMillis()): Flow<List<BorrowRecordEntity>>

    @Query("SELECT * FROM borrow_records WHERE borrower_id = :borrowerId ORDER BY issued_at DESC")
    fun getRecordsByBorrower(borrowerId: String): Flow<List<BorrowRecordEntity>>

    @Query("SELECT * FROM borrow_records WHERE borrower_id = :borrowerId AND status = 'issued'")
    fun getCurrentBorrowsByBorrower(borrowerId: String): Flow<List<BorrowRecordEntity>>

    @Query("SELECT * FROM borrow_records WHERE book_id = :bookId AND status = 'issued' LIMIT 1")
    suspend fun getActiveBorrowByBook(bookId: String): BorrowRecordEntity?

    @Query("SELECT * FROM borrow_records WHERE status = 'issued'")
    fun getAllIssued(): Flow<List<BorrowRecordEntity>>

    @Query("SELECT * FROM borrow_records")
    suspend fun getAllRecords(): List<BorrowRecordEntity>

    @Query("SELECT * FROM borrow_records WHERE issued_at >= :startOfDay AND issued_at < :endOfDay")
    suspend fun getIssuedBetween(startOfDay: Long, endOfDay: Long): List<BorrowRecordEntity>

    @Query("SELECT * FROM borrow_records WHERE returned_at IS NOT NULL AND returned_at >= :startOfDay AND returned_at < :endOfDay")
    suspend fun getReturnedBetween(startOfDay: Long, endOfDay: Long): List<BorrowRecordEntity>

    @Query("SELECT * FROM borrow_records WHERE status = 'issued' AND due_date >= :startOfDay AND due_date < :endOfDay")
    suspend fun getDueBetween(startOfDay: Long, endOfDay: Long): List<BorrowRecordEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRecord(record: BorrowRecordEntity)

    @Update
    suspend fun updateRecord(record: BorrowRecordEntity)

    @Query("DELETE FROM borrow_records WHERE record_id = :recordId")
    suspend fun deleteRecord(recordId: String)

    @Query("SELECT COALESCE(SUM(fine_amount), 0) FROM borrow_records WHERE fine_paid_at IS NOT NULL")
    suspend fun getTotalFinesCollected(): Double
}
