package com.pwezacore.ui.screens.admin

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.pwezacore.ui.components.GlassButton
import com.pwezacore.ui.components.GlassCard
import com.pwezacore.ui.navigation.WebAdminRoutes

@Composable
fun ReportsScreen(
    reportRoute: String = WebAdminRoutes.REPORTS,
    modifier: Modifier = Modifier,
    onGenerateReport: () -> Unit = {}
) {
    val (title, subtitle) = when (reportRoute) {
        WebAdminRoutes.REPORTS_GENERATE -> "Generate Reports" to "Create and download report cards and exports."
        WebAdminRoutes.REPORT_RECORDS -> "Report Records" to "View and manage generated report records."
        else -> "Reports Overview" to "View report templates and generated reports."
    }
    LazyColumn(
        modifier = modifier.fillMaxWidth().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        item {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(bottom = 4.dp)
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f),
                modifier = Modifier.padding(bottom = 16.dp)
            )
        }
        item {
            GlassButton(
                text = "Generate Report",
                onClick = onGenerateReport,
                modifier = Modifier.fillMaxWidth(),
                isPrimary = true
            )
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                Text(
                    text = "Reports and exports will appear here.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                )
            }
        }
    }
}
