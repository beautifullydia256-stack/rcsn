package com.pwezacore.ui.screens.parent

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.pwezacore.ui.components.GlassCard
import com.pwezacore.ui.theme.AppAccentColors

data class ParentMoreOption(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val iconColor: Color
)

@Composable
fun ParentMoreScreen(
    onNavigateToProfile: () -> Unit,
    onNavigateToAttendance: () -> Unit,
    onNavigateToAssignments: () -> Unit,
    onNavigateToEvents: () -> Unit,
    onNavigateToDiscipline: () -> Unit,
    onNavigateToTransport: () -> Unit,
    onNavigateToMedical: () -> Unit,
    onNavigateToDocuments: () -> Unit,
    onNavigateToNotifications: () -> Unit,
    onNavigateToAIAssistant: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val options = listOf(
        ParentMoreOption("profile", "Profile", Icons.Default.Person, AppAccentColors.Students),
        ParentMoreOption("attendance", "Attendance", Icons.Default.EventNote, AppAccentColors.Attendance),
        ParentMoreOption("assignments", "Assignments", Icons.Default.Assignment, AppAccentColors.Reports),
        ParentMoreOption("events", "Events & Calendar", Icons.Default.CalendarMonth, AppAccentColors.Classes),
        ParentMoreOption("discipline", "Discipline & Behavior", Icons.Default.Warning, AppAccentColors.Notifications),
        ParentMoreOption("transport", "Transport", Icons.Default.TrendingUp, AppAccentColors.SystemSettings),
        ParentMoreOption("medical", "Medical Records", Icons.Default.LocalHospital, AppAccentColors.Identity),
        ParentMoreOption("documents", "Documents", Icons.Default.FolderOpen, AppAccentColors.Reports),
        ParentMoreOption("notifications", "Notifications", Icons.Default.Notifications, AppAccentColors.Notifications),
        ParentMoreOption("ai", "AI Assistant", Icons.Default.SmartToy, AppAccentColors.Identity),
        ParentMoreOption("settings", "Settings", Icons.Default.Settings, AppAccentColors.SystemSettings),
        ParentMoreOption("logout", "Logout", Icons.Default.ExitToApp, MaterialTheme.colorScheme.error)
    )

    val scrollState = rememberScrollState()
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp)
            .verticalScroll(scrollState)
    ) {
        Text(
            text = "More",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Other options and settings",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
        )
        Spacer(modifier = Modifier.height(16.dp))

        val onOptionClick: (String) -> Unit = { key ->
            when (key) {
                "profile" -> onNavigateToProfile()
                "attendance" -> onNavigateToAttendance()
                "assignments" -> onNavigateToAssignments()
                "events" -> onNavigateToEvents()
                "discipline" -> onNavigateToDiscipline()
                "transport" -> onNavigateToTransport()
                "medical" -> onNavigateToMedical()
                "documents" -> onNavigateToDocuments()
                "notifications" -> onNavigateToNotifications()
                "ai" -> onNavigateToAIAssistant()
                "settings" -> onNavigateToSettings()
                "logout" -> onLogout()
            }
        }

        options.forEach { option ->
            GlassCard(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOptionClick(option.route) },
                contentPadding = PaddingValues(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Icon(
                        imageVector = option.icon,
                        contentDescription = null,
                        tint = option.iconColor,
                        modifier = Modifier.size(24.dp)
                    )
                    Text(
                        text = option.label,
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (option.route == "logout") MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}
