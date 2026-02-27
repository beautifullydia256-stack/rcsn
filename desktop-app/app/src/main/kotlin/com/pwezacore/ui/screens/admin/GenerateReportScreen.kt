package com.pwezacore.ui.screens.admin

import androidx.compose.foundation.background
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.data.ExamSetRow
import com.pwezacore.data.GeneratedReportRow
import com.pwezacore.data.ReportGenerateResult
import com.pwezacore.data.ReportGeneratorPageData
import com.pwezacore.data.ReportGeneratorRepository
import com.pwezacore.data.ReportStudentRow
import com.pwezacore.data.ReportTermOption
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.awt.Desktop

private val WebCardBg = androidx.compose.ui.graphics.Color(0xFF1E293B)
private val WebBorder = androidx.compose.ui.graphics.Color(0xFF334155)
private val WebTextMuted = androidx.compose.ui.graphics.Color(0xFF94A3B8)
private val WebTextPrimary = androidx.compose.ui.graphics.Color(0xFFF8FAFC)
private val WebGreen = androidx.compose.ui.graphics.Color(0xFF22C55E)
private val WebBlue = androidx.compose.ui.graphics.Color(0xFF2563EB)
private val WebRed = androidx.compose.ui.graphics.Color(0xFFDC2626)
private val WebAmber = androidx.compose.ui.graphics.Color(0xFFD97706)

