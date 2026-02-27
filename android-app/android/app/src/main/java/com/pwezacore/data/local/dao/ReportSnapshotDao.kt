package com.pwezacore.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.pwezacore.data.local.entities.ReportSnapshotEntity

@Dao
interface ReportSnapshotDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: ReportSnapshotEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entities: List<ReportSnapshotEntity>)

    @Query("SELECT * FROM report_snapshots WHERE synced = 0")
    suspend fun getUnsynced(): List<ReportSnapshotEntity>

    @Query("SELECT * FROM report_snapshots WHERE id = :id LIMIT 1")
    suspend fun getById(id: String): ReportSnapshotEntity?

    @Query("UPDATE report_snapshots SET synced = 1 WHERE synced = 0")
    suspend fun markAllSynced()
}
