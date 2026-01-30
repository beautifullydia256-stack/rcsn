package com.pwezacore.data.repository

import com.pwezacore.data.local.dao.StudentDao
import com.pwezacore.data.local.entities.StudentEntity
import com.pwezacore.data.remote.SupabaseClient
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StudentRepository @Inject constructor(
    private val supabaseClient: SupabaseClient,
    private val studentDao: StudentDao
) {
    fun getStudentsBySchool(schoolId: String): Flow<List<StudentEntity>> {
        return studentDao.getStudentsBySchool(schoolId)
    }
    
    fun getStudentById(studentId: String): Flow<StudentEntity?> {
        return studentDao.getStudentById(studentId)
    }
    
    fun getStudentsByClass(schoolId: String, className: String): Flow<List<StudentEntity>> {
        return studentDao.getStudentsByClass(schoolId, className)
    }
    
    suspend fun syncStudents(schoolId: String) {
        try {
            val students = supabaseClient.postgrest.from("students")
                .select {
                    filter {
                        eq("school_id", schoolId)
                    }
                }
                .decodeList<StudentEntity>()
            
            studentDao.insertStudents(students)
        } catch (e: Exception) {
            // Handle error
        }
    }
    
    suspend fun insertStudent(student: StudentEntity) {
        studentDao.insertStudent(student)
        // TODO: Sync to remote
    }
    
    suspend fun updateStudent(student: StudentEntity) {
        studentDao.updateStudent(student)
        // TODO: Sync to remote
    }
    
    suspend fun deleteStudent(studentId: String) {
        studentDao.deleteStudent(studentId)
        // TODO: Sync to remote
    }
}




