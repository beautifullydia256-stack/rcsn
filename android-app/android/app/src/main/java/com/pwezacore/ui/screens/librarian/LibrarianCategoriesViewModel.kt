package com.pwezacore.ui.screens.librarian

import androidx.lifecycle.viewModelScope
import com.pwezacore.data.local.entities.CategoryEntity
import com.pwezacore.data.repository.LibraryRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.Dispatchers
import javax.inject.Inject

@HiltViewModel
class LibrarianCategoriesViewModel @Inject constructor(
    private val libraryRepository: LibraryRepository
) : androidx.lifecycle.ViewModel() {

    val categories: Flow<List<CategoryEntity>> = libraryRepository.getCategories()

    fun addCategory(category: CategoryEntity) {
        viewModelScope.launch {
            withContext(Dispatchers.IO) { libraryRepository.addCategory(category) }
        }
    }
}
