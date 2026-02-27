package com.pwezacore.data.local

import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import android.content.Context
import com.pwezacore.data.local.dao.PaymentDao
import com.pwezacore.data.local.dao.SchoolDao
import com.pwezacore.data.local.dao.SchoolTermDao
import com.pwezacore.data.local.dao.StudentDao
import com.pwezacore.data.local.dao.UserDao
import com.pwezacore.data.local.dao.BookDao
import com.pwezacore.data.local.dao.BorrowRecordDao
import com.pwezacore.data.local.dao.CategoryDao
import com.pwezacore.data.local.dao.ExamSetDao
import com.pwezacore.data.local.dao.GeneratedReportDao
import com.pwezacore.data.local.dao.ReportSnapshotDao
import com.pwezacore.data.local.dao.ReportSnapshotDataDao
import com.pwezacore.data.local.entities.ExamEntity
import com.pwezacore.data.local.entities.PaymentEntity
import com.pwezacore.data.local.entities.SchoolEntity
import com.pwezacore.data.local.entities.SchoolTermEntity
import com.pwezacore.data.local.entities.ExamSetEntity
import com.pwezacore.data.local.entities.StudentEntity
import com.pwezacore.data.local.entities.UserEntity
import com.pwezacore.data.local.entities.BookEntity
import com.pwezacore.data.local.entities.BorrowRecordEntity
import com.pwezacore.data.local.entities.CategoryEntity
import com.pwezacore.data.local.entities.GeneratedReportEntity
import com.pwezacore.data.local.entities.ReportSnapshotDataEntity
import com.pwezacore.data.local.entities.ReportSnapshotEntity

@Database(
    entities = [
        UserEntity::class,
        StudentEntity::class,
        PaymentEntity::class,
        ExamEntity::class,
        SchoolEntity::class,
        SchoolTermEntity::class,
        ExamSetEntity::class,
        BookEntity::class,
        BorrowRecordEntity::class,
        CategoryEntity::class,
        ReportSnapshotEntity::class,
        ReportSnapshotDataEntity::class,
        GeneratedReportEntity::class
    ],
    version = 4,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class PwezaCoreDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun studentDao(): StudentDao
    abstract fun paymentDao(): PaymentDao
    abstract fun schoolDao(): SchoolDao
    abstract fun schoolTermDao(): SchoolTermDao
    abstract fun examSetDao(): ExamSetDao
    abstract fun bookDao(): BookDao
    abstract fun borrowRecordDao(): BorrowRecordDao
    abstract fun categoryDao(): CategoryDao
    abstract fun reportSnapshotDao(): ReportSnapshotDao
    abstract fun reportSnapshotDataDao(): ReportSnapshotDataDao
    abstract fun generatedReportDao(): GeneratedReportDao
    
    companion object {
        @Volatile
        private var INSTANCE: PwezaCoreDatabase? = null
        
        fun getDatabase(context: Context): PwezaCoreDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    PwezaCoreDatabase::class.java,
                    "pwezacore_database"
                )
                    .fallbackToDestructiveMigration(dropAllTables = true)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}




