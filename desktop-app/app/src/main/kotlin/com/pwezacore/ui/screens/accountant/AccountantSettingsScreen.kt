package com.pwezacore.ui.screens.accountant

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.ui.components.GlassCard

private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)
private val AccentBlue = Color(0xFF3B82F6)

@Composable
fun AccountantSettingsScreen(modifier: Modifier = Modifier) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(bottom = 32.dp)
    ) {
        Column(modifier = Modifier.padding(bottom = 24.dp)) {
            Text("Settings", fontSize = 24.sp, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold, color = TextPrimary)
            Text("Manage your account settings", fontSize = 14.sp, color = TextSecondary, modifier = Modifier.padding(top = 4.dp))
        }
        Column(verticalArrangement = Arrangement.spacedBy(24.dp)) {
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Profile Information", fontSize = 18.sp, color = TextPrimary)
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Name", color = TextSecondary) },
                        placeholder = { Text("Your name", color = TextSecondary.copy(alpha = 0.6f)) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = AccentBlue.copy(alpha = 0.5f),
                            unfocusedBorderColor = TextSecondary.copy(alpha = 0.3f)
                        )
                    )
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email", color = TextSecondary) },
                        placeholder = { Text("your.email@example.com", color = TextSecondary.copy(alpha = 0.6f)) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = AccentBlue.copy(alpha = 0.5f),
                            unfocusedBorderColor = TextSecondary.copy(alpha = 0.3f)
                        )
                    )
                }
            }
        }
    }
}
