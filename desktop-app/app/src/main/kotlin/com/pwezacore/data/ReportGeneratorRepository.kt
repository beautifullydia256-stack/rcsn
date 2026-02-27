package com.pwezacore.data

import com.pwezacore.data.DesktopSupabase.postgrest
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.rpc
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

object ReportGeneratorRepository {

    /** Load all data needed for the report generator form in parallel (fast on native). */
    suspend fun getReportGeneratorPageData(schoolId: String): ReportGeneratorPageData? = withContext(Dispatchers.IO) {
        try {
            coroutineScope {
                val termsDeferred = async {
                    postgrest.from("school_terms")
                        .select { filter { SchoolTermRow::schoolId eq schoolId } }
                        .decodeList<SchoolTermRow>()
                }
                val setsDeferred = async {
                    postgrest.from("exam_sets")
                        .select { filter { ExamSetRow::schoolId eq schoolId } }
                        .decodeList<ExamSetRow>()
                }
                val classesDeferred = async { getClassesForSchool(schoolId) }

                val terms = termsDeferred.await().sortedWith(compareByDescending<SchoolTermRow> { it.year }.thenByDescending { it.term })
                val examSets = setsDeferred.await().filter { it.isActive != false }
                    .sortedWith(compareByDescending<ExamSetRow> { it.year ?: 0 }.thenByDescending { it.term ?: 0 })
                val classes = classesDeferred.await()

                val today = java.time.LocalDate.now().toString()
                val currentTermRow = terms.find { t ->
                    val start = t.startDate ?: return@find false
                    val end = t.endDate ?: return@find false
                    start <= today && end >= today
                } ?: terms.firstOrNull()

                val currentTerm = if (currentTermRow != null)
                    ReportTermOption(currentTermRow.term ?: 1, currentTermRow.year ?: java.time.Year.now().value)
                else
                    ReportTermOption(1, java.time.Year.now().value)

                val termSet = mutableSetOf<ReportTermOption>()
                terms.forEach { t -> if (t.term != null && t.year != null) termSet.add(ReportTermOption(t.term, t.year)) }
                examSets.forEach { es -> if (es.term != null && es.year != null) termSet.add(ReportTermOption(es.term, es.year)) }
                val allTerms = termSet
                    .filter { it.year < currentTerm.year || (it.year == currentTerm.year && it.term <= currentTerm.term) }
                    .sortedWith(compareByDescending<ReportTermOption> { it.year }.thenByDescending { it.term })
                val allTermsList = if (allTerms.isEmpty()) listOf(currentTerm) else allTerms

                ReportGeneratorPageData(
                    schoolId = schoolId,
                    currentTerm = currentTerm,
                    allTerms = allTermsList,
                    classes = classes,
                    examSets = examSets
                )
            }
        } catch (_: Throwable) { null }
    }

    private suspend fun getClassesForSchool(schoolId: String): List<String> = withContext(Dispatchers.IO) {
        try {
            val rows = postgrest.from("classes")
                .select { filter { ClassNameRow::schoolId eq schoolId } }
                .decodeList<ClassNameRow>()
            val list = rows.mapNotNull { it.className }.distinct().sorted()
            if (list.isNotEmpty()) return@withContext list
            val students = postgrest.from("students")
                .select { filter { StudentRow::schoolId eq schoolId } }
                .decodeList<StudentRow>()
            students.mapNotNull { it.currentClass }.distinct().sorted()
        } catch (_: Throwable) { emptyList() }
    }

    /** Classes that have at least one exam result for this exam set. */
    suspend fun getClassesForExamSet(schoolId: String, examSetId: String): List<String> = withContext(Dispatchers.IO) {
        try {
            val rows = postgrest.from("exam_results")
                .select { filter { ExamResultClassRow::schoolId eq schoolId; ExamResultClassRow::examSetId eq examSetId } }
                .decodeList<ExamResultClassRow>()
            rows.mapNotNull { it.className }.distinct().sorted()
        } catch (_: Throwable) { emptyList() }
    }

    /** Students with results for this exam set and class (uses RPC so graduated students included). */
    suspend fun getStudentsForReport(schoolId: String, examSetId: String, className: String): List<ReportStudentRow> = withContext(Dispatchers.IO) {
        try {
            postgrest.rpc(
                "get_report_students_for_class",
                mapOf(
                    "p_school_id" to schoolId,
                    "p_exam_set_id" to examSetId,
                    "p_class_name" to className
                )
            ).decodeList<ReportStudentRow>()
        } catch (_: Throwable) { emptyList() }
    }

    /** Fallback: students in class (when no exam set selected yet). */
    suspend fun getStudentsInClass(schoolId: String, className: String): List<ReportStudentRow> = withContext(Dispatchers.IO) {
        try {
            val rows = postgrest.from("students")
                .select {
                    filter {
                        StudentRow::schoolId eq schoolId
                        StudentRow::currentClass eq className
                    }
                }
                .decodeList<StudentRow>()
            rows.map { s ->
                ReportStudentRow(
                    studentId = s.studentId,
                    name = s.name,
                    admissionNumber = s.admissionNumber,
                    currentClass = s.currentClass
                )
            }.sortedBy { it.name?.lowercase() }
        } catch (_: Throwable) { emptyList() }
    }

    /** Fetch generated reports for a snapshot (for preview). */
    suspend fun getGeneratedReports(snapshotId: String): List<GeneratedReportRow> = withContext(Dispatchers.IO) {
        try {
            postgrest.from("generated_reports")
                .select {
                    filter { GeneratedReportRow::snapshotId eq snapshotId }
                }
                .decodeList<GeneratedReportRow>()
        } catch (_: Throwable) { emptyList() }
    }

    /**
     * Create a locked snapshot and generate reports (single student or class).
     * Returns [ReportGenerateResult] with snapshotId on success or error message on failure.
     */
    suspend fun createSnapshotAndGenerate(
        schoolId: String,
        examSetId: String,
        term: Int,
        year: Int,
        studentIds: List<String>?,
        classNames: List<String>?
    ): ReportGenerateResult = withContext(Dispatchers.IO) {
        try {
            ReportSnapshotService.createSnapshotAndGenerate(schoolId, examSetId, term, year, studentIds, classNames)
        } catch (e: Throwable) {
            ReportGenerateResult(null, e.message ?: "Report generation failed.")
        }
    }
}

@Serializable
private data class ClassNameRow(
    @SerialName("class_name") val className: String? = null,
    @SerialName("school_id") val schoolId: String? = null
)

@Serializable
private data class ExamResultClassRow(
    @SerialName("class_name") val className: String? = null,
    @SerialName("school_id") val schoolId: String? = null,
    @SerialName("exam_set_id") val examSetId: String? = null
)
