package com.pwezacore.ui.screens.accountant

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.ui.components.GlassButton
import com.pwezacore.ui.components.GlassCard
import androidx.compose.foundation.shape.RoundedCornerShape

private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)
private val AccentGreen = Color(0xFF10B981)

@Composable
fun AccountantPaymentsScreen(
    modifier: Modifier = Modifier,
    onBackToDashboard: () -> Unit = {},
    onRecordPayment: () -> Unit = {},
    onViewOutstanding: () -> Unit = {},
    onViewReceipts: () -> Unit = {}
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Payments", fontSize = 22.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            TextButton(onClick = onBackToDashboard) {
                Text("Back to Dashboard", color = TextSecondary, fontSize = 14.sp)
            }
        }
        Text(
            "Record money received from students. Allocate to unpaid invoices; a receipt is generated automatically. Use Outstanding Fees to follow up on balances.",
            color = TextSecondary,
            fontSize = 14.sp,
            modifier = Modifier.padding(top = 8.dp)
        )

        // Record a payment CTA card (same as web)
        GlassCard(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 24.dp),
            contentPadding = PaddingValues(32.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.AccountBalance, contentDescription = null, modifier = Modifier.size(32.dp), tint = AccentGreen)
                }
                Text("Record a payment", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                Text(
                    "Search for a student, see unpaid invoices, enter the amount and payment method (Cash, Bank, or Mobile Money). Payment is allocated to the oldest term first and a receipt is generated for printing.",
                    color = TextSecondary,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(horizontal = 24.dp)
                )
                GlassButton(
                    text = "Record payment",
                    onClick = onRecordPayment
                )
            }
        }

        // Quick links (same as web)
        GlassCard(modifier = Modifier.fillMaxWidth().padding(top = 24.dp), contentPadding = PaddingValues(16.dp)) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("Quick links", fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = onViewOutstanding) {
                        Text("View Outstanding Fees", color = AccentGreen, fontSize = 14.sp)
                    }
                    Text(" — follow up on who owes", color = TextSecondary, fontSize = 14.sp)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = onViewReceipts) {
                        Text("View Receipts", color = AccentGreen, fontSize = 14.sp)
                    }
                    Text(" — reprint or verify past payments", color = TextSecondary, fontSize = 14.sp)
                }
            }
        }
    }
}
