package com.pwezacore.data

import com.pwezacore.data.DesktopSupabase.postgrest
import com.pwezacore.data.local.LocalReportWriter
import io.github.jan.supabase.postgrest.from
import io.github.jan.supabase.postgrest.rpc
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.put

/**
 * Snapshot creation and report generation (mirrors web createSnapshotFromExamSet + generateReportsBulkClient).
 * When [studentIds] or [classNames] are provided, only that subset is fetched — faster for single-student or single-class.
 */
object ReportSnapshotService {

    suspend fun createSnapshotAndGenerate(
        schoolId: String,
        examSetId: String,
        term: Int,
        year: Int,
        studentIds: List<String>?,
        classNames: List<String>?
    ): ReportGenerateResult = withContext(Dispatchers.IO) {
        try {
            val (snapshotId, errorMsg) = createSnapshotFromExamSet(schoolId, examSetId, term, year, studentIds, classNames)
            if (errorMsg != null)
                return@withContext ReportGenerateResult(null, errorMsg)
            if (snapshotId == null)
                return@withContext ReportGenerateResult(null, "Report generation failed.")
            generateReportsFromSnapshot(snapshotId, classNames, studentIds)
            ReportGenerateResult(snapshotId, null)
        } catch (e: Throwable) {
            ReportGenerateResult(null, e.message ?: "Report generation failed. Check connection and permissions.")
        }
    }

