package com.pwezacore.ui.screens.accountant

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)

@Composable
fun AccountantBankScreen(modifier: Modifier = Modifier) {
    Column(modifier = modifier.fillMaxWidth().padding(24.dp)) {
        Text("Bank & Cash", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
        Text("Manage bank and cash accounts", fontSize = 14.sp, color = TextSecondary, modifier = Modifier.padding(top = 4.dp))
        Text("Bank and cash summary will appear here.", fontSize = 14.sp, color = TextSecondary, modifier = Modifier.padding(top = 16.dp))
    }
}
