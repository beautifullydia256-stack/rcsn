package com.pwezacore.data

import com.pwezacore.data.DesktopSupabase.postgrest
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object AdminDashboardRepository {

    suspend fun getUserProfile(userId: String): UserProfile? = withContext(Dispatchers.IO) {
        try {
            postgrest.from("users")
                .select {
                    filter { UserProfile::userId eq userId }
                }
                .decodeSingle<UserProfile>()
        } catch (_: Throwable) { null }
    }

    suspend fun getStudentCount(schoolId: String): Long = withContext(Dispatchers.IO) {
        try {
            postgrest.from("students")
                .select {
                    filter {
                        StudentRow::schoolId eq schoolId
                        StudentRow::status eq "active"
                    }
                }
                .decodeList<StudentRow>()
                .size
                .toLong()
        } catch (_: Throwable) { 0L }
    }

    suspend fun getTeacherCount(schoolId: String): Long = withContext(Dispatchers.IO) {
        try {
            postgrest.from("teachers")
                .select {
                    filter { TeacherRow::schoolId eq schoolId }
                }
                .decodeList<TeacherRow>()
                .size
                .toLong()
        } catch (_: Throwable) { 0L }
    }

    suspend fun getFeesCollectedThisTerm(schoolId: String): Double = withContext(Dispatchers.IO) {
        try {
            val today = java.time.LocalDate.now().toString()
            val allTerms = postgrest.from("school_terms")
                .select {
                    filter { SchoolTermRow::schoolId eq schoolId }
                }
                .decodeList<SchoolTermRow>()
                .sortedWith(compareByDescending<SchoolTermRow> { it.year }.thenByDescending { it.term })
            val currentTerm = allTerms.find { t ->
                val start = t.startDate ?: return@find false
                val end = t.endDate ?: return@find false
                start <= today && end >= today
            } ?: allTerms.firstOrNull()
            val startDate = currentTerm?.startDate ?: "1900-01-01"
            val endDate = currentTerm?.endDate ?: "2100-12-31"
            val payments = postgrest.from("student_payments")
                .select {
                    filter { StudentPaymentSumRow::schoolId eq schoolId }
                }
                .decodeList<StudentPaymentSumRow>()
            payments
                .filter { p -> (p.paymentDate ?: "").let { it >= startDate && it <= endDate } }
                .sumOf { it.amountPaid ?: 0.0 }
        } catch (_: Throwable) { 0.0 }
    }

    suspend fun getOutstandingBalances(schoolId: String): Double = withContext(Dispatchers.IO) {
        try {
            val students = postgrest.from("students")
                .select {
                    filter {
                        StudentRow::schoolId eq schoolId
                        StudentRow::status eq "active"
                    }
                }
                .decodeList<StudentRow>()
            if (students.isEmpty()) return@withContext 0.0
            val studentIds = students.mapNotNull { it.studentId }
            val payments = postgrest.from("student_payments")
                .select {
                    filter { PaymentByStudentRow::schoolId eq schoolId }
                }
                .decodeList<PaymentByStudentRow>()
            val paidByStudent = payments
                .filter { it.studentId in studentIds }
                .groupBy { it.studentId!! }
                .mapValues { (_, list) -> list.sumOf { it.amountPaid ?: 0.0 } }
            students.sumOf { s ->
                val expected = s.expectedFeeAmount ?: 0.0
                val paid = paidByStudent[s.studentId] ?: 0.0
                (expected - paid).coerceAtLeast(0.0)
            }
        } catch (_: Throwable) { 0.0 }
    }

    suspend fun getAttendanceTodayCount(schoolId: String): Long = withContext(Dispatchers.IO) {
        try {
            val today = java.time.LocalDate.now().toString()
            postgrest.from("attendance")
                .select {
                    filter {
                        AttendanceRow::schoolId eq schoolId
                        AttendanceRow::timestamp gte today
                    }
                }
                .decodeList<AttendanceRow>()
                .size
                .toLong()
        } catch (_: Throwable) { 0L }
    }

    suspend fun getStudents(schoolId: String): List<StudentRow> = withContext(Dispatchers.IO) {
        try {
            postgrest.from("students")
                .select {
                    filter {
                        StudentRow::schoolId eq schoolId
                        StudentRow::status eq "active"
                    }
                }
                .decodeList<StudentRow>()
        } catch (_: Throwable) { emptyList() }
    }

    suspend fun getParents(schoolId: String): List<ParentRow> = withContext(Dispatchers.IO) {
        try {
            postgrest.from("parents")
                .select {
                    filter { ParentRow::schoolId eq schoolId }
                }
                .decodeList<ParentRow>()
        } catch (_: Throwable) { emptyList() }
    }

    /** Returns map of class_name -> teacher display name for class teacher column. */
    suspend fun getClassTeacherNamesByClass(schoolId: String): Map<String, String> = withContext(Dispatchers.IO) {
        try {
            val classTeachers = postgrest.from("class_teachers")
                .select {
                    filter { ClassTeacherRow::schoolId eq schoolId }
                }
                .decodeList<ClassTeacherRow>()
            val teacherIds = classTeachers.mapNotNull { it.teacherId }.distinct()
            if (teacherIds.isEmpty()) return@withContext emptyMap()
            val teachers = postgrest.from("teachers")
                .select {
                    filter { TeacherRow::schoolId eq schoolId }
                }
                .decodeList<TeacherRow>()
            val nameByTeacherId = teachers.associate { (it.teacherId ?: "") to (it.name ?: "—") }
            classTeachers
                .filter { it.className != null && it.teacherId != null }
                .associate { (it.className!!) to (nameByTeacherId[it.teacherId] ?: "—") }
        } catch (_: Throwable) { emptyMap() }
    }

    suspend fun getTeachers(schoolId: String): List<TeacherRow> = withContext(Dispatchers.IO) {
        try {
            postgrest.from("teachers")
                .select {
                    filter { TeacherRow::schoolId eq schoolId }
                }
                .decodeList<TeacherRow>()
        } catch (_: Throwable) { emptyList() }
    }

    suspend fun getRecentPayments(schoolId: String, limit: Int = 5): List<RecentPaymentRow> = withContext(Dispatchers.IO) {
        try {
            postgrest.from("student_payments")
                .select {
                    filter { RecentPaymentFilter::schoolId eq schoolId }
                }
                .decodeList<RecentPaymentRow>()
                .sortedByDescending { it.paymentDate ?: "" }
                .take(limit)
        } catch (_: Throwable) { emptyList() }
    }

    suspend fun getStaffPreview(schoolId: String, limit: Int = 4): List<StaffPreviewRow> = withContext(Dispatchers.IO) {
        try {
            postgrest.from("teachers")
                .select {
                    filter { StaffPreviewRow::schoolId eq schoolId }
                    limit(limit.toLong())
                }
                .decodeList<StaffPreviewRow>()
        } catch (_: Throwable) { emptyList() }
    }

    /** All staff (teachers) for the school — for Staff screen. */
    suspend fun getStaff(schoolId: String): List<StaffPreviewRow> = withContext(Dispatchers.IO) {
        try {
            postgrest.from("teachers")
                .select {
                    filter { StaffPreviewRow::schoolId eq schoolId }
                }
                .decodeList<StaffPreviewRow>()
        } catch (_: Throwable) { emptyList() }
    }
}
