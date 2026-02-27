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
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Class
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Work
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

data class AdminDrawerItem(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val iconColor: Color
)

val adminMenuItems: List<AdminDrawerItem> = listOf(
    AdminDrawerItem(Screen.AdminDashboard.route, "Dashboard", Icons.Default.Dashboard, AppAccentColors.Dashboard),
    AdminDrawerItem(Screen.Students.route, "Students", Icons.Default.School, AppAccentColors.Students),
    AdminDrawerItem(Screen.Teachers.route, "Teachers", Icons.Default.Person, AppAccentColors.Teachers),
    AdminDrawerItem(Screen.Parents.route, "Parents", Icons.Default.Group, AppAccentColors.Parents),
    AdminDrawerItem(Screen.Staff.route, "Staff", Icons.Default.Badge, AppAccentColors.Staff),
    AdminDrawerItem(Screen.Finance.route, "Finance", Icons.Default.AccountBalance, AppAccentColors.Finance),
    AdminDrawerItem(Screen.Reports.route, "Reports", Icons.Default.Receipt, AppAccentColors.Reports),
    AdminDrawerItem(Screen.Attendance.route, "Attendance", Icons.Default.EventNote, AppAccentColors.Attendance),
    AdminDrawerItem(Screen.ExamSets.route, "Exam Sets", Icons.Default.Book, AppAccentColors.ExamSets),
    AdminDrawerItem(Screen.Identity.route, "Identity", Icons.Default.Folder, AppAccentColors.Identity),
    AdminDrawerItem(Screen.Classes.route, "Classes", Icons.Default.Class, AppAccentColors.Classes),
    AdminDrawerItem(Screen.JobVacancies.route, "Job Vacancies", Icons.Default.Work, AppAccentColors.JobVacancies),
    AdminDrawerItem(Screen.SystemSettings.route, "System Settings", Icons.Default.Settings, AppAccentColors.SystemSettings),
    AdminDrawerItem(Screen.Notifications.route, "Notifications", Icons.Default.Notifications, AppAccentColors.Notifications)
)

@Composable
fun AdminDrawerContent(
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
                tint = AppAccentColors.Dashboard,
                modifier = Modifier.size(32.dp)
            )
            Text(
                text = "PwezaCore",
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
        adminMenuItems.forEach { item ->
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
                .clickable { onItemClick(Screen.SystemSettings.route) }
                .then(
                    if (currentRoute == Screen.SystemSettings.route) Modifier.background(AppAccentColors.SystemSettings.copy(alpha = 0.2f), MaterialTheme.shapes.small)
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
                color = if (currentRoute == Screen.SystemSettings.route) AppAccentColors.SystemSettings else MaterialTheme.colorScheme.onSurface
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
            Icon(
                Icons.Default.Settings,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.error
            )
            Text(
                text = "Logout",
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.labelLarge
            )
        }
    }
}
