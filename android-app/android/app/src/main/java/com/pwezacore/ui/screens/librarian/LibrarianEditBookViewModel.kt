package com.pwezacore.ui.screens.librarian

import androidx.lifecycle.viewModelScope
import com.pwezacore.data.local.entities.BookEntity
import com.pwezacore.data.local.entities.CategoryEntity
import com.pwezacore.data.repository.LibraryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@HiltViewModel
class LibrarianEditBookViewModel @Inject constructor(
    private val libraryRepository: LibraryRepository
) : androidx.lifecycle.ViewModel() {

    fun getBook(bookId: String): Flow<BookEntity?> = libraryRepository.getBookById(bookId)
    val categories: Flow<List<CategoryEntity>> = libraryRepository.getCategories()

    fun updateBook(book: BookEntity, onDone: () -> Unit) {
        viewModelScope.launch {
            withContext(Dispatchers.IO) {
                libraryRepository.updateBook(book)
            }
            onDone()
        }
    }

    fun updateQuantity(bookId: String, quantity: Int, onDone: () -> Unit) {
        viewModelScope.launch {
            val book = withContext(Dispatchers.IO) { libraryRepository.getBookById(bookId).first() } ?: return@launch
            val currentAvailable = book.available_quantity
            val diff = quantity - book.quantity
            withContext(Dispatchers.IO) {
                libraryRepository.updateBook(
                    book.copy(
                        quantity = quantity,
                        available_quantity = (currentAvailable + diff).coerceIn(0, quantity)
                    )
                )
            }
            onDone()
        }
    }

    fun markLost(bookId: String, onDone: () -> Unit) {
        viewModelScope.launch {
            val book = withContext(Dispatchers.IO) { libraryRepository.getBookById(bookId).first() } ?: return@launch
            withContext(Dispatchers.IO) { libraryRepository.updateBook(book.copy(lost = true)) }
            onDone()
        }
    }

    fun markDamaged(bookId: String, onDone: () -> Unit) {
        viewModelScope.launch {
            val book = withContext(Dispatchers.IO) { libraryRepository.getBookById(bookId).first() } ?: return@launch
            withContext(Dispatchers.IO) { libraryRepository.updateBook(book.copy(damaged = true, condition = "Damaged")) }
            onDone()
        }
    }
}
