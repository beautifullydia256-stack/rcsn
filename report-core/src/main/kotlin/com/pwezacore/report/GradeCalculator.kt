package com.pwezacore.report

/**
 * Primary grades (D1–F9) and Uganda secondary (A–E) per REPORT_CALCULATION_SPECIFICATION.md.
 */
object GradeCalculator {

    // Primary Subject Grade Boundaries (D1–F9) — inclusive [min, max]
    private val PRIMARY_GRADE_SCALE = listOf(
        Triple(75, 100, "D1"),
        Triple(70, 74, "D2"),
        Triple(65, 69, "C3"),
        Triple(60, 64, "C4"),
        Triple(55, 59, "C5"),
        Triple(50, 54, "C6"),
        Triple(45, 49, "P7"),
        Triple(40, 44, "P8"),
        Triple(0, 39, "F9")
    )

    // Uganda secondary (A–E) for aggregate points
    private data class UgandaGrade(val min: Int, val max: Int, val grade: String, val points: Int)
    private val UGANDA_GRADE_SCALE = listOf(
        UgandaGrade(80, 100, "A", 6),
        UgandaGrade(70, 79, "B", 5),
        UgandaGrade(60, 69, "C", 4),
        UgandaGrade(50, 59, "D", 3),
        UgandaGrade(0, 49, "E", 1)
    )

    /**
     * Primary grade (D1–F9) and remark from marks and total.
     * If totalMarks <= 0 returns ("F9", "Fail").
     */
    fun calculatePrimaryGrade(marks: Double, totalMarks: Double): Pair<String, String> {
        if (totalMarks <= 0) return "F9" to "Fail"
        val percentage = (marks / totalMarks) * 100
        val entry = PRIMARY_GRADE_SCALE.find { percentage >= it.first && percentage <= it.second }
        val grade = entry?.third ?: "F9"
        val remark = if (grade == "F9") "Fail" else "Pass"
        return grade to remark
    }

    /**
     * Uganda secondary grade and points from marks and total (for aggregate).
     * If totalMarks <= 0 treats as 0% → E (1 point).
     */
    fun calculateSecondaryGrade(marks: Double, totalMarks: Double): Pair<String, Int> {
        val total = if (totalMarks > 0) totalMarks else 100.0
        val percentage = (marks / total) * 100
        val scale = UGANDA_GRADE_SCALE.find { percentage >= it.min && percentage <= it.max }
        val grade = scale?.grade ?: "E"
        val points = scale?.points ?: 1
        return grade to points
    }
}
