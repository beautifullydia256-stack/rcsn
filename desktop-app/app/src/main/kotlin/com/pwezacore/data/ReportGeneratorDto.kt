package com.pwezacore.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/** Term option for report generator (school_terms or derived from exam_sets). */
@Serializable
data class ReportTermOption(
    @SerialName("term") val term: Int,
    @SerialName("year") val year: Int
) {
    val key: String get() = "$term-$year"
}

@Serializable
data class ExamSetRow(
    @SerialName("id") val id: String? = null,
    @SerialName("name") val name: String? = null,
    @SerialName("term") val term: Int? = null,
    @SerialName("year") val year: Int? = null,
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("is_active") val isActive: Boolean? = null
)

@Serializable
data class ReportStudentRow(
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("name") val name: String? = null,
    @SerialName("admission_number") val admissionNumber: String? = null,
    @SerialName("current_class") val currentClass: String? = null
)

@Serializable
data class ReportGeneratorPageData(
    val schoolId: String,
    val currentTerm: ReportTermOption,
    val allTerms: List<ReportTermOption>,
    val classes: List<String>,
    val examSets: List<ExamSetRow>
)

@Serializable
data class GeneratedReportRow(
    @SerialName("id") val id: String? = null,
    @SerialName("snapshot_id") val snapshotId: String? = null,
    @SerialName("student_id") val studentId: String? = null,
    @SerialName("report_data") val reportData: JsonObject? = null
)

/** Result of createSnapshotAndGenerate: snapshotId on success, error message on failure. */
data class ReportGenerateResult(
    val snapshotId: String?,
    val error: String?
) {
    val isSuccess: Boolean get() = snapshotId != null && error == null
}
