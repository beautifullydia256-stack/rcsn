package com.pwezacore.ui.screens.teacher

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Class
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.People
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
private fun TeacherKpiCard(
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
fun TeacherDashboardScreen(
    onNavigateToMyClasses: () -> Unit = {},
    onNavigateToMyStudents: () -> Unit = {},
    onNavigateToAttendance: () -> Unit = {},
    onNavigateToExamResults: () -> Unit = {},
    onNavigateToTimetable: () -> Unit = {},
    onNavigateToAIPlanner: () -> Unit = {},
    onNavigateToAssignments: () -> Unit = {},
    onNavigateToResources: () -> Unit = {},
    onNavigateToMessages: () -> Unit = {},
    onNavigateToNotifications: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val myClassesCount = 0
    val myStudentsCount = 0
    val attendanceToday = 0

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
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                TeacherKpiCard(
                    title = "My Classes",
                    value = "$myClassesCount",
                    valueColor = AppAccentColors.Classes,
                    onViewClick = onNavigateToMyClasses
                )
                TeacherKpiCard(
                    title = "My Students",
                    value = "$myStudentsCount",
                    valueColor = AppAccentColors.Students,
                    onViewClick = onNavigateToMyStudents
                )
                TeacherKpiCard(
                    title = "Attendance today",
                    value = "$attendanceToday",
                    valueColor = AppAccentColors.Attendance,
                    onViewClick = onNavigateToAttendance
                )
            }
        }
        item { Spacer(modifier = Modifier.height(8.dp)) }
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
                        text = "My Classes",
                        onClick = onNavigateToMyClasses,
                        modifier = Modifier.weight(1f),
                        isPrimary = true
                    )
                    GlassButton(
                        text = "Take Attendance",
                        onClick = onNavigateToAttendance,
                        modifier = Modifier.weight(1f),
                        isPrimary = true
                    )
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    GlassButton(
                        text = "My Students",
                        onClick = onNavigateToMyStudents,
                        modifier = Modifier.weight(1f),
                        isPrimary = false
                    )
                    GlassButton(
                        text = "Exams & Results",
                        onClick = onNavigateToExamResults,
                        modifier = Modifier.weight(1f),
                        isPrimary = false
                    )
                }
                GlassButton(
                    text = "Timetable",
                    onClick = onNavigateToTimetable,
                    modifier = Modifier.fillMaxWidth(),
                    isPrimary = false
                )
                GlassButton(
                    text = "AI Lesson Planner",
                    onClick = onNavigateToAIPlanner,
                    modifier = Modifier.fillMaxWidth(),
                    isPrimary = false
                )
            }
        }
        item { Spacer(modifier = Modifier.height(8.dp)) }
        item {
            Text(
                text = "My Classes",
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
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "No classes assigned",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    GlassTextButton(text = "View all", onClick = onNavigateToMyClasses)
                }
            }
        }
        item {
            Text(
                text = "Assignments",
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
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "No pending assignments",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    GlassTextButton(text = "View", onClick = onNavigateToAssignments)
                }
            }
        }
        item {
            Text(
                text = "Messages & Notifications",
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
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "No new messages or notifications",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    GlassTextButton(text = "View", onClick = onNavigateToMessages)
                }
            }
        }
    }
}
