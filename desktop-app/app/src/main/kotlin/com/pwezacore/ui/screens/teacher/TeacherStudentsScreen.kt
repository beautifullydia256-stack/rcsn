package com.pwezacore.ui.screens.teacher

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.ui.components.GlassCard

private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)
private val AccentBlue = Color(0xFF4DABFF)

@Composable
fun TeacherStudentsScreen(
    modifier: Modifier = Modifier,
    students: List<Triple<String, String, String>> = listOf(
        Triple("Student One", "S.1 West", "student1@school.com"),
        Triple("Student Two", "S.2 East", "student2@school.com"),
        Triple("Student Three", "S.3 North", "student3@school.com")
    ),
    onStudentClick: (String) -> Unit = {}
) {
    TeacherPageLayout(
        title = "My Students",
        subtitle = "View and manage students in your classes",
        modifier = modifier
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                Text("${students.size} students", fontSize = 14.sp, color = TextSecondary)
            }
            students.forEach { (name, className, _) ->
                GlassCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onStudentClick(name) },
                    contentPadding = PaddingValues(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(AccentBlue.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Person, contentDescription = null, tint = AccentBlue, modifier = Modifier.size(26.dp))
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(name, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            Text(className, fontSize = 13.sp, color = TextSecondary)
                        }
                    }
                }
            }
        }
    }
}
