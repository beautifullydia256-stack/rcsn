package com.pwezacore.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assignment
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Class
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Psychology
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material3.Icon
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
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.ui.theme.LiquidGlassTheme
import com.pwezacore.ui.navigation.TeacherRoutes
import com.pwezacore.ui.screens.teacher.TeacherAiPlannerScreen
import com.pwezacore.ui.screens.teacher.TeacherAssignmentsScreen
import com.pwezacore.ui.screens.teacher.TeacherAttendanceScreen
import com.pwezacore.ui.screens.teacher.TeacherClassesScreen
import com.pwezacore.ui.screens.teacher.TeacherDashboardScreen
import com.pwezacore.ui.screens.teacher.TeacherExamResultsScreen
import com.pwezacore.ui.screens.teacher.TeacherGradingSystemScreen
import com.pwezacore.ui.screens.teacher.TeacherMessagesScreen
import com.pwezacore.ui.screens.teacher.TeacherNotificationsScreen
import com.pwezacore.ui.screens.teacher.TeacherResourcesScreen
import com.pwezacore.ui.screens.teacher.TeacherSettingsScreen
import com.pwezacore.ui.screens.teacher.TeacherStudentsScreen
import com.pwezacore.ui.screens.teacher.TeacherTimetableScreen

private val WebSidebarBg = Color(0x14FFFFFF)
private val WebSidebarBorder = Color(0x33FFFFFF)
private val WebSidebarText = Color(0xD9FFFFFF)
private val WebSidebarActiveBg = Color(0x264DABFF)
private val WebSidebarActiveText = Color(0xFF4DABFF)
private val WebSidebarLogout = Color(0xE6EF4444)
private val WebNavbarBg = Color(0xFF1E293B)
private val WebNavbarBorder = Color(0xFF334155)
private val WebNavbarText = Color(0xFF94A3B8)
private val WebNavbarTextBold = Color(0xFFF8FAFC)
private val WebNavbarSearchBg = Color(0xFF0F172A)
private val WebNavbarSearchBorder = Color(0xFF475569)
private val WebContentBg = Color(0xFF0F172A)

data class TeacherNavItem(val route: String, val label: String, val icon: ImageVector)

// Exact order: Menu > Dashboard, My Classes, My Students, Exam Results, Attendance, Timetable, Grading System, AI Lesson Planner, Assignments, Resources, Messages, Notifications, Settings
private val teacherSidebarItems = listOf(
    TeacherNavItem(TeacherRoutes.DASHBOARD, "Dashboard", Icons.Default.Dashboard),
    TeacherNavItem(TeacherRoutes.CLASSES, "My Classes", Icons.Default.Class),
    TeacherNavItem(TeacherRoutes.STUDENTS, "My Students", Icons.Default.Person),
    TeacherNavItem(TeacherRoutes.EXAM_RESULTS, "Exam Results", Icons.Default.Assignment),
    TeacherNavItem(TeacherRoutes.ATTENDANCE, "Attendance", Icons.Default.EventNote),
    TeacherNavItem(TeacherRoutes.TIMETABLE, "Timetable", Icons.Default.CalendarMonth),
    TeacherNavItem(TeacherRoutes.GRADING_SYSTEM, "Grading System", Icons.Default.Assessment),
    TeacherNavItem(TeacherRoutes.AI_PLANNER, "AI Lesson Planner", Icons.Default.Psychology),
    TeacherNavItem(TeacherRoutes.ASSIGNMENTS, "Assignments", Icons.Default.Assignment),
    TeacherNavItem(TeacherRoutes.RESOURCES, "Resources", Icons.Default.MenuBook),
    TeacherNavItem(TeacherRoutes.MESSAGES, "Messages", Icons.Default.Mail),
    TeacherNavItem(TeacherRoutes.NOTIFICATIONS, "Notifications", Icons.Default.Notifications),
    TeacherNavItem(TeacherRoutes.SETTINGS, "Settings", Icons.Default.Settings),
)