    /** Returns Pair(snapshotId, errorMessage). Success = (id, null), failure = (null, message). */
    private suspend fun createSnapshotFromExamSet(
        schoolId: String,
        examSetId: String,
        term: Int,
        year: Int,
        studentIds: List<String>?,
        classNames: List<String>?
    ): Pair<String?, String?> = withContext(Dispatchers.IO) {
        val pg = postgrest

        // 1. Create snapshot (insert then fetch by filter to get id)
        try {
            pg.from("report_snapshots").insert(
                SnapshotInsert(
                    schoolId = schoolId,
                    term = term,
                    year = year,
                    examSetId = examSetId,
                    status = "draft"
                )
            )
        } catch (e: Throwable) {
            return@withContext (null to (e.message ?: "Could not create snapshot. Check permissions."))
        }
        val inserted = pg.from("report_snapshots")
            .select { filter { SnapshotRow::schoolId eq schoolId; SnapshotRow::term eq term; SnapshotRow::year eq year; SnapshotRow::examSetId eq examSetId; SnapshotRow::status eq "draft" } }
            .decodeList<SnapshotRow>()
            .lastOrNull() ?: return@withContext (null to "Could not read created snapshot.")
        val snapshotId = inserted.id ?: return@withContext (null to "Invalid snapshot.")

        // Mirror snapshot to local DB (synced = true since we just wrote to Supabase)
        LocalReportWriter.saveSnapshot(snapshotId, schoolId, term, year, examSetId, "draft", 0, synced = true)

        // 2. Exam sets for term
        val examSetsForTerm = pg.from("exam_sets")
            .select { filter { ExamSetRow::schoolId eq schoolId; ExamSetRow::term eq term; ExamSetRow::year eq year } }
            .decodeList<ExamSetRow>()
        val baseExamSet = examSetsForTerm.find { it.id == examSetId } ?: examSetsForTerm.firstOrNull()
        val isMidTerm = baseExamSet?.name?.trim()?.lowercase()?.let { n ->
            n == "mid term" || n == "midterm" || n.contains("mid") || n.contains("mid-term")
        } ?: true
        val examSetIdsToInclude = if (isMidTerm && examSetsForTerm.isNotEmpty())
            listOf(examSetId)
        else
            examSetsForTerm.mapNotNull { it.id }.ifEmpty { listOf(examSetId) }

        // 3. Exam results
        var examResults = emptyList<ExamResultRow>()
        for (setId in examSetIdsToInclude.distinct()) {
            val rows = pg.from("exam_results")
                .select { filter { ExamResultRow::schoolId eq schoolId; ExamResultRow::examSetId eq setId } }
                .decodeList<ExamResultRow>()
            examResults = examResults + rows
        }
        if (!studentIds.isNullOrEmpty()) examResults = examResults.filter { it.studentId in studentIds }
        if (!classNames.isNullOrEmpty()) examResults = examResults.filter { it.className in classNames }
        if (examResults.isEmpty())
            return@withContext (null to "No exam results found for the selected student and exam set. Add marks in Exam Results first.")

        val resultStudentIds = examResults.mapNotNull { it.studentId }.distinct()
        val classNamesFromResults = examResults.mapNotNull { it.className }.distinct()

        // 3b. Processed (aggregate, division, class_position)
        val processedByStudent = mutableMapOf<String, Triple<Double?, String?, Int?>>()
        for (setId in examSetIdsToInclude.distinct()) {
            val processed = try {
                pg.from("processed_primary_exam_results")
                    .select { filter { ProcessedPrimaryRow::schoolId eq schoolId; ProcessedPrimaryRow::examSetId eq setId } }
                    .decodeList<ProcessedPrimaryRow>()
                    .filter { it.studentId in resultStudentIds }
            } catch (_: Throwable) { emptyList() }
            processed.forEach { row ->
                val sid = row.studentId ?: return@forEach
                if (!processedByStudent.containsKey(sid))
                    processedByStudent[sid] = Triple(row.aggregate, row.division, row.classPosition)
            }
        }

        // 4. Fetch supporting data (by school then filter in memory)
        val studentsList = pg.from("students")
            .select { filter { StudentRow::schoolId eq schoolId } }
            .decodeList<StudentRow>()
            .filter { it.studentId in resultStudentIds }
        val attendanceList = try {
            pg.from("student_attendance")
                .select { filter { StudentAttendanceRow::schoolId eq schoolId } }
                .decodeList<StudentAttendanceRow>()
                .filter { it.studentId in resultStudentIds }
        } catch (_: Throwable) { emptyList() }
        val paymentsList = try {
            pg.from("student_payments")
                .select { filter { StudentPaymentRow::schoolId eq schoolId } }
                .decodeList<StudentPaymentRow>()
                .filter { it.studentId in resultStudentIds }
        } catch (_: Throwable) { emptyList() }
        val schoolInfo = pg.from("schools")
            .select { filter { SchoolInfoRow::schoolId eq schoolId } }
            .decodeList<SchoolInfoRow>()
            .firstOrNull()
        var commentSettingsList = pg.from("class_teacher_comments_settings")
            .select { filter { ClassTeacherCommentSettingRow::schoolId eq schoolId } }
            .decodeList<ClassTeacherCommentSettingRow>()
        if (classNamesFromResults.isNotEmpty())
            commentSettingsList = commentSettingsList.filter { it.className in classNamesFromResults }
        val reportCommentsList = try {
            pg.from("report_comments")
                .select { filter { ReportCommentRow::schoolId eq schoolId; ReportCommentRow::term eq term; ReportCommentRow::year eq year } }
                .decodeList<ReportCommentRow>()
                .filter { it.studentId in resultStudentIds }
        } catch (_: Throwable) { emptyList() }
        val studentPhotosList = try {
            pg.from("student_photos")
                .select { filter { StudentPhotoRow::schoolId eq schoolId } }
                .decodeList<StudentPhotoRow>()
                .filter { it.studentId in resultStudentIds }
        } catch (_: Throwable) { emptyList() }

        // 5. Fees paid per student
        val paidByStudent = mutableMapOf<String, Double>()
        paymentsList.forEach { p ->
            val sid = p.studentId ?: return@forEach
            paidByStudent[sid] = (paidByStudent[sid] ?: 0.0) + (p.amountPaid ?: 0.0)
        }

        // 6. Group results by class and student
        val studentResultsByClass = mutableMapOf<String, MutableMap<String, MutableList<ExamResultRow>>>()
        examResults.forEach { r ->
            val cn = r.className ?: studentsList.find { it.studentId == r.studentId }?.currentClass ?: ""
            studentResultsByClass.getOrPut(cn) { mutableMapOf() }
                .getOrPut(r.studentId ?: "") { mutableListOf() }
                .add(r)
        }

        // 7. Positions, averages, aggregates
        val studentPositions = mutableMapOf<String, Int>()
        val studentAverages = mutableMapOf<String, Double>()
        val studentAggregates = mutableMapOf<String, Double>()
        studentResultsByClass.forEach { (className, classStudents) ->
            val averagesList = mutableListOf<Triple<String, Double, Double>>()
            classStudents.forEach { (studentId, results) ->
                val fromDb = processedByStudent[studentId]
                val validResults = results.filter { it.marksObtained != null && it.totalMarks != null }
                if (validResults.isEmpty()) {
                    studentAverages[studentId] = 0.0
                    studentAggregates[studentId] = fromDb?.first ?: 0.0
                    fromDb?.third?.let { studentPositions[studentId] = it }
                    return@forEach
                }
                val totalMarks = validResults.sumOf { (it.marksObtained ?: 0.0) }
                val totalPossible = validResults.sumOf { (it.totalMarks ?: 100.0) }
                val average = if (totalPossible > 0) (totalMarks / totalPossible) * 100 else 0.0
                studentAverages[studentId] = average
                val aggregate = fromDb?.first ?: ReportUtils.calculateAggregate(
                    validResults.map { (it.marksObtained ?: 0.0) to (it.totalMarks ?: 100.0) }
                )
                studentAggregates[studentId] = aggregate
                fromDb?.third?.let { studentPositions[studentId] = it }
                averagesList.add(Triple(studentId, average, aggregate))
            }
            averagesList.sortByDescending { it.second }
            averagesList.forEachIndexed { index, (sid, _, _) ->
                if (!studentPositions.containsKey(sid)) studentPositions[sid] = index + 1
            }
        }

        // 8. Attendance percentage per student
        val attendanceByStudent = mutableMapOf<String, Pair<Int, Int>>()
        attendanceList.forEach { a ->
            val sid = a.studentId ?: return@forEach
            val (present, total) = attendanceByStudent.getOrPut(sid) { 0 to 0 }
            attendanceByStudent[sid] = if (a.present == true) present + 1 to total + 1 else present to total + 1
        }
        val attendancePct = attendanceByStudent.mapValues { (_, v) ->
            if (v.second > 0) (v.first.toDouble() / v.second * 100).toInt() else 0
        }

        // 9. Resolve comments (class teacher / headteacher from settings or report_comments)
        val resolvedComments = mutableMapOf<String, Pair<String, String>>()
        val commentByStudent = reportCommentsList.groupBy { it.studentId }
        studentsList.forEach { student ->
            val sid = student.studentId ?: return@forEach
            val average = studentAverages[sid] ?: 0.0
            val bounded = average.coerceIn(0.0, 100.0)
            val currentClass = student.currentClass ?: ""
            var classTeacher = ""
            val ctSetting = commentSettingsList.find { it.className == currentClass && bounded >= (it.minPercent ?: 0) && bounded <= (it.maxPercent ?: 100) }
            if (ctSetting?.commentText != null) classTeacher = ctSetting.commentText
            else commentByStudent[sid]?.find { (it.commentType ?: "").lowercase().replace(" ", "_") in listOf("class_teacher", "class_teacher_comment") }?.commentText?.let { classTeacher = it }
            var headTeacher = ""
            val htSetting = commentSettingsList.find { it.className == currentClass && bounded >= (it.minPercent ?: 0) && bounded <= (it.maxPercent ?: 100) }
            if (htSetting?.commentText != null) headTeacher = htSetting.commentText
            else commentByStudent[sid]?.find { (it.commentType ?: "").lowercase().replace(" ", "_") in listOf("headteacher", "head_teacher", "headteacher_comment") }?.commentText?.let { headTeacher = it }
            resolvedComments[sid] = classTeacher to headTeacher
        }

        // 10. Build snapshot data rows
        val snapshotData = mutableListOf<ReportSnapshotDataInsert>()
        val examSetNameBySetId = examSetsForTerm.associate { it.id to it.name }.mapKeys { it.key ?: "" }
        examResults.forEach { result ->
            val sid = result.studentId ?: return@forEach
            val student = studentsList.find { it.studentId == sid }
            val attendance = attendancePct[sid]
            val expectedFee = student?.expectedFeeAmount ?: 0.0
            val totalPaid = paidByStudent[sid] ?: 0.0
            val feesBalance = (expectedFee - totalPaid).coerceAtLeast(0.0)
            val dbGrade = result.grade?.trim() ?: ""
            val isOldFormat = dbGrade.uppercase() in listOf("A", "B", "C", "D", "E", "F")
            val (grade, remark) = if (dbGrade.isNotEmpty() && !isOldFormat)
                dbGrade to (result.remarks ?: "")
            else
                ReportUtils.calculatePrimaryGrade(result.marksObtained ?: 0.0, result.totalMarks ?: 100.0)
            val average = studentAverages[sid] ?: 0.0
            val fromDb = processedByStudent[sid]
            val division = fromDb?.second ?: ReportUtils.calculateDivision(average)
            val position = processedByStudent[sid]?.third ?: studentPositions[sid]
            val aggregate = studentAggregates[sid]
            val (classTeacherComment, headteacherComment) = resolvedComments[sid] ?: ("" to "")
            val className = result.className ?: student?.currentClass ?: ""
            val totalInClass = studentResultsByClass[className]?.size ?: 0
            val frozenData = buildJsonObject {
                put("student_name", student?.name ?: "")
                put("admission_number", student?.admissionNumber ?: "")
                put("school_name", schoolInfo?.name ?: "")
                put("school_address", schoolInfo?.address ?: "")
                put("school_phone", schoolInfo?.phone ?: "")
                put("school_email", schoolInfo?.email ?: "")
                put("school_motto", schoolInfo?.motto ?: "")
                put("total_students_in_class", totalInClass)
            }
            val effectiveTeacherComment = if (result.teacherComment?.trim().isNullOrEmpty()) result.remarks ?: remark else result.teacherComment
            val examSetName = examSetNameBySetId[result.examSetId ?: ""] ?: baseExamSet?.name ?: ""
            val rowId = java.util.UUID.randomUUID().toString()
            snapshotData.add(
                ReportSnapshotDataInsert(
                    id = rowId,
                    snapshotId = snapshotId,
                    studentId = sid,
                    className = className,
                    subject = result.subject ?: "",
                    marksObtained = result.marksObtained,
                    totalMarks = result.totalMarks,
                    grade = grade,
                    remarks = result.remarks ?: remark,
                    teacherInitials = result.teacherInitials,
                    teacherComment = effectiveTeacherComment,
                    classTeacherComment = classTeacherComment,
                    headteacherComment = headteacherComment,
                    attendancePercentage = attendance?.toDouble(),
                    position = position,
                    aggregate = aggregate,
                    averagePercentage = average,
                    division = division,
                    feesBalance = feesBalance,
                    feesPaid = totalPaid,
                    feesExpected = expectedFee,
                    studentPhotoUrl = studentPhotosList.find { it.studentId == sid }?.photoUrl,
                    schoolLogoUrl = schoolInfo?.logoUrl,
                    examSetName = examSetName,
                    examSetTerm = baseExamSet?.term,
                    examSetYear = baseExamSet?.year,
                    frozenData = frozenData
                )
            )
        }

        // 11. Insert snapshot data (batch) and mirror to local
        snapshotData.chunked(100).forEach { chunk ->
            pg.from("report_snapshot_data").insert(chunk)
        }
        snapshotData.forEach { row ->
            LocalReportWriter.saveSnapshotDataRow(
                id = row.id!!,
                snapshotId = row.snapshotId,
                studentId = row.studentId,
                className = row.className,
                subject = row.subject,
                marksObtained = row.marksObtained,
                totalMarks = row.totalMarks,
                grade = row.grade,
                averagePercentage = row.averagePercentage,
                aggregate = row.aggregate,
                division = row.division,
                position = row.position,
                classTeacherComment = row.classTeacherComment,
                headteacherComment = row.headteacherComment,
                attendancePercentage = row.attendancePercentage,
                feesBalance = row.feesBalance,
                feesPaid = row.feesPaid,
                frozenData = row.frozenData?.toString(),
                synced = true
            )
        }

        // 12. Update snapshot metadata
        val metadata = buildJsonObject {
            put("exam_set_name", baseExamSet?.name ?: "")
            put("total_subjects", examResults.map { it.subject }.distinct().size)
        }
        pg.from("report_snapshots").update(
            SnapshotMetadataUpdate(
                studentCount = resultStudentIds.size,
                classCount = classNamesFromResults.size,
                metadata = metadata
            )
        ) { filter { SnapshotRow::id eq snapshotId } }

        // 13. Lock snapshot
        pg.rpc("lock_report_snapshot", mapOf("p_snapshot_id" to snapshotId))
        (snapshotId to null)
    }

