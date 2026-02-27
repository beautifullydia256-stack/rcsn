package com.pwezacore.ui.navigation

/**
 * App-level screen. Matches web flow: start at Login, then go to role dashboard (admin by default).
 * Admin uses sub-routes matching web: "", "students", "students/add", "teachers", etc.
 */
sealed class AppScreen {
    data object Login : AppScreen()
    data object Register : AppScreen()
    data object ForgotPassword : AppScreen()
    data class Admin(val route: String = "") : AppScreen()
    data class Teacher(val route: String = "") : AppScreen()
    data class Accountant(val route: String = "") : AppScreen()
}

/** Web admin paths (same order as web SPA sidebar). No leading slash. */
object WebAdminRoutes {
    const val DASHBOARD = ""
    const val STUDENTS = "students"
    const val STUDENTS_ADD = "students/add"
    const val TEACHERS = "teachers"
    const val PARENTS = "parents"
    const val PARENTS_ADD = "parents/add"
    const val ACCOUNTS = "accounts"
    const val ACCOUNTS_ADD = "accounts/add"
    const val STAFF = "staff"
    const val OUTSTANDING = "outstanding"
    const val REPORTS = "reports"
    const val REPORTS_GENERATE = "reports/generate"
    const val REPORT_RECORDS = "report-records"
    const val ATTENDANCE = "attendance"
    const val EXAM_SETS = "exam-sets"
    const val IDENTITY = "identity"
    const val SETTINGS_CLASSES = "settings/classes"
    const val SETTINGS_LOCATION = "settings/location"
    const val JOBS = "jobs"
    const val SETTINGS = "settings"
    const val NOTIFICATIONS = "notifications"

    fun fullPath(segment: String): String = if (segment.isEmpty()) "admin" else "admin/$segment"
}

/** Teacher dashboard paths (match web /dashboard/teacher/...). */
object TeacherRoutes {
    const val DASHBOARD = ""
    const val CLASSES = "classes"
    const val STUDENTS = "students"
    const val EXAM_RESULTS = "exam-results"
    const val ATTENDANCE = "attendance"
    const val TIMETABLE = "timetable"
    const val GRADING_SYSTEM = "grading-system"
    const val AI_PLANNER = "ai-planner"
    const val ASSIGNMENTS = "assignments"
    const val RESOURCES = "resources"
    const val MESSAGES = "messages"
    const val NOTIFICATIONS = "notifications"
    const val SETTINGS = "settings"
}

/** Accountant dashboard paths (match web SPA /dashboard/accountant/...). */
object AccountantRoutes {
    const val DASHBOARD = ""
    const val FEE_STRUCTURE = "fee-structure"
    const val BILLING = "billing"
    const val PAYMENTS = "payments"
    const val RECEIPTS = "receipts"
    const val OUTSTANDING = "outstanding"
    const val EXPENSES = "expenses"
    const val BANK = "bank"
    const val REPORTS = "reports"
    const val ADJUSTMENTS = "adjustments"
    const val SETTINGS = "settings"
}
