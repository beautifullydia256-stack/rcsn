package com.pwezacore.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.DrawerState
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.pwezacore.ui.navigation.Screen
import com.pwezacore.ui.theme.GlassConstants
import com.pwezacore.ui.theme.glassBlur
import com.pwezacore.ui.screens.admin.AdminDashboardScreen
import com.pwezacore.ui.screens.admin.AddParentScreen
import com.pwezacore.ui.screens.admin.AddStudentScreen
import com.pwezacore.ui.screens.admin.AddTeacherScreen
import com.pwezacore.ui.screens.admin.AttendanceScreen
import com.pwezacore.ui.screens.admin.ClassesScreen
import com.pwezacore.ui.screens.admin.ExamSetsScreen
import com.pwezacore.ui.screens.admin.FinanceScreen
import com.pwezacore.ui.screens.admin.IdentityScreen
import com.pwezacore.ui.screens.admin.JobVacanciesScreen
import com.pwezacore.ui.screens.admin.NotificationsScreen
import com.pwezacore.ui.screens.admin.ParentsScreen
import com.pwezacore.ui.screens.admin.ReportsScreen
import com.pwezacore.ui.screens.admin.GenerateReportScreen
import com.pwezacore.ui.screens.admin.StaffScreen
import com.pwezacore.ui.screens.admin.StudentsScreen
import com.pwezacore.ui.screens.admin.SystemSettingsScreen
import com.pwezacore.ui.screens.admin.TeachersScreen
import com.pwezacore.ui.screens.admin.RecordPaymentScreen
import com.pwezacore.ui.screens.admin.SettingsSectionScreen
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminHost(
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val navController: NavHostController = rememberNavController()
    val drawerState: DrawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val titleForRoute = when (currentRoute) {
        Screen.AdminDashboard.route -> "Dashboard"
        Screen.Students.route -> "Students"
        Screen.Teachers.route -> "Teachers"
        Screen.Parents.route -> "Parents"
        Screen.Staff.route -> "Staff"
        Screen.Finance.route -> "Finance"
        Screen.Reports.route -> "Reports"
        Screen.GenerateReport.route -> "Generate Report"
        Screen.Attendance.route -> "Attendance"
        Screen.ExamSets.route -> "Exam Sets"
        Screen.Identity.route -> "Identity"
        Screen.Classes.route -> "Classes"
        Screen.JobVacancies.route -> "Job Vacancies"
        Screen.SystemSettings.route -> "System Settings"
        Screen.Notifications.route -> "Notifications"
        Screen.AddStudent.route -> "Add Student"
        Screen.AddTeacher.route -> "Add Teacher"
        Screen.AddParent.route -> "Add Parent"
        Screen.RecordPayment.route -> "Record Payment"
        Screen.SettingsSchoolProfile.route -> "School Profile"
        Screen.SettingsSubjectsPerClass.route -> "Subjects per Class"
        Screen.SettingsTeacherSubjectClass.route -> "Teacher ↔ Subject ↔ Class"
        Screen.SettingsTermSettings.route -> "Term Settings"
        Screen.SettingsTimetableDesigner.route -> "Timetable Designer"
        Screen.SettingsFinancial.route -> "Financial Settings"
        Screen.SettingsSchoolRequirements.route -> "School Requirements"
        Screen.SettingsLocation.route -> "Location"
        else -> "Admin"
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = Color.Transparent
            ) {
                Box(Modifier.fillMaxSize()) {
                    // Real glass: blur the same main content so the background page is visible but blurred
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .glassBlur(GlassConstants.BLUR_RADIUS_DRAWER)
                    ) {
                        AdminMainContent(
                            navController = navController,
                            drawerState = drawerState,
                            scope = scope,
                            titleForRoute = titleForRoute,
                            onLogout = onLogout
                        )
                    }
                    // Very light scrim so sidebar text stays readable (no frost, just contrast)
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.06f))
                    )
                    AdminDrawerContent(
                        currentRoute = currentRoute,
                        onItemClick = { route ->
                            navController.navigate(route) {
                                popUpTo(Screen.AdminDashboard.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                            scope.launch { drawerState.close() }
                        },
                        onLogout = {
                            scope.launch { drawerState.close() }
                            onLogout()
                        },
                        modifier = Modifier.padding(0.dp)
                    )
                }
            }
        },
        modifier = modifier
    ) {
        AdminMainContent(
            navController = navController,
            drawerState = drawerState,
            scope = scope,
            titleForRoute = titleForRoute,
            onLogout = onLogout
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminMainContent(
    navController: NavHostController,
    drawerState: DrawerState,
    scope: kotlinx.coroutines.CoroutineScope,
    titleForRoute: String,
    onLogout: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(titleForRoute) },
                navigationIcon = {
                    IconButton(onClick = { scope.launch { drawerState.open() } }) {
                        Icon(Icons.Default.Menu, contentDescription = "Open menu")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.primary,
                    navigationIconContentColor = MaterialTheme.colorScheme.primary
                )
            )
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.AdminDashboard.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.AdminDashboard.route) {
                AdminDashboardScreen(
                    onLogout = onLogout,
                    onNavigateToStudents = { navController.navigate(Screen.Students.route) },
                    onNavigateToTeachers = { navController.navigate(Screen.Teachers.route) },
                    onNavigateToFinance = { navController.navigate(Screen.Finance.route) },
                    onNavigateToReports = { navController.navigate(Screen.Reports.route) },
                    onNavigateToParents = { navController.navigate(Screen.Parents.route) },
                    onAddStudent = { navController.navigate(Screen.AddStudent.route) },
                    onAddTeacher = { navController.navigate(Screen.AddTeacher.route) },
                    onAddParent = { navController.navigate(Screen.AddParent.route) },
                    onRecordPayment = { navController.navigate(Screen.RecordPayment.route) }
                )
            }
            composable(Screen.Students.route) {
                StudentsScreen(
                    onBack = { navController.popBackStack() },
                    onAddStudent = { navController.navigate(Screen.AddStudent.route) }
                )
            }
            composable(Screen.Teachers.route) {
                TeachersScreen(
                    onBack = { navController.popBackStack() },
                    onAddTeacher = { navController.navigate(Screen.AddTeacher.route) }
                )
            }
            composable(Screen.Parents.route) {
                ParentsScreen(onAddParent = { navController.navigate(Screen.AddParent.route) })
            }
            composable(Screen.AddStudent.route) {
                AddStudentScreen(
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() }
                )
            }
            composable(Screen.AddTeacher.route) {
                AddTeacherScreen(
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() }
                )
            }
            composable(Screen.AddParent.route) {
                AddParentScreen(
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() }
                )
            }
            composable(Screen.RecordPayment.route) {
                RecordPaymentScreen(
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() }
                )
            }
            composable(Screen.Staff.route) {
                StaffScreen(onAddStaff = { })
            }
            composable(Screen.Finance.route) {
                FinanceScreen(
                    onRecordPayment = { navController.navigate(Screen.RecordPayment.route) },
                    onViewOutstanding = { }
                )
            }
            composable(Screen.Reports.route) {
                ReportsScreen(onGenerateReport = { navController.navigate(Screen.GenerateReport.route) })
            }
            composable(Screen.GenerateReport.route) {
                GenerateReportScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.Attendance.route) {
                AttendanceScreen(
                    onTakeAttendance = { },
                    onViewRecords = { }
                )
            }
            composable(Screen.ExamSets.route) {
                ExamSetsScreen(onAddExamSet = { })
            }
            composable(Screen.Identity.route) {
                IdentityScreen(onGenerateIdCards = { })
            }
            composable(Screen.Classes.route) {
                ClassesScreen(
                    onAddClass = { },
                    onManageClasses = { }
                )
            }
            composable(Screen.JobVacancies.route) {
                JobVacanciesScreen(onPostJob = { })
            }
            composable(Screen.SystemSettings.route) {
                SystemSettingsScreen(
                    onSchoolProfile = { navController.navigate(Screen.SettingsSchoolProfile.route) },
                    onClasses = { navController.navigate(Screen.Classes.route) },
                    onSubjectsPerClass = { navController.navigate(Screen.SettingsSubjectsPerClass.route) },
                    onTeacherSubjectClass = { navController.navigate(Screen.SettingsTeacherSubjectClass.route) },
                    onTermSettings = { navController.navigate(Screen.SettingsTermSettings.route) },
                    onExamSets = { navController.navigate(Screen.ExamSets.route) },
                    onTimetableDesigner = { navController.navigate(Screen.SettingsTimetableDesigner.route) },
                    onFinancialSettings = { navController.navigate(Screen.SettingsFinancial.route) },
                    onSchoolRequirements = { navController.navigate(Screen.SettingsSchoolRequirements.route) },
                    onLocation = { navController.navigate(Screen.SettingsLocation.route) },
                    onQuickLinkExamSets = { navController.navigate(Screen.ExamSets.route) },
                    onQuickLinkOldStudents = { },
                    onQuickLinkFinanceRecords = { navController.navigate(Screen.Finance.route) },
                    onQuickLinkAttendanceRecords = { navController.navigate(Screen.Attendance.route) },
                    onQuickLinkReportRecords = { navController.navigate(Screen.Reports.route) }
                )
            }
            composable(Screen.SettingsSchoolProfile.route) {
                SettingsSectionScreen(
                    title = "School profile / Branding",
                    description = "Name, logo, address, contact. Same as on the web."
                )
            }
            composable(Screen.SettingsSubjectsPerClass.route) {
                SettingsSectionScreen(
                    title = "Subjects per Class",
                    description = "Manage the list of subjects taught in each class/grade."
                )
            }
            composable(Screen.SettingsTeacherSubjectClass.route) {
                SettingsSectionScreen(
                    title = "Teacher ↔ Subject ↔ Class",
                    description = "Assign teachers to subjects and classes."
                )
            }
            composable(Screen.SettingsTermSettings.route) {
                SettingsSectionScreen(
                    title = "Term Settings",
                    description = "Academic terms and dates."
                )
            }
            composable(Screen.SettingsTimetableDesigner.route) {
                SettingsSectionScreen(
                    title = "Timetable Designer",
                    description = "Set periods per day, assign classes, subjects and teachers."
                )
            }
            composable(Screen.SettingsFinancial.route) {
                SettingsSectionScreen(
                    title = "Financial Settings",
                    description = "Fee structure, payment settings."
                )
            }
            composable(Screen.SettingsSchoolRequirements.route) {
                SettingsSectionScreen(
                    title = "School Requirements",
                    description = "Requirements and policies."
                )
            }
            composable(Screen.SettingsLocation.route) {
                SettingsSectionScreen(
                    title = "Location",
                    description = "School location and map."
                )
            }
            composable(Screen.Notifications.route) {
                NotificationsScreen()
            }
        }
    }
}
