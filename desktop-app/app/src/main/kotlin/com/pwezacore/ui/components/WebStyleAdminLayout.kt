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
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Class
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.EventNote
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.FileCopy
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.ui.theme.LiquidGlassTheme
import com.pwezacore.ui.navigation.WebAdminRoutes
import com.pwezacore.data.DesktopSupabase
import com.pwezacore.data.AdminDashboardRepository
import com.pwezacore.ui.screens.admin.AdminDashboardScreen
import com.pwezacore.ui.screens.admin.AddStudentScreen
import com.pwezacore.ui.screens.admin.AddTeacherScreen
import com.pwezacore.ui.screens.admin.AddParentScreen
import com.pwezacore.ui.screens.admin.AttendanceScreen
import com.pwezacore.ui.screens.admin.ClassesScreen
import com.pwezacore.ui.screens.admin.ExamSetsScreen
import com.pwezacore.ui.screens.admin.FinanceScreen
import com.pwezacore.ui.screens.admin.IdentityScreen
import com.pwezacore.ui.screens.admin.JobVacanciesScreen
import com.pwezacore.ui.screens.admin.NotificationsScreen
import com.pwezacore.ui.screens.admin.ParentsScreen
import com.pwezacore.ui.screens.admin.ReportsScreen
import com.pwezacore.ui.screens.admin.StaffScreen
import com.pwezacore.ui.screens.admin.StudentsScreen
import com.pwezacore.ui.screens.admin.SystemSettingsScreen
import com.pwezacore.ui.screens.admin.GenerateReportScreen
import com.pwezacore.ui.screens.admin.TeachersScreen
import com.pwezacore.ui.screens.admin.SettingsSectionScreen
import com.pwezacore.ui.components.SyncStatusIndicator

private val WebSidebarBg = Color(0x14FFFFFF)
private val WebSidebarBorder = Color(0x33FFFFFF)
private val WebSidebarText = Color(0xD9FFFFFF)
private val WebSidebarActiveBg = Color(0x264DABFF)
private val WebSidebarActiveText = Color(0xFF4DABFF)
private val WebSidebarLogout = Color(0xE6EF4444)
// Web app dark mode: dark navbar and content (match web)
private val WebNavbarBg = Color(0xFF1E293B)
private val WebNavbarBorder = Color(0xFF334155)
private val WebNavbarText = Color(0xFF94A3B8)
private val WebNavbarTextBold = Color(0xFFF8FAFC)
private val WebNavbarSearchBg = Color(0xFF0F172A)
private val WebNavbarSearchBorder = Color(0xFF475569)
private val WebGreen = Color(0xFF22C55E)
private val WebContentBg = Color(0xFF0F172A)

data class WebNavItem(val route: String, val label: String, val icon: ImageVector)

/** SPA order: Dashboard, Students, Teachers, Parents, [User Management expandable], Staff, Finance, [Reports expandable], Attendance, Exam Sets, Identity, Classes, Job Vacancies, System Settings, Notifications, Logout */
private val menuSectionItems = listOf(
    WebNavItem(WebAdminRoutes.DASHBOARD, "Dashboard", Icons.Default.Dashboard),
    WebNavItem(WebAdminRoutes.STUDENTS, "Students", Icons.Default.School),
    WebNavItem(WebAdminRoutes.TEACHERS, "Teachers", Icons.Default.Person),
    WebNavItem(WebAdminRoutes.PARENTS, "Parents", Icons.Default.Group),
)

private val afterExpandableItems = listOf(
    WebNavItem(WebAdminRoutes.STAFF, "Staff", Icons.Default.Badge),
    WebNavItem(WebAdminRoutes.OUTSTANDING, "Finance", Icons.Default.AccountBalance),
)

