package com.pwezacore.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.pwezacore.ui.screens.auth.LoginScreen
import com.pwezacore.ui.screens.auth.RegisterScreen
import com.pwezacore.ui.screens.auth.ForgotPasswordScreen
import com.pwezacore.ui.components.AdminHost
import com.pwezacore.ui.components.TeacherHost
import com.pwezacore.ui.components.AccountantHost
import com.pwezacore.ui.components.ParentHost
import com.pwezacore.ui.components.LibrarianHost
import com.pwezacore.ui.components.HeadTeacherHost
import com.pwezacore.ui.screens.owner.OwnerPlaceholderScreen

sealed class Screen(val route: String) {
    // Auth
    object Login : Screen("login")
    object Register : Screen("register")
    object ForgotPassword : Screen("forgot_password")
    
    // Admin (sidebar parity with web) - single entry route shows AdminHost with drawer
    object Admin : Screen("admin")
    object AdminDashboard : Screen("admin/dashboard")
    object Students : Screen("admin/students")
    object Teachers : Screen("admin/teachers")
    object Parents : Screen("admin/parents")
    object Staff : Screen("admin/accounts")
    object Finance : Screen("admin/outstanding")
    object Reports : Screen("admin/reports/generate")
    object GenerateReport : Screen("admin/generate-report")
    object Attendance : Screen("admin/attendance-records")
    object ExamSets : Screen("admin/exam-sets")
    object Identity : Screen("admin/identity")
    object Classes : Screen("admin/settings/classes")
    object JobVacancies : Screen("admin/jobs")
    object SystemSettings : Screen("admin/settings")
    object Notifications : Screen("admin/notifications")

    // Add forms (open directly from quick actions / list Add buttons)
    object AddStudent : Screen("admin/students/add")
    object AddTeacher : Screen("admin/teachers/add")
    object AddParent : Screen("admin/parents/add")
    object RecordPayment : Screen("admin/record-payment")

    // System settings sub-screens
    object SettingsSchoolProfile : Screen("admin/settings/school-profile")
    object SettingsSubjectsPerClass : Screen("admin/settings/subjects-per-class")
    object SettingsTeacherSubjectClass : Screen("admin/settings/teacher-subject-class")
    object SettingsTermSettings : Screen("admin/settings/term-settings")
    object SettingsTimetableDesigner : Screen("admin/settings/timetable-designer")
    object SettingsFinancial : Screen("admin/settings/financial")
    object SettingsSchoolRequirements : Screen("admin/settings/school-requirements")
    object SettingsLocation : Screen("admin/settings/location")
    
    // Teacher
    object Teacher : Screen("teacher")
    object TeacherDashboard : Screen("teacher/dashboard")
    object MyClasses : Screen("teacher/classes")
    object TeacherStudents : Screen("teacher/students")
    object TeacherAttendance : Screen("teacher/attendance")
    object TeacherExamResults : Screen("teacher/exam-results")
    object TeacherTimetable : Screen("teacher/timetable")
    object TeacherAIPlanner : Screen("teacher/ai-planner")
    object TeacherAssignments : Screen("teacher/assignments")
    object TeacherResources : Screen("teacher/resources")
    object TeacherMessages : Screen("teacher/messages")
    object TeacherNotifications : Screen("teacher/notifications")
    object TeacherSettings : Screen("teacher/settings")
    
    // Student
    object StudentDashboard : Screen("student/dashboard")
    object MyReports : Screen("student/reports")
    
    // Parent
    object Parent : Screen("parent")
    object ParentDashboard : Screen("parent/dashboard")
    object ParentFees : Screen("parent/fees")
    object ParentAcademics : Screen("parent/academics")
    object ParentMessages : Screen("parent/messages")
    object ParentProfile : Screen("parent/profile")
    object ParentMore : Screen("parent/more")
    object ParentAttendance : Screen("parent/attendance")
    object ParentAssignments : Screen("parent/assignments")
    object ParentEvents : Screen("parent/events")
    object ParentDiscipline : Screen("parent/discipline")
    object ParentTransport : Screen("parent/transport")
    object ParentMedical : Screen("parent/medical")
    object ParentDocuments : Screen("parent/documents")
    object ParentNotifications : Screen("parent/notifications")
    object ParentAIAssistant : Screen("parent/ai-assistant")
    object ParentSettings : Screen("parent/settings")
    
