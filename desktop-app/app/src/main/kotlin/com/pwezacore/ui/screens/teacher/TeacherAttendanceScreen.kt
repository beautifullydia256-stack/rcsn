package com.pwezacore.ui.screens.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)
private val CardBg = Color(0x1A4DABFF)
private val CardBorder = Color(0x4D2563EB)

@Composable
fun TeacherAttendanceScreen(
    modifier: Modifier = Modifier,
    classes: List<String> = listOf("S.1 West", "S.2 East", "S.3 North"),
    onSelectClass: (String) -> Unit = {}
) {
    TeacherPageLayout(
        title = "Select Class for Attendance",
        subtitle = "Choose a class to record attendance",
        modifier = modifier
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (classes.isEmpty()) {
                Text("No classes assigned.", fontSize = 14.sp, color = TextSecondary)
            } else {
                classes.forEach { className ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(CardBg)
                            .clickable { onSelectClass(className) }
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(className, fontSize = 16.sp, color = Color(0xFF93C5FD))
                            Text("Record attendance", fontSize = 13.sp, color = TextSecondary)
                        }
                    }
                }
            }
        }
    }
}
