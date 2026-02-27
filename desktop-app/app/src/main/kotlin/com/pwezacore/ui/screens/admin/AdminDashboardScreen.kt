package com.pwezacore.ui.screens.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Event
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import com.pwezacore.data.AdminDashboardRepository
import com.pwezacore.data.RecentPaymentRow
import com.pwezacore.data.StaffPreviewRow
import com.pwezacore.ui.components.GlassCard
import com.pwezacore.ui.theme.AppAccentColors

private val WebGray900 = Color(0xFFF8FAFC)
private val WebGray600 = Color(0xFF94A3B8)
private val WebGray500 = Color(0xFF64748B)
private val WebGreen600 = Color(0xFF22C55E)
private val WebWhite = Color(0xFFFFFFFF)
private val WebGray100 = Color(0xFF1E293B)
private val WebGray200 = Color(0xFF334155)
private val WebRed600 = Color(0xFFEF4444)

private fun formatMoney(amount: Double): String =
    "USh ${"%,.0f".format(amount)}"

@Composable
private fun KpiCard(
    title: String,
    value: String,
    subtitle: String,
    valueColor: Color,
    onViewClick: (() -> Unit)?,
    modifier: Modifier = Modifier
) {
    GlassCard(
        modifier = modifier
            .fillMaxWidth()
            .then(if (onViewClick != null) Modifier.clickable(onClick = onViewClick) else Modifier),
        contentPadding = PaddingValues(16.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(valueColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {}
            Spacer(modifier = Modifier.height(12.dp))
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = WebGray900, lineHeight = 24.sp)
            Text(title, fontSize = 11.sp, color = WebGray500, lineHeight = 14.sp)
            if (subtitle.isNotEmpty()) {
                Text(subtitle, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = WebGreen600, lineHeight = 16.sp)
            }
        }
    }
}

@Composable
fun AdminDashboardScreen(
    schoolId: String?,
    onLogout: () -> Unit,
    onNavigateToStudents: () -> Unit = {},
    onNavigateToTeachers: () -> Unit = {},
    onNavigateToFinance: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    onNavigateToParents: () -> Unit = {},
    onAddStudent: () -> Unit = {},
    onAddTeacher: () -> Unit = {},
    onAddParent: () -> Unit = {},
    onRecordPayment: () -> Unit = {},
    onNavigateToSettings: () -> Unit = {},
    onNavigateToLocation: () -> Unit = {},
    onNavigateToJobs: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var studentCount by remember { mutableStateOf(0L) }
    var teacherCount by remember { mutableStateOf(0L) }
    var feesCollected by remember { mutableStateOf(0.0) }
    var outstanding by remember { mutableStateOf(0.0) }
    var attendanceToday by remember { mutableStateOf(0L) }
    var recentPayments by remember { mutableStateOf<List<RecentPaymentRow>>(emptyList()) }
    var staffPreview by remember { mutableStateOf<List<StaffPreviewRow>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(schoolId) {
        loading = true
        if (schoolId != null) {
            coroutineScope {
                val studentCountDeferred = async { AdminDashboardRepository.getStudentCount(schoolId) }
                val teacherCountDeferred = async { AdminDashboardRepository.getTeacherCount(schoolId) }
                val feesDeferred = async { AdminDashboardRepository.getFeesCollectedThisTerm(schoolId) }
                val outstandingDeferred = async { AdminDashboardRepository.getOutstandingBalances(schoolId) }
                val attendanceDeferred = async { AdminDashboardRepository.getAttendanceTodayCount(schoolId) }
                val paymentsDeferred = async { AdminDashboardRepository.getRecentPayments(schoolId) }
                val staffDeferred = async { AdminDashboardRepository.getStaffPreview(schoolId) }
                studentCount = studentCountDeferred.await()
                teacherCount = teacherCountDeferred.await()
                feesCollected = feesDeferred.await()
                outstanding = outstandingDeferred.await()
                attendanceToday = attendanceDeferred.await()
                recentPayments = paymentsDeferred.await()
                staffPreview = staffDeferred.await()
            }
        }
        loading = false
    }

    // Show dashboard shell immediately; no full-screen spinner so the app feels native
    LazyColumn(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(24.dp),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Dashboard", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = WebGray900)
                    Text("Plan, prioritize, and manage your school with ease.", style = MaterialTheme.typography.bodyMedium, color = WebGray600)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(onClick = onAddStudent, colors = ButtonDefaults.buttonColors(containerColor = WebGreen600), shape = RoundedCornerShape(12.dp)) { Text("+ Add Student") }
                    Button(onClick = { }, colors = ButtonDefaults.outlinedButtonColors(contentColor = WebGray600), shape = RoundedCornerShape(12.dp), border = BorderStroke(1.dp, WebGray200)) { Text("Import Data") }
                }
            }
        }

        item { Text("Key figures", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = WebGray900) }
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                val showPlaceholder = loading && schoolId != null
                listOf(
                    Triple(if (showPlaceholder) "—" else studentCount.toString(), "TOTAL STUDENTS", "Active"),
                    Triple(if (showPlaceholder) "—" else teacherCount.toString(), "TOTAL TEACHERS", "Staff"),
                    Triple(if (showPlaceholder) "—" else formatMoney(feesCollected), "FEES COLLECTED", "This term"),
                    Triple(if (showPlaceholder) "—" else formatMoney(outstanding), "OUTSTANDING BALANCES", "Balance due"),
                    Triple(if (showPlaceholder) "—" else attendanceToday.toString(), "ATTENDANCE TODAY", "Present")
                ).forEachIndexed { i, (value, title, subtitle) ->
                    val valueColor = if (title.contains("OUTSTANDING")) WebRed600 else WebGreen600
                    KpiCard(value = value, title = title, subtitle = subtitle, valueColor = valueColor, onViewClick = when (i) { 0 -> onNavigateToStudents; 1 -> onNavigateToTeachers; 2, 3 -> onNavigateToFinance; else -> null }, modifier = Modifier.weight(1f))
                }
            }
        }

        item { Text("Quick Actions", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = WebGray900) }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(24.dp)) {
                val quickActions = listOf(
                    "Add Student" to onAddStudent,
                    "Add Teacher" to onAddTeacher,
                    "Add Parent" to onAddParent,
                    "Add Accounts Manager" to onAddTeacher,
                    "Generate Reports" to onNavigateToReports,
                    "Generate Receipts" to onRecordPayment,
                    "Post Job Vacancy" to onNavigateToJobs,
                    "Add Librarian" to {},
                    "Appoint Head Teacher" to {},
                    "Headed Paper" to {},
                    "Location Settings" to onNavigateToLocation,
                    "System Settings" to onNavigateToSettings
                )
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    quickActions.chunked(4).forEach { rowActions ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            rowActions.forEach { (label, onClick) ->
                                Row(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(WebGray100.copy(alpha = 0.5f))
                                        .clickable(onClick = onClick)
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(label, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = if (label in listOf("Add Student", "Add Teacher", "Add Parent")) WebGreen600 else WebGray600)
                                }
                            }
                        }
                    }
                }
            }
        }

        item { Text("Pending Expense Approvals", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = WebGray900) }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("No expenses awaiting approval", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = WebGray900)
                    Text("When expenses are submitted they will appear here.", fontSize = 13.sp, color = WebGray600)
                }
            }
        }

        item { Text("Enrollment & Attendance Analytics", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = WebGray900) }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Charts will load from your school data.", fontSize = 14.sp, color = WebGray600)
                    Text("Last 7 working days", fontSize = 12.sp, color = WebGray500)
                    Row(modifier = Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Enrollment by Term", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = WebGray900)
                            Text("Term data", fontSize = 12.sp, color = WebGray500)
                        }
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Fee Collections by Week", fontSize = 13.sp, fontWeight = FontWeight.Medium, color = WebGray900)
                            Text("Weekly fees", fontSize = 12.sp, color = WebGray500)
                        }
                    }
                }
            }
        }

        item { Text("Reminders", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = WebGray900) }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("No upcoming reminders.", fontSize = 14.sp, color = WebGray900)
                    TextButton(onClick = { }) { Text("View notifications", color = WebGreen600) }
                }
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Upcoming", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = WebGray900)
                TextButton(onClick = { }) { Text("View all", color = WebGreen600) }
            }
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("No upcoming events.", fontSize = 14.sp, color = WebGray600)
                }
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Recent Payments", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = WebGray900)
                TextButton(onClick = onRecordPayment) { Text("View all →", color = WebGreen600) }
            }
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (recentPayments.isEmpty()) {
                        Text("No recent payments.", fontSize = 14.sp, color = WebGray600)
                    } else {
                        recentPayments.forEach { p ->
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(p.payerName, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = WebGray900)
                                    Text("${p.paymentMethod ?: "—"} • ${p.paymentDate ?: "—"}", fontSize = 12.sp, color = WebGray500)
                                }
                                Text(formatMoney(p.amountPaid), fontSize = 14.sp, fontWeight = FontWeight.Medium, color = WebGray900)
                            }
                        }
                    }
                }
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Notifications", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = WebGray900)
                TextButton(onClick = { }) { Text("View all →", color = WebGreen600) }
            }
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                Text("No notifications", fontSize = 14.sp, color = WebGray600)
            }
        }

        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Staff Overview", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = WebGray900)
                TextButton(onClick = onNavigateToTeachers) { Text("View all", color = WebGreen600) }
            }
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                if (staffPreview.isEmpty()) {
                    Text("No staff yet.", fontSize = 14.sp, color = WebGray600)
                } else {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        staffPreview.forEach { staff ->
                            Row(
                                modifier = Modifier.weight(1f),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(RoundedCornerShape(9999.dp))
                                        .background(WebGray200),
                                    contentAlignment = Alignment.Center
                                ) { Text(staff.name.take(1).uppercase(), fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = WebGray600) }
                                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(staff.name, fontSize = 14.sp, fontWeight = FontWeight.Medium, color = WebGray900)
                                    Text(staff.displayClass, fontSize = 12.sp, color = WebGray500)
                                    Text("Teaching", fontSize = 12.sp, color = WebGreen600)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
