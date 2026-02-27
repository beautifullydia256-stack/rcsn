package com.pwezacore.ui.screens.accountant

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.pwezacore.ui.components.GlassButton
import com.pwezacore.ui.components.GlassCard
import com.pwezacore.ui.components.GlassTextButton
import com.pwezacore.ui.theme.AppAccentColors

@Composable
private fun AccountantKpiCard(
    title: String,
    value: String,
    valueColor: Color,
    modifier: Modifier = Modifier
) {
    GlassCard(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(16.dp)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = valueColor
            )
        }
    }
}

@Composable
fun AccountantDashboardScreen(
    onNavigateToPayments: () -> Unit = {},
    onNavigateToExpenses: () -> Unit = {},
    onNavigateToBalances: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    // Placeholder values – wire to Supabase when ready
    val collectedToday = "UGX 0"
    val collectedThisTerm = "UGX 0"
    val expenses = "UGX 0"
    val netBalance = "UGX 0"
    val outstandingThisTerm = "UGX 0"
    val outstandingAllTime = "UGX 0"
    val debtorsCount = 0

    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        item {
            Text(
                text = "Key figures",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }

        // KPI cards: Collected Today, This Term, Expenses, Net Balance
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                AccountantKpiCard(
                    title = "Collected Today",
                    value = collectedToday,
                    valueColor = AppAccentColors.Finance
                )
                AccountantKpiCard(
                    title = "Collected This Term",
                    value = collectedThisTerm,
                    valueColor = AppAccentColors.Finance
                )
                AccountantKpiCard(
                    title = "Expenses",
                    value = expenses,
                    valueColor = AppAccentColors.Attendance
                )
                AccountantKpiCard(
                    title = "Net Balance",
                    value = netBalance,
                    valueColor = AppAccentColors.Reports
                )
                AccountantKpiCard(
                    title = "Outstanding This Term",
                    value = outstandingThisTerm,
                    valueColor = MaterialTheme.colorScheme.primary
                )
                AccountantKpiCard(
                    title = "Outstanding All Time",
                    value = outstandingAllTime,
                    valueColor = MaterialTheme.colorScheme.primary
                )
                AccountantKpiCard(
                    title = "Debtors",
                    value = "$debtorsCount",
                    valueColor = AppAccentColors.Notifications
                )
            }
        }

        // Quick actions
        item {
            Text(
                text = "Quick actions",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                GlassButton(
                    text = "Payments",
                    onClick = onNavigateToPayments,
                    modifier = Modifier.weight(1f),
                    isPrimary = true
                )
                GlassButton(
                    text = "Expenses",
                    onClick = onNavigateToExpenses,
                    modifier = Modifier.weight(1f),
                    isPrimary = false
                )
            }
        }
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                GlassButton(
                    text = "Balances",
                    onClick = onNavigateToBalances,
                    modifier = Modifier.weight(1f),
                    isPrimary = false
                )
                GlassButton(
                    text = "Reports",
                    onClick = onNavigateToReports,
                    modifier = Modifier.weight(1f),
                    isPrimary = false
                )
            }
        }

        // Recent Payments
        item {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(16.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Recent Payments",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        GlassTextButton(text = "View all", onClick = onNavigateToPayments)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "No recent payments",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                }
            }
        }

        // Recent Expenses
        item {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(16.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Recent Expenses",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        GlassTextButton(text = "View all", onClick = onNavigateToExpenses)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "No recent expenses",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                }
            }
        }
    }
}
