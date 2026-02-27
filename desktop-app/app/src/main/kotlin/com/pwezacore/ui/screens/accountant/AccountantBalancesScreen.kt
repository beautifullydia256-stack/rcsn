package com.pwezacore.ui.screens.accountant

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
private val TextMuted = Color(0xFF64748B)
private val AccentGreen = Color(0xFF10B981)
private val AccentAmber = Color(0xFFF59E0B)
private val SearchBorder = Color(0xFF475569)

/** Matches web OutstandingPage row shape so when data loads it displays the same. */
data class OutstandingRow(
    val student_id: String,
    val term_id: String,
    val term_label: String,
    val student_name: String,
    val current_class: String,
    val amount_paid: Number,
    val balance: Number,
    val total_fees: Number,
    val invoice_number: String?,
    val days_overdue: Int
)

@Composable
fun AccountantBalancesScreen(
    modifier: Modifier = Modifier,
    rows: List<OutstandingRow> = emptyList(),
    isLoading: Boolean = false,
    onBackToDashboard: () -> Unit = {},
    onRecordPayment: (studentId: String) -> Unit = {}
) {
    var searchQuery by remember { mutableStateOf("") }
    val filtered = remember(rows, searchQuery) {
        val q = searchQuery.trim().lowercase()
        if (q.isEmpty()) rows
        else rows.filter {
            it.student_name.lowercase().contains(q) ||
                it.current_class.lowercase().contains(q) ||
                it.term_label.lowercase().contains(q) ||
                (it.invoice_number?.lowercase()?.contains(q) == true)
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 32.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                "Outstanding Fees",
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary
            )
            TextButton(onClick = onBackToDashboard) {
                Text("Back to Dashboard", color = TextSecondary, fontSize = 14.sp)
            }
        }

        GlassCard(
            modifier = Modifier.fillMaxWidth().padding(top = 24.dp),
            contentPadding = PaddingValues(0.dp)
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .border(1.dp, SearchBorder, RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp, vertical = 10.dp)
                ) {
                    BasicTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        textStyle = androidx.compose.ui.text.TextStyle(color = TextPrimary, fontSize = 14.sp),
                        decorationBox = { inner ->
                            if (searchQuery.isEmpty()) {
                                Text("Search by student or class…", color = TextMuted, fontSize = 14.sp)
                            }
                            inner()
                        }
                    )
                }
                if (isLoading) {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Loading…", color = TextMuted, fontSize = 14.sp)
                    }
                } else {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        // Table header (same as web)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp)
                                .border(1.dp, Color.White.copy(alpha = 0.1f)),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            TableHeaderCell("Student", 1f)
                            TableHeaderCell("Class", 0.8f)
                            TableHeaderCell("Term", 0.7f)
                            TableHeaderCell("Invoice", 0.9f)
                            TableHeaderCell("Expected", 0.8f)
                            TableHeaderCell("Paid", 0.6f)
                            TableHeaderCell("Balance", 0.8f)
                            TableHeaderCell("Aging", 0.7f)
                            TableHeaderCell("Action", 1f)
                        }
                        if (filtered.isEmpty()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Text("No outstanding balances.", color = TextMuted, fontSize = 14.sp)
                            }
                        } else {
                            filtered.forEach { r ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 12.dp)
                                        .border(1.dp, Color.White.copy(alpha = 0.06f)),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Text(r.student_name, color = TextPrimary, fontSize = 13.sp, modifier = Modifier.weight(1f))
                                    Text(r.current_class, color = TextSecondary, fontSize = 13.sp, modifier = Modifier.weight(0.8f))
                                    Text(r.term_label, color = TextSecondary, fontSize = 13.sp, modifier = Modifier.weight(0.7f))
                                    Text(r.invoice_number ?: "—", color = TextSecondary, fontSize = 13.sp, modifier = Modifier.weight(0.9f))
                                    Text(formatNum(r.total_fees), color = TextSecondary, fontSize = 13.sp, modifier = Modifier.weight(0.8f))
                                    Text(formatNum(r.amount_paid), color = TextSecondary, fontSize = 13.sp, modifier = Modifier.weight(0.6f))
                                    Text(formatNum(r.balance), color = AccentAmber, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(0.8f))
                                    Text(
                                        if (r.days_overdue > 0) "${r.days_overdue} days overdue" else "—",
                                        color = if (r.days_overdue > 0) AccentAmber else TextMuted,
                                        fontSize = 13.sp,
                                        modifier = Modifier.weight(0.7f)
                                    )
                                    TextButton(
                                        onClick = { onRecordPayment(r.student_id) },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text("Record Payment", color = AccentGreen, fontSize = 13.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RowScope.TableHeaderCell(text: String, weight: Float) {
    Text(
        text,
        color = TextMuted,
        fontSize = 12.sp,
        fontWeight = FontWeight.Medium,
        modifier = Modifier.weight(weight)
    )
}

private fun formatNum(n: Number): String =
    java.text.NumberFormat.getIntegerInstance(java.util.Locale.US).format(n)
