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
fun TeacherAiPlannerScreen(modifier: Modifier = Modifier) {
    TeacherPageLayout(
        title = "AI Lesson Planner",
        subtitle = "Generate lesson plans and exam papers with AI",
        modifier = modifier
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Text(
                "Create lesson plans and exam papers using AI. Options will appear here when connected.",
                fontSize = 14.sp,
                color = TextSecondary
            )
        }
    }
}
