package com.pwezacore.report

/**
 * Input DTOs for building report data. Callers map from local DB or API to these.
 */
data class ExamResultInput(
    val studentId: String,
    val className: String,
    val subject: String,
    val marksObtained: Double,
    val totalMarks: Double,
    val grade: String? = null,
    val remarks: String? = null,
    val teacherInitials: String? = null,
    val teacherComment: String? = null,
    val examSetId: String? = null
)

data class ProcessedResultInput(
    val studentId: String,
    val aggregate: Double?,
    val division: String?,
    val classPosition: Int?
)

data class AttendanceInput(
    val studentId: String,
    val present: Boolean,
    val date: String
)

data class FeesInput(
    val studentId: String,
    val expectedAmount: Double,
    val paidAmount: Double
)

data class CommentInput(
    val studentId: String,
    val classTeacherComment: String?,
    val headteacherComment: String?
)

data class StudentBasicInput(
    val studentId: String,
    val name: String,
    val currentClass: String,
    val admissionNumber: String? = null
)

/** Single subject line for report. */
data class SubjectResultLine(
    val subject: String,
    val marksObtained: Double,
    val totalMarks: Double,
    val grade: String,
    val remarks: String,
    val teacherInitials: String?,
    val teacherComment: String?
)

/** Per-student report data ready for template/PDF. */
data class StudentReportData(
    val studentId: String,
    val name: String,
    val currentClass: String,
    val admissionNumber: String?,
    val subjectResults: List<SubjectResultLine>,
    val averagePercentage: Double,
    val aggregate: Double,
    val division: String,
    val classPosition: Int,
    val attendancePercentage: Int?,
    val feesExpected: Double,
    val feesPaid: Double,
    val feesBalance: Double,
    val classTeacherComment: String?,
    val headteacherComment: String?
)

/**
 * Division from average per REPORT_CALCULATION_SPECIFICATION.md §3.
 */
object DivisionCalculator {
    fun calculateDivision(average: Double): String = when {
        average >= 80 -> "Division 1"
        average >= 60 -> "Division 2"
        average >= 40 -> "Division 3"
        average >= 20 -> "Division 4"
        else -> "Ungraded"
    }
}

/**
 * Builds [StudentReportData] from raw inputs. Uses [GradeCalculator], [AggregateCalculator],
 * [PositionCalculator] per REPORT_CALCULATION_SPECIFICATION.md.
 */
object ReportDataBuilder {

    fun build(
        examResults: List<ExamResultInput>,
        processedByStudent: Map<String, ProcessedResultInput>,
        attendanceByStudent: Map<String, List<AttendanceInput>>,
        feesByStudent: Map<String, FeesInput>,
        commentsByStudent: Map<String, CommentInput>,
        students: List<StudentBasicInput>
    ): List<StudentReportData> {
        if (students.isEmpty()) return emptyList()

        val resultsByStudent = examResults.groupBy { it.studentId }
        val averages = mutableMapOf<String, Double>()
        val aggregates = mutableMapOf<String, Double>()
        for ((sid, results) in resultsByStudent) {
            if (results.isEmpty()) continue
            val totalMarks = results.sumOf { it.marksObtained }
            val totalPossible = results.sumOf { it.totalMarks }.takeIf { it > 0 } ?: 100.0 * results.size
            averages[sid] = (totalMarks / totalPossible) * 100
            aggregates[sid] = processedByStudent[sid]?.aggregate
                ?: AggregateCalculator.calculateAggregate(results.map { it.marksObtained to it.totalMarks })
        }

        val positions = PositionCalculator.computePositionsByAverage(
            students.associate { it.studentId to averages[it.studentId] }
        )

        return students.map { student ->
            val sid = student.studentId
            val results = resultsByStudent[sid] ?: emptyList()
            val processed = processedByStudent[sid]
            val attendance = attendanceByStudent[sid] ?: emptyList()
            val presentDays = attendance.count { it.present }
            val totalDays = attendance.size
            val attendancePct = if (totalDays > 0) (presentDays * 100 / totalDays) else null
            val fees = feesByStudent[sid] ?: FeesInput(sid, 0.0, 0.0)
            val comments = commentsByStudent[sid]

            val subjectLines = results.map { r ->
                val (grade, remark) = if (!r.grade.isNullOrBlank()) r.grade to (r.remarks ?: "")
                else GradeCalculator.calculatePrimaryGrade(r.marksObtained, r.totalMarks)
                SubjectResultLine(
                    subject = r.subject,
                    marksObtained = r.marksObtained,
                    totalMarks = r.totalMarks,
                    grade = grade,
                    remarks = remark,
                    teacherInitials = r.teacherInitials,
                    teacherComment = r.teacherComment ?: remark
                )
            }

            val average = averages[sid] ?: 0.0
            val aggregate = aggregates[sid] ?: 0.0
            val division = processed?.division ?: DivisionCalculator.calculateDivision(average)
            val position = processed?.classPosition ?: positions[sid] ?: 0

            StudentReportData(
                studentId = sid,
                name = student.name,
                currentClass = student.currentClass,
                admissionNumber = student.admissionNumber,
                subjectResults = subjectLines,
                averagePercentage = average,
                aggregate = aggregate,
                division = division,
                classPosition = position,
                attendancePercentage = attendancePct,
                feesExpected = fees.expectedAmount,
                feesPaid = fees.paidAmount,
                feesBalance = (fees.expectedAmount - fees.paidAmount).coerceAtLeast(0.0),
                classTeacherComment = comments?.classTeacherComment,
                headteacherComment = comments?.headteacherComment
            )
        }
    }
}
