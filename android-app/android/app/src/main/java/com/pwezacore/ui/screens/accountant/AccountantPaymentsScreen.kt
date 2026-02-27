package com.pwezacore.ui.screens.accountant

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.pwezacore.ui.components.GlassButton
import com.pwezacore.ui.components.GlassCard

@Composable
fun AccountantPaymentsScreen(
    modifier: Modifier = Modifier,
    onRecordPayment: () -> Unit = {},
    onExportCsv: () -> Unit = {}
) {
    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(
                text = "Payments",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "View and manage all payment records",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                GlassButton(
                    text = "Record Payment",
                    onClick = onRecordPayment,
                    modifier = Modifier.fillMaxWidth(),
                    isPrimary = true
                )
                GlassButton(
                    text = "Export CSV",
                    onClick = onExportCsv,
                    modifier = Modifier.fillMaxWidth(),
                    isPrimary = false
                )
            }
        }
        item {
            GlassCard(contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp)) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "No payments yet",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                }
            }
        }
    }
}
