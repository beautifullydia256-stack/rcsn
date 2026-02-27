package com.pwezacore.ui.screens.librarian

import com.pwezacore.data.local.entities.BorrowRecordEntity
import com.pwezacore.data.repository.LibraryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withContext
import javax.inject.Inject

@HiltViewModel
class LibrarianStudentProfileViewModel @Inject constructor(
    private val libraryRepository: LibraryRepository
) : androidx.lifecycle.ViewModel() {

    fun studentName(studentId: String): Flow<String> =
        libraryRepository.getBorrowerName(studentId)

    suspend fun getBorrowHistory(studentId: String): List<BorrowRecordEntity> =
        withContext(Dispatchers.IO) { libraryRepository.getBorrowHistory(studentId).first() }

    suspend fun getCurrentBorrows(studentId: String): List<BorrowRecordEntity> =
        withContext(Dispatchers.IO) { libraryRepository.getCurrentBorrows(studentId).first() }

    suspend fun getOverdueCount(studentId: String): Int {
        val overdue = withContext(Dispatchers.IO) { libraryRepository.getOverdueRecords().filter { it.record.borrower_id == studentId } }
        return overdue.size
    }

    suspend fun getTotalBorrowed(studentId: String): Int =
        withContext(Dispatchers.IO) { libraryRepository.getBorrowHistory(studentId).first().size }

    suspend fun getFinesPending(studentId: String): Double {
        val overdue = withContext(Dispatchers.IO) { libraryRepository.getOverdueRecords().filter { it.record.borrower_id == studentId } }
        return overdue.sumOf { libraryRepository.computeFine(it.record) }
    }
}
