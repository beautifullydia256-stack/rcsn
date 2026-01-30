package com.pwezacore.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.pwezacore.data.local.entities.StudentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface StudentDao {
    @Query("SELECT * FROM students WHERE student_id = :studentId")
    fun getStudentById(studentId: String): Flow<StudentEntity?>
    
    @Query("SELECT * FROM students WHERE school_id = :schoolId")
    fun getStudentsBySchool(schoolId: String): Flow<List<StudentEntity>>
    
    @Query("SELECT * FROM students WHERE school_id = :schoolId AND current_class = :className")
    fun getStudentsByClass(schoolId: String, className: String): Flow<List<StudentEntity>>
    
    @Query("SELECT * FROM students WHERE school_id = :schoolId AND status = :status")
    fun getStudentsByStatus(schoolId: String, status: String): Flow<List<StudentEntity>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStudent(student: StudentEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStudents(students: List<StudentEntity>)
    
    @Update
    suspend fun updateStudent(student: StudentEntity)
    
    @Query("DELETE FROM students WHERE student_id = :studentId")
    suspend fun deleteStudent(studentId: String)
    
    @Query("SELECT * FROM students WHERE is_synced = 0")
    suspend fun getUnsyncedStudents(): List<StudentEntity>
}




