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
import com.pwezacore.ui.screens.accountant.AccountantBalancesScreen
import com.pwezacore.ui.screens.accountant.AccountantDashboardScreen
import com.pwezacore.ui.screens.accountant.AccountantExpensesScreen
import com.pwezacore.ui.screens.accountant.AccountantNotificationsScreen
import com.pwezacore.ui.screens.accountant.AccountantPaymentsScreen
import com.pwezacore.ui.screens.accountant.AccountantReceiptsScreen
import com.pwezacore.ui.screens.accountant.AccountantReportsScreen
import com.pwezacore.ui.screens.accountant.AccountantSettingsScreen
import com.pwezacore.ui.theme.GlassConstants
import com.pwezacore.ui.theme.glassBlur
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountantHost(
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val navController: NavHostController = rememberNavController()
    val drawerState: DrawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val titleForRoute = when (currentRoute) {
        Screen.AccountantDashboard.route -> "Dashboard"
        Screen.AccountantPayments.route -> "Payments"
        Screen.AccountantExpenses.route -> "Expenses"
        Screen.AccountantBalances.route -> "Balances"
        Screen.AccountantReceipts.route -> "Receipts"
        Screen.AccountantReports.route -> "Reports"
        Screen.AccountantNotifications.route -> "Notifications"
        Screen.AccountantSettings.route -> "Settings"
        else -> "Accountant"
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
                        AccountantMainContent(
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
                    AccountantDrawerContent(
                        currentRoute = currentRoute,
                        onItemClick = { route ->
                            navController.navigate(route) {
                                popUpTo(Screen.AccountantDashboard.route) { saveState = true }
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
        AccountantMainContent(
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
private fun AccountantMainContent(
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
            startDestination = Screen.AccountantDashboard.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.AccountantDashboard.route) {
                AccountantDashboardScreen(
                    onNavigateToPayments = { navController.navigate(Screen.AccountantPayments.route) },
                    onNavigateToExpenses = { navController.navigate(Screen.AccountantExpenses.route) },
                    onNavigateToBalances = { navController.navigate(Screen.AccountantBalances.route) },
                    onNavigateToReports = { navController.navigate(Screen.AccountantReports.route) }
                )
            }
            composable(Screen.AccountantPayments.route) {
                AccountantPaymentsScreen()
            }
            composable(Screen.AccountantExpenses.route) {
                AccountantExpensesScreen()
            }
            composable(Screen.AccountantBalances.route) {
                AccountantBalancesScreen()
            }
            composable(Screen.AccountantReceipts.route) {
                AccountantReceiptsScreen()
            }
            composable(Screen.AccountantReports.route) {
                AccountantReportsScreen()
            }
            composable(Screen.AccountantNotifications.route) {
                AccountantNotificationsScreen()
            }
            composable(Screen.AccountantSettings.route) {
                AccountantSettingsScreen()
            }
        }
    }
}
