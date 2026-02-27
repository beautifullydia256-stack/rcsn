package com.pwezacore.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.pwezacore.data.local.entities.SchoolEntity

@Dao
interface SchoolDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(schools: List<SchoolEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(school: SchoolEntity)

    @Query("SELECT * FROM schools WHERE school_id = :schoolId LIMIT 1")
    suspend fun getById(schoolId: String): SchoolEntity?

    @Query("SELECT * FROM schools WHERE deleted_at IS NULL")
    suspend fun getAll(): List<SchoolEntity>
}
