package com.pwezacore.report

/**
 * Aggregate = average of Uganda secondary grade points (A=6 … E=1).
 * Per REPORT_CALCULATION_SPECIFICATION.md §4.
 */
object AggregateCalculator {

    /**
     * Compute aggregate from a list of (marks_obtained, total_marks) per subject.
     * Each subject is mapped to points via GradeCalculator secondary scale; aggregate = mean(points).
     * Returns 0.0 if results is empty.
     */
    fun calculateAggregate(results: List<Pair<Double, Double>>): Double {
        if (results.isEmpty()) return 0.0
        var totalPoints = 0.0
        for ((marks, total) in results) {
            val t = if (total > 0) total else 100.0
            val (_, points) = GradeCalculator.calculateSecondaryGrade(marks, t)
            totalPoints += points
        }
        return totalPoints / results.size
    }
}
