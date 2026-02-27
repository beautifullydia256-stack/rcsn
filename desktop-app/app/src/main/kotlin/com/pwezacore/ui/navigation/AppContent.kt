package com.pwezacore.ui.navigation

import androidx.compose.runtime.Composable
import com.pwezacore.ui.components.WebStyleAdminLayout
import com.pwezacore.ui.components.WebStyleTeacherLayout
import com.pwezacore.ui.components.WebStyleAccountantLayout
import com.pwezacore.ui.screens.auth.ForgotPasswordScreen
import com.pwezacore.ui.screens.auth.LoginScreen
import com.pwezacore.ui.screens.auth.RegisterScreen

@Composable
fun AppContent(
    currentScreen: AppScreen,
    onScreenChange: (AppScreen) -> Unit
) {
    when (val screen = currentScreen) {
        is AppScreen.Login -> LoginScreen(
            onLoginSuccess = { role ->
                val screen = when (role) {
                    "teacher" -> AppScreen.Teacher("")
                    "accountant" -> AppScreen.Accountant("")
                    else -> AppScreen.Admin("")
                }
                onScreenChange(screen)
            },
            onNavigateToRegister = { onScreenChange(AppScreen.Register) },
            onNavigateToForgotPassword = { onScreenChange(AppScreen.ForgotPassword) }
        )
        is AppScreen.Register -> RegisterScreen(
            onRegisterSuccess = { onScreenChange(AppScreen.Login) },
            onNavigateToLogin = { onScreenChange(AppScreen.Login) }
        )
        is AppScreen.ForgotPassword -> ForgotPasswordScreen(
            onBack = { onScreenChange(AppScreen.Login) }
        )
        is AppScreen.Admin -> WebStyleAdminLayout(
            currentRoute = screen.route,
            onNavigate = { onScreenChange(AppScreen.Admin(it)) },
            onLogout = { onScreenChange(AppScreen.Login) }
        )
        is AppScreen.Teacher -> WebStyleTeacherLayout(
            currentRoute = screen.route,
            onNavigate = { onScreenChange(AppScreen.Teacher(it)) },
            onLogout = { onScreenChange(AppScreen.Login) },
            onBackToAdmin = { onScreenChange(AppScreen.Admin("")) }
        )
        is AppScreen.Accountant -> WebStyleAccountantLayout(
            currentRoute = screen.route,
            onNavigate = { onScreenChange(AppScreen.Accountant(it)) },
            onLogout = { onScreenChange(AppScreen.Login) }
        )
    }
}
