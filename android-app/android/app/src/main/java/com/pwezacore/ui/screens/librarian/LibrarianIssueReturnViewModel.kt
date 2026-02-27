package com.pwezacore.ui.screens.librarian

import androidx.lifecycle.viewModelScope
import com.pwezacore.data.repository.LibraryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@HiltViewModel
class LibrarianIssueReturnViewModel @Inject constructor(
    private val libraryRepository: LibraryRepository
) : androidx.lifecycle.ViewModel() {

    fun issueBook(
        borrowerQuery: String,
        bookQuery: String,
        returnDateStr: String,
        onResult: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    if (borrowerQuery.isBlank()) { withContext(Dispatchers.Main) { onError("Enter borrower") }; return@withContext }
                    if (bookQuery.isBlank()) { withContext(Dispatchers.Main) { onError("Enter book") }; return@withContext }
                    val returnDate = parseDate(returnDateStr)
                    if (returnDate == null || returnDate < System.currentTimeMillis()) {
                        withContext(Dispatchers.Main) { onError("Invalid return date") }; return@withContext
                    }
                    val books = libraryRepository.getBooksFiltered(bookQuery).first()
                    val book = books.firstOrNull() ?: run { withContext(Dispatchers.Main) { onError("Book not found") }; return@withContext }
                    if (book.available_quantity < 1) { withContext(Dispatchers.Main) { onError("No copies available") }; return@withContext }
                    val borrowerId = borrowerQuery.trim()
                    val borrowerType = "student"
                    val count = libraryRepository.getCurrentBorrowCount(borrowerId)
                    if (count >= LibraryRepository.MAX_BORROW_LIMIT) {
                        withContext(Dispatchers.Main) { onError("Borrower has reached limit (${LibraryRepository.MAX_BORROW_LIMIT})") }; return@withContext
                    }
                    if (libraryRepository.hasOverdue(borrowerId)) {
                        withContext(Dispatchers.Main) { onError("Borrower has overdue items") }; return@withContext
                    }
                    libraryRepository.issueBook(book.book_id, borrowerId, borrowerType, returnDate)
                }
                onResult("")
            } catch (e: Exception) {
                onError(e.message ?: "Error")
            }
        }
    }

    fun returnBook(
        barcodeOrBookQuery: String,
        onResult: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    if (barcodeOrBookQuery.isBlank()) { withContext(Dispatchers.Main) { onError("Enter book or barcode") }; return@withContext }
                    val books = libraryRepository.getBooksFiltered(barcodeOrBookQuery).first()
                    val book = books.firstOrNull() ?: run { withContext(Dispatchers.Main) { onError("Book not found") }; return@withContext }
                    val record = libraryRepository.getActiveBorrowByBook(book.book_id)
                        ?: run { withContext(Dispatchers.Main) { onError("No active borrow for this book") }; return@withContext }
                    val fine = libraryRepository.computeFine(record)
                    libraryRepository.returnBook(record.record_id, fine)
                    withContext(Dispatchers.Main) { onResult("Returned. Fine: UGX %.0f".format(fine)) }
                }
            } catch (e: Exception) {
                onError(e.message ?: "Error")
            }
        }
    }

    private fun parseDate(s: String): Long? {
        return try {
            val parts = s.trim().split("-")
            if (parts.size != 3) return null
            val y = parts[0].toInt()
            val m = parts[1].toInt() - 1
            val d = parts[2].toInt()
            java.util.Calendar.getInstance().apply { set(y, m, d, 23, 59, 59); set(java.util.Calendar.MILLISECOND, 999) }.timeInMillis
        } catch (_: Exception) { null }
    }
}
