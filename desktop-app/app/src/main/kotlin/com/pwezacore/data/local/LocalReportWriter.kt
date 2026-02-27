package com.pwezacore.data.local

import com.pwezacore.data.local.LocalSchema.GeneratedReports
import com.pwezacore.data.local.LocalSchema.ReportSnapshotData
import com.pwezacore.data.local.LocalSchema.ReportSnapshots
import org.jetbrains.exposed.sql.transactions.transaction

/**
 * Writes report snapshots and generated reports to the local database for offline-first sync.
 * Set synced = false so the sync engine will push them when online.
 */
object LocalReportWriter {

    fun saveSnapshot(
        snapshotId: String,
        schoolId: String,
        term: Int,
        year: Int,
        examSetId: String?,
        status: String,
        studentCount: Int,
        synced: Boolean = false
    ) {
        transaction(LocalDatabase.get()) {
            ReportSnapshots.upsert(listOf(ReportSnapshots.id)) {
                it[ReportSnapshots.id] = snapshotId
                it[ReportSnapshots.schoolId] = schoolId
                it[ReportSnapshots.term] = term
                it[ReportSnapshots.year] = year
                it[ReportSnapshots.examSetId] = examSetId
                it[ReportSnapshots.status] = status
                it[ReportSnapshots.createdAt] = System.currentTimeMillis()
                it[ReportSnapshots.updatedAt] = System.currentTimeMillis()
                it[ReportSnapshots.synced] = synced
            }
        }
    }

    fun saveSnapshotDataRow(
        id: String,
        snapshotId: String,
        studentId: String,
        className: String,
        subject: String,
        marksObtained: Double?,
        totalMarks: Double?,
        grade: String?,
        averagePercentage: Double?,
        aggregate: Double?,
        division: String?,
        position: Int?,
        classTeacherComment: String?,
        headteacherComment: String?,
        attendancePercentage: Double?,
        feesBalance: Double?,
        feesPaid: Double?,
        frozenData: String?,
        synced: Boolean = false
    ) {
        transaction(LocalDatabase.get()) {
            ReportSnapshotData.upsert(listOf(ReportSnapshotData.id)) {
                it[ReportSnapshotData.id] = id
                it[ReportSnapshotData.snapshotId] = snapshotId
                it[ReportSnapshotData.studentId] = studentId
                it[ReportSnapshotData.className] = className
                it[ReportSnapshotData.subject] = subject
                it[ReportSnapshotData.marksObtained] = marksObtained
                it[ReportSnapshotData.totalMarks] = totalMarks
                it[ReportSnapshotData.grade] = grade
                it[ReportSnapshotData.averagePercentage] = averagePercentage
                it[ReportSnapshotData.aggregate] = aggregate
                it[ReportSnapshotData.division] = division
                it[ReportSnapshotData.position] = position
                it[ReportSnapshotData.classTeacherComment] = classTeacherComment
                it[ReportSnapshotData.headteacherComment] = headteacherComment
                it[ReportSnapshotData.attendancePercentage] = attendancePercentage
                it[ReportSnapshotData.feesBalance] = feesBalance
                it[ReportSnapshotData.feesPaid] = feesPaid
                it[ReportSnapshotData.frozenData] = frozenData
                it[ReportSnapshotData.createdAt] = System.currentTimeMillis()
                it[ReportSnapshotData.updatedAt] = System.currentTimeMillis()
                it[ReportSnapshotData.synced] = synced
            }
        }
    }

    fun saveGeneratedReport(
        id: String,
        snapshotId: String,
        studentId: String,
        templateId: String?,
        reportDataJson: String,
        pdfUrl: String?,
        synced: Boolean = false
    ) {
        transaction(LocalDatabase.get()) {
            GeneratedReports.upsert(listOf(GeneratedReports.id)) {
                it[GeneratedReports.id] = id
                it[GeneratedReports.snapshotId] = snapshotId
                it[GeneratedReports.studentId] = studentId
                it[GeneratedReports.templateId] = templateId
                it[GeneratedReports.reportData] = reportDataJson
                it[GeneratedReports.pdfUrl] = pdfUrl
                it[GeneratedReports.generatedAt] = System.currentTimeMillis()
                it[GeneratedReports.createdAt] = System.currentTimeMillis()
                it[GeneratedReports.updatedAt] = System.currentTimeMillis()
                it[GeneratedReports.synced] = synced
            }
        }
    }
}
