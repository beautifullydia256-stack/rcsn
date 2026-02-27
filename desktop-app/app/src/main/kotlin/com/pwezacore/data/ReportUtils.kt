package com.pwezacore.data

import com.pwezacore.report.AggregateCalculator
import com.pwezacore.report.DivisionCalculator
import com.pwezacore.report.GradeCalculator

/**
 * Mirrors web src/lib/reportUtils.ts. Delegates to report-core for consistency.
 * Used by report snapshot generation until fully migrated to ReportDataBuilder.
 */
object ReportUtils {

    /** Primary grade (D1–F9) from marks and total. */
    fun calculatePrimaryGrade(marks: Double, totalMarks: Double): Pair<String, String> {
        return GradeCalculator.calculatePrimaryGrade(marks, totalMarks)
    }

    /** Division from average percentage (e.g. Division 1, Ungraded). */
    fun calculateDivision(average: Double): String {
        return DivisionCalculator.calculateDivision(average)
    }

    /** Aggregate = average of grade points (A=6, B=5, ... E=1). */
    fun calculateAggregate(results: List<Pair<Double, Double>>): Double {
        return AggregateCalculator.calculateAggregate(results)
    }
}
