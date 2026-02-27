package com.pwezacore.ui.screens.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.pwezacore.data.AdminDashboardRepository
import com.pwezacore.data.TeacherRow
import com.pwezacore.ui.components.GlassButton
import com.pwezacore.ui.components.GlassCard

@Composable
fun TeachersScreen(
    schoolId: String? = null,
    modifier: Modifier = Modifier,
    onBack: () -> Unit = {},
    onAddTeacher: () -> Unit = {}
) {
    var teachers by remember { mutableStateOf<List<TeacherRow>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(schoolId) {
        loading = true
        teachers = if (schoolId != null) AdminDashboardRepository.getTeachers(schoolId) else emptyList()
        loading = false
    }

    Column(
        modifier = modifier.fillMaxSize().padding(16.dp)
    ) {
        Text(
            "Teachers",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "Manage teaching staff and class assignments.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
        )
        Spacer(modifier = Modifier.height(16.dp))
        GlassButton(
            text = "Add Teacher",
            onClick = onAddTeacher,
            modifier = Modifier.fillMaxWidth()
        )
        Spacer(modifier = Modifier.height(16.dp))
        when {
            loading && schoolId != null -> {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }
            teachers.isEmpty() -> {
                GlassCard(contentPadding = PaddingValues(16.dp)) {
                    Text(
                        text = if (schoolId == null) "Loading…" else "No teachers yet. Add a teacher to get started.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                }
            }
            else -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(teachers) { t ->
                        GlassCard(contentPadding = PaddingValues(16.dp)) {
                            Column {
                                Text(
                                    text = t.name ?: "—",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "ID: ${t.teacherId ?: "—"}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
