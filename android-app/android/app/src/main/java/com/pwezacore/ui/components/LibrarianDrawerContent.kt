package com.pwezacore.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.pwezacore.ui.navigation.Screen
import com.pwezacore.ui.theme.AppAccentColors

data class LibrarianDrawerItem(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val iconColor: Color
)

val librarianMenuItems: List<LibrarianDrawerItem> = listOf(
    LibrarianDrawerItem(Screen.LibrarianDashboard.route, "Dashboard", Icons.Default.Dashboard, AppAccentColors.Dashboard),
    LibrarianDrawerItem(Screen.LibrarianBooks.route, "Books", Icons.Default.MenuBook, AppAccentColors.ExamSets),
    LibrarianDrawerItem(Screen.LibrarianIssueReturn.route, "Issue/Return", Icons.Default.SwapHoriz, AppAccentColors.Finance),
    LibrarianDrawerItem(Screen.LibrarianOverdue.route, "Overdue", Icons.Default.Warning, AppAccentColors.Notifications),
    LibrarianDrawerItem(Screen.LibrarianReports.route, "Reports", Icons.Default.Assignment, AppAccentColors.Reports),
    LibrarianDrawerItem(Screen.LibrarianCategories.route, "Categories", Icons.Default.FolderOpen, AppAccentColors.Classes),
    LibrarianDrawerItem(Screen.LibrarianNotifications.route, "Notifications", Icons.Default.Notifications, AppAccentColors.Notifications)
)

@Composable
fun LibrarianDrawerContent(
    currentRoute: String?,
    onItemClick: (String) -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(scrollState)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(
                imageVector = Icons.Default.School,
                contentDescription = null,
                tint = AppAccentColors.Reports,
                modifier = Modifier.size(32.dp)
            )
            Text(
                text = "PwezaCore Library",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(1.dp)
                .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f))
        )
        Spacer(modifier = Modifier.height(8.dp))

        librarianMenuItems.forEach { item ->
            val selected = currentRoute == item.route
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp)
                    .clickable { onItemClick(item.route) }
                    .then(
                        if (selected) Modifier.background(item.iconColor.copy(alpha = 0.2f), MaterialTheme.shapes.small)
                        else Modifier
                    )
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Icon(
                    item.icon,
                    contentDescription = null,
                    tint = if (selected) item.iconColor else item.iconColor.copy(alpha = 0.85f)
                )
                Text(
                    item.label,
                    style = MaterialTheme.typography.labelLarge,
                    color = if (selected) item.iconColor else MaterialTheme.colorScheme.onSurface
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .height(1.dp)
                .background(MaterialTheme.colorScheme.onSurface.copy(alpha = 0.2f))
        )
        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "GENERAL",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
            modifier = Modifier.padding(horizontal = 28.dp, vertical = 4.dp)
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .clickable { onItemClick(Screen.LibrarianSettings.route) }
                .then(
                    if (currentRoute == Screen.LibrarianSettings.route) Modifier.background(AppAccentColors.SystemSettings.copy(alpha = 0.2f), MaterialTheme.shapes.small)
                    else Modifier
                )
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(Icons.Default.Settings, contentDescription = null, tint = AppAccentColors.SystemSettings)
            Text(
                "Settings",
                style = MaterialTheme.typography.labelLarge,
                color = if (currentRoute == Screen.LibrarianSettings.route) AppAccentColors.SystemSettings else MaterialTheme.colorScheme.onSurface
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp)
                .clickable(onClick = onLogout)
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Icon(Icons.Default.ExitToApp, contentDescription = null, tint = MaterialTheme.colorScheme.error)
            Text(
                text = "Logout",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.labelLarge
            )
        }
    }
}
