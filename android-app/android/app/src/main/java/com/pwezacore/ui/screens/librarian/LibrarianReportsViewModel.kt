package com.pwezacore.ui.screens.librarian

import com.pwezacore.data.repository.LibraryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject

@HiltViewModel
class LibrarianReportsViewModel @Inject constructor(
    private val libraryRepository: LibraryRepository
) : androidx.lifecycle.ViewModel() {

    suspend fun loadReport(type: String): String = withContext(Dispatchers.IO) {
        when (type) {
            "by_class" -> {
                val data = libraryRepository.getReportBorrowingByClass()
                if (data.isEmpty()) "No data" else data.joinToString("\n") { "${it.first}: ${it.second}" }
            }
            "most_borrowed" -> {
                val data = libraryRepository.getReportMostBorrowed(10)
                if (data.isEmpty()) "No data" else data.joinToString("\n") { "${it.first.title}: ${it.second}" }
            }
            "overdue" -> {
                val data = libraryRepository.getReportOverdue()
                if (data.isEmpty()) "No overdue items" else data.joinToString("\n") { "${it.borrowerName} - ${it.bookTitle} (${it.daysOverdue} days)" }
            }
            "fines" -> "Total fines collected: UGX %.0f".format(libraryRepository.getReportFinesCollected())
            else -> "Unknown report"
        }
    }
}
