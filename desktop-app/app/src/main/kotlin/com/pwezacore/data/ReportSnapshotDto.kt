package com.pwezacore.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/** One row from exam_results (for snapshot creation). */
@Serializable
internal data class ExamResultRow(
    @SerialName("id") val id: String? = null,
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("exam_set_id") val examSetId: String? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("class_name") val className: String? = null,
    @SerialName("subject") val subject: String? = null,
    @SerialName("marks_obtained") val marksObtained: Double? = null,
    @SerialName("total_marks") val totalMarks: Double? = null,
    @SerialName("grade") val grade: String? = null,
    @SerialName("remarks") val remarks: String? = null,
    @SerialName("teacher_initials") val teacherInitials: String? = null,
    @SerialName("teacher_comment") val teacherComment: String? = null
)

@Serializable
internal data class ProcessedPrimaryRow(
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("exam_set_id") val examSetId: String? = null,
    @SerialName("aggregate") val aggregate: Double? = null,
    @SerialName("division") val division: String? = null,
    @SerialName("class_position") val classPosition: Int? = null,
    @SerialName("exam_set_name") val examSetName: String? = null,
    @SerialName("term") val term: String? = null,
    @SerialName("year") val year: Int? = null
)

@Serializable
internal data class SnapshotRow(
    @SerialName("id") val id: String? = null,
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("term") val term: Int? = null,
    @SerialName("year") val year: Int? = null,
    @SerialName("exam_set_id") val examSetId: String? = null,
    @SerialName("status") val status: String? = null
)

@Serializable
internal data class ReportSnapshotDataInsert(
    @SerialName("id") val id: String? = null,
    @SerialName("snapshot_id") val snapshotId: String,
    @SerialName("student_id") val studentId: String,
    @SerialName("class_name") val className: String,
    @SerialName("subject") val subject: String,
    @SerialName("marks_obtained") val marksObtained: Double? = null,
    @SerialName("total_marks") val totalMarks: Double? = null,
    @SerialName("grade") val grade: String? = null,
    @SerialName("remarks") val remarks: String? = null,
    @SerialName("teacher_initials") val teacherInitials: String? = null,
    @SerialName("teacher_comment") val teacherComment: String? = null,
    @SerialName("class_teacher_comment") val classTeacherComment: String? = null,
    @SerialName("headteacher_comment") val headteacherComment: String? = null,
    @SerialName("attendance_percentage") val attendancePercentage: Double? = null,
    @SerialName("position") val position: Int? = null,
    @SerialName("aggregate") val aggregate: Double? = null,
    @SerialName("average_percentage") val averagePercentage: Double? = null,
    @SerialName("division") val division: String? = null,
    @SerialName("fees_balance") val feesBalance: Double? = null,
    @SerialName("fees_paid") val feesPaid: Double? = null,
    @SerialName("fees_expected") val feesExpected: Double? = null,
    @SerialName("student_photo_url") val studentPhotoUrl: String? = null,
    @SerialName("school_logo_url") val schoolLogoUrl: String? = null,
    @SerialName("exam_set_name") val examSetName: String? = null,
    @SerialName("exam_set_term") val examSetTerm: Int? = null,
    @SerialName("exam_set_year") val examSetYear: Int? = null,
    @SerialName("frozen_data") val frozenData: JsonObject? = null
)

@Serializable
internal data class ReportCommentRow(
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("term") val term: Int? = null,
    @SerialName("year") val year: Int? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("comment_type") val commentType: String? = null,
    @SerialName("comment_text") val commentText: String? = null
)

@Serializable
internal data class ClassTeacherCommentSettingRow(
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("class_name") val className: String? = null,
    @SerialName("min_percent") val minPercent: Int? = null,
    @SerialName("max_percent") val maxPercent: Int? = null,
    @SerialName("comment_text") val commentText: String? = null
)

@Serializable
internal data class StudentAttendanceRow(
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("present") val present: Boolean? = null
)

@Serializable
internal data class StudentPaymentRow(
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("amount_paid") val amountPaid: Double? = null
)

@Serializable
internal data class SnapshotDataRow(
    @SerialName("snapshot_id") val snapshotId: String? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("class_name") val className: String? = null,
    @SerialName("subject") val subject: String? = null,
    @SerialName("marks_obtained") val marksObtained: Double? = null,
    @SerialName("total_marks") val totalMarks: Double? = null,
    @SerialName("grade") val grade: String? = null,
    @SerialName("remarks") val remarks: String? = null,
    @SerialName("teacher_initials") val teacherInitials: String? = null,
    @SerialName("teacher_comment") val teacherComment: String? = null,
    @SerialName("class_teacher_comment") val classTeacherComment: String? = null,
    @SerialName("headteacher_comment") val headteacherComment: String? = null,
    @SerialName("attendance_percentage") val attendancePercentage: Double? = null,
    @SerialName("position") val position: Int? = null,
    @SerialName("aggregate") val aggregate: Double? = null,
    @SerialName("average_percentage") val averagePercentage: Double? = null,
    @SerialName("division") val division: String? = null,
    @SerialName("fees_expected") val feesExpected: Double? = null,
    @SerialName("fees_paid") val feesPaid: Double? = null,
    @SerialName("fees_balance") val feesBalance: Double? = null,
    @SerialName("student_photo_url") val studentPhotoUrl: String? = null,
    @SerialName("school_logo_url") val schoolLogoUrl: String? = null,
    @SerialName("exam_set_name") val examSetName: String? = null,
    @SerialName("frozen_data") val frozenData: JsonObject? = null
)

@Serializable
internal data class SchoolInfoRow(
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("name") val name: String? = null,
    @SerialName("address") val address: String? = null,
    @SerialName("phone") val phone: String? = null,
    @SerialName("email") val email: String? = null,
    @SerialName("motto") val motto: String? = null,
    @SerialName("logo_url") val logoUrl: String? = null
)

@Serializable
internal data class StudentPhotoRow(
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("photo_url") val photoUrl: String? = null
)

/** Payload for report_snapshots update (metadata is JSONB). */
@Serializable
internal data class SnapshotMetadataUpdate(
    @SerialName("student_count") val studentCount: Int,
    @SerialName("class_count") val classCount: Int,
    @SerialName("metadata") val metadata: JsonObject
)

/** Payload for generated_reports insert. */
@Serializable
internal data class GeneratedReportInsert(
    @SerialName("id") val id: String? = null,
    @SerialName("snapshot_id") val snapshotId: String,
    @SerialName("student_id") val studentId: String,
    @SerialName("template_id") val templateId: String? = null,
    @SerialName("report_data") val reportData: JsonObject,
    @SerialName("template_version") val templateVersion: String = "1.0"
)

/** Payload for report_snapshots generation_completed update. */
@Serializable
internal data class SnapshotGenerationCompleteUpdate(
    @SerialName("generation_completed_at") val generationCompletedAt: String,
    @SerialName("generation_duration_seconds") val generationDurationSeconds: Int
)

/** Payload for report_snapshots initial insert. */
@Serializable
internal data class SnapshotInsert(
    @SerialName("school_id") val schoolId: String,
    @SerialName("term") val term: Int,
    @SerialName("year") val year: Int,
    @SerialName("exam_set_id") val examSetId: String,
    @SerialName("status") val status: String = "draft"
)

/** Payload for report_snapshots status update (generation started). */
@Serializable
internal data class SnapshotStatusUpdate(
    @SerialName("status") val status: String,
    @SerialName("generation_started_at") val generationStartedAt: String
)