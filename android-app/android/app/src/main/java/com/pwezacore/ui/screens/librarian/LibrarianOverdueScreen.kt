package com.pwezacore.ui.screens.librarian

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.pwezacore.data.repository.OverdueRecord
import com.pwezacore.ui.components.GlassCard

@Composable
fun LibrarianOverdueScreen(
    onBack: () -> Unit = {},
    onViewStudentProfile: (String) -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: LibrarianOverdueViewModel = hiltViewModel()
) {
    var list by remember { mutableStateOf<List<OverdueRecord>>(emptyList()) }
    var refreshTrigger by remember { mutableStateOf(0) }
    LaunchedEffect(refreshTrigger) {
        list = viewModel.getOverdueRecords()
    }
    Column(modifier = modifier.fillMaxWidth().padding(16.dp)) {
        Text(
            text = "Overdue",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(8.dp))
        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            items(list, key = { it.record.record_id }) { item ->
                GlassCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onViewStudentProfile(item.record.borrower_id) },
                    contentPadding = PaddingValues(16.dp)
                ) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = item.bookTitle,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "${item.borrowerName} • ${item.borrowerClass}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "Due: ${formatDate(item.record.due_date)} • ${item.daysOverdue} days overdue",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                            )
                            Text(
                                text = "UGX %.0f".format(viewModel.computeFine(item.record)),
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            TextButton(onClick = { /* SMS placeholder */ }) { Text("Send SMS") }
                            TextButton(onClick = { /* Notify parent placeholder */ }) { Text("Notify parent") }
                            TextButton(onClick = {
                                viewModel.markFinePaid(item.record.record_id) { refreshTrigger++ }
                            }) { Text("Mark fine paid") }
                        }
                    }
                }
            }
        }
        TextButton(onClick = onBack) { Text("Back") }
    }
}

private fun formatDate(ms: Long): String {
    val c = java.util.Calendar.getInstance().apply { timeInMillis = ms }
    return "%04d-%02d-%02d".format(c.get(java.util.Calendar.YEAR), c.get(java.util.Calendar.MONTH) + 1, c.get(java.util.Calendar.DAY_OF_MONTH))
}
