package com.pwezacore.ui.components

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.pwezacore.ui.navigation.Screen
import com.pwezacore.ui.screens.librarian.LibrarianAddBookScreen
import com.pwezacore.ui.screens.librarian.LibrarianBooksScreen
import com.pwezacore.ui.screens.librarian.LibrarianCategoriesScreen
import com.pwezacore.ui.screens.librarian.LibrarianDashboardScreen
import com.pwezacore.ui.screens.librarian.LibrarianEditBookScreen
import com.pwezacore.ui.screens.librarian.LibrarianIssueReturnScreen
import com.pwezacore.ui.screens.librarian.LibrarianMoreScreen
import com.pwezacore.ui.screens.librarian.LibrarianNotificationsScreen
import com.pwezacore.ui.screens.librarian.LibrarianOverdueScreen
import com.pwezacore.ui.screens.librarian.LibrarianReportsScreen
import com.pwezacore.ui.screens.librarian.LibrarianSettingsScreen
import com.pwezacore.ui.screens.librarian.LibrarianStudentProfileScreen

data class LibrarianBottomNavItem(
    val route: String,
    val label: String,
    val icon: ImageVector
)

val librarianBottomNavItems = listOf(
    LibrarianBottomNavItem(Screen.LibrarianDashboard.route, "Home", Icons.Default.Dashboard),
    LibrarianBottomNavItem(Screen.LibrarianBooks.route, "Books", Icons.Default.MenuBook),
    LibrarianBottomNavItem(Screen.LibrarianIssueReturn.route, "Issue/Return", Icons.Default.SwapHoriz),
    LibrarianBottomNavItem(Screen.LibrarianOverdue.route, "Overdue", Icons.Default.Warning),
    LibrarianBottomNavItem(Screen.LibrarianMore.route, "More", Icons.Default.MoreHoriz)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LibrarianHost(
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val navController: NavHostController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val titleForRoute = when {
        currentRoute == Screen.LibrarianDashboard.route -> "Dashboard"
        currentRoute == Screen.LibrarianBooks.route -> "Books"
        currentRoute == Screen.LibrarianAddBook.route -> "Add Book"
        currentRoute?.startsWith("librarian/books/edit") == true -> "Edit Book"
        currentRoute == Screen.LibrarianIssueReturn.route -> "Issue/Return"
        currentRoute == Screen.LibrarianOverdue.route -> "Overdue"
        currentRoute == Screen.LibrarianReports.route -> "Reports"
        currentRoute == Screen.LibrarianCategories.route -> "Categories"
        currentRoute == Screen.LibrarianNotifications.route -> "Notifications"
        currentRoute == Screen.LibrarianSettings.route -> "Settings"
        currentRoute == Screen.LibrarianMore.route -> "More"
        currentRoute?.startsWith("librarian/student-profile") == true -> "Student Profile"
        else -> "Library"
    }

    val showBottomBar = currentRoute in librarianBottomNavItems.map { it.route }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(titleForRoute) },
                actions = {
                    IconButton(onClick = { navController.navigate(Screen.LibrarianBooks.route) }) {
                        Icon(Icons.Default.Search, contentDescription = "Search books")
                    }
                    IconButton(onClick = { /* Scan barcode placeholder */ }) {
                        Icon(Icons.Default.QrCodeScanner, contentDescription = "Scan barcode")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                    titleContentColor = MaterialTheme.colorScheme.primary
                )
            )
        },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    librarianBottomNavItems.forEach { item ->
                        val selected = currentRoute == item.route
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(item.route) {
                                    popUpTo(Screen.LibrarianDashboard.route) { saveState = true }
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
            startDestination = Screen.LibrarianDashboard.route,
            modifier = Modifier.padding(paddingValues)
        ) {
            composable(Screen.LibrarianDashboard.route) {
                LibrarianDashboardScreen(
                    onNavigateToBooks = { navController.navigate(Screen.LibrarianBooks.route) },
                    onNavigateToIssueReturn = { navController.navigate(Screen.LibrarianIssueReturn.route) },
                    onNavigateToOverdue = { navController.navigate(Screen.LibrarianOverdue.route) },
                    onNavigateToReports = { navController.navigate(Screen.LibrarianReports.route) }
                )
            }
            composable(Screen.LibrarianBooks.route) {
                LibrarianBooksScreen(
                    onAddBook = { navController.navigate(Screen.LibrarianAddBook.route) },
                    onEditBook = { bookId -> navController.navigate(Screen.LibrarianEditBook.createRoute(bookId)) }
                )
            }
            composable(Screen.LibrarianAddBook.route) {
                LibrarianAddBookScreen(
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() }
                )
            }
            composable(
                route = Screen.LibrarianEditBook.route,
                arguments = listOf(navArgument("bookId") { type = NavType.StringType })
            ) { backStackEntry ->
                val bookId = backStackEntry.arguments?.getString("bookId") ?: return@composable
                LibrarianEditBookScreen(
                    bookId = bookId,
                    onBack = { navController.popBackStack() },
                    onSaved = { navController.popBackStack() }
                )
            }
            composable(Screen.LibrarianIssueReturn.route) {
                LibrarianIssueReturnScreen(
                    onBack = { navController.popBackStack() },
                    onViewStudentProfile = { studentId -> navController.navigate(Screen.LibrarianStudentProfile.createRoute(studentId)) }
                )
            }
            composable(Screen.LibrarianOverdue.route) {
                LibrarianOverdueScreen(
                    onBack = { navController.popBackStack() },
                    onViewStudentProfile = { studentId -> navController.navigate(Screen.LibrarianStudentProfile.createRoute(studentId)) }
                )
            }
            composable(Screen.LibrarianReports.route) {
                LibrarianReportsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.LibrarianCategories.route) {
                LibrarianCategoriesScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.LibrarianNotifications.route) {
                LibrarianNotificationsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.LibrarianSettings.route) {
                LibrarianSettingsScreen(onBack = { navController.popBackStack() })
            }
            composable(Screen.LibrarianMore.route) {
                LibrarianMoreScreen(
                    onNavigateToReports = { navController.navigate(Screen.LibrarianReports.route) },
                    onNavigateToCategories = { navController.navigate(Screen.LibrarianCategories.route) },
                    onNavigateToNotifications = { navController.navigate(Screen.LibrarianNotifications.route) },
                    onNavigateToSettings = { navController.navigate(Screen.LibrarianSettings.route) },
                    onLogout = onLogout
                )
            }
            composable(
                route = Screen.LibrarianStudentProfile.route,
                arguments = listOf(navArgument("studentId") { type = NavType.StringType })
            ) { backStackEntry ->
                val studentId = backStackEntry.arguments?.getString("studentId") ?: return@composable
                LibrarianStudentProfileScreen(
                    studentId = studentId,
                    onBack = { navController.popBackStack() }
                )
            }
        }
    }
}
