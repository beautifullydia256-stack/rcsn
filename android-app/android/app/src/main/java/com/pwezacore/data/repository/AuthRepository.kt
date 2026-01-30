package com.pwezacore.data.repository

import com.pwezacore.data.local.dao.UserDao
import com.pwezacore.data.local.entities.UserEntity
import com.pwezacore.data.remote.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
    private val userDao: UserDao
) {
    suspend fun signIn(email: String, password: String): Result<UserEntity> {
        return try {
            // Sign in with Supabase Auth
            val authResult = supabaseClient.auth.signInWith(io.github.jan.supabase.auth.providers.builtin.Email) {
                this.email = email
                this.password = password
            }
            
            val userId = authResult.user?.id ?: return Result.failure(Exception("User ID not found"))
            
            // Fetch user data from database
            val userData = supabaseClient.postgrest.from("users")
                .select {
                    filter {
                        eq("user_id", userId)
                    }
                }
                .decodeSingle<UserEntity>()
            
            // Cache in local database
            userDao.insertUser(userData)
            
            Result.success(userData)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun signOut() {
        try {
            supabaseClient.auth.signOut()
        } catch (e: Exception) {
            // Handle error
        }
    }
    
    suspend fun getCurrentUser(): UserEntity? {
        return try {
            val session = supabaseClient.auth.currentSessionOrNull()
            session?.user?.id?.let { userId ->
                userDao.getUserById(userId).first()
            }
        } catch (e: Exception) {
            null
        }
    }
    
    fun getCurrentUserFlow(): Flow<UserEntity?> {
        return try {
            val session = supabaseClient.auth.currentSessionOrNull()
            session?.user?.id?.let { userId ->
                userDao.getUserById(userId)
            } ?: flow { emit(null) }
        } catch (e: Exception) {
            flow { emit(null) }
        }
    }
}

