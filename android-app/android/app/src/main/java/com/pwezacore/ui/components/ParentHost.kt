package com.pwezacore.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.pwezacore.ui.navigation.Screen
import com.pwezacore.ui.screens.parent.ParentAcademicsScreen
import com.pwezacore.ui.screens.parent.ParentAssignmentsScreen
import com.pwezacore.ui.screens.parent.ParentDisciplineScreen
import com.pwezacore.ui.screens.parent.ParentDocumentsScreen
import com.pwezacore.ui.screens.parent.ParentEventsScreen
import com.pwezacore.ui.screens.parent.ParentFeesScreen
import com.pwezacore.ui.screens.parent.ParentMedicalScreen
import com.pwezacore.ui.screens.parent.ParentMessagesScreen
import com.pwezacore.ui.screens.parent.ParentMoreScreen
import com.pwezacore.ui.screens.parent.ParentNotificationsScreen
import com.pwezacore.ui.screens.parent.ParentProfileScreen
import com.pwezacore.ui.screens.parent.ParentTransportScreen
import com.pwezacore.ui.screens.parent.ParentAIAssistantScreen
import com.pwezacore.ui.screens.parent.ParentAttendanceScreen
import com.pwezacore.ui.screens.parent.ParentDashboardScreen
import com.pwezacore.ui.screens.parent.ParentSettingsScreen

data class ParentBottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
)

val parentBottomNavItems = listOf(
    ParentBottomNavItem(Screen.ParentDashboard.route, "Home", Icons.Default.Dashboard),
    ParentBottomNavItem(Screen.ParentFees.route, "Fees", Icons.Default.Payment),
    ParentBottomNavItem(Screen.ParentAcademics.route, "Academic", Icons.Default.School),
    ParentBottomNavItem(Screen.ParentMessages.route, "Messages", Icons.Default.Message),
    ParentBottomNavItem(Screen.ParentMore.route, "More", Icons.Default.MoreHoriz)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ParentHost(
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val navController: NavHostController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val titleForRoute = when (currentRoute) {
        Screen.ParentDashboard.route -> "Home"
        Screen.ParentFees.route -> "Fees & Payments"
        Screen.ParentAcademics.route -> "Academic"
        Screen.ParentMessages.route -> "Messages"
        Screen.ParentMore.route -> "More"
        Screen.ParentProfile.route -> "Profile"
        Screen.ParentAttendance.route -> "Attendance"
        Screen.ParentAssignments.route -> "Assignments"
        Screen.ParentEvents.route -> "Events & Calendar"
        Screen.ParentDiscipline.route -> "Discipline"
        Screen.ParentTransport.route -> "Transport"
        Screen.ParentMedical.route -> "Medical"
        Screen.ParentDocuments.route -> "Documents"
        Screen.ParentNotifications.route -> "Notifications"
        Screen.ParentAIAssistant.route -> "AI Assistant"
        Screen.ParentSettings.route -> "Settings"
        else -> "Parent"
    }

    val showBottomBar = currentRoute in parentBottomNavItems.map { it.route }

    ParentMainContent(
        navController = navController,
        titleForRoute = titleForRoute,
        showBottomBar = showBottomBar,
        currentRoute = currentRoute,
        onLogout = onLogout
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ParentMainContent(
    navController: NavHostController,
    titleForRoute: String,
    showBottomBar: Boolean,
    currentRoute: String?,
    onLogout: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(titleForRoute) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.primary
                )
            )
        },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    parentBottomNavItems.forEach { item ->
                        val selected = currentRoute == item.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(Screen.ParentDashboard.route) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(item.icon, contentDescription = item.label) },
                            label = { Text(item.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = MaterialTheme.colorScheme.primary,
                                selectedTextColor = MaterialTheme.colorScheme.primary,
                                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = Screen.ParentDashboard.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.ParentDashboard.route) {
                ParentDashboardScreen(
                    onNavigateToFees = { navController.navigate(Screen.ParentFees.route) },
                    onNavigateToAcademics = { navController.navigate(Screen.ParentAcademics.route) },
                    onNavigateToMessages = { navController.navigate(Screen.ParentMessages.route) },
                    onNavigateToProfile = { navController.navigate(Screen.ParentProfile.route) },
                    onNavigateToAttendance = { navController.navigate(Screen.ParentAttendance.route) },
                    onNavigateToAssignments = { navController.navigate(Screen.ParentAssignments.route) },
                    onNavigateToEvents = { navController.navigate(Screen.ParentEvents.route) },
                    onNavigateToDiscipline = { navController.navigate(Screen.ParentDiscipline.route) },
                    onNavigateToTransport = { navController.navigate(Screen.ParentTransport.route) },
                    onNavigateToMedical = { navController.navigate(Screen.ParentMedical.route) },
                    onNavigateToDocuments = { navController.navigate(Screen.ParentDocuments.route) },
                    onNavigateToNotifications = { navController.navigate(Screen.ParentNotifications.route) },
                    onNavigateToAIAssistant = { navController.navigate(Screen.ParentAIAssistant.route) },
                    onNavigateToSettings = { navController.navigate(Screen.ParentSettings.route) }
                )
            }
            composable(Screen.ParentFees.route) {
                ParentFeesScreen()
            }
            composable(Screen.ParentAcademics.route) {
                ParentAcademicsScreen()
            }
            composable(Screen.ParentMessages.route) {
                ParentMessagesScreen()
            }
            composable(Screen.ParentMore.route) {
                ParentMoreScreen(
                    onNavigateToProfile = { navController.navigate(Screen.ParentProfile.route) },
                    onNavigateToAttendance = { navController.navigate(Screen.ParentAttendance.route) },
                    onNavigateToAssignments = { navController.navigate(Screen.ParentAssignments.route) },
                    onNavigateToEvents = { navController.navigate(Screen.ParentEvents.route) },
                    onNavigateToDiscipline = { navController.navigate(Screen.ParentDiscipline.route) },
                    onNavigateToTransport = { navController.navigate(Screen.ParentTransport.route) },
                    onNavigateToMedical = { navController.navigate(Screen.ParentMedical.route) },
                    onNavigateToDocuments = { navController.navigate(Screen.ParentDocuments.route) },
                    onNavigateToNotifications = { navController.navigate(Screen.ParentNotifications.route) },
                    onNavigateToAIAssistant = { navController.navigate(Screen.ParentAIAssistant.route) },
                    onNavigateToSettings = { navController.navigate(Screen.ParentSettings.route) },
                    onLogout = onLogout
                )
            }
            composable(Screen.ParentProfile.route) {
                ParentProfileScreen(onNavigateToSettings = { navController.navigate(Screen.ParentSettings.route) })
            }
            composable(Screen.ParentAttendance.route) {
                ParentAttendanceScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.ParentAssignments.route) {
                ParentAssignmentsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.ParentEvents.route) {
                ParentEventsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.ParentDiscipline.route) {
                ParentDisciplineScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.ParentTransport.route) {
                ParentTransportScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.ParentMedical.route) {
                ParentMedicalScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.ParentDocuments.route) {
                ParentDocumentsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.ParentNotifications.route) {
                ParentNotificationsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.ParentAIAssistant.route) {
                ParentAIAssistantScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.ParentSettings.route) {
                ParentSettingsScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
