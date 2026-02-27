package com.pwezacore.di

import android.content.Context
import androidx.room.Room
import com.pwezacore.data.local.DatabaseKeyProvider
import com.pwezacore.data.local.PwezaCoreDatabase
import com.pwezacore.data.local.dao.BookDao
import com.pwezacore.data.local.dao.BorrowRecordDao
import com.pwezacore.data.local.dao.CategoryDao
import com.pwezacore.data.local.dao.ExamSetDao
import com.pwezacore.data.local.dao.GeneratedReportDao
import com.pwezacore.data.local.dao.ReportSnapshotDao
import com.pwezacore.data.local.dao.ReportSnapshotDataDao
import com.pwezacore.data.local.dao.PaymentDao
import com.pwezacore.data.local.dao.SchoolDao
import com.pwezacore.data.local.dao.SchoolTermDao
import com.pwezacore.data.local.dao.StudentDao
import com.pwezacore.data.local.dao.UserDao
import com.pwezacore.data.remote.SupabaseClient
import com.pwezacore.data.repository.AuthRepository
import com.pwezacore.data.repository.LibraryRepository
import com.pwezacore.data.repository.PaymentRepository
import com.pwezacore.data.repository.ReportRepository
import com.pwezacore.data.repository.StudentRepository
import com.pwezacore.data.sync.SyncManager
import com.pwezacore.data.sync.SyncStateStorage
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import net.sqlcipher.database.SupportFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    
    @Provides
    @Singleton
    fun provideSupabaseClient(): SupabaseClient {
        return SupabaseClient()
    }
    
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): PwezaCoreDatabase {
        val passphrase = DatabaseKeyProvider.getOrCreatePassphrase(context)
        val factory = SupportFactory(passphrase)
        return Room.databaseBuilder(
            context,
            PwezaCoreDatabase::class.java,
            "pwezacore_database"
        )
            .openHelperFactory(factory)
            .fallbackToDestructiveMigration(dropAllTables = true)
            .build()
    }
    
    @Provides
    fun provideUserDao(database: PwezaCoreDatabase): UserDao {
        return database.userDao()
    }
    
    @Provides
    fun provideStudentDao(database: PwezaCoreDatabase): StudentDao {
        return database.studentDao()
    }
    
    @Provides
    fun providePaymentDao(database: PwezaCoreDatabase): PaymentDao {
        return database.paymentDao()
    }

    @Provides
    fun provideBookDao(database: PwezaCoreDatabase): BookDao {
        return database.bookDao()
    }

    @Provides
    fun provideBorrowRecordDao(database: PwezaCoreDatabase): BorrowRecordDao {
        return database.borrowRecordDao()
    }

    @Provides
    fun provideCategoryDao(database: PwezaCoreDatabase): CategoryDao {
        return database.categoryDao()
    }

    @Provides
    fun provideSchoolDao(database: PwezaCoreDatabase): SchoolDao {
        return database.schoolDao()
    }

    @Provides
    fun provideSchoolTermDao(database: PwezaCoreDatabase): SchoolTermDao {
        return database.schoolTermDao()
    }

    @Provides
    fun provideExamSetDao(database: PwezaCoreDatabase): ExamSetDao {
        return database.examSetDao()
    }

    @Provides
    fun provideReportSnapshotDao(database: PwezaCoreDatabase): ReportSnapshotDao {
        return database.reportSnapshotDao()
    }

    @Provides
    fun provideReportSnapshotDataDao(database: PwezaCoreDatabase): ReportSnapshotDataDao {
        return database.reportSnapshotDataDao()
    }

    @Provides
    fun provideGeneratedReportDao(database: PwezaCoreDatabase): GeneratedReportDao {
        return database.generatedReportDao()
    }
    
    @Provides
    @Singleton
    fun provideAuthRepository(
        supabaseClient: SupabaseClient,
        userDao: UserDao
    ): AuthRepository {
        return AuthRepository(supabaseClient, userDao)
    }
    
    @Provides
    @Singleton
    fun provideStudentRepository(
        supabaseClient: SupabaseClient,
        studentDao: StudentDao
    ): StudentRepository {
        return StudentRepository(supabaseClient, studentDao)
    }
    
    @Provides
    @Singleton
    fun providePaymentRepository(
        supabaseClient: SupabaseClient,
        paymentDao: PaymentDao
    ): PaymentRepository {
        return PaymentRepository(supabaseClient, paymentDao)
    }

    @Provides
    @Singleton
    fun provideReportRepository(
        supabaseClient: SupabaseClient,
        authRepository: AuthRepository
    ): ReportRepository {
        return ReportRepository(supabaseClient, authRepository)
    }

    @Provides
    @Singleton
    fun provideLibraryRepository(
        bookDao: BookDao,
        borrowRecordDao: BorrowRecordDao,
        categoryDao: CategoryDao,
        studentDao: StudentDao
    ): LibraryRepository {
        return LibraryRepository(bookDao, borrowRecordDao, categoryDao, studentDao)
    }

    @Provides
    @Singleton
    fun provideSyncStateStorage(@ApplicationContext context: Context): SyncStateStorage {
        return SyncStateStorage(context)
    }

    @Provides
    @Singleton
    fun provideSyncManager(
        supabaseClient: SupabaseClient,
        syncStateStorage: SyncStateStorage
    ): SyncManager {
        return SyncManager(supabaseClient, syncStateStorage)
    }
}




