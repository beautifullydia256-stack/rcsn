package com.pwezacore.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.pwezacore.ui.screens.auth.LoginScreen
import com.pwezacore.ui.screens.auth.RegisterScreen
import com.pwezacore.ui.screens.auth.ForgotPasswordScreen

sealed class Screen(val route: String) {
    // Auth
    object Login : Screen("login")
    object Register : Screen("register")
    object ForgotPassword : Screen("forgot_password")
    
    // Admin
    object AdminDashboard : Screen("admin/dashboard")
    object Students : Screen("admin/students")
    object Teachers : Screen("admin/teachers")
    
    // Teacher
    object TeacherDashboard : Screen("teacher/dashboard")
    object MyClasses : Screen("teacher/classes")
    
    // Student
    object StudentDashboard : Screen("student/dashboard")
    object MyReports : Screen("student/reports")
    
    // Parent
    object ParentDashboard : Screen("parent/dashboard")
    
    // Accountant
    object AccountantDashboard : Screen("accountant/dashboard")
    
    // Librarian
    object LibrarianDashboard : Screen("librarian/dashboard")
    
    // Head Teacher
    object HeadTeacherDashboard : Screen("head_teacher/dashboard")
    
    // Owner
    object OwnerDashboard : Screen("owner/dashboard")
}

@Composable
fun AppNavigation(
    navController: NavHostController,
    startDestination: String = Screen.Login.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Login.route) {
            LoginScreen(
                onLoginSuccess = { navController.navigate(Screen.AdminDashboard.route) },
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
        
        composable(Screen.AdminDashboard.route) {
            // TODO: Implement AdminDashboard
        }
        
        composable(Screen.TeacherDashboard.route) {
            // TODO: Implement TeacherDashboard
        }
        
        composable(Screen.StudentDashboard.route) {
            // TODO: Implement StudentDashboard
        }
        
        // Add more routes as needed
    }
}




