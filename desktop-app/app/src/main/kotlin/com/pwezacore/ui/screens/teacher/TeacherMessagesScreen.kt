package com.pwezacore.ui.screens.teacher

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
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
private val AccentBlue = Color(0xFF4DABFF)

@Composable
fun TeacherMessagesScreen(
    modifier: Modifier = Modifier,
    onNewMessage: () -> Unit = {}
) {
    TeacherPageLayout(
        title = "Messages",
        subtitle = "View and manage your messages",
        modifier = modifier
    ) {
        Column(verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(16.dp)) {
            androidx.compose.foundation.layout.Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.End
            ) {
                TextButton(onClick = onNewMessage) { Text("New Message", color = AccentBlue) }
            }
            GlassCard(modifier = Modifier.fillMaxWidth(), contentPadding = PaddingValues(16.dp)) {
                Column(verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp)) {
                    Text("No new messages.", fontSize = 14.sp, color = TextPrimary)
                    Text("Send a message to a class or student.", fontSize = 13.sp, color = TextSecondary)
                }
            }
        }
    }
}
