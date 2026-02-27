package com.pwezacore.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.pwezacore.data.local.entities.GeneratedReportEntity

@Dao
interface GeneratedReportDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: GeneratedReportEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entities: List<GeneratedReportEntity>)

    @Query("SELECT * FROM generated_reports WHERE synced = 0")
    suspend fun getUnsynced(): List<GeneratedReportEntity>

    @Query("SELECT * FROM generated_reports WHERE snapshot_id = :snapshotId")
    suspend fun getBySnapshotId(snapshotId: String): List<GeneratedReportEntity>

    @Query("UPDATE generated_reports SET synced = 1 WHERE synced = 0")
    suspend fun markAllSynced()
}
