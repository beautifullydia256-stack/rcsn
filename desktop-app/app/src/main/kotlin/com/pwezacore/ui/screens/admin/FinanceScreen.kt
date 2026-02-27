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

@Composable
fun FinanceScreen(
    modifier: Modifier = Modifier,
    onRecordPayment: () -> Unit = {},
    onViewOutstanding: () -> Unit = {}
) {
    LazyColumn(
        modifier = modifier.fillMaxWidth().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        item {
            GlassButton(
                text = "Record Payment",
                onClick = onRecordPayment,
                modifier = Modifier.fillMaxWidth(),
                isPrimary = true
            )
        }
        item {
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                Text(
                    text = "Outstanding balance and fee records will appear here.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.8f)
                )
            }
        }
    }
}
