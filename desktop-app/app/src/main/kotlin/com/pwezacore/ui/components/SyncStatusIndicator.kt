package com.pwezacore.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.pwezacore.data.sync.SyncManager

/**
 * Sync status indicator per MASTER_ARCHITECTURE_DIRECTIVE §8: Synced (green), Syncing (yellow), Offline (red).
 */
@Composable
fun SyncStatusIndicator(modifier: Modifier = Modifier) {
    val status = SyncManager.lastStatus
    val (color, label) = when (status) {
        is SyncManager.SyncStatus.Idle -> if (SyncManager.isOnline()) Color(0xFF22C55E) to "Synced" else Color(0xFFEF4444) to "Offline"
        is SyncManager.SyncStatus.Syncing -> Color(0xFFEAB308) to "Syncing"
        is SyncManager.SyncStatus.Error -> Color(0xFFEF4444) to "Error"
    }
    Row(
        modifier = modifier.padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            modifier = Modifier
                .size(8.dp)
                .background(color, CircleShape),
            verticalAlignment = Alignment.CenterVertically
        ) {}
        Text(
            text = label,
            color = color,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(start = 4.dp)
        )
    }
}
