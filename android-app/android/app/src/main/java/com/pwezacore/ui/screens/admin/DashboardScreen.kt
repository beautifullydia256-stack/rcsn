package com.pwezacore.ui.screens.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.Icon
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

/** KPI card in glass style (like Outstanding balance): translucent, rounded, title + value left, blue View right */
@Composable
private fun KpiCard(
    title: String,
    value: String,
    valueColor: Color,
    onViewClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    GlassCard(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
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
            GlassTextButton(text = "View", onClick = onViewClick)
        }
    }
}

@Composable
fun AdminDashboardScreen(
    onLogout: () -> Unit,
    onNavigateToStudents: () -> Unit = {},
    onNavigateToTeachers: () -> Unit = {},
    onNavigateToFinance: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    onNavigateToParents: () -> Unit = {},
    onAddStudent: () -> Unit = {},
    onAddTeacher: () -> Unit = {},
    onAddParent: () -> Unit = {},
    onRecordPayment: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    // Stub data – replace with Supabase when wired
    val totalStudents = 0
    val totalTeachers = 0
    val attendanceToday = 0
    val feesCollectedTerm = "UGX 0"
    val outstandingBalance = "UGX 0"

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

        // Key figure cards – glass style like Outstanding balance (5 cards only)
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                KpiCard(
                    title = "Total Students",
                    value = "$totalStudents",
                    valueColor = AppAccentColors.Students,
                    onViewClick = onNavigateToStudents
                )
                KpiCard(
                    title = "Teachers",
                    value = "$totalTeachers",
                    valueColor = AppAccentColors.Teachers,
                    onViewClick = onNavigateToTeachers
                )
                KpiCard(
                    title = "Attendance today",
                    value = "$attendanceToday",
                    valueColor = AppAccentColors.Attendance,
                    onViewClick = { }
                )
                KpiCard(
                    title = "Fees collected (term)",
                    value = feesCollectedTerm,
                    valueColor = AppAccentColors.Finance,
                    onViewClick = onNavigateToFinance
                )
                KpiCard(
                    title = "Outstanding balance",
                    value = outstandingBalance,
                    valueColor = AppAccentColors.Finance,
                    onViewClick = onNavigateToFinance
                )
            }
        }

        item { Spacer(modifier = Modifier.height(8.dp)) }

        // Quick actions
        item {
            Text(
                text = "Quick actions",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    GlassButton(
                        text = "Add Student",
                        onClick = onAddStudent,
                        modifier = Modifier.weight(1f),
                        isPrimary = true
                    )
                    GlassButton(
                        text = "Add Teacher",
                        onClick = onAddTeacher,
                        modifier = Modifier.weight(1f),
                        isPrimary = true
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    GlassButton(
                        text = "Add Parent",
                        onClick = onAddParent,
                        modifier = Modifier.weight(1f),
                        isPrimary = false
                    )
                    GlassButton(
                        text = "Record Payment",
                        onClick = onRecordPayment,
                        modifier = Modifier.weight(1f),
                        isPrimary = false
                    )
                }
                GlassButton(
                    text = "Generate Report",
                    onClick = onNavigateToReports,
                    modifier = Modifier.fillMaxWidth(),
                    isPrimary = false
                )
            }
        }

        item { Spacer(modifier = Modifier.height(8.dp)) }

        // Reminders
        item {
            Text(
                text = "Reminders",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        item {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.Default.Notifications,
                        contentDescription = null,
                        tint = AppAccentColors.Notifications,
                        modifier = Modifier.size(24.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "No reminders",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Upcoming meetings, deadlines, and exams will appear here.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }

        // Upcoming
        item {
            Text(
                text = "Upcoming",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        item {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.Default.Event,
                        contentDescription = null,
                        tint = AppAccentColors.Attendance,
                        modifier = Modifier.size(24.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Exams, reports & fees",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Due dates and events will appear here.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }

        // Recent payments & notifications
        item {
            Text(
                text = "Recent payments & notifications",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        item {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.Default.Receipt,
                        contentDescription = null,
                        tint = AppAccentColors.Reports,
                        modifier = Modifier.size(24.dp)
                    )
                    Text(
                        text = "No recent payments or notifications.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                    )
                }
            }
        }

        // Staff overview
        item {
            Text(
                text = "Staff overview",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        item {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(
                        Icons.Default.Group,
                        contentDescription = null,
                        tint = AppAccentColors.Staff,
                        modifier = Modifier.size(24.dp)
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Teacher activity",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "Current classes and status will appear here.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                        )
                    }
                }
            }
        }
    }
}
