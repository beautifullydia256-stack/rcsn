package com.pwezacore.data.local

import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import android.content.Context
import com.pwezacore.data.local.dao.PaymentDao
import com.pwezacore.data.local.dao.StudentDao
import com.pwezacore.data.local.dao.UserDao
import com.pwezacore.data.local.entities.ExamEntity
import com.pwezacore.data.local.entities.PaymentEntity
import com.pwezacore.data.local.entities.StudentEntity
import com.pwezacore.data.local.entities.UserEntity

@Database(
    entities = [
        UserEntity::class,
        StudentEntity::class,
        PaymentEntity::class,
        ExamEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class PwezaCoreDatabase : RoomDatabase() {
    abstract fun userDao(): UserDao
    abstract fun studentDao(): StudentDao
    abstract fun paymentDao(): PaymentDao
    
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
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}