@Composable
fun WebStyleTeacherLayout(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    onBackToAdmin: () -> Unit = {},
    userDisplayName: String = "Teacher",
    userEmail: String = "teacher@school.com",
    modifier: Modifier = Modifier
) {
    Row(modifier = modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .width(288.dp)
                .fillMaxHeight()
                .background(WebSidebarBg)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp).height(56.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                androidx.compose.ui.graphics.Brush.linearGradient(
                                    listOf(Color(0xFF2563EB), Color(0xFF4F46E5))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.School, contentDescription = null, modifier = Modifier.size(20.dp), tint = Color.White)
                    }
                    Text("PwezaCore", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
                Box(Modifier.fillMaxWidth().height(1.dp).padding(horizontal = 16.dp).background(WebSidebarBorder))
                Spacer(Modifier.height(8.dp))
                Text("MENU", color = WebSidebarText.copy(alpha = 0.7f), fontSize = 11.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp))
                teacherSidebarItems.forEach { item ->
                    TeacherSidebarNavRow(item = item, currentRoute = currentRoute, onNavigate = onNavigate)
                }
                Spacer(Modifier.height(8.dp))
                Box(Modifier.fillMaxWidth().height(1.dp).padding(horizontal = 16.dp).background(WebSidebarBorder))
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable(onClick = onLogout)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(Icons.Default.ExitToApp, contentDescription = null, tint = WebSidebarLogout)
                    Text("Logout", color = WebSidebarLogout, fontSize = 14.sp)
                }
            }
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxSize()
                .background(WebContentBg)
        ) {
            var searchQuery by remember { mutableStateOf("") }
            var profileOpen by remember { mutableStateOf(false) }
            val searchFocusRequester = remember { FocusRequester() }
            val greeting = remember {
                when (java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)) {
                    in 0..11 -> "Good morning"
                    in 12..17 -> "Good afternoon"
                    else -> "Good evening"
                }
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(72.dp)
                    .background(WebNavbarBg)
                    .padding(horizontal = 24.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .widthIn(min = 220.dp, max = 360.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(WebNavbarSearchBg)
                            .border(1.dp, WebNavbarSearchBorder, RoundedCornerShape(12.dp))
                            .clickable { searchFocusRequester.requestFocus() },
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .padding(start = 14.dp, end = 8.dp, top = 2.dp, bottom = 2.dp)
                        ) {
                            if (searchQuery.isEmpty()) {
                                Text(
                                    text = "Search students, classes, assignments…",
                                    color = WebNavbarText,
                                    fontSize = 14.sp,
                                    modifier = Modifier.align(Alignment.CenterStart)
                                )
                            }
                            BasicTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 10.dp)
                                    .focusRequester(searchFocusRequester),
                                singleLine = true,
                                textStyle = TextStyle(color = WebNavbarTextBold, fontSize = 14.sp)
                            )
                        }
                        Icon(Icons.Default.Search, contentDescription = null, tint = WebNavbarText, modifier = Modifier.padding(end = 14.dp).size(20.dp))
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("$greeting, ", color = WebNavbarText, fontSize = 14.sp)
                    Text(userDisplayName, color = WebNavbarTextBold, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    TextButton(
                        onClick = { onNavigate(TeacherRoutes.NOTIFICATIONS) },
                        colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = WebNavbarText)
                    ) {
                        Icon(Icons.Default.Notifications, contentDescription = null, modifier = Modifier.size(20.dp))
                    }
                    TextButton(
                        onClick = { onNavigate(TeacherRoutes.MESSAGES) },
                        colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = WebNavbarText)
                    ) {
                        Icon(Icons.Default.Mail, contentDescription = null, modifier = Modifier.size(20.dp))
                    }
                    Box {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(WebNavbarSearchBg)
                                .clickable { profileOpen = !profileOpen }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(36.dp)
                                    .clip(RoundedCornerShape(9999.dp))
                                    .background(androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFF22C55E), Color(0xFF15803D)))),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = userDisplayName.take(1).uppercase().ifEmpty { "?" },
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(userDisplayName, color = WebNavbarTextBold, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                Text(userEmail, color = WebNavbarText, fontSize = 12.sp)
                            }
                        }
                        if (profileOpen) {
                            Column(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(top = 48.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(WebNavbarBg)
                                    .padding(8.dp)
                            ) {
                                Text(userDisplayName, color = WebNavbarTextBold, fontSize = 14.sp, modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp))
                                Text(userEmail, color = WebNavbarText, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 12.dp).padding(bottom = 8.dp))
                                Box(Modifier.fillMaxWidth().height(1.dp).background(WebNavbarBorder))
                                TextButton(onClick = { profileOpen = false; onNavigate(TeacherRoutes.SETTINGS) }) {
                                    Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(18.dp), tint = WebNavbarText)
                                    Spacer(Modifier.size(8.dp))
                                    Text("Settings", color = WebNavbarTextBold)
                                }
                                TextButton(onClick = { profileOpen = false; onBackToAdmin() }) {
                                    Text("Admin Dashboard", color = WebNavbarText)
                                }
                                TextButton(onClick = { profileOpen = false; onLogout() }) {
                                    Text("Logout", color = Color(0xFFDC2626))
                                }
                            }
                        }
                    }
                }
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(WebNavbarBorder))
            LiquidGlassTheme(darkTheme = true) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth()
                        .background(WebContentBg)
                        .padding(24.dp)
                ) {
                    when (currentRoute) {
                        TeacherRoutes.DASHBOARD -> TeacherDashboardScreen(
                            onTakeAttendance = { onNavigate(TeacherRoutes.ATTENDANCE) },
                            onExamResults = { onNavigate(TeacherRoutes.EXAM_RESULTS) },
                            onTimetable = { onNavigate(TeacherRoutes.TIMETABLE) },
                            onAssignments = { onNavigate(TeacherRoutes.ASSIGNMENTS) },
                            onMessages = { onNavigate(TeacherRoutes.MESSAGES) },
                            onNotifications = { onNavigate(TeacherRoutes.NOTIFICATIONS) },
                            onViewClass = { onNavigate(TeacherRoutes.CLASSES) },
                            onEnterMarks = { onNavigate(TeacherRoutes.EXAM_RESULTS) }
                        )
                        TeacherRoutes.CLASSES -> TeacherClassesScreen(onViewClass = { onNavigate(TeacherRoutes.CLASSES) })
                        TeacherRoutes.STUDENTS -> TeacherStudentsScreen()
                        TeacherRoutes.EXAM_RESULTS -> TeacherExamResultsScreen()
                        TeacherRoutes.ATTENDANCE -> TeacherAttendanceScreen(onSelectClass = { })
                        TeacherRoutes.TIMETABLE -> TeacherTimetableScreen()
                        TeacherRoutes.GRADING_SYSTEM -> TeacherGradingSystemScreen()
                        TeacherRoutes.AI_PLANNER -> TeacherAiPlannerScreen()
                        TeacherRoutes.ASSIGNMENTS -> TeacherAssignmentsScreen(onCreateAssignment = { })
                        TeacherRoutes.RESOURCES -> TeacherResourcesScreen(onUploadResource = { })
                        TeacherRoutes.MESSAGES -> TeacherMessagesScreen(onNewMessage = { })
                        TeacherRoutes.NOTIFICATIONS -> TeacherNotificationsScreen()
                        TeacherRoutes.SETTINGS -> TeacherSettingsScreen()
                        else -> TeacherDashboardScreen(
                            onTakeAttendance = { onNavigate(TeacherRoutes.ATTENDANCE) },
                            onExamResults = { onNavigate(TeacherRoutes.EXAM_RESULTS) },
                            onTimetable = { onNavigate(TeacherRoutes.TIMETABLE) },
                            onAssignments = { onNavigate(TeacherRoutes.ASSIGNMENTS) },
                            onMessages = { onNavigate(TeacherRoutes.MESSAGES) },
                            onNotifications = { onNavigate(TeacherRoutes.NOTIFICATIONS) },
                            onViewClass = { onNavigate(TeacherRoutes.CLASSES) },
                            onEnterMarks = { onNavigate(TeacherRoutes.EXAM_RESULTS) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TeacherSidebarNavRow(
    item: TeacherNavItem,
    currentRoute: String,
    onNavigate: (String) -> Unit
) {
    val active = when {
        item.route.isEmpty() -> currentRoute.isEmpty()
        else -> currentRoute == item.route || currentRoute.startsWith(item.route + "/")
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .clip(RoundedCornerShape(12.dp))
            .then(
                if (active) Modifier.border(1.dp, Color(0x4D4DABFF), RoundedCornerShape(12.dp))
                else Modifier
            )
            .background(if (active) WebSidebarActiveBg else Color.Transparent)
            .clickable { onNavigate(item.route) }
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(item.icon, contentDescription = item.label, tint = if (active) WebSidebarActiveText else WebSidebarText)
        Text(item.label, color = if (active) WebSidebarActiveText else WebSidebarText, fontSize = 14.sp)
    }
}
