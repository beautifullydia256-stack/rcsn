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
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.pwezacore.ui.components.GlassCard
import com.pwezacore.ui.components.GlassTextButton
import com.pwezacore.ui.theme.AppAccentColors

@Composable
private fun LibrarianKpiCard(
    title: String,
    value: String,
    valueColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    GlassCard(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        contentPadding = PaddingValues(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = androidx.compose.ui.Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = value,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = valueColor
                )
            }
            GlassTextButton(text = "View", onClick = onClick)
        }
    }
}

@Composable
fun LibrarianDashboardScreen(
    onNavigateToBooks: () -> Unit = {},
    onNavigateToIssueReturn: () -> Unit = {},
    onNavigateToOverdue: () -> Unit = {},
    onNavigateToReports: () -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: LibrarianDashboardViewModel = hiltViewModel()
) {
    var totalBooks by remember { mutableStateOf(0) }
    var totalBorrowed by remember { mutableStateOf(0) }
    var overdueCount by remember { mutableStateOf(0) }
    var activeBorrowers by remember { mutableStateOf(0) }
    var booksAddedThisMonth by remember { mutableStateOf(0) }
    var borrowedToday by remember { mutableStateOf(0) }
    var returnedToday by remember { mutableStateOf(0) }
    var dueToday by remember { mutableStateOf(0) }
    var finesCollectedToday by remember { mutableStateOf(0.0) }

    LaunchedEffect(Unit) {
        val (total, borrowed) = viewModel.getDashboardCounts()
        totalBooks = total
        totalBorrowed = borrowed
        overdueCount = viewModel.getOverdueCount()
        activeBorrowers = viewModel.getActiveBorrowerCount()
        booksAddedThisMonth = viewModel.getBooksAddedThisMonth()
        val activity = viewModel.getTodaysActivity()
        borrowedToday = activity.borrowedToday
        returnedToday = activity.returnedToday
        dueToday = activity.dueToday
        finesCollectedToday = activity.finesCollectedToday
    }

    LazyColumn(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        item {
            Text(
                text = "Quick summary",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        item {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                LibrarianKpiCard(
                    title = "Total Books",
                    value = "$totalBooks",
                    valueColor = AppAccentColors.ExamSets,
                    onClick = onNavigateToBooks
                )
                LibrarianKpiCard(
                    title = "Total Borrowed",
                    value = "$totalBorrowed",
                    valueColor = AppAccentColors.Finance,
                    onClick = onNavigateToIssueReturn
                )
                LibrarianKpiCard(
                    title = "Overdue Books",
                    value = "$overdueCount",
                    valueColor = AppAccentColors.Notifications,
                    onClick = onNavigateToOverdue
                )
                LibrarianKpiCard(
                    title = "Active Borrowers",
                    value = "$activeBorrowers",
                    valueColor = AppAccentColors.Students,
                    onClick = onNavigateToIssueReturn
                )
                LibrarianKpiCard(
                    title = "Books Added This Month",
                    value = "$booksAddedThisMonth",
                    valueColor = AppAccentColors.Reports,
                    onClick = onNavigateToBooks
                )
            }
        }
        item {
            Text(
                text = "Today's activity",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
        item {
            GlassCard(
                modifier = Modifier.fillMaxWidth(),
                contentPadding = PaddingValues(16.dp)
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Books borrowed today", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        Text("$borrowedToday", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Books returned today", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        Text("$returnedToday", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Books due today", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        Text("$dueToday", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Fines collected today", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface)
                        Text("UGX %.0f".format(finesCollectedToday), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        }
    }
}
