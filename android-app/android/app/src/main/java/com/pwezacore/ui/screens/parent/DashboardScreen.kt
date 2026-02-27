package com.pwezacore.ui.screens.parent

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Payment
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.pwezacore.ui.components.GlassButton
import com.pwezacore.ui.components.GlassCard
import com.pwezacore.ui.components.GlassTextButton
import com.pwezacore.ui.theme.AppAccentColors

// Placeholder data – replace with repository/ViewModel when wired to Supabase
data class ChildSummary(
    val name: String,
    val className: String,
    val stream: String,
    val admissionNumber: String,
    val profilePhotoUrl: String?,
    val currentTerm: String,
    val classTeacherName: String
)

data class QuickStat(
    val label: String,
    val value: String,
    val color: Color
)

@Composable
private fun ChildSummaryCard(
    child: ChildSummary,
    modifier: Modifier = Modifier
) {
    GlassCard(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Default.Person,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = child.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = "${child.className} ${child.stream}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                )
                Text(
                    text = "Adm: ${child.admissionNumber} · ${child.currentTerm}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
                Text(
                    text = "Class teacher: ${child.classTeacherName}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                )
            }
        }
    }
}

@Composable
private fun QuickStatCard(
    stat: QuickStat,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    GlassCard(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        contentPadding = PaddingValues(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = stat.label,
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = stat.value,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = stat.color
            )
        }
    }
}

@Composable
fun ParentDashboardScreen(
    onNavigateToFees: () -> Unit = {},
    onNavigateToAcademics: () -> Unit = {},
    onNavigateToMessages: () -> Unit = {},
    onNavigateToProfile: () -> Unit = {},
    onNavigateToAttendance: () -> Unit = {},
    onNavigateToAssignments: () -> Unit = {},
    onNavigateToEvents: () -> Unit = {},
    onNavigateToDiscipline: () -> Unit = {},
    onNavigateToTransport: () -> Unit = {},
    onNavigateToMedical: () -> Unit = {},
    onNavigateToDocuments: () -> Unit = {},
    onNavigateToNotifications: () -> Unit = {},
    onNavigateToAIAssistant: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    // Placeholder: one or multiple children – wire to ViewModel later
    val children = listOf(
        ChildSummary(
            name = "Student Name",
            className = "Senior 1",
            stream = "East",
            admissionNumber = "ADM-2024-001",
            profilePhotoUrl = null,
            currentTerm = "Term 1 2025",
            classTeacherName = "Mr. Okello"
        )
    )
    val quickStats = listOf(
        QuickStat("Fees balance", "UGX 0", AppAccentColors.Finance),
        QuickStat("Attendance (term)", "—%", AppAccentColors.Attendance),
        QuickStat("Latest exam avg", "—", AppAccentColors.ExamSets),
        QuickStat("Unread messages", "0", AppAccentColors.Parents),
        QuickStat("Upcoming events", "0", AppAccentColors.Classes),
        QuickStat("Pending assignments", "0", AppAccentColors.Reports)
    )

    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        item {
            Text(
                text = "My children",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        items(children) { child ->
            ChildSummaryCard(child = child)
        }

        item {
            Text(
                text = "Quick stats",
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
                quickStats.chunked(2).forEach { rowStats ->
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        rowStats.forEach { stat ->
                            QuickStatCard(
                                stat = stat,
                                onClick = {
                                    when (stat.label) {
                                        "Fees balance" -> onNavigateToFees()
                                        "Attendance (term)" -> onNavigateToAttendance()
                                        "Latest exam avg" -> onNavigateToAcademics()
                                        "Unread messages" -> onNavigateToMessages()
                                        "Upcoming events" -> onNavigateToEvents()
                                        "Pending assignments" -> onNavigateToAssignments()
                                        else -> { }
                                    }
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }

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
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                GlassButton(
                    text = "Pay fees",
                    onClick = onNavigateToFees,
                    modifier = Modifier.weight(1f),
                    isPrimary = true
                )
                GlassButton(
                    text = "Academics",
                    onClick = onNavigateToAcademics,
                    modifier = Modifier.weight(1f),
                    isPrimary = false
                )
            }
        }
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                GlassButton(
                    text = "Messages",
                    onClick = onNavigateToMessages,
                    modifier = Modifier.weight(1f),
                    isPrimary = false
                )
                GlassButton(
                    text = "Attendance",
                    onClick = onNavigateToAttendance,
                    modifier = Modifier.weight(1f),
                    isPrimary = false
                )
            }
        }

        item {
            Text(
                text = "More",
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
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Assignments & homework",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        GlassTextButton(text = "View", onClick = onNavigateToAssignments)
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Events & calendar",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        GlassTextButton(text = "View", onClick = onNavigateToEvents)
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Documents",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        GlassTextButton(text = "View", onClick = onNavigateToDocuments)
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Notifications",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        GlassTextButton(text = "View", onClick = onNavigateToNotifications)
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "AI Assistant",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        GlassTextButton(text = "Open", onClick = onNavigateToAIAssistant)
                    }
                }
            }
        }
    }
}
