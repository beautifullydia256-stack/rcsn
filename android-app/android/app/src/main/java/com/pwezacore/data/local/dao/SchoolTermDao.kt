package com.pwezacore.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.pwezacore.data.local.entities.SchoolTermEntity

@Dao
interface SchoolTermDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(terms: List<SchoolTermEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(term: SchoolTermEntity)

    @Query("SELECT * FROM school_terms WHERE school_id = :schoolId AND deleted_at IS NULL ORDER BY year DESC, term DESC")
    suspend fun getBySchool(schoolId: String): List<SchoolTermEntity>

    @Query("SELECT * FROM school_terms WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): SchoolTermEntity?
}