    private suspend fun generateReportsFromSnapshot(
        snapshotId: String,
        classNames: List<String>?,
        studentIds: List<String>?
    ): Boolean = withContext(Dispatchers.IO) {
        val pg = postgrest
        val snapshot = pg.from("report_snapshots").select { filter { SnapshotRow::id eq snapshotId } }.decodeList<SnapshotRow>().singleOrNull()
            ?: return@withContext false
        if (snapshot.status != "locked" && snapshot.status != "generated") return@withContext false

        val allData = try {
            pg.from("report_snapshot_data").select { filter { SnapshotDataRow::snapshotId eq snapshotId } }.decodeList<SnapshotDataRow>()
        } catch (_: Throwable) { emptyList() }
        var allSnapshotData = allData
        if (!classNames.isNullOrEmpty()) allSnapshotData = allSnapshotData.filter { it.className in classNames }
        if (!studentIds.isNullOrEmpty()) allSnapshotData = allSnapshotData.filter { it.studentId in studentIds }
        if (allSnapshotData.isEmpty()) return@withContext true

        val uniqueStudentIds = allSnapshotData.mapNotNull { it.studentId }.distinct().toMutableList()
        if (!studentIds.isNullOrEmpty()) uniqueStudentIds.retainAll(studentIds.toSet())

        val schoolId = snapshot.schoolId ?: return@withContext false
        val school = pg.from("schools").select { filter { SchoolInfoRow::schoolId eq schoolId } }.decodeList<SchoolInfoRow>().firstOrNull()
        val examSet = pg.from("exam_sets").select { filter { ExamSetRow::id eq snapshot.examSetId } }.decodeList<ExamSetRow>().firstOrNull()

        pg.from("report_snapshots").update(
            SnapshotStatusUpdate(
                status = "generated",
                generationStartedAt = java.time.Instant.now().toString()
            )
        ) { filter { SnapshotRow::id eq snapshotId } }

        val batchSize = 50
        var generatedCount = 0
        try {
            for (i in uniqueStudentIds.indices step batchSize) {
                val batch = uniqueStudentIds.drop(i).take(batchSize)
                batch.forEach { studentId ->
                    val studentData = allSnapshotData.filter { it.studentId == studentId }
                    if (studentData.isEmpty()) return@forEach
                    val first = studentData.first()
                    val frozen = first.frozenData
                    val results = studentData.map { d ->
                        buildJsonObject {
                            put("subject", d.subject)
                            put("marks_obtained", d.marksObtained)
                            put("total_marks", d.totalMarks)
                            put("grade", d.grade)
                            put("remarks", d.remarks)
                            put("teacher_initials", d.teacherInitials)
                            put("teacher_comment", d.teacherComment ?: d.remarks)
                        }
                    }
                    val reportData = buildJsonObject {
                        put("school", buildJsonObject {
                            put("name", frozen?.get("school_name")?.toString() ?: school?.name)
                            put("address", frozen?.get("school_address")?.toString() ?: school?.address)
                            put("phone", school?.phone)
                            put("email", school?.email)
                            put("motto", school?.motto)
                            put("logo_url", first.schoolLogoUrl ?: school?.logoUrl)
                        })
                        put("examSet", buildJsonObject {
                            put("id", snapshot.examSetId)
                            put("name", examSet?.name ?: "")
                            put("term", examSet?.term ?: snapshot.term)
                            put("year", examSet?.year ?: snapshot.year)
                        })
                        put("students", buildJsonArray {
                            add(buildJsonObject {
                            put("student_id", studentId)
                            put("name", frozen?.get("student_name")?.toString() ?: "")
                            put("current_class", first.className)
                            put("admission_number", frozen?.get("admission_number")?.toString() ?: "")
                            put("profile_photo", first.studentPhotoUrl)
                            put("results", buildJsonArray { results.forEach { add(it) } })
                            put("fees", buildJsonObject {
                                put("expected", first.feesExpected ?: 0)
                                put("paid", first.feesPaid ?: 0)
                                put("balance", first.feesBalance ?: 0)
                            })
                            put("comments", buildJsonObject {
                                put("class_teacher_text", first.classTeacherComment)
                                put("headteacher_text", first.headteacherComment)
                                put("head_teacher_text", first.headteacherComment)
                            })
                            put("summary", buildJsonObject {
                                put("totalMarks", studentData.sumOf { (it.marksObtained ?: 0.0).toDouble() })
                                put("totalPossibleMarks", studentData.sumOf { (it.totalMarks ?: 100.0).toDouble() })
                                put("average", first.averagePercentage)
                                put("aggregate", first.aggregate)
                                put("division", first.division)
                                put("attendancePercentage", first.attendancePercentage)
                                put("classPosition", first.position)
                                put("performanceRemark", first.division ?: "N/A")
                            })
                        }
                    )
                    }
                    )
                    }
                    try {
                        val reportId = java.util.UUID.randomUUID().toString()
                        pg.from("generated_reports").insert(
                            GeneratedReportInsert(
                                id = reportId,
                                snapshotId = snapshotId,
                                studentId = studentId,
                                templateId = null,
                                reportData = reportData,
                                templateVersion = "1.0"
                            )
                        )
                        LocalReportWriter.saveGeneratedReport(
                            id = reportId,
                            snapshotId = snapshotId,
                            studentId = studentId,
                            templateId = null,
                            reportDataJson = kotlinx.serialization.json.Json.encodeToString(kotlinx.serialization.json.JsonObject.serializer(), reportData),
                            pdfUrl = null,
                            synced = true
                        )
                        generatedCount++
                    } catch (e: Throwable) { }
                }
            }
            val duration = 0
            pg.from("report_snapshots").update(
                SnapshotGenerationCompleteUpdate(
                    generationCompletedAt = java.time.Instant.now().toString(),
                    generationDurationSeconds = duration
                )
            ) { filter { SnapshotRow::id eq snapshotId } }
            true
        } catch (e: Throwable) { false }
    }
}
