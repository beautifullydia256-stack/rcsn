package com.pwezacore.di

import android.content.Context
import androidx.room.Room
import com.pwezacore.data.local.PwezaCoreDatabase
import com.pwezacore.data.local.dao.PaymentDao
import com.pwezacore.data.local.dao.StudentDao
import com.pwezacore.data.local.dao.UserDao
import com.pwezacore.data.remote.SupabaseClient
import com.pwezacore.data.repository.AuthRepository
import com.pwezacore.data.repository.PaymentRepository
import com.pwezacore.data.repository.StudentRepository
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
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
        return Room.databaseBuilder(
            context,
            PwezaCoreDatabase::class.java,
            "pwezacore_database"
        )
            .fallbackToDestructiveMigration()
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
}




