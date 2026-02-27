package com.pwezacore.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class StudentNameRef(
    @SerialName("name") val name: String? = null
)

@Serializable
data class RecentPaymentRow(
    @SerialName("amount_paid") val amountPaid: Double = 0.0,
    @SerialName("payment_method") val paymentMethod: String? = null,
    @SerialName("payment_date") val paymentDate: String? = null,
    @SerialName("students") val students: StudentNameRef? = null
) {
    val payerName: String get() = students?.name ?: "—"
}

@Serializable
data class StaffPreviewRow(
    @SerialName("name") val name: String,
    @SerialName("classes") val classes: List<String>? = null,
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("current_class") val currentClass: String? = null,
    @SerialName("role_label") val roleLabel: String = "Teaching"
) {
    val displayClass: String get() = currentClass ?: classes?.firstOrNull() ?: "—"
}

@Serializable
data class StudentCountRow(
    @SerialName("count") val count: Long = 0
)

@Serializable
data class TeacherCountRow(
    @SerialName("count") val count: Long = 0
)

@Serializable
data class FeesCollectedRow(
    @SerialName("total") val total: Double? = null
)

@Serializable
data class OutstandingRow(
    @SerialName("total") val total: Double? = null
)

@Serializable
data class AttendanceTodayRow(
    @SerialName("count") val count: Long = 0
)

@Serializable
data class StudentRow(
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("status") val status: String? = null,
    @SerialName("name") val name: String? = null,
    @SerialName("current_class") val currentClass: String? = null,
    @SerialName("expected_fee_amount") val expectedFeeAmount: Double? = null,
    @SerialName("address") val address: String? = null,
    @SerialName("guardian_address") val guardianAddress: String? = null,
    @SerialName("admission_number") val admissionNumber: String? = null
)

@Serializable
data class TeacherRow(
    @SerialName("teacher_id") val teacherId: String? = null,
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("name") val name: String? = null
)

@Serializable
data class SchoolTermRow(
    @SerialName("id") val id: String? = null,
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("is_current") val isCurrent: Boolean? = null,
    @SerialName("year") val year: Int? = null,
    @SerialName("term") val term: Int? = null,
    @SerialName("start_date") val startDate: String? = null,
    @SerialName("end_date") val endDate: String? = null
)

@Serializable
data class StudentPaymentSumRow(
    @SerialName("amount_paid") val amountPaid: Double? = null,
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("term_id") val termId: String? = null,
    @SerialName("payment_date") val paymentDate: String? = null
)

@Serializable
data class StudentBalanceRow(
    @SerialName("balance") val balance: Double? = null,
    @SerialName("school_id") val schoolId: String? = null
)

@Serializable
data class AttendanceRow(
    @SerialName("attendance_id") val attendanceId: String? = null,
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("timestamp") val timestamp: String? = null
)

/** Used only for filter in student_payments query */
@Serializable
data class RecentPaymentFilter(
    @SerialName("school_id") val schoolId: String? = null
)

@Serializable
data class PaymentByStudentRow(
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("amount_paid") val amountPaid: Double? = null,
    @SerialName("school_id") val schoolId: String? = null
)

@Serializable
data class ParentRow(
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("name") val name: String? = null,
    @SerialName("email") val email: String? = null,
    @SerialName("phone") val phone: String? = null
)

@Serializable
data class ClassTeacherRow(
    @SerialName("class_name") val className: String? = null,
    @SerialName("teacher_id") val teacherId: String? = null,
    @SerialName("school_id") val schoolId: String? = null
)
