package com.pwezacore.ui.screens.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.ui.components.GlassCard

private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted = Color(0xFF64748B)

@Composable
fun TeacherDashboardScreen(
    modifier: Modifier = Modifier,
    teacherName: String = "Teacher",
    totalClasses: Int = 0,
    totalStudents: Int = 0,
    onTakeAttendance: () -> Unit = {},
    onExamResults: () -> Unit = {},
    onTimetable: () -> Unit = {},
    onAssignments: () -> Unit = {},
    onMessages: () -> Unit = {},
    onNotifications: () -> Unit = {},
    onViewClass: () -> Unit = {},
    onEnterMarks: () -> Unit = {},
    onBackToDashboard: () -> Unit = {}
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(24.dp)
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(
                "Teacher Dashboard",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
            Text(
                "Manage your classes and students",
                fontSize = 14.sp,
                color = TextSecondary
            )
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            GlassCard(
                modifier = Modifier
                    .weight(1f)
                    .clickable(onClick = onViewClass),
                contentPadding = PaddingValues(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("My Classes", fontSize = 16.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                    Text("Assigned classes", fontSize = 13.sp, color = TextMuted)
                    Text("$totalClasses", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            }
            GlassCard(
                modifier = Modifier
                    .weight(1f)
                    .clickable { onExamResults() },
                contentPadding = PaddingValues(16.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("My Students", fontSize = 16.sp, fontWeight = FontWeight.Medium, color = TextPrimary)
                    Text("Total students in your classes", fontSize = 13.sp, color = TextMuted)
                    Text("$totalStudents", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedButton(
                onClick = onExamResults,
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
            ) {
                Text("Exam Results")
            }
            OutlinedButton(
                onClick = onTakeAttendance,
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
            ) {
                Text("Attendance")
            }
            OutlinedButton(
                onClick = onTimetable,
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
            ) {
                Text("Timetable")
            }
            OutlinedButton(
                onClick = onAssignments,
                colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
            ) {
                Text("Assignments")
            }
        }
    }
}
