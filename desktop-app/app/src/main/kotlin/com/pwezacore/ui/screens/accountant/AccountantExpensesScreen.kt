package com.pwezacore.ui.screens.accountant

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.ui.components.GlassCard

private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)
private val AccentRed = Color(0xFFEF4444)

@Composable
fun AccountantExpensesScreen(
    modifier: Modifier = Modifier,
    onRecordExpense: () -> Unit = {}
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
    ) {
        Column(modifier = Modifier.padding(bottom = 24.dp)) {
            Text("Expenses", fontSize = 24.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, color = TextPrimary)
            Text("Track and manage school expenses", fontSize = 14.sp, color = TextSecondary, modifier = Modifier.padding(top = 4.dp))
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
            TextButton(onClick = onRecordExpense) { Text("Record Expense", color = AccentRed) }
        }
        GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Total Expenses: 0", fontSize = 14.sp, color = TextPrimary)
                Text("No expenses found. Record an expense to get started.", fontSize = 13.sp, color = TextSecondary)
            }
        }
    }
}
