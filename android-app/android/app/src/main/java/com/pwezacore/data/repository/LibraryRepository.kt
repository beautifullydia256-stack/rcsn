package com.pwezacore.data.repository

import com.pwezacore.data.local.entities.BookEntity
import com.pwezacore.data.local.entities.BorrowRecordEntity
import com.pwezacore.data.local.entities.CategoryEntity
import com.pwezacore.data.local.dao.BookDao
import com.pwezacore.data.local.dao.BorrowRecordDao
import com.pwezacore.data.local.dao.CategoryDao
import com.pwezacore.data.local.dao.StudentDao
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import java.util.Calendar
import javax.inject.Inject
import javax.inject.Singleton

data class TodaysActivity(
    val borrowedToday: Int,
    val returnedToday: Int,
    val dueToday: Int,
    val finesCollectedToday: Double
)

data class OverdueRecord(
    val record: BorrowRecordEntity,
    val bookTitle: String,
    val borrowerName: String,
    val borrowerClass: String,
    val daysOverdue: Int
)

@Singleton
class LibraryRepository @Inject constructor(
    private val bookDao: BookDao,
    private val borrowRecordDao: BorrowRecordDao,
    private val categoryDao: CategoryDao,
    private val studentDao: StudentDao
) {
    companion object {
        const val FINE_RATE_PER_DAY = 500.0 // UGX default
        const val MAX_BORROW_LIMIT = 3
    }

    fun getBooks(): Flow<List<BookEntity>> = bookDao.getBooks()

    fun getBooksFiltered(query: String): Flow<List<BookEntity>> =
        if (query.isBlank()) bookDao.getBooks() else bookDao.searchBooks(query)

    fun getBookById(bookId: String): Flow<BookEntity?> = bookDao.getBookById(bookId)

    suspend fun addBook(book: BookEntity) {
        bookDao.insertBook(book)
    }

    suspend fun updateBook(book: BookEntity) {
        bookDao.updateBook(book.copy(updated_at = System.currentTimeMillis()))
    }

    fun getCategories(): Flow<List<CategoryEntity>> = categoryDao.getCategories()

    fun getCategoryById(categoryId: String): Flow<CategoryEntity?> = categoryDao.getCategoryById(categoryId)

    fun getBorrowerName(borrowerId: String): Flow<String> =
        studentDao.getStudentById(borrowerId).map { it?.name ?: "Unknown" }

    suspend fun addCategory(category: CategoryEntity) {
        categoryDao.insertCategory(category)
    }

    suspend fun updateCategory(category: CategoryEntity) {
        categoryDao.updateCategory(category)
    }

    suspend fun getOverdueRecords(): List<OverdueRecord> {
        val now = System.currentTimeMillis()
        val records = borrowRecordDao.getOverdueRecords(now).first()
        return records.mapNotNull { record ->
            val book = bookDao.getBookById(record.book_id).first() ?: return@mapNotNull null
            val (name, className) = getBorrowerNameAndClass(record.borrower_id, record.borrower_type)
            val daysOverdue = ((now - record.due_date) / (24 * 60 * 60 * 1000)).toInt().coerceAtLeast(0)
            OverdueRecord(
                record = record,
                bookTitle = book.title,
                borrowerName = name,
                borrowerClass = className,
                daysOverdue = daysOverdue
            )
        }
    }

    private suspend fun getBorrowerNameAndClass(borrowerId: String, borrowerType: String): Pair<String, String> {
        return if (borrowerType == "student") {
            val student = studentDao.getStudentById(borrowerId).first()
            (student?.name ?: "Unknown") to (student?.current_class ?: "")
        } else {
            "Teacher" to ""
        }
    }

    fun getOverdueRecordsFlow(): Flow<List<BorrowRecordEntity>> =
        borrowRecordDao.getOverdueRecords(System.currentTimeMillis())

    suspend fun getTodaysActivity(): TodaysActivity {
        val cal = Calendar.getInstance()
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        val startOfDay = cal.timeInMillis
        cal.add(Calendar.DAY_OF_MONTH, 1)
        val endOfDay = cal.timeInMillis

        val borrowedToday = borrowRecordDao.getIssuedBetween(startOfDay, endOfDay).size
        val returnedToday = borrowRecordDao.getReturnedBetween(startOfDay, endOfDay).size
        val dueToday = borrowRecordDao.getDueBetween(startOfDay, endOfDay).size
        val returned = borrowRecordDao.getReturnedBetween(startOfDay, endOfDay)
        val finesCollectedToday = returned.sumOf { it.fine_amount }

        return TodaysActivity(
            borrowedToday = borrowedToday,
            returnedToday = returnedToday,
            dueToday = dueToday,
            finesCollectedToday = finesCollectedToday
        )
    }

    suspend fun getDashboardCounts(): Pair<Int, Int> {
        val totalBooks = bookDao.getTotalBooksCount()
        val issued = borrowRecordDao.getAllIssued().first().size
        return totalBooks to issued
    }

    suspend fun getOverdueCount(): Int = borrowRecordDao.getOverdueRecords(System.currentTimeMillis()).first().size

    suspend fun getBooksAddedThisMonth(): Int {
        val cal = Calendar.getInstance()
        cal.set(Calendar.DAY_OF_MONTH, 1)
        cal.set(Calendar.HOUR_OF_DAY, 0)
        cal.set(Calendar.MINUTE, 0)
        cal.set(Calendar.SECOND, 0)
        cal.set(Calendar.MILLISECOND, 0)
        return bookDao.getBooksAddedSince(cal.timeInMillis)
    }

    fun getBorrowHistory(borrowerId: String): Flow<List<BorrowRecordEntity>> =
        borrowRecordDao.getRecordsByBorrower(borrowerId)

    fun getCurrentBorrows(borrowerId: String): Flow<List<BorrowRecordEntity>> =
        borrowRecordDao.getCurrentBorrowsByBorrower(borrowerId)

    suspend fun getCurrentBorrowCount(borrowerId: String): Int =
        borrowRecordDao.getCurrentBorrowsByBorrower(borrowerId).first().size

    suspend fun hasOverdue(borrowerId: String): Boolean {
        val now = System.currentTimeMillis()
        val overdue = borrowRecordDao.getOverdueRecords(now).first()
        return overdue.any { it.borrower_id == borrowerId }
    }

    suspend fun issueBook(bookId: String, borrowerId: String, borrowerType: String, returnDate: Long) {
        val book = bookDao.getBookById(bookId).first() ?: return
        if (book.available_quantity < 1) return
        val record = BorrowRecordEntity(
            book_id = bookId,
            borrower_id = borrowerId,
            borrower_type = borrowerType,
            due_date = returnDate,
            status = "issued"
        )
        borrowRecordDao.insertRecord(record)
        bookDao.updateBook(
            book.copy(
                available_quantity = book.available_quantity - 1,
                updated_at = System.currentTimeMillis()
            )
        )
    }

    fun computeFine(record: BorrowRecordEntity, ratePerDay: Double = FINE_RATE_PER_DAY): Double {
        val now = System.currentTimeMillis()
        if (record.due_date >= now) return 0.0
        val daysOverdue = ((now - record.due_date) / (24.0 * 60 * 60 * 1000)).toInt().coerceAtLeast(0)
        return daysOverdue * ratePerDay
    }

    suspend fun returnBook(recordId: String, finePaid: Double = 0.0) {
        val record = borrowRecordDao.getRecordById(recordId).first() ?: return
        val book = bookDao.getBookById(record.book_id).first() ?: return
        val updatedRecord = record.copy(
            returned_at = System.currentTimeMillis(),
            fine_amount = computeFine(record),
            fine_paid_at = if (finePaid > 0) System.currentTimeMillis() else null,
            status = "returned"
        )
        borrowRecordDao.updateRecord(updatedRecord)
        bookDao.updateBook(
            book.copy(
                available_quantity = book.available_quantity + 1,
                updated_at = System.currentTimeMillis()
            )
        )
    }

    suspend fun markFinePaid(recordId: String) {
        val record = borrowRecordDao.getRecordById(recordId).first() ?: return
        borrowRecordDao.updateRecord(
            record.copy(fine_paid_at = System.currentTimeMillis())
        )
    }

    suspend fun getActiveBorrowByBook(bookId: String): BorrowRecordEntity? =
        borrowRecordDao.getActiveBorrowByBook(bookId)

    // Report data
    suspend fun getReportBorrowingByClass(): List<Pair<String, Int>> {
        val issued = borrowRecordDao.getAllIssued().first()
        val byClass = mutableMapOf<String, Int>()
        for (r in issued) {
            if (r.borrower_type != "student") continue
            val student = studentDao.getStudentById(r.borrower_id).first()
            val cls = student?.current_class ?: "Other"
            byClass[cls] = (byClass[cls] ?: 0) + 1
        }
        return byClass.toList().sortedByDescending { it.second }
    }

    suspend fun getReportMostBorrowed(limit: Int = 10): List<Pair<BookEntity, Int>> {
        val allRecords = borrowRecordDao.getAllRecords()
        val byBook = allRecords.groupBy { it.book_id }.mapValues { it.value.size }
        val sorted = byBook.entries.sortedByDescending { it.value }.take(limit)
        return sorted.mapNotNull { (bookId, count) ->
            val book = bookDao.getBookById(bookId).first() ?: return@mapNotNull null
            book to count
        }
    }

    suspend fun getReportOverdue(): List<OverdueRecord> = getOverdueRecords()

    suspend fun getReportFinesCollected(): Double =
        borrowRecordDao.getTotalFinesCollected()

    suspend fun getActiveBorrowerCount(): Int {
        val issued = borrowRecordDao.getAllIssued().first()
        val studentIds = issued.filter { it.borrower_type == "student" }.map { it.borrower_id }.toSet().size
        val teacherIds = issued.filter { it.borrower_type == "teacher" }.map { it.borrower_id }.toSet().size
        return studentIds + teacherIds
    }
}
