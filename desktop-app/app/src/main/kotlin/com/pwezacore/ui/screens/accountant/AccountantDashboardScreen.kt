package com.pwezacore.ui.screens.accountant

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.AttachMoney
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material.icons.filled.Wallet
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
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
private val TextMuted = Color(0xFF64748B)
private val AccentGreen = Color(0xFF10B981)
private val AccentBlue = Color(0xFF3B82F6)
private val AccentOrange = Color(0xFFF97316)
private val AccentTeal = Color(0xFF14B8A6)

/** Matches web RecentTransaction so when data loads it displays the same. */
data class RecentTransaction(
    val id: String,
    val type: String, // "payment" | "expense"
    val name: String,
    val sub: String,
    val account: String,
    val date: String,
    val time: String,
    val amount: Number,
    val status: String // "Completed" | "Pending"
)

private fun formatCurrency(amount: Number): String =
    java.text.NumberFormat.getCurrencyInstance(java.util.Locale("en", "UG")).format(amount)

@Composable
fun AccountantDashboardScreen(
    modifier: Modifier = Modifier,
    termLabel: String = "Term 1, 2026",
    totalFeesExpected: Number = 0,
    totalFeesCollected: Number = 0,
    outstandingBalances: Number = 0,
    todayCollections: Number = 0,
    totalBalanceCashflow: Number = 0,
    totalExpectedAllTerms: Number = 0,
    totalOverallBalanceAllTerms: Number = 0,
    recentTransactions: List<RecentTransaction> = emptyList(),
    onRecordPayment: () -> Unit = {},
    onGenerateInvoice: () -> Unit = {},
    onRecordExpense: () -> Unit = {},
    onSendReminder: () -> Unit = {},
    onPayments: () -> Unit = {},
    onExpenses: () -> Unit = {},
    onBalances: () -> Unit = {},
    onReports: () -> Unit = {}
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 32.dp)
    ) {
        // Top card: Financial Overview + term + action buttons
        GlassCard(
            modifier = Modifier.fillMaxWidth().padding(bottom = 28.dp),
            contentPadding = PaddingValues(20.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Financial Overview", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(9999.dp))
                            .background(AccentGreen.copy(alpha = 0.2f))
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text(termLabel, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = AccentGreen)
                    }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedButton(
                        onClick = onRecordPayment,
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                        border = androidx.compose.foundation.BorderStroke(1.dp, AccentGreen.copy(alpha = 0.5f))
                    ) {
                        Icon(Icons.Default.AttachMoney, contentDescription = null, modifier = Modifier.size(16.dp), tint = AccentGreen)
                        Text("Record payment", modifier = Modifier.padding(start = 8.dp), fontSize = 14.sp)
                    }
                    OutlinedButton(
                        onClick = onGenerateInvoice,
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
                    ) {
                        Icon(Icons.Default.Description, contentDescription = null, modifier = Modifier.size(16.dp), tint = AccentBlue)
                        Text("Generate invoice", modifier = Modifier.padding(start = 8.dp), fontSize = 14.sp)
                    }
                    OutlinedButton(
                        onClick = onRecordExpense,
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
                    ) {
                        Icon(Icons.Default.AttachMoney, contentDescription = null, modifier = Modifier.size(16.dp), tint = AccentOrange)
                        Text("Record expense", modifier = Modifier.padding(start = 8.dp), fontSize = 14.sp)
                    }
                    OutlinedButton(
                        onClick = onSendReminder,
                        colors = androidx.compose.material3.ButtonDefaults.outlinedButtonColors(contentColor = TextSecondary),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0x33FFFFFF))
                    ) {
                        Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(16.dp), tint = TextMuted)
                        Text("Send reminder", modifier = Modifier.padding(start = 8.dp), fontSize = 14.sp)
                    }
                }
            }
        }

        // KEY FIGURES
        Text("KEY FIGURES", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = TextMuted, modifier = Modifier.padding(bottom = 16.dp))
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            listOf(
                Quad("Total fees expected", formatCurrency(totalFeesExpected), "This term", AccentBlue, Icons.Default.Wallet),
                Quad("Total fees collected", formatCurrency(totalFeesCollected), "This term", AccentGreen, Icons.Default.Assessment),
                Quad("Outstanding balances", formatCurrency(outstandingBalances), "Balance due", AccentOrange, Icons.Default.Description),
                Quad("Today's collections", formatCurrency(todayCollections), "Payments today", AccentTeal, Icons.Default.TrendingUp)
            ).forEach { (label, value, subline, accent, icon) ->
                GlassCard(modifier = Modifier.weight(1f), contentPadding = PaddingValues(16.dp)) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(icon, contentDescription = null, modifier = Modifier.size(24.dp), tint = accent)
                        Text(label, fontSize = 13.sp, color = TextSecondary)
                        Text(value, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        Text(subline, fontSize = 11.sp, color = TextMuted)
                    }
                }
            }
        }

        // Cashflow (left) + Statistic (right)
        Row(modifier = Modifier.fillMaxWidth().padding(top = 28.dp), horizontalArrangement = Arrangement.spacedBy(24.dp)) {
            GlassCard(modifier = Modifier.weight(1f), contentPadding = PaddingValues(24.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                        Text("Cashflow", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                        Text("This year", fontSize = 12.sp, color = TextMuted)
                    }
                    Text("Total Balance", fontSize = 13.sp, color = TextSecondary)
                    Text(
                        formatCurrency(totalBalanceCashflow),
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (totalBalanceCashflow.toDouble() >= 0) AccentGreen else Color(0xFFEF4444)
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(modifier = Modifier.size(10.dp).background(Color(0xFF047857)))
                            Text("Cash In", fontSize = 13.sp, color = TextSecondary)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(modifier = Modifier.size(10.dp).background(Color(0xFF86EFAC)))
                            Text("Expense", fontSize = 13.sp, color = TextSecondary)
                        }
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color.White.copy(alpha = 0.05f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Cashflow chart", fontSize = 13.sp, color = TextMuted)
                    }
                }
            }
            GlassCard(modifier = Modifier.weight(1f), contentPadding = PaddingValues(24.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Statistic", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        GlassCard(modifier = Modifier.weight(1f), contentPadding = PaddingValues(12.dp)) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("Total expected (all terms)", fontSize = 12.sp, color = TextSecondary)
                                Text("From older unpaid + current term invoices", fontSize = 11.sp, color = TextMuted)
                                Text(formatCurrency(totalExpectedAllTerms), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                        }
                        GlassCard(modifier = Modifier.weight(1f), contentPadding = PaddingValues(12.dp)) {
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Text("Total overall balance (all terms)", fontSize = 12.sp, color = TextSecondary)
                                Text("According to paid this term", fontSize = 11.sp, color = TextMuted)
                                Text(formatCurrency(totalOverallBalanceAllTerms), fontSize = 18.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            }
                        }
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color.White.copy(alpha = 0.05f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Outstanding by term", fontSize = 13.sp, color = TextMuted)
                    }
                }
            }
        }

        // Recent Transactions — same table as web (Transaction Name, Account, Date & Time, Amount, Status)
        GlassCard(modifier = Modifier.fillMaxWidth().padding(top = 28.dp), contentPadding = PaddingValues(24.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Recent Transactions", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Transaction Name", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                    Text("Account", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                    Text("Date & Time", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                    Text("Amount", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                    Text("Status", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                }
                if (recentTransactions.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxWidth().height(80.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("No transactions in this period.", fontSize = 14.sp, color = TextMuted)
                    }
                } else {
                    recentTransactions.forEach { tx ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 12.dp)
                                .border(1.dp, Color.White.copy(alpha = 0.06f), RoundedCornerShape(4.dp)),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1.5f)) {
                                Text(tx.name, color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Medium)
                                Text(tx.sub, color = TextMuted, fontSize = 11.sp)
                            }
                            Text(tx.account, color = TextSecondary, fontSize = 13.sp, modifier = Modifier.weight(1.2f))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(tx.date, color = TextSecondary, fontSize = 13.sp)
                                Text(tx.time, color = TextMuted, fontSize = 11.sp)
                            }
                            Text(
                                (if (tx.amount.toDouble() >= 0) "+" else "") + formatCurrency(tx.amount),
                                color = if (tx.amount.toDouble() >= 0) AccentGreen else Color(0xFFEF4444),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                modifier = Modifier.weight(0.8f)
                            )
                            Box(
                                modifier = Modifier
                                    .weight(0.6f)
                                    .clip(RoundedCornerShape(9999.dp))
                                    .background(if (tx.status == "Completed") AccentGreen else AccentGreen.copy(alpha = 0.7f))
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(tx.status, color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                            }
                        }
                    }
                }
            }
        }
    }
}

private data class Quad(val label: String, val value: String, val subline: String, val accent: Color, val icon: androidx.compose.ui.graphics.vector.ImageVector)
