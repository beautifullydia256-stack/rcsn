package com.pwezacore.ui.screens.librarian

import com.pwezacore.data.repository.LibraryRepository
import com.pwezacore.data.repository.TodaysActivity
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class LibrarianDashboardViewModel @Inject constructor(
    private val libraryRepository: LibraryRepository
) : androidx.lifecycle.ViewModel() {

    suspend fun getDashboardCounts(): Pair<Int, Int> = libraryRepository.getDashboardCounts()
    suspend fun getOverdueCount(): Int = libraryRepository.getOverdueCount()
    suspend fun getActiveBorrowerCount(): Int = libraryRepository.getActiveBorrowerCount()
    suspend fun getBooksAddedThisMonth(): Int = libraryRepository.getBooksAddedThisMonth()
    suspend fun getTodaysActivity(): TodaysActivity = libraryRepository.getTodaysActivity()
}
