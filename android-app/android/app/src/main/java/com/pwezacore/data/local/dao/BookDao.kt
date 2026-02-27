package com.pwezacore.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.pwezacore.data.local.entities.BookEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface BookDao {
    @Query("SELECT * FROM books ORDER BY title ASC")
    fun getBooks(): Flow<List<BookEntity>>

    @Query("SELECT * FROM books WHERE book_id = :bookId")
    fun getBookById(bookId: String): Flow<BookEntity?>

    @Query("SELECT * FROM books WHERE title LIKE '%' || :query || '%' OR author LIKE '%' || :query || '%' OR isbn LIKE '%' || :query || '%' ORDER BY title ASC")
    fun searchBooks(query: String): Flow<List<BookEntity>>

    @Query("SELECT * FROM books WHERE category_id = :categoryId ORDER BY title ASC")
    fun getBooksByCategory(categoryId: String): Flow<List<BookEntity>>

    @Query("SELECT * FROM books WHERE barcode = :barcode LIMIT 1")
    suspend fun getBookByBarcode(barcode: String): BookEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertBook(book: BookEntity)

    @Update
    suspend fun updateBook(book: BookEntity)

    @Query("DELETE FROM books WHERE book_id = :bookId")
    suspend fun deleteBook(bookId: String)

    @Query("SELECT COUNT(*) FROM books")
    suspend fun getTotalBooksCount(): Int

    @Query("SELECT COUNT(*) FROM books WHERE created_at >= :since")
    suspend fun getBooksAddedSince(since: Long): Int
}
