package com.pwezacore.ui.screens.librarian

import com.pwezacore.data.repository.LibraryRepository
import com.pwezacore.data.repository.OverdueRecord
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@HiltViewModel
class LibrarianOverdueViewModel @Inject constructor(
    private val libraryRepository: LibraryRepository
) : androidx.lifecycle.ViewModel() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    suspend fun getOverdueRecords(): List<OverdueRecord> =
        withContext(Dispatchers.IO) { libraryRepository.getOverdueRecords() }

    fun computeFine(record: com.pwezacore.data.local.entities.BorrowRecordEntity): Double =
        libraryRepository.computeFine(record)

    fun markFinePaid(recordId: String, onDone: () -> Unit) {
        scope.launch {
            withContext(Dispatchers.IO) { libraryRepository.markFinePaid(recordId) }
            onDone()
        }
    }

    override fun onCleared() {
        super.onCleared()
        scope.cancel()
    }
}
