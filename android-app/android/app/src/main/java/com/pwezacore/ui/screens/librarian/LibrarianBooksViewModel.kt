package com.pwezacore.ui.screens.librarian

import com.pwezacore.data.local.entities.BookEntity
import com.pwezacore.data.repository.LibraryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import javax.inject.Inject

@OptIn(ExperimentalCoroutinesApi::class)
@HiltViewModel
class LibrarianBooksViewModel @Inject constructor(
    private val libraryRepository: LibraryRepository
) : androidx.lifecycle.ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: Flow<String> = _searchQuery.asStateFlow()

    val books: Flow<List<BookEntity>> = _searchQuery.flatMapLatest { query ->
        libraryRepository.getBooksFiltered(query)
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }
}