private val restSectionItems = listOf(
    WebNavItem(WebAdminRoutes.ATTENDANCE, "Attendance", Icons.Default.EventNote),
    WebNavItem(WebAdminRoutes.EXAM_SETS, "Exam Sets", Icons.Default.Book),
    WebNavItem(WebAdminRoutes.IDENTITY, "Identity", Icons.Default.FileCopy),
    WebNavItem(WebAdminRoutes.SETTINGS_CLASSES, "Classes", Icons.Default.Class),
    WebNavItem(WebAdminRoutes.JOBS, "Job Vacancies", Icons.Default.Work),
    WebNavItem(WebAdminRoutes.SETTINGS, "System Settings", Icons.Default.Settings),
    WebNavItem(WebAdminRoutes.NOTIFICATIONS, "Notifications", Icons.Default.Notifications),
)

@Composable
private fun SidebarNavRow(
    item: WebNavItem,
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

@Composable
private fun SidebarSubRow(route: String, label: String, currentRoute: String, onNavigate: (String) -> Unit) {
    val active = currentRoute == route || currentRoute.startsWith("$route/")
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 16.dp, end = 12.dp, top = 2.dp, bottom = 2.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(if (active) WebSidebarActiveBg else Color.Transparent)
            .clickable { onNavigate(route) }
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            label,
            color = if (active) WebSidebarActiveText else WebSidebarText,
            fontSize = 14.sp
        )
    }
}

