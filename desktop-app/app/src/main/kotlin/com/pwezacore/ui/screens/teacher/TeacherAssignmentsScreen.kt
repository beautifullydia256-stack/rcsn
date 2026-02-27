package com.pwezacore.ui.screens.teacher

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.ui.components.GlassCard

private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)
private val AccentBlue = Color(0xFF4DABFF)

@Composable
fun TeacherAssignmentsScreen(
    modifier: Modifier = Modifier,
    onCreateAssignment: () -> Unit = {}
) {
    TeacherPageLayout(
        title = "Assignments",
        subtitle = "Manage assignments for your classes",
        modifier = modifier
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                TextButton(onClick = onCreateAssignment) {
                    Text("Create Assignment", color = AccentBlue)
                }
            }
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("No assignments due.", fontSize = 14.sp, color = TextPrimary)
                    Text("Upload or create new assignments.", fontSize = 13.sp, color = TextSecondary)
                    TextButton(onClick = onCreateAssignment) { Text("View Assignments", color = AccentBlue) }
                }
            }
        }
    }
}
