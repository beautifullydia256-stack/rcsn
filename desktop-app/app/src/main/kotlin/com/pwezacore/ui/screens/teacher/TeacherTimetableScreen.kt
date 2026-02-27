package com.pwezacore.ui.screens.teacher

import androidx.compose.foundation.background
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
import com.pwezacore.ui.components.GlassCard

private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)

@Composable
fun TeacherTimetableScreen(modifier: Modifier = Modifier) {
    TeacherPageLayout(
        title = "Timetable",
        subtitle = "View your teaching schedule and upcoming classes",
        modifier = modifier
    ) {
        GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Weekly Schedule", fontSize = 18.sp, color = TextPrimary)
                listOf("Monday", "Tuesday", "Wednesday", "Thursday", "Friday").forEach { day ->
                    Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                        Text(day, fontSize = 14.sp, color = TextPrimary)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 4.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color.White.copy(alpha = 0.05f))
                                .padding(12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("08:00 - 09:00", fontSize = 13.sp, color = TextSecondary)
                            Text("Mathematics", fontSize = 13.sp, color = TextPrimary)
                            Text("S.1 West", fontSize = 13.sp, color = TextSecondary)
                            Text("Room 101", fontSize = 13.sp, color = TextSecondary)
                        }
                    }
                }
            }
        }
    }
}
