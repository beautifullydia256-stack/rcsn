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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
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
import com.pwezacore.ui.screens.teacher.MyClassesScreen
import com.pwezacore.ui.screens.teacher.MyStudentsScreen
import com.pwezacore.ui.screens.teacher.TeacherAIPlannerScreen
import com.pwezacore.ui.screens.teacher.TeacherAssignmentsScreen
import com.pwezacore.ui.screens.teacher.TeacherAttendanceScreen
import com.pwezacore.ui.screens.teacher.TeacherDashboardScreen
import com.pwezacore.ui.screens.teacher.TeacherExamResultsScreen
import com.pwezacore.ui.screens.teacher.TeacherMessagesScreen
import com.pwezacore.ui.screens.teacher.TeacherNotificationsScreen
import com.pwezacore.ui.screens.teacher.TeacherResourcesScreen
import com.pwezacore.ui.screens.teacher.TeacherSettingsScreen
import com.pwezacore.ui.screens.teacher.TeacherTimetableScreen
import com.pwezacore.ui.theme.GlassConstants
import com.pwezacore.ui.theme.glassBlur
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherHost(
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val navController: NavHostController = rememberNavController()
    val drawerState: DrawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val titleForRoute = when (currentRoute) {
        Screen.TeacherDashboard.route -> "Dashboard"
        Screen.MyClasses.route -> "My Classes"
        Screen.TeacherStudents.route -> "My Students"
        Screen.TeacherAttendance.route -> "Attendance"
        Screen.TeacherExamResults.route -> "Exams & Results"
        Screen.TeacherTimetable.route -> "Timetable"
        Screen.TeacherAIPlanner.route -> "AI Lesson Planner"
        Screen.TeacherAssignments.route -> "Assignments"
        Screen.TeacherResources.route -> "Resources"
        Screen.TeacherMessages.route -> "Messages"
        Screen.TeacherNotifications.route -> "Notifications"
        Screen.TeacherSettings.route -> "Settings"
        else -> "Teacher"
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = Color.Transparent
            ) {
                Box(Modifier.fillMaxSize()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .glassBlur(GlassConstants.BLUR_RADIUS_DRAWER)
                    ) {
                        TeacherMainContent(
                            navController = navController,
                            drawerState = drawerState,
                            scope = scope,
                            titleForRoute = titleForRoute,
                            onLogout = onLogout
                        )
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.06f))
                    )
                    TeacherDrawerContent(
                        currentRoute = currentRoute,
                        onItemClick = { route ->
                            navController.navigate(route) {
                                popUpTo(Screen.TeacherDashboard.route) { saveState = true }
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
        TeacherMainContent(
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
private fun TeacherMainContent(
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
            startDestination = Screen.TeacherDashboard.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.TeacherDashboard.route) {
                TeacherDashboardScreen(
                    onNavigateToMyClasses = { navController.navigate(Screen.MyClasses.route) },
                    onNavigateToMyStudents = { navController.navigate(Screen.TeacherStudents.route) },
                    onNavigateToAttendance = { navController.navigate(Screen.TeacherAttendance.route) },
                    onNavigateToExamResults = { navController.navigate(Screen.TeacherExamResults.route) },
                    onNavigateToTimetable = { navController.navigate(Screen.TeacherTimetable.route) },
                    onNavigateToAIPlanner = { navController.navigate(Screen.TeacherAIPlanner.route) },
                    onNavigateToAssignments = { navController.navigate(Screen.TeacherAssignments.route) },
                    onNavigateToResources = { navController.navigate(Screen.TeacherResources.route) },
                    onNavigateToMessages = { navController.navigate(Screen.TeacherMessages.route) },
                    onNavigateToNotifications = { navController.navigate(Screen.TeacherNotifications.route) },
                    onNavigateToSettings = { navController.navigate(Screen.TeacherSettings.route) }
                )
            }
            composable(Screen.MyClasses.route) {
                MyClassesScreen()
            }
            composable(Screen.TeacherStudents.route) {
                MyStudentsScreen()
            }
            composable(Screen.TeacherAttendance.route) {
                TeacherAttendanceScreen()
            }
            composable(Screen.TeacherExamResults.route) {
                TeacherExamResultsScreen()
            }
            composable(Screen.TeacherTimetable.route) {
                TeacherTimetableScreen()
            }
            composable(Screen.TeacherAIPlanner.route) {
                TeacherAIPlannerScreen()
            }
            composable(Screen.TeacherAssignments.route) {
                TeacherAssignmentsScreen()
            }
            composable(Screen.TeacherResources.route) {
                TeacherResourcesScreen()
            }
            composable(Screen.TeacherMessages.route) {
                TeacherMessagesScreen()
            }
            composable(Screen.TeacherNotifications.route) {
                TeacherNotificationsScreen()
            }
            composable(Screen.TeacherSettings.route) {
                TeacherSettingsScreen()
            }
        }
    }
}
