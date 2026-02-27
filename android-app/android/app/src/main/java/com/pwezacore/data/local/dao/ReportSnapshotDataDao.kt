package com.pwezacore.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.pwezacore.data.local.entities.ReportSnapshotDataEntity

@Dao
interface ReportSnapshotDataDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: ReportSnapshotDataEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(entities: List<ReportSnapshotDataEntity>)

    @Query("SELECT * FROM report_snapshot_data WHERE synced = 0")
    suspend fun getUnsynced(): List<ReportSnapshotDataEntity>

    @Query("SELECT * FROM report_snapshot_data WHERE snapshot_id = :snapshotId")
    suspend fun getBySnapshotId(snapshotId: String): List<ReportSnapshotDataEntity>

    @Query("UPDATE report_snapshot_data SET synced = 1 WHERE synced = 0")
    suspend fun markAllSynced()
}
