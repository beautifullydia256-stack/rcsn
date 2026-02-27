package com.pwezacore.ui.screens.librarian

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
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
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.pwezacore.data.local.entities.BorrowRecordEntity
import com.pwezacore.ui.components.GlassCard

@Composable
fun LibrarianStudentProfileScreen(
    studentId: String,
    onBack: () -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: LibrarianStudentProfileViewModel = hiltViewModel()
) {
    val studentName by viewModel.studentName(studentId).collectAsState(initial = "—")
    var borrowHistory by remember { mutableStateOf<List<BorrowRecordEntity>>(emptyList()) }
    var currentBorrows by remember { mutableStateOf<List<BorrowRecordEntity>>(emptyList()) }
    var overdueCount by remember { mutableStateOf(0) }
    var totalBorrowed by remember { mutableStateOf(0) }
    var finesPending by remember { mutableStateOf(0.0) }

    LaunchedEffect(studentId) {
        borrowHistory = viewModel.getBorrowHistory(studentId)
        currentBorrows = viewModel.getCurrentBorrows(studentId)
        overdueCount = viewModel.getOverdueCount(studentId)
        totalBorrowed = viewModel.getTotalBorrowed(studentId)
        finesPending = viewModel.getFinesPending(studentId)
    }

    Column(modifier = modifier.fillMaxWidth().padding(16.dp)) {
        Text(
            text = "Student profile",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = studentName,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
        )
        Spacer(modifier = Modifier.height(16.dp))
        GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text("Current borrows: ${currentBorrows.size}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                Text("Overdue: $overdueCount", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                Text("Fines pending: UGX %.0f".format(finesPending), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                Text("Total borrowed (all time): $totalBorrowed", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Borrow history",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurface
        )
        LazyColumn(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(bottom = 24.dp)
        ) {
            items(borrowHistory.take(20), key = { it.record_id }) { r ->
                GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(12.dp)) {
                    Text(
                        text = "Book ID: ${r.book_id} • ${r.status} • Due ${formatDate(r.due_date)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface
                    )
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
