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
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.TrendingUp
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

data class AccountantDrawerItem(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val iconColor: Color
)

val accountantMenuItems: List<AccountantDrawerItem> = listOf(
    AccountantDrawerItem(Screen.AccountantDashboard.route, "Dashboard", Icons.Default.Dashboard, AppAccentColors.Dashboard),
    AccountantDrawerItem(Screen.AccountantPayments.route, "Payments", Icons.Default.AccountBalance, AppAccentColors.Finance),
    AccountantDrawerItem(Screen.AccountantExpenses.route, "Expenses", Icons.Default.Receipt, AppAccentColors.Attendance),
    AccountantDrawerItem(Screen.AccountantBalances.route, "Balances", Icons.Default.TrendingUp, AppAccentColors.Finance),
    AccountantDrawerItem(Screen.AccountantReceipts.route, "Receipts", Icons.Default.Receipt, AppAccentColors.Reports),
    AccountantDrawerItem(Screen.AccountantReports.route, "Reports", Icons.Default.Description, AppAccentColors.Reports),
    AccountantDrawerItem(Screen.AccountantNotifications.route, "Notifications", Icons.Default.Notifications, AppAccentColors.Notifications)
)

@Composable
fun AccountantDrawerContent(
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
        // Header: PwezaCore logo + title
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
                tint = AppAccentColors.Finance,
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

        // Menu items (7 from web sidebar, same order)
        accountantMenuItems.forEach { item ->
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

        // GENERAL section: Settings, Logout
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
                .clickable { onItemClick(Screen.AccountantSettings.route) }
                .then(
                    if (currentRoute == Screen.AccountantSettings.route) Modifier.background(AppAccentColors.SystemSettings.copy(alpha = 0.2f), MaterialTheme.shapes.small)
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
                color = if (currentRoute == Screen.AccountantSettings.route) AppAccentColors.SystemSettings else MaterialTheme.colorScheme.onSurface
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
                Icons.Default.ExitToApp,
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
