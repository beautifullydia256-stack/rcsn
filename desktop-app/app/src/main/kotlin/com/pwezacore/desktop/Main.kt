package com.pwezacore.desktop

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.pwezacore.data.local.LocalDatabase
import com.pwezacore.ui.navigation.AppContent
import com.pwezacore.ui.navigation.AppScreen
import androidx.compose.ui.Modifier
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import com.pwezacore.ui.theme.LiquidGlassTheme

fun main() = application {
    LocalDatabase.init()
    val windowState = rememberWindowState()
    var currentScreen by remember { mutableStateOf<AppScreen>(AppScreen.Login) }
    Window(
        onCloseRequest = ::exitApplication,
        state = windowState,
        title = "PwezaCore"
    ) {
        LiquidGlassTheme(darkTheme = true) {
            Surface(
                modifier = Modifier.fillMaxSize(),
                color = MaterialTheme.colorScheme.background
            ) {
                AppContent(
                    currentScreen = currentScreen,
                    onScreenChange = { currentScreen = it }
                )
            }
        }
    }
}