@Composable
fun WebStyleAdminLayout(
    currentRoute: String,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    userDisplayName: String = "User",
    userEmail: String = "user@school.com",
    modifier: Modifier = Modifier
) {
    var displayName by remember { mutableStateOf(userDisplayName) }
    var displayEmail by remember { mutableStateOf(userEmail) }
    var schoolId by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        val session = DesktopSupabase.auth.currentSessionOrNull() ?: return@LaunchedEffect
        val userId = session.user?.id ?: return@LaunchedEffect
        val profile = AdminDashboardRepository.getUserProfile(userId)
        if (profile != null) {
            displayName = profile.name?.takeIf { it.isNotBlank() } ?: "User"
            displayEmail = profile.email?.takeIf { it.isNotBlank() } ?: "user@school.com"
            schoolId = profile.schoolId
        }
    }
    val userName = if (displayName != "User" || displayEmail != "user@school.com") displayName else userDisplayName
    val userMail = if (displayName != "User" || displayEmail != "user@school.com") displayEmail else userEmail
    var userManagementOpen by remember { mutableStateOf(currentRoute.startsWith(WebAdminRoutes.ACCOUNTS)) }
    var reportsOpen by remember {
        mutableStateOf(
            currentRoute.startsWith(WebAdminRoutes.REPORTS) ||
                currentRoute == WebAdminRoutes.REPORT_RECORDS ||
                currentRoute == WebAdminRoutes.SETTINGS
        )
    }
    LaunchedEffect(currentRoute) {
        if (currentRoute.startsWith(WebAdminRoutes.ACCOUNTS)) userManagementOpen = true
        if (currentRoute.startsWith(WebAdminRoutes.REPORTS) || currentRoute == WebAdminRoutes.REPORT_RECORDS || currentRoute == WebAdminRoutes.SETTINGS) reportsOpen = true
    }
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
                menuSectionItems.forEach { item ->
                    SidebarNavRow(item = item, currentRoute = currentRoute, onNavigate = onNavigate)
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { userManagementOpen = !userManagementOpen }
                        .background(if (currentRoute.startsWith(WebAdminRoutes.ACCOUNTS)) WebSidebarActiveBg else Color.Transparent)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(Icons.Default.Badge, contentDescription = null, tint = if (currentRoute.startsWith(WebAdminRoutes.ACCOUNTS)) WebSidebarActiveText else WebSidebarText)
                    Text("User Management", color = if (currentRoute.startsWith(WebAdminRoutes.ACCOUNTS)) WebSidebarActiveText else WebSidebarText, fontSize = 14.sp, modifier = Modifier.weight(1f))
                    Icon(if (userManagementOpen) Icons.Default.ExpandMore else Icons.Default.ChevronRight, contentDescription = null, tint = WebSidebarText, modifier = Modifier.size(20.dp))
                }
                if (userManagementOpen) {
                    SidebarSubRow(WebAdminRoutes.ACCOUNTS, "All users", currentRoute, onNavigate)
                    SidebarSubRow(WebAdminRoutes.ACCOUNTS_ADD, "Create Staff", currentRoute, onNavigate)
                }
                afterExpandableItems.forEach { item ->
                    SidebarNavRow(item = item, currentRoute = currentRoute, onNavigate = onNavigate)
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 4.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { reportsOpen = !reportsOpen }
                        .background(if (currentRoute.startsWith(WebAdminRoutes.REPORTS) || currentRoute == WebAdminRoutes.REPORT_RECORDS) WebSidebarActiveBg else Color.Transparent)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Icon(Icons.Default.Receipt, contentDescription = null, tint = if (currentRoute.startsWith(WebAdminRoutes.REPORTS) || currentRoute == WebAdminRoutes.REPORT_RECORDS) WebSidebarActiveText else WebSidebarText)
                    Text("Reports", color = if (currentRoute.startsWith(WebAdminRoutes.REPORTS) || currentRoute == WebAdminRoutes.REPORT_RECORDS) WebSidebarActiveText else WebSidebarText, fontSize = 14.sp, modifier = Modifier.weight(1f))
                    Icon(if (reportsOpen) Icons.Default.ExpandMore else Icons.Default.ChevronRight, contentDescription = null, tint = WebSidebarText, modifier = Modifier.size(20.dp))
                }
                if (reportsOpen) {
                    SidebarSubRow(WebAdminRoutes.REPORTS, "Overview", currentRoute, onNavigate)
                    SidebarSubRow(WebAdminRoutes.REPORTS_GENERATE, "Generate Reports", currentRoute, onNavigate)
                    SidebarSubRow(WebAdminRoutes.REPORT_RECORDS, "Report Records", currentRoute, onNavigate)
                    SidebarSubRow(WebAdminRoutes.SETTINGS, "Report Templates", currentRoute, onNavigate)
                }
                restSectionItems.forEach { item ->
                    SidebarNavRow(item = item, currentRoute = currentRoute, onNavigate = onNavigate)
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
            var selectedTerm by remember { mutableStateOf("") }
            var selectedClass by remember { mutableStateOf("") }
            var selectedYear by remember { mutableStateOf("") }
            var termExpanded by remember { mutableStateOf(false) }
            var classExpanded by remember { mutableStateOf(false) }
            var yearExpanded by remember { mutableStateOf(false) }
            val greeting = remember {
                when (java.util.Calendar.getInstance().get(java.util.Calendar.HOUR_OF_DAY)) {
                    in 0..11 -> "Good morning"
                    in 12..17 -> "Good afternoon"
                    else -> "Good evening"
                }
            }
            // Web-style navbar: white bg, gray border, search + filters + profile
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
                    // Single search bar matching web: one rounded field, placeholder text only, icon on right
                    Row(
                        modifier = Modifier
                            .widthIn(min = 220.dp, max = 360.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(WebNavbarSearchBg)
                            .border(1.dp, WebNavbarSearchBorder, RoundedCornerShape(12.dp)),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .padding(start = 14.dp, end = 8.dp, top = 2.dp, bottom = 2.dp)
                        ) {
                            if (searchQuery.isEmpty()) {
                                Text(
                                    text = "Search students, fees, reports...",
                                    color = WebNavbarText,
                                    fontSize = 14.sp,
                                    modifier = Modifier.align(Alignment.CenterStart)
                                )
                            }
                            BasicTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                                singleLine = true,
                                textStyle = TextStyle(
                                    color = WebNavbarTextBold,
                                    fontSize = 14.sp
                                )
                            )
                        }
                        Icon(
                            Icons.Default.Search,
                            contentDescription = null,
                            tint = WebNavbarText,
                            modifier = Modifier.padding(end = 14.dp).size(20.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    // Term dropdown
                    Box {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(WebNavbarSearchBg)
                                .border(1.dp, WebNavbarSearchBorder, RoundedCornerShape(8.dp))
                                .clickable { termExpanded = true }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = selectedTerm.ifEmpty { "Term" },
                                fontSize = 14.sp,
                                color = if (selectedTerm.isEmpty()) WebNavbarText else WebNavbarTextBold
                            )
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = WebNavbarText)
                        }
                        DropdownMenu(
                            expanded = termExpanded,
                            onDismissRequest = { termExpanded = false },
                            modifier = Modifier.background(WebNavbarSearchBg)
                        ) {
                            listOf("", "Term 1", "Term 2", "Term 3").forEach { opt ->
                                DropdownMenuItem(
                                    text = { Text(if (opt.isEmpty()) "Term" else opt, color = WebNavbarTextBold) },
                                    onClick = {
                                        selectedTerm = opt
                                        termExpanded = false
                                    }
                                )
                            }
                        }
                    }
                    // Class dropdown
                    Box {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(WebNavbarSearchBg)
                                .border(1.dp, WebNavbarSearchBorder, RoundedCornerShape(8.dp))
                                .clickable { classExpanded = true }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = selectedClass.ifEmpty { "Class" },
                                fontSize = 14.sp,
                                color = if (selectedClass.isEmpty()) WebNavbarText else WebNavbarTextBold
                            )
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = WebNavbarText)
                        }
                        DropdownMenu(
                            expanded = classExpanded,
                            onDismissRequest = { classExpanded = false },
                            modifier = Modifier.background(WebNavbarSearchBg)
                        ) {
                            listOf("", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6", "Senior 1", "Senior 2", "Senior 3", "Senior 4").forEach { opt ->
                                DropdownMenuItem(
                                    text = { Text(if (opt.isEmpty()) "Class" else opt, color = WebNavbarTextBold) },
                                    onClick = {
                                        selectedClass = opt
                                        classExpanded = false
                                    }
                                )
                            }
                        }
                    }
                    // Academic Year dropdown
                    Box {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(WebNavbarSearchBg)
                                .border(1.dp, WebNavbarSearchBorder, RoundedCornerShape(8.dp))
                                .clickable { yearExpanded = true }
                                .padding(horizontal = 12.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            Text(
                                text = selectedYear.ifEmpty { "Academic Year" },
                                fontSize = 14.sp,
                                color = if (selectedYear.isEmpty()) WebNavbarText else WebNavbarTextBold
                            )
                            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = WebNavbarText)
                        }
                        DropdownMenu(
                            expanded = yearExpanded,
                            onDismissRequest = { yearExpanded = false },
                            modifier = Modifier.background(WebNavbarSearchBg)
                        ) {
                            listOf("", "2026", "2025", "2024", "2023").forEach { opt ->
                                DropdownMenuItem(
                                    text = { Text(if (opt.isEmpty()) "Academic Year" else opt, color = WebNavbarTextBold) },
                                    onClick = {
                                        selectedYear = opt
                                        yearExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SyncStatusIndicator()
                    Text("$greeting, ", color = WebNavbarText, fontSize = 14.sp)
                    Text(userName, color = WebNavbarTextBold, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    TextButton(
                        onClick = { onNavigate(WebAdminRoutes.NOTIFICATIONS) },
                        colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = WebNavbarText)
                    ) {
                        Icon(Icons.Default.Notifications, contentDescription = null, modifier = Modifier.size(20.dp))
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
                                text = userName.take(1).uppercase().ifEmpty { "?" },
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text(userName, color = WebNavbarTextBold, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                Text(userMail, color = WebNavbarText, fontSize = 12.sp)
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
                                TextButton(onClick = { profileOpen = false; onLogout() }) {
                                    Text("Logout", color = Color(0xFFDC2626))
                                }
                            }
                        }
                    }
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(WebNavbarBorder)
            )
            LiquidGlassTheme(darkTheme = true) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth()
                        .background(WebContentBg)
                        .padding(24.dp)
                ) {
                    WebAdminContent(currentRoute = currentRoute, onNavigate = onNavigate, schoolId = schoolId)
                }
            }
        }
    }
}

