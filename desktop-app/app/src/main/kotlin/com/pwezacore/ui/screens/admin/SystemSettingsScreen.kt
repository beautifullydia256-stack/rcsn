package com.pwezacore.ui.screens.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.ui.components.GlassCard

// Match web System Settings: dark card surfaces and tab styles
private val CardBorder = Color(0x33FFFFFF)
private val TabSelectedBg = Color(0x33FFFFFF)
private val TabSelectedBorder = Color(0x33FFFFFF)
private val TabUnselectedBg = Color(0x1AFFFFFF)
private val TabUnselectedBorder = Color(0x1AFFFFFF)
private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xB3FFFFFF)
private val ButtonBg = Color(0x1AFFFFFF)
private val ButtonBorder = Color(0x1AFFFFFF)

private enum class SettingsTab(val label: String) {
    SUBJECTS("Subjects per Class"),
    ASSIGNMENTS("Teacher ↔ Subject ↔ Class"),
    FINANCE("Financial Settings"),
    REQUIREMENTS("School Requirements"),
    TIMETABLE("Timetable Designer"),
    TERMS("Term Settings"),
    EXAMS("Exam Sets"),
    BRANDING("School Branding"),
}

@Composable
fun SystemSettingsScreen(
    modifier: Modifier = Modifier,
    onBackToDashboard: () -> Unit = {},
    onSchoolProfile: () -> Unit = {},
    onClasses: () -> Unit = {},
    onSubjectsPerClass: () -> Unit = {},
    onTeacherSubjectClass: () -> Unit = {},
    onTermSettings: () -> Unit = {},
    onExamSets: () -> Unit = {},
    onTimetableDesigner: () -> Unit = {},
    onFinancialSettings: () -> Unit = {},
    onSchoolRequirements: () -> Unit = {},
    onLocation: () -> Unit = {},
    onQuickLinkExamSets: () -> Unit = {},
    onQuickLinkOldStudents: () -> Unit = {},
    onQuickLinkFinanceRecords: () -> Unit = {},
    onQuickLinkAttendanceRecords: () -> Unit = {},
    onQuickLinkReportRecords: () -> Unit = {}
) {
    var selectedTab by remember { mutableStateOf(SettingsTab.SUBJECTS) }
    val tabScrollState = rememberScrollState()

    Column(modifier = modifier.fillMaxWidth().padding(24.dp)) {
        // Header: title + Back to Dashboard (match web)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "System Settings",
                fontSize = 20.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            TextButton(
                onClick = onBackToDashboard,
                colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = TextPrimary),
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(ButtonBg)
                    .border(1.dp, ButtonBorder, RoundedCornerShape(8.dp))
            ) {
                Text("Back to Dashboard", fontSize = 14.sp)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Tab row (match web: flex-wrap gap-2)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(tabScrollState),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            SettingsTab.entries.forEach { tab ->
                val selected = selectedTab == tab
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (selected) TabSelectedBg else TabUnselectedBg)
                        .border(1.dp, if (selected) TabSelectedBorder else TabUnselectedBorder, RoundedCornerShape(8.dp))
                        .clickable { selectedTab = tab }
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                ) {
                    Text(
                        text = tab.label,
                        fontSize = 14.sp,
                        color = if (selected) TextPrimary else TextSecondary
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Single content card for selected tab (match web motion.div card)
        GlassCard(
            modifier = Modifier.fillMaxWidth(),
            contentPadding = PaddingValues(16.dp)
        ) {
            when (selectedTab) {
                SettingsTab.SUBJECTS -> TabContentPlaceholder(
                    title = "Subjects per Class",
                    description = "Manage the list of subjects taught in each class/grade.",
                    onOpen = onSubjectsPerClass
                )
                SettingsTab.ASSIGNMENTS -> TabContentPlaceholder(
                    title = "Teacher ↔ Subject ↔ Class",
                    description = "Assign teachers to subjects and classes.",
                    onOpen = onTeacherSubjectClass
                )
                SettingsTab.FINANCE -> TabContentPlaceholder(
                    title = "Financial Settings",
                    description = "Configure fee structures and payment settings.",
                    onOpen = onFinancialSettings
                )
                SettingsTab.REQUIREMENTS -> TabContentPlaceholder(
                    title = "School Requirements",
                    description = "Set school-wide requirements and policies.",
                    onOpen = onSchoolRequirements
                )
                SettingsTab.TIMETABLE -> TabContentPlaceholder(
                    title = "Timetable Designer",
                    description = "Design and manage the school timetable.",
                    onOpen = onTimetableDesigner
                )
                SettingsTab.TERMS -> TabContentPlaceholder(
                    title = "Term Settings",
                    description = "Configure academic terms and dates.",
                    onOpen = onTermSettings
                )
                SettingsTab.EXAMS -> TabContentPlaceholder(
                    title = "Exam Sets",
                    description = "Manage exam sets and grading.",
                    onOpen = onExamSets
                )
                SettingsTab.BRANDING -> TabContentPlaceholder(
                    title = "School Branding",
                    description = "School profile, logo, name, address and contact.",
                    onOpen = onSchoolProfile
                )
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // School Location Settings (match web LocationSettingsWidget)
        GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "School Location Settings",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary
                )
                Text(
                    text = "Set your school address and map location.",
                    fontSize = 13.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 4.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                TextButton(
                    onClick = onLocation,
                    colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = Color(0xFF22C55E))
                ) {
                    Text("Open Location Settings")
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Classes card (match web: "Classes" + class links or placeholder)
        GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Classes",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary
                )
                Text(
                    text = "Classes will appear here after your school type is set. Manage classes in settings.",
                    fontSize = 13.sp,
                    color = TextSecondary,
                    modifier = Modifier.padding(top = 4.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                TextButton(
                    onClick = onClasses,
                    colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = Color(0xFF22C55E))
                ) {
                    Text("Manage Classes")
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Quick Management (match web)
        GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Quick Management",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    QuickLinkChip("Exam Sets", onClick = onQuickLinkExamSets)
                    QuickLinkChip("Old Students", onClick = onQuickLinkOldStudents)
                    QuickLinkChip("Finance Records", onClick = onQuickLinkFinanceRecords)
                    QuickLinkChip("Attendance Records", onClick = onQuickLinkAttendanceRecords)
                    QuickLinkChip("Report Records", onClick = onQuickLinkReportRecords)
                }
            }
        }
    }
}

@Composable
private fun TabContentPlaceholder(
    title: String,
    description: String,
    onOpen: () -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = title,
            fontSize = 16.sp,
            fontWeight = FontWeight.Medium,
            color = TextPrimary
        )
        Text(
            text = description,
            fontSize = 13.sp,
            color = TextSecondary,
            modifier = Modifier.padding(top = 4.dp)
        )
        Spacer(modifier = Modifier.height(12.dp))
        TextButton(
            onClick = onOpen,
            colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = Color(0xFF22C55E))
        ) {
            Text("Open")
        }
    }
}

@Composable
private fun QuickLinkChip(label: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(ButtonBg)
            .border(1.dp, ButtonBorder, RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Text(text = label, fontSize = 14.sp, color = TextPrimary)
    }
}
