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
import androidx.compose.material.icons.filled.Class
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
fun TeacherClassesScreen(
    modifier: Modifier = Modifier,
    classAssignments: List<Triple<String, List<String>, Int>> = listOf(
        Triple("S.1 West", listOf("Mathematics", "Physics"), 32),
        Triple("S.2 East", listOf("Chemistry", "Biology"), 28),
        Triple("S.3 North", listOf("Mathematics", "Physics"), 35)
    ),
    onViewClass: (String) -> Unit = {}
) {
    TeacherPageLayout(
        title = "My Classes",
        subtitle = "View and manage your assigned classes",
        modifier = modifier
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            classAssignments.forEach { (className, subjects, count) ->
                GlassCard(
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onViewClass(className) },
                    contentPadding = PaddingValues(16.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(AccentBlue.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Class, contentDescription = null, tint = AccentBlue, modifier = Modifier.size(26.dp))
                            }
                            Text("$count", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextSecondary)
                        }
                        Text(className, fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(subjects.joinToString(", "), fontSize = 13.sp, color = TextSecondary)
                        TextButton(onClick = { onViewClass(className) }) { Text("View Class", color = AccentBlue) }
                    }
                }
            }
        }
    }
}