@Composable
private fun WebAdminContent(currentRoute: String, onNavigate: (String) -> Unit, schoolId: String?) {
    when (currentRoute) {
        WebAdminRoutes.DASHBOARD -> AdminDashboardScreen(
            schoolId = schoolId,
            onLogout = { },
            onNavigateToStudents = { onNavigate(WebAdminRoutes.STUDENTS) },
            onNavigateToTeachers = { onNavigate(WebAdminRoutes.TEACHERS) },
            onNavigateToFinance = { onNavigate(WebAdminRoutes.OUTSTANDING) },
            onNavigateToReports = { onNavigate(WebAdminRoutes.REPORTS_GENERATE) },
            onNavigateToParents = { onNavigate(WebAdminRoutes.PARENTS) },
            onAddStudent = { onNavigate(WebAdminRoutes.STUDENTS_ADD) },
            onAddTeacher = { onNavigate(WebAdminRoutes.ACCOUNTS_ADD) },
            onAddParent = { onNavigate(WebAdminRoutes.PARENTS) },
            onRecordPayment = { onNavigate(WebAdminRoutes.OUTSTANDING) },
            onNavigateToSettings = { onNavigate(WebAdminRoutes.SETTINGS) },
            onNavigateToLocation = { onNavigate(WebAdminRoutes.SETTINGS_LOCATION) },
            onNavigateToJobs = { onNavigate(WebAdminRoutes.JOBS) }
        )
        WebAdminRoutes.STUDENTS -> StudentsScreen(
            schoolId = schoolId,
            onBack = { onNavigate(WebAdminRoutes.DASHBOARD) },
            onAddStudent = { onNavigate(WebAdminRoutes.STUDENTS_ADD) },
            onAddFamily = { onNavigate(WebAdminRoutes.PARENTS) }
        )
        WebAdminRoutes.STUDENTS_ADD -> AddStudentScreen(onBack = { onNavigate(WebAdminRoutes.STUDENTS) }, onSaved = { onNavigate(WebAdminRoutes.STUDENTS) })
        WebAdminRoutes.TEACHERS -> TeachersScreen(schoolId = schoolId, onBack = { onNavigate(WebAdminRoutes.DASHBOARD) }, onAddTeacher = { onNavigate(WebAdminRoutes.ACCOUNTS_ADD) })
        WebAdminRoutes.PARENTS -> ParentsScreen(schoolId = schoolId, onAddParent = { onNavigate(WebAdminRoutes.PARENTS_ADD) })
        WebAdminRoutes.PARENTS_ADD -> AddParentScreen(onBack = { onNavigate(WebAdminRoutes.PARENTS) }, onSaved = { onNavigate(WebAdminRoutes.PARENTS) })
        WebAdminRoutes.ACCOUNTS -> StaffScreen(schoolId = schoolId, onAddStaff = { onNavigate(WebAdminRoutes.ACCOUNTS_ADD) })
        WebAdminRoutes.ACCOUNTS_ADD -> AddTeacherScreen(onBack = { onNavigate(WebAdminRoutes.ACCOUNTS) }, onSaved = { onNavigate(WebAdminRoutes.ACCOUNTS) })
        WebAdminRoutes.STAFF -> StaffScreen(schoolId = schoolId, onAddStaff = { onNavigate(WebAdminRoutes.ACCOUNTS_ADD) })
        WebAdminRoutes.OUTSTANDING -> FinanceScreen(onRecordPayment = { onNavigate(WebAdminRoutes.OUTSTANDING) }, onViewOutstanding = { })
        WebAdminRoutes.REPORTS, WebAdminRoutes.REPORT_RECORDS -> ReportsScreen(
            reportRoute = currentRoute,
            onGenerateReport = { onNavigate(WebAdminRoutes.REPORTS_GENERATE) }
        )
        WebAdminRoutes.REPORTS_GENERATE -> GenerateReportScreen(
            schoolId = schoolId,
            onBackToReports = { onNavigate(WebAdminRoutes.REPORTS) },
            onCustomizeHeader = { }
        )
        WebAdminRoutes.ATTENDANCE -> AttendanceScreen(onTakeAttendance = { }, onViewRecords = { })
        WebAdminRoutes.EXAM_SETS -> ExamSetsScreen(onAddExamSet = { })
        WebAdminRoutes.IDENTITY -> IdentityScreen(onGenerateIdCards = { })
        WebAdminRoutes.SETTINGS_CLASSES -> ClassesScreen(onAddClass = { }, onManageClasses = { })
        WebAdminRoutes.JOBS -> JobVacanciesScreen(onPostJob = { })
        WebAdminRoutes.SETTINGS -> SystemSettingsScreen(
            onBackToDashboard = { onNavigate(WebAdminRoutes.DASHBOARD) },
            onSchoolProfile = { onNavigate(WebAdminRoutes.SETTINGS) },
            onClasses = { onNavigate(WebAdminRoutes.SETTINGS_CLASSES) },
            onSubjectsPerClass = { },
            onTeacherSubjectClass = { },
            onTermSettings = { },
            onExamSets = { onNavigate(WebAdminRoutes.EXAM_SETS) },
            onTimetableDesigner = { },
            onFinancialSettings = { },
            onSchoolRequirements = { },
            onLocation = { onNavigate(WebAdminRoutes.SETTINGS_LOCATION) },
            onQuickLinkExamSets = { onNavigate(WebAdminRoutes.EXAM_SETS) },
            onQuickLinkOldStudents = { },
            onQuickLinkFinanceRecords = { onNavigate(WebAdminRoutes.OUTSTANDING) },
            onQuickLinkAttendanceRecords = { onNavigate(WebAdminRoutes.ATTENDANCE) },
            onQuickLinkReportRecords = { onNavigate(WebAdminRoutes.REPORTS_GENERATE) }
        )
        WebAdminRoutes.SETTINGS_LOCATION -> SettingsSectionScreen(title = "Location", description = "School location and map.")
        WebAdminRoutes.NOTIFICATIONS -> NotificationsScreen()
        else -> AdminDashboardScreen(
            schoolId = schoolId,
            onLogout = { },
            onNavigateToStudents = { onNavigate(WebAdminRoutes.STUDENTS) },
            onNavigateToTeachers = { onNavigate(WebAdminRoutes.TEACHERS) },
            onNavigateToFinance = { onNavigate(WebAdminRoutes.OUTSTANDING) },
            onNavigateToReports = { onNavigate(WebAdminRoutes.REPORTS_GENERATE) },
            onNavigateToParents = { onNavigate(WebAdminRoutes.PARENTS) },
            onAddStudent = { onNavigate(WebAdminRoutes.STUDENTS_ADD) },
            onAddTeacher = { onNavigate(WebAdminRoutes.ACCOUNTS_ADD) },
            onAddParent = { onNavigate(WebAdminRoutes.PARENTS) },
            onRecordPayment = { onNavigate(WebAdminRoutes.OUTSTANDING) },
            onNavigateToSettings = { onNavigate(WebAdminRoutes.SETTINGS) },
            onNavigateToLocation = { onNavigate(WebAdminRoutes.SETTINGS_LOCATION) },
            onNavigateToJobs = { onNavigate(WebAdminRoutes.JOBS) }
        )
    }
}
