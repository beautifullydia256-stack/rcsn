package com.pwezacore.report

/**
 * Class position by average (descending). Position 1 = best.
 * Per REPORT_CALCULATION_SPECIFICATION.md §5.
 * Ties get the same position; next distinct position = 1 + number of students ahead.
 */
object PositionCalculator {

    /**
     * Compute 1-based class position for each student in [studentAverages].
     * Map key = student identifier (e.g. studentId), value = average percentage.
     * Sort by average descending; null/NaN treated as 0 (rank last).
     */
    fun computePositionsByAverage(studentAverages: Map<String, Double?>): Map<String, Int> {
        val sorted = studentAverages.entries
            .sortedByDescending { (_, avg) -> (avg ?: 0.0).takeIf { !it.isNaN() } ?: 0.0 }
        val result = mutableMapOf<String, Int>()
        var position = 1
        var index = 0
        while (index < sorted.size) {
            val currentAvg = sorted[index].value ?: 0.0
            result[sorted[index].key] = position
            var j = index + 1
            while (j < sorted.size && (sorted[j].value ?: 0.0) == currentAvg) {
                result[sorted[j].key] = position
                j++
            }
            index = j
            position = index + 1
        }
        return result
    }

    /**
     * Same as above but for a list of (studentId, average) pairs (e.g. for one class).
     */
    fun computePositionsForClass(studentsWithAverage: List<Pair<String, Double?>>): Map<String, Int> {
        val map = studentsWithAverage.associate { it.first to it.second }
        return computePositionsByAverage(map)
    }
}