@Composable
fun GenerateReportScreen(
    schoolId: String? = null,
    modifier: Modifier = Modifier,
    onBackToReports: () -> Unit = {},
    onCustomizeHeader: () -> Unit = {}
) {
    var pageData by remember { mutableStateOf<ReportGeneratorPageData?>(null) }
    var loading by remember { mutableStateOf(true) }
    var reportType by remember { mutableStateOf("single") }
    var selectedTermKey by remember { mutableStateOf("") }
    var selectedExamSetId by remember { mutableStateOf("") }
    var selectedClass by remember { mutableStateOf("") }
    var selectedStudent by remember { mutableStateOf("") }
    var studentSearch by remember { mutableStateOf("") }
    var previewing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var stepMessage by remember { mutableStateOf("") }
    var completedSnapshotId by remember { mutableStateOf<String?>(null) }
    var generatedReportIds by remember { mutableStateOf<List<String>>(emptyList()) }
    var firstGeneratedReport by remember { mutableStateOf<GeneratedReportRow?>(null) }
    var showViewReportDialog by remember { mutableStateOf(false) }

    LaunchedEffect(completedSnapshotId) {
        firstGeneratedReport = null
        if (completedSnapshotId != null) {
            val list = withContext(Dispatchers.IO) {
                ReportGeneratorRepository.getGeneratedReports(completedSnapshotId!!)
            }
            firstGeneratedReport = list.firstOrNull()
        }
    }

    LaunchedEffect(schoolId) {
        loading = true
        pageData = if (schoolId != null) ReportGeneratorRepository.getReportGeneratorPageData(schoolId) else null
        selectedTermKey = pageData?.currentTerm?.key ?: ""
        loading = false
    }

    val data = pageData
    val currentTerm = if (data != null && selectedTermKey.isNotEmpty()) {
        val parts = selectedTermKey.split("-")
        if (parts.size == 2) ReportTermOption(parts[0].toIntOrNull() ?: 1, parts[1].toIntOrNull() ?: data.currentTerm.year)
        else data.currentTerm
    } else data?.currentTerm

    val examSetsForTerm = remember(data, currentTerm) {
        if (data == null || currentTerm == null) emptyList()
        else data.examSets.filter { it.term == currentTerm.term && it.year == currentTerm.year }
    }

    var classesForExamSet by remember { mutableStateOf<List<String>>(emptyList()) }
    LaunchedEffect(schoolId, selectedExamSetId) {
        classesForExamSet = if (schoolId != null && selectedExamSetId.isNotEmpty())
            ReportGeneratorRepository.getClassesForExamSet(schoolId, selectedExamSetId)
        else emptyList()
    }

    var studentsForClass by remember { mutableStateOf<List<ReportStudentRow>>(emptyList()) }
    LaunchedEffect(schoolId, selectedExamSetId, selectedClass) {
        studentsForClass = if (schoolId != null && selectedClass.isNotEmpty()) {
            if (selectedExamSetId.isNotEmpty())
                ReportGeneratorRepository.getStudentsForReport(schoolId, selectedExamSetId, selectedClass)
            else
                ReportGeneratorRepository.getStudentsInClass(schoolId, selectedClass)
        } else emptyList()
    }

    val effectiveExamSetId = remember(examSetsForTerm, selectedExamSetId) {
        if (selectedExamSetId.isNotEmpty()) selectedExamSetId
        else examSetsForTerm.maxByOrNull { (it.name ?: "").lowercase().contains("mid") }?.id ?: examSetsForTerm.firstOrNull()?.id
    }

    val filteredStudents = remember(studentsForClass, studentSearch) {
        val q = studentSearch.trim().lowercase()
        if (q.isEmpty()) studentsForClass
        else studentsForClass.filter {
            (it.name?.lowercase()?.contains(q) == true) || (it.admissionNumber?.lowercase()?.contains(q) == true)
        }
    }

    val templateDisplayName = "Report For ${selectedClass.ifEmpty { "…" }}"
    val canPreview = selectedClass.isNotEmpty() && (reportType != "single" || selectedStudent.isNotEmpty())
    val scope = rememberCoroutineScope()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    "Student Report Generator",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = WebTextPrimary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Generate and download student academic reports.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = WebTextMuted
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TextButton(
                    onClick = onCustomizeHeader,
                    colors = androidx.compose.material3.ButtonDefaults.textButtonColors(containerColor = WebGreen, contentColor = androidx.compose.ui.graphics.Color.White)
                ) { Text("Customize Header") }
                OutlinedButton(
                    onClick = onBackToReports,
                    colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = WebTextPrimary)
                ) { Text("Back to Reports") }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(WebCardBg)
                .padding(24.dp)
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    "Report Configuration",
                    style = MaterialTheme.typography.titleLarge,
                    color = WebTextPrimary,
                    modifier = Modifier.padding(bottom = 16.dp)
                )

                if (loading && pageData == null) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
                        CircularProgressIndicator(color = WebGreen)
                    }
                    return@Box
                }

                if (data == null) {
                    Text("Unable to load report data. Check your connection.", color = WebTextMuted)
                    return@Box
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Label("Report Template")
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(WebBorder.copy(alpha = 0.3f))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(templateDisplayName, color = WebTextPrimary, fontSize = 14.sp)
                            Spacer(modifier = Modifier.weight(1f))
                            Text("✓ Auto-selected", color = WebGreen, fontSize = 12.sp)
                        }
                        Text(
                            "Template automatically selected based on class section.",
                            fontSize = 12.sp,
                            color = WebTextMuted,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Label("Report Type")
                        DropdownField(
                            selected = reportType,
                            options = listOf("single" to "Single Student", "class" to "Entire Class"),
                            onSelect = {
                                reportType = it
                                selectedStudent = ""
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Label("Term")
                        DropdownField(
                            selected = selectedTermKey.ifEmpty { data.currentTerm.key },
                            options = data.allTerms.map { it.key to "Term ${it.term}, ${it.year}${if (it.key == data.currentTerm.key) " (Current)" else ""}" },
                            onSelect = {
                                selectedTermKey = it
                                selectedExamSetId = ""
                                selectedClass = ""
                                selectedStudent = ""
                            }
                        )
                        Text("Choose the term for which to generate reports.", fontSize = 12.sp, color = WebTextMuted, modifier = Modifier.padding(top = 4.dp))
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Label("Exam Set")
                        if (examSetsForTerm.isEmpty()) {
                            Text(
                                "No exam set for this term. Create one first.",
                                fontSize = 14.sp,
                                color = WebAmber,
                                modifier = Modifier.padding(vertical = 8.dp)
                            )
                        } else {
                            DropdownField(
                                selected = selectedExamSetId,
                                options = listOf("" to "Auto (latest exam set for selected term)") + examSetsForTerm.map { it.id!! to (it.name ?: "Set - Term ${it.term}, ${it.year}") },
                                onSelect = {
                                    selectedExamSetId = it
                                    selectedClass = ""
                                    selectedStudent = ""
                                }
                            )
                        }
                        Text("Pick Mid Term or End of Term. Leave Auto for latest.", fontSize = 12.sp, color = WebTextMuted, modifier = Modifier.padding(top = 4.dp))
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                Column {
                    Label("Class")
                    if (effectiveExamSetId == null) {
                        Text("Select Term and Exam Set first.", fontSize = 14.sp, color = WebTextMuted, modifier = Modifier.padding(vertical = 8.dp))
                    } else {
                        DropdownField(
                            selected = selectedClass,
                            options = listOf("" to "Select Class") + classesForExamSet.map { it to it },
                            onSelect = {
                                selectedClass = it
                                selectedStudent = ""
                            }
                        )
                        if (classesForExamSet.isEmpty()) {
                            Text("No results for this exam set yet.", fontSize = 12.sp, color = WebAmber, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }

                if (reportType == "single") {
                    Spacer(modifier = Modifier.height(16.dp))
                    Column {
                        Label("Student")
                        androidx.compose.material3.OutlinedTextField(
                            value = studentSearch,
                            onValueChange = { studentSearch = it },
                            placeholder = { Text("Search by name or admission number", color = WebTextMuted) },
                            modifier = Modifier.fillMaxWidth(),
                            colors = outlineColors(),
                            shape = RoundedCornerShape(8.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        DropdownField(
                            selected = selectedStudent,
                            options = listOf("" to "Select Student") + filteredStudents.map { it.studentId!! to "${it.name ?: "—"} ${it.admissionNumber?.let { "($it)" } ?: ""}" },
                            onSelect = { selectedStudent = it }
                        )
                    }
                }

                if (error.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(error, color = WebRed, fontSize = 14.sp)
                }

                Spacer(modifier = Modifier.height(24.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    TextButton(
                        onClick = {
                            error = ""
                            stepMessage = "Preparing…"
                            previewing = true
                            scope.launch {
                                val result = withContext(Dispatchers.IO) {
                                    ReportGeneratorRepository.createSnapshotAndGenerate(
                                        schoolId = data.schoolId,
                                        examSetId = effectiveExamSetId ?: return@withContext ReportGenerateResult(null, "No exam set selected."),
                                        term = currentTerm?.term ?: 1,
                                        year = currentTerm?.year ?: java.time.Year.now().value,
                                        studentIds = if (reportType == "single" && selectedStudent.isNotEmpty()) listOf(selectedStudent) else null,
                                        classNames = if (reportType == "class" && selectedClass.isNotEmpty()) listOf(selectedClass) else null
                                    )
                                }
                                previewing = false
                                stepMessage = ""
                                if (result.isSuccess && result.snapshotId != null) {
                                    completedSnapshotId = result.snapshotId
                                    generatedReportIds = ReportGeneratorRepository.getGeneratedReports(result.snapshotId).mapNotNull { it.id }
                                } else {
                                    error = result.error ?: "Report generation failed. Ensure exam set and class have results."
                                }
                            }
                        },
                        enabled = canPreview && !previewing,
                        colors = androidx.compose.material3.ButtonDefaults.textButtonColors(containerColor = WebBlue, contentColor = androidx.compose.ui.graphics.Color.White)
                    ) {
                        if (previewing) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = androidx.compose.ui.graphics.Color.White)
                            Spacer(modifier = Modifier.width(8.dp))
                        }
                        Text(if (previewing) stepMessage.ifEmpty { "Generating…" } else "Preview Report")
                    }
                    TextButton(
                        onClick = {
                            val report = firstGeneratedReport
                            if (report?.reportData != null) {
                                val html = ReportPreviewHelper.reportDataToHtml(report.reportData)
                                val file = ReportPreviewHelper.saveReportAsHtml(html, "student_report.html")
                                file?.let { try { Desktop.getDesktop().browse(it.toURI()) } catch (_: Exception) { } }
                            }
                        },
                        enabled = completedSnapshotId != null && firstGeneratedReport != null,
                        colors = androidx.compose.material3.ButtonDefaults.textButtonColors(containerColor = WebRed, contentColor = androidx.compose.ui.graphics.Color.White)
                    ) { Text("Download as PDF (Single)") }
                    TextButton(
                        onClick = {
                            val report = firstGeneratedReport
                            if (report?.reportData != null) {
                                val text = ReportPreviewHelper.reportDataToPlainText(report.reportData)
                                ReportPreviewHelper.printReport(text)
                            }
                        },
                        enabled = completedSnapshotId != null && firstGeneratedReport != null,
                        colors = androidx.compose.material3.ButtonDefaults.textButtonColors(containerColor = WebAmber, contentColor = androidx.compose.ui.graphics.Color.White)
                    ) { Text("Print Report") }
                }
            }
        }

        if (completedSnapshotId != null && generatedReportIds.isNotEmpty()) {
            Spacer(modifier = Modifier.height(16.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(WebCardBg)
                    .padding(24.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, null, tint = WebGreen, modifier = Modifier.size(28.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            "Report generated for ${generatedReportIds.size} student(s).",
                            style = MaterialTheme.typography.titleMedium,
                            color = WebTextPrimary
                        )
                    }
                    Spacer(modifier = Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        TextButton(
                            onClick = { showViewReportDialog = true },
                            colors = androidx.compose.material3.ButtonDefaults.textButtonColors(containerColor = WebBlue, contentColor = androidx.compose.ui.graphics.Color.White)
                        ) { Text("View report") }
                        TextButton(
                            onClick = {
                                val report = firstGeneratedReport
                                if (report?.reportData != null) {
                                    val text = ReportPreviewHelper.reportDataToPlainText(report.reportData)
                                    ReportPreviewHelper.printReport(text)
                                }
                            },
                            colors = androidx.compose.material3.ButtonDefaults.textButtonColors(containerColor = WebAmber, contentColor = androidx.compose.ui.graphics.Color.White)
                        ) { Text("Print report") }
                        TextButton(
                            onClick = {
                                val report = firstGeneratedReport
                                if (report?.reportData != null) {
                                    val html = ReportPreviewHelper.reportDataToHtml(report.reportData)
                                    val file = ReportPreviewHelper.saveReportAsHtml(html, "student_report.html")
                                    file?.let { try { Desktop.getDesktop().browse(it.toURI()) } catch (_: Exception) { } }
                                }
                            },
                            colors = androidx.compose.material3.ButtonDefaults.textButtonColors(containerColor = WebRed, contentColor = androidx.compose.ui.graphics.Color.White)
                        ) { Text("Save as HTML / open in browser") }
                    }
                    Text(
                        "Save as HTML then use browser Print → Save as PDF to get a PDF.",
                        fontSize = 12.sp,
                        color = WebTextMuted,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }
            }
        }

        if (showViewReportDialog) {
            val report = firstGeneratedReport
            val reportText = report?.reportData?.let { ReportPreviewHelper.reportDataToPlainText(it) } ?: "No report data."
            AlertDialog(
                onDismissRequest = { showViewReportDialog = false },
                title = { Text("Report preview", color = WebTextPrimary) },
                text = {
                    Column(
                        modifier = Modifier
                            .height(400.dp)
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                    ) {
                        Text(
                            reportText,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 13.sp,
                            color = WebTextPrimary,
                            modifier = Modifier.padding(8.dp)
                        )
                    }
                },
                confirmButton = {
                    TextButton(onClick = { showViewReportDialog = false }) { Text("Close", color = WebBlue) }
                }
            )
        }
    }
}

@Composable
private fun Label(text: String) {
    Text(
        text = text,
        fontSize = 14.sp,
        fontWeight = FontWeight.Medium,
        color = WebTextMuted,
        modifier = Modifier.padding(bottom = 6.dp)
    )
}

@Composable
private fun DropdownField(
    selected: String,
    options: List<Pair<String, String>>,
    onSelect: (String) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = options.find { it.first == selected }?.second ?: options.firstOrNull()?.second ?: ""
    Box {
        OutlinedButton(
            onClick = { expanded = true },
            modifier = Modifier.fillMaxWidth(),
            colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = WebTextPrimary),
            border = androidx.compose.foundation.BorderStroke(1.dp, WebBorder)
        ) {
            Text(selectedLabel, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Start)
            Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = WebTextMuted)
        }
        androidx.compose.material3.DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.background(WebCardBg)
        ) {
            options.forEach { (value, label) ->
                androidx.compose.material3.DropdownMenuItem(
                    text = { Text(label, color = WebTextPrimary) },
                    onClick = {
                        onSelect(value)
                        expanded = false
                    }
                )
            }
        }
    }
}

@Composable
private fun outlineColors() = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
    focusedTextColor = WebTextPrimary,
    unfocusedTextColor = WebTextPrimary,
    focusedBorderColor = WebBorder,
    unfocusedBorderColor = WebBorder,
    cursorColor = WebGreen,
    focusedLabelColor = WebTextMuted,
    unfocusedLabelColor = WebTextMuted
)