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
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.pwezacore.ui.navigation.Screen
import com.pwezacore.ui.theme.GlassConstants
import com.pwezacore.ui.theme.glassBlur
import com.pwezacore.ui.screens.headteacher.HeadTeacherDashboardScreen
import com.pwezacore.ui.screens.headteacher.HeadTeacherAcademicsScreen
import com.pwezacore.ui.screens.headteacher.HeadTeacherApprovalsScreen
import com.pwezacore.ui.screens.headteacher.HeadTeacherAnnouncementsScreen
import com.pwezacore.ui.screens.headteacher.HeadTeacherReportsScreen
import com.pwezacore.ui.screens.headteacher.HeadTeacherSettingsScreen
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HeadTeacherHost(
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val navController: NavHostController = rememberNavController()
    val drawerState: DrawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val titleForRoute = when (currentRoute) {
        Screen.HeadTeacherDashboard.route -> "Dashboard"
        Screen.HeadTeacherAcademics.route -> "Academics"
        Screen.HeadTeacherApprovals.route -> "Approvals"
        Screen.HeadTeacherAnnouncements.route -> "Announcements"
        Screen.HeadTeacherReports.route -> "Reports"
        Screen.HeadTeacherSettings.route -> "Settings"
        else -> "Head Teacher"
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(
                drawerContainerColor = androidx.compose.ui.graphics.Color.Transparent
            ) {
                Box(Modifier.fillMaxSize()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .glassBlur(GlassConstants.BLUR_RADIUS_DRAWER)
                    ) {
                        HeadTeacherMainContent(
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
                    HeadTeacherDrawerContent(
                        currentRoute = currentRoute,
                        onItemClick = { route ->
                            navController.navigate(route) {
                                popUpTo(Screen.HeadTeacherDashboard.route) { saveState = true }
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
        HeadTeacherMainContent(
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
private fun HeadTeacherMainContent(
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
            startDestination = Screen.HeadTeacherDashboard.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.HeadTeacherDashboard.route) {
                HeadTeacherDashboardScreen(
                    onNavigateToAcademics = { navController.navigate(Screen.HeadTeacherAcademics.route) },
                    onNavigateToApprovals = { navController.navigate(Screen.HeadTeacherApprovals.route) },
                    onNavigateToReports = { navController.navigate(Screen.HeadTeacherReports.route) }
                )
            }
            composable(Screen.HeadTeacherAcademics.route) {
                HeadTeacherAcademicsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.HeadTeacherApprovals.route) {
                HeadTeacherApprovalsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.HeadTeacherAnnouncements.route) {
                HeadTeacherAnnouncementsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.HeadTeacherReports.route) {
                HeadTeacherReportsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.HeadTeacherSettings.route) {
                HeadTeacherSettingsScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}