    // Accountant
    object Accountant : Screen("accountant")
    object AccountantDashboard : Screen("accountant/dashboard")
    object AccountantPayments : Screen("accountant/payments")
    object AccountantExpenses : Screen("accountant/expenses")
    object AccountantBalances : Screen("accountant/balances")
    object AccountantReceipts : Screen("accountant/receipts")
    object AccountantReports : Screen("accountant/reports")
    object AccountantNotifications : Screen("accountant/notifications")
    object AccountantSettings : Screen("accountant/settings")
    
    // Librarian
    object Librarian : Screen("librarian")
    object LibrarianDashboard : Screen("librarian/dashboard")
    object LibrarianBooks : Screen("librarian/books")
    object LibrarianAddBook : Screen("librarian/books/add")
    object LibrarianEditBook : Screen("librarian/books/edit/{bookId}") {
        fun createRoute(bookId: String) = "librarian/books/edit/$bookId"
    }
    object LibrarianIssueReturn : Screen("librarian/issue-return")
    object LibrarianOverdue : Screen("librarian/overdue")
    object LibrarianReports : Screen("librarian/reports")
    object LibrarianCategories : Screen("librarian/categories")
    object LibrarianNotifications : Screen("librarian/notifications")
    object LibrarianSettings : Screen("librarian/settings")
    object LibrarianMore : Screen("librarian/more")
    object LibrarianStudentProfile : Screen("librarian/student-profile/{studentId}") {
        fun createRoute(studentId: String) = "librarian/student-profile/$studentId"
    }
    
    // Head Teacher
    object HeadTeacher : Screen("head_teacher")
    object HeadTeacherDashboard : Screen("head_teacher/dashboard")
    object HeadTeacherAcademics : Screen("head_teacher/academics")
    object HeadTeacherApprovals : Screen("head_teacher/approvals")
    object HeadTeacherAnnouncements : Screen("head_teacher/announcements")
    object HeadTeacherReports : Screen("head_teacher/reports")
    object HeadTeacherSettings : Screen("head_teacher/settings")
    
    // Owner
    object OwnerDashboard : Screen("owner/dashboard")
}

/** Maps user role from Supabase to the host route for that role. */
fun roleToDashboardRoute(role: String): String = when (role.lowercase()) {
    "admin" -> Screen.Admin.route
    "teacher" -> Screen.Teacher.route
    "accountant" -> Screen.Accountant.route
    "parent" -> Screen.Parent.route
    "librarian" -> Screen.Librarian.route
    "head_teacher", "head teacher" -> Screen.HeadTeacher.route
    "owner" -> Screen.OwnerDashboard.route
    "student" -> Screen.StudentDashboard.route
    else -> Screen.Admin.route
}

@Composable
fun AppNavigation(
    navController: NavHostController,
    startDestination: String = Screen.Login.route,
    onLogout: (() -> Unit)? = null
) {
    val logoutAction: () -> Unit = onLogout ?: {
        navController.navigate(Screen.Login.route) {
            popUpTo(Screen.Login.route) { inclusive = true }
            launchSingleTop = true
        }
    }
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = { role ->
                    val route = roleToDashboardRoute(role)
                    navController.navigate(route) {
                        popUpTo(Screen.Login.route) { inclusive = true }
                        launchSingleTop = true
                    }
                },
                onNavigateToRegister = { navController.navigate(Screen.Register.route) },
                onNavigateToForgotPassword = { navController.navigate(Screen.ForgotPassword.route) }
            )
        }
        
        composable(Screen.Register.route) {
            RegisterScreen(
                onRegisterSuccess = { navController.navigate(Screen.Login.route) },
                onNavigateToLogin = { navController.popBackStack() }
            )
        }
        
        composable(Screen.ForgotPassword.route) {
            ForgotPasswordScreen(
                onBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Admin.route) {
            AdminHost(
                onLogout = logoutAction
            )
        }
        
        composable(Screen.Teacher.route) {
            TeacherHost(
                onLogout = logoutAction
            )
        }
        
        composable(Screen.Accountant.route) {
            AccountantHost(
                onLogout = logoutAction
            )
        }

        composable(Screen.Parent.route) {
            ParentHost(
                onLogout = logoutAction
            )
        }

        composable(Screen.Librarian.route) {
            LibrarianHost(
                onLogout = logoutAction
            )
        }

        composable(Screen.HeadTeacher.route) {
            HeadTeacherHost(
                onLogout = logoutAction
            )
        }

        composable(Screen.OwnerDashboard.route) {
            OwnerPlaceholderScreen(onLogout = logoutAction)
        }

        composable(Screen.StudentDashboard.route) {
            // TODO: Implement StudentDashboard
        }

        // Add more routes as needed
    }
}




