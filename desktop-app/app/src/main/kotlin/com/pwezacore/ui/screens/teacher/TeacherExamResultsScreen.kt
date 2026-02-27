package com.pwezacore.ui.screens.teacher

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)

@Composable
fun TeacherExamResultsScreen(modifier: Modifier = Modifier) {
    TeacherPageLayout(
        title = "Exam Results",
        subtitle = "Enter and view exam results by class",
        modifier = modifier
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                "Select a class to enter or view exam results. Primary and secondary grading views will appear here when connected.",
                fontSize = 14.sp,
                color = TextSecondary
            )
        }
    }
}
