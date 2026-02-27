package com.pwezacore.ui.screens.librarian

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
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
import com.pwezacore.ui.components.GlassCard

data class ReportItem(val title: String, val subtitle: String, val type: String)

@Composable
fun LibrarianReportsScreen(
    onBack: () -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: LibrarianReportsViewModel = hiltViewModel()
) {
    val reportTypes = listOf(
        ReportItem("Borrowing by class", "Books borrowed per class", "by_class"),
        ReportItem("Most borrowed books", "Top titles", "most_borrowed"),
        ReportItem("Overdue report", "Current overdue list", "overdue"),
        ReportItem("Fine collection", "Fines collected", "fines")
    )
    var selectedReport by remember { mutableStateOf<ReportItem?>(null) }
    var reportData by remember { mutableStateOf<String>("") }
    LaunchedEffect(selectedReport) {
        selectedReport?.let { item ->
            reportData = viewModel.loadReport(item.type)
        }
    }
    Column(modifier = modifier.fillMaxWidth().padding(16.dp)) {
        Text(
            text = "Reports",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        if (selectedReport == null) {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 24.dp)
            ) {
                items(reportTypes) { item ->
                    GlassCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedReport = item },
                        contentPadding = PaddingValues(16.dp)
                    ) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                text = item.title,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = item.subtitle,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                            )
                        }
                    }
                }
            }
        } else {
            Text(
                text = selectedReport!!.title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(bottom = 8.dp)
            )
            Text(
                text = reportData,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
            )
            TextButton(onClick = { /* Export placeholder */ }) { Text("Export (PDF/Excel)") }
            TextButton(onClick = { selectedReport = null }) { Text("Back to list") }
        }
        TextButton(onClick = onBack) { Text("Back") }
    }
}
