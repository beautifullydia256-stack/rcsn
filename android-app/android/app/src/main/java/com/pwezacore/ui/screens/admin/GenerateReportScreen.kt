package com.pwezacore.ui.screens.admin

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.pwezacore.ui.components.GlassButton
import com.pwezacore.ui.components.GlassCard
import com.pwezacore.ui.theme.AppAccentColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GenerateReportScreen(
    onBack: () -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: GenerateReportViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val scrollState = rememberScrollState()

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Text(
            text = "Student Report Generator",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = "Select term, class and student(s). Same as on the web, optimized for speed.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
        )

        if (state.loading) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                CircularProgressIndicator(color = AppAccentColors.Reports)
                Text("Loading terms & classes…", style = MaterialTheme.typography.bodySmall)
            }
        } else {
            // Term
            if (state.terms.isNotEmpty()) {
                SimpleDropdown(
                    label = "Term",
                    options = state.terms.map { it.displayName() },
                    selectedIndex = state.terms.indexOf(state.selectedTerm).coerceAtLeast(0),
                    onSelect = { viewModel.selectTerm(state.terms[it]) }
                )
            }

            // Class
            if (state.classes.isNotEmpty()) {
                SimpleDropdown(
                    label = "Class",
                    options = state.classes,
                    selectedIndex = state.classes.indexOf(state.selectedClass).coerceAtLeast(0),
                    onSelect = { viewModel.selectClass(state.classes[it]) }
                )
            }

            // Report type
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                Text(
                    text = "Report type",
                    style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        RadioButton(
                            selected = state.reportType == ReportType.SingleStudent,
                            onClick = { viewModel.setReportType(ReportType.SingleStudent) }
                        )
                        Text("Single student", style = MaterialTheme.typography.bodyLarge)
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        RadioButton(
                            selected = state.reportType == ReportType.WholeClass,
                            onClick = { viewModel.setReportType(ReportType.WholeClass) }
                        )
                        Text("Whole class", style = MaterialTheme.typography.bodyLarge)
                    }
                }
            }

            // Student (if Single)
            if (state.reportType == ReportType.SingleStudent) {
                if (state.loadingStudents) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        CircularProgressIndicator(modifier = Modifier.padding(8.dp))
                    }
                } else if (state.students.isNotEmpty()) {
                    SimpleDropdown(
                        label = "Student",
                        options = state.students.map { "${it.name} (${it.admission_number ?: it.student_id.take(8)})" },
                        selectedIndex = state.students.indexOf(state.selectedStudent).coerceAtLeast(0),
                        onSelect = { viewModel.selectStudent(state.students[it]) }
                    )
                }
            }

            state.error?.let { msg ->
                Text(
                    text = msg,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 4.dp)
                )
                TextButton(onClick = { viewModel.clearError() }) {
                    Text("Dismiss")
                }
            }

            GlassButton(
                text = "Generate report",
                onClick = { viewModel.generateReport() },
                modifier = Modifier.fillMaxWidth(),
                isPrimary = true
            )

            state.reportText?.let { text ->
                GlassCard(
                    modifier = Modifier.fillMaxWidth(),
                    contentPadding = PaddingValues(16.dp)
                ) {
                    Text(
                        text = "Report preview",
                        style = MaterialTheme.typography.titleSmall,
                        color = AppAccentColors.Reports,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    Text(
                        text = text,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    TextButton(onClick = { viewModel.clearReport() }) {
                        Text("Clear")
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SimpleDropdown(
    label: String,
    options: List<String>,
    selectedIndex: Int,
    onSelect: (Int) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }
    val selected = options.getOrNull(selectedIndex) ?: "Select $label"

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { expanded = true }
    ) {
        OutlinedTextField(
            value = selected,
            onValueChange = { },
            readOnly = true,
            label = { Text(label) },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            modifier = Modifier.fillMaxWidth(),
            colors = ExposedDropdownMenuDefaults.outlinedTextFieldColors()
        )
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            options.forEachIndexed { index, s ->
                DropdownMenuItem(
                    text = { Text(s) },
                    onClick = {
                        onSelect(index)
                        expanded = false
                    }
                )
            }
        }
    }
}