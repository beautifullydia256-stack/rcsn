package com.pwezacore.ui.screens.admin

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.data.AdminDashboardRepository
import com.pwezacore.data.ParentRow
import com.pwezacore.data.StudentRow
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

private val WebContentBg = androidx.compose.ui.graphics.Color(0xFF0F172A)
private val WebCardBg = androidx.compose.ui.graphics.Color(0xFF1E293B)
private val WebBorder = androidx.compose.ui.graphics.Color(0xFF334155)
private val WebTextMuted = androidx.compose.ui.graphics.Color(0xFF94A3B8)
private val WebTextPrimary = androidx.compose.ui.graphics.Color(0xFFF8FAFC)
private val WebGreen = androidx.compose.ui.graphics.Color(0xFF22C55E)

@Composable
fun StudentsScreen(
    schoolId: String? = null,
    modifier: Modifier = Modifier,
    onBack: () -> Unit = {},
    onAddStudent: () -> Unit = {},
    onAddFamily: () -> Unit = {}
) {
    var students by remember { mutableStateOf<List<StudentRow>>(emptyList()) }
    var parents by remember { mutableStateOf<List<ParentRow>>(emptyList()) }
    var classTeacherByClass by remember { mutableStateOf<Map<String, String>>(emptyMap()) }
    var loading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var filterClass by remember { mutableStateOf("") }
    var displayMenuOpen by remember { mutableStateOf(false) }
    var groupByMenuOpen by remember { mutableStateOf(false) }
    var sortMenuOpen by remember { mutableStateOf(false) }
    var sortKey by remember { mutableStateOf("name") }
    var sortAsc by remember { mutableStateOf(true) }

    LaunchedEffect(schoolId) {
        loading = true
        if (schoolId != null) {
            coroutineScope {
                val studentsDeferred = async { AdminDashboardRepository.getStudents(schoolId) }
                val parentsDeferred = async { AdminDashboardRepository.getParents(schoolId) }
                val teachersDeferred = async { AdminDashboardRepository.getClassTeacherNamesByClass(schoolId) }
                students = studentsDeferred.await()
                parents = parentsDeferred.await()
                classTeacherByClass = teachersDeferred.await()
            }
        } else {
            students = emptyList()
            parents = emptyList()
            classTeacherByClass = emptyMap()
        }
        loading = false
    }

    val parentsByStudent = remember(parents) {
        parents.groupBy { it.studentId ?: "" }.mapValues { (_, list) ->
            list.map { p -> Triple(p.name ?: "—", p.email, p.phone) }
        }
    }

    val classOptions = remember(students) {
        listOf("") + students.mapNotNull { it.currentClass }.distinct().sorted()
    }

    val filtered = remember(students, searchQuery, filterClass, parentsByStudent) {
        var list = students
        val q = searchQuery.trim().lowercase()
        if (q.isNotEmpty()) {
            list = list.filter { s ->
                (s.name?.lowercase()?.contains(q) == true) ||
                    (s.currentClass?.lowercase()?.contains(q) == true) ||
                    (parentsByStudent[s.studentId]?.any { (name, _, _) -> name.lowercase().contains(q) } == true)
            }
        }
        if (filterClass.isNotEmpty()) {
            list = list.filter { it.currentClass == filterClass }
        }
        list
    }

    val sorted = remember(filtered, sortKey, sortAsc, parentsByStudent, classTeacherByClass) {
        filtered.sortedWith(compareBy(
            if (sortAsc) kotlin.Comparator.naturalOrder() else kotlin.Comparator.reverseOrder()
        ) { s ->
            when (sortKey) {
                "class" -> (s.currentClass ?: "")
                "name" -> (s.name ?: "").lowercase()
                "parents" -> (parentsByStudent[s.studentId]?.joinToString { it.first } ?: "").lowercase()
                else -> (s.name ?: "").lowercase()
            }
        })
    }

    Column(modifier = modifier.fillMaxWidth()) {
        Text(
            "Students",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = WebTextPrimary
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "Manage student records and guardian contacts.",
            style = MaterialTheme.typography.bodyMedium,
            color = WebTextMuted
        )
        Spacer(modifier = Modifier.height(20.dp))

        // Toolbar – match web
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box {
                TextButton(
                    onClick = { displayMenuOpen = !displayMenuOpen },
                    colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = WebTextPrimary)
                ) {
                    Icon(Icons.Default.Settings, contentDescription = null, modifier = Modifier.size(20.dp))
                    Text("Display / Print", fontSize = 14.sp)
                    Icon(Icons.Default.ArrowDropDown, contentDescription = null, modifier = Modifier.size(20.dp))
                }
                DropdownMenu(
                    expanded = displayMenuOpen,
                    onDismissRequest = { displayMenuOpen = false },
                    modifier = Modifier.background(WebCardBg)
                ) {
                    DropdownMenuItem(
                        text = { Text("Print table", color = WebTextPrimary) },
                        onClick = { displayMenuOpen = false }
                    )
                    DropdownMenuItem(
                        text = { Text("Export (coming soon)", color = WebTextMuted) },
                        onClick = { displayMenuOpen = false }
                    )
                }
            }
            TextButton(
                onClick = onAddStudent,
                colors = androidx.compose.material3.ButtonDefaults.textButtonColors(containerColor = WebGreen, contentColor = androidx.compose.ui.graphics.Color.White)
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("+ Add New", fontSize = 14.sp)
            }
            TextButton(
                onClick = onAddFamily,
                colors = androidx.compose.material3.ButtonDefaults.textButtonColors(containerColor = WebGreen, contentColor = androidx.compose.ui.graphics.Color.White)
            ) {
                Icon(Icons.Default.PersonAdd, contentDescription = null, modifier = Modifier.size(18.dp))
                Text("+ Add Family", fontSize = 14.sp)
            }
            Box {
                TextButton(
                    onClick = { groupByMenuOpen = !groupByMenuOpen },
                    colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = WebTextPrimary)
                ) {
                    Text("Group By", fontSize = 14.sp)
                    Icon(Icons.Default.ArrowDropDown, contentDescription = null, modifier = Modifier.size(20.dp))
                }
                DropdownMenu(
                    expanded = groupByMenuOpen,
                    onDismissRequest = { groupByMenuOpen = false },
                    modifier = Modifier.background(WebCardBg)
                ) {
                    listOf("None", "Class", "Status").forEach { opt ->
                        DropdownMenuItem(
                            text = { Text(opt, color = WebTextPrimary) },
                            onClick = { groupByMenuOpen = false }
                        )
                    }
                }
            }
            Box {
                TextButton(
                    onClick = { sortMenuOpen = !sortMenuOpen },
                    colors = androidx.compose.material3.ButtonDefaults.textButtonColors(contentColor = WebTextPrimary)
                ) {
                    Text("Sorting", fontSize = 14.sp)
                    Icon(Icons.Default.ArrowDropDown, contentDescription = null, modifier = Modifier.size(20.dp))
                }
                DropdownMenu(
                    expanded = sortMenuOpen,
                    onDismissRequest = { sortMenuOpen = false },
                    modifier = Modifier.background(WebCardBg)
                ) {
                    DropdownMenuItem(
                        text = { Text("Name A–Z", color = WebTextPrimary) },
                        onClick = { sortKey = "name"; sortAsc = true; sortMenuOpen = false }
                    )
                    DropdownMenuItem(
                        text = { Text("Name Z–A", color = WebTextPrimary) },
                        onClick = { sortKey = "name"; sortAsc = false; sortMenuOpen = false }
                    )
                    DropdownMenuItem(
                        text = { Text("Class", color = WebTextPrimary) },
                        onClick = { sortKey = "class"; sortAsc = true; sortMenuOpen = false }
                    )
                }
            }
            Text("Filter by class:", fontSize = 14.sp, color = WebTextMuted)
            var classFilterExpanded by remember { mutableStateOf(false) }
            Box(
                modifier = Modifier
                    .width(140.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(WebCardBg)
                    .border(1.dp, WebBorder, RoundedCornerShape(8.dp))
                    .clickable { classFilterExpanded = true }
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        if (filterClass.isEmpty()) "All Classes" else filterClass,
                        color = WebTextPrimary,
                        fontSize = 14.sp
                    )
                    Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = WebTextMuted, modifier = Modifier.size(20.dp))
                }
                DropdownMenu(
                    expanded = classFilterExpanded,
                    onDismissRequest = { classFilterExpanded = false },
                    modifier = Modifier.background(WebCardBg)
                ) {
                    classOptions.forEach { c ->
                        DropdownMenuItem(
                            text = { Text(if (c.isEmpty()) "All Classes" else c, color = WebTextPrimary) },
                            onClick = {
                                filterClass = c
                                classFilterExpanded = false
                            }
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.weight(1f))
            Row(
                modifier = Modifier
                    .widthIn(min = 180.dp, max = 280.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(WebCardBg)
                    .border(1.dp, WebBorder, RoundedCornerShape(12.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Search, contentDescription = null, tint = WebTextMuted, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
                androidx.compose.foundation.text.BasicTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.weight(1f),
                    singleLine = true,
                    textStyle = androidx.compose.ui.text.TextStyle(color = WebTextPrimary, fontSize = 14.sp),
                    decorationBox = { inner ->
                        if (searchQuery.isEmpty()) {
                            Text("Q Search", color = WebTextMuted, fontSize = 14.sp)
                        }
                        inner()
                    }
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Table
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(WebCardBg)
                .border(1.dp, WebBorder, RoundedCornerShape(12.dp))
        ) {
            when {
                loading && schoolId != null -> {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = WebGreen)
                    }
                }
                sorted.isEmpty() -> {
                    Text(
                        text = if (schoolId == null) "Loading…" else "No students found.",
                        color = WebTextMuted,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(24.dp)
                    )
                }
                else -> {
                    val scrollState = rememberScrollState()
                    val rowScrollState = rememberScrollState()
                    Column(modifier = Modifier.fillMaxWidth()) {
                        // Header row
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(WebBorder.copy(alpha = 0.3f))
                                .padding(horizontal = 16.dp, vertical = 12.dp)
                                .horizontalScroll(scrollState),
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            TableHeader("Student Name", 140)
                            TableHeader("Parents Names", 120)
                            TableHeader("Address", 140)
                            TableHeader("Class Teacher", 100)
                            TableHeader("Class", 80)
                            TableHeader("Email", 160)
                            TableHeader("Phone", 120)
                        }
                        LazyColumn(
                            modifier = Modifier.fillMaxWidth(),
                            verticalArrangement = Arrangement.spacedBy(0.dp)
                        ) {
                            items(sorted) { s ->
                                val parentList = parentsByStudent[s.studentId] ?: emptyList()
                                val firstParent = parentList.firstOrNull()
                                val address = (s.address?.takeIf { it.isNotBlank() } ?: s.guardianAddress?.takeIf { it.isNotBlank() }) ?: "—"
                                val classTeacher = classTeacherByClass[s.currentClass ?: ""] ?: "—"
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 16.dp, vertical = 12.dp)
                                        .horizontalScroll(rowScrollState),
                                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                                ) {
                                    TableCell(s.name ?: "—", 140)
                                    TableCell(parentList.joinToString(", ") { it.first }.ifEmpty { "—" }, 120)
                                    TableCell(address, 140)
                                    TableCell(classTeacher, 100)
                                    TableCell(s.currentClass ?: "—", 80)
                                    TableCell(firstParent?.second ?: "—", 160)
                                    TableCell(firstParent?.third ?: "—", 120)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TableHeader(label: String, minWidth: Int) {
    Text(
        text = label,
        fontSize = 14.sp,
        fontWeight = FontWeight.SemiBold,
        color = WebTextMuted,
        modifier = Modifier.width(minWidth.dp)
    )
}

@Composable
private fun TableCell(text: String, minWidth: Int) {
    Text(
        text = text.ifEmpty { "—" },
        fontSize = 14.sp,
        color = WebTextPrimary,
        modifier = Modifier.width(minWidth.dp),
        maxLines = 1
    )
}
