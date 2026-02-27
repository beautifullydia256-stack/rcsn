package com.pwezacore.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.pwezacore.data.local.entities.ExamSetEntity

@Dao
interface ExamSetDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(sets: List<ExamSetEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: ExamSetEntity)

    @Query("SELECT * FROM exam_sets WHERE school_id = :schoolId AND deleted_at IS NULL AND is_active = 1 ORDER BY year DESC, term DESC")
    suspend fun getActiveBySchool(schoolId: String): List<ExamSetEntity>

    @Query("SELECT * FROM exam_sets WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ExamSetEntity?
}
