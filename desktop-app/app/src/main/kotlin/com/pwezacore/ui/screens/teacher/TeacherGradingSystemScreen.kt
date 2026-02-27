package com.pwezacore.ui.screens.teacher

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.sp

private val TextSecondary = Color(0xFF94A3B8)

@Composable
fun TeacherGradingSystemScreen(modifier: Modifier = Modifier) {
    TeacherPageLayout(
        title = "Grading System",
        subtitle = "Configure and view grading scales and comments",
        modifier = modifier
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                "Grading scales and comment templates will appear here when connected.",
                fontSize = 14.sp,
                color = TextSecondary
            )
        }
    }
}
