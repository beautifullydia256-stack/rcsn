package com.pwezacore.ui.screens.accountant

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Download
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.ui.components.GlassCard

private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)
private val AccentBlue = Color(0xFF3B82F6)

private val reports = listOf(
    "Collections Report" to "All payments collected in the current term",
    "Balances Report" to "Outstanding balances for all students",
    "Term Summary" to "Complete financial summary for the term",
    "Expenses Report" to "All expenses recorded in the current term"
)

@Composable
fun AccountantReportsScreen(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
    ) {
        Column(modifier = Modifier.padding(bottom = 24.dp)) {
            Text("Reports", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Text("Generate and download financial reports", fontSize = 14.sp, color = TextSecondary, modifier = Modifier.padding(top = 4.dp))
        }
        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
            for ((name, description) in reports) {
                GlassCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { },
                    contentPadding = PaddingValues(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(48.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(AccentBlue.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Description, contentDescription = null, tint = AccentBlue, modifier = Modifier.size(24.dp))
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(name, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                            Text(description, fontSize = 13.sp, color = TextSecondary)
                        }
                        Icon(Icons.Default.Download, contentDescription = null, tint = AccentBlue, modifier = Modifier.size(24.dp))
                    }
                }
            }
        }
    }
}
