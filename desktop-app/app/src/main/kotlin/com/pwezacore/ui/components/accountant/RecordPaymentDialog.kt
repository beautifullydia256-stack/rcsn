package com.pwezacore.ui.components.accountant

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
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
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

private val DialogBg = Color(0xFF1E293B)
private val DialogHeaderBg = Color(0xFF334155)
private val HeaderGreen = Color(0xFF047857)
private val TextPrimary = Color(0xFFF8FAFC)
private val TextSecondary = Color(0xFF94A3B8)
private val TextMuted = Color(0xFF64748B)
private val BorderSubtle = Color(0x33FFFFFF)
private val InputBg = Color(0xFF0F172A)
private val AccentLink = Color(0xFF94A3B8)

private val PAYMENT_METHODS = listOf(
    "Cash" to "cash",
    "Bank" to "bank",
    "Mobile Money" to "mobile_money",
    "Cheque" to "cheque",
    "POS / Card" to "pos",
    "Online" to "online",
    "Other" to "other"
)

/**
 * Record Payment modal — matches web app: opens over current view, no navigation.
 * Green header, Student search, Amount, Payment method, Notes, Cancel / Record payment.
 */
@Composable
fun RecordPaymentDialog(
    open: Boolean,
    onClose: () -> Unit,
    initialStudentId: String? = null,
    onRecordPayment: (studentId: String, amount: Double, method: String, notes: String) -> Unit = { _, _, _, _ -> }
) {
    if (!open) return

    var studentSearch by remember(open) { mutableStateOf("") }
    var selectedStudentId by remember(open) { mutableStateOf(initialStudentId ?: "") }
    var selectedStudentName by remember(open) { mutableStateOf("") }
    var selectedStudentClass by remember(open) { mutableStateOf("") }
    var amount by remember(open) { mutableStateOf("") }
    var expandedMethod by remember(open) { mutableStateOf(false) }
    var selectedMethod by remember(open) { mutableStateOf("Cash") }
    var notes by remember(open) { mutableStateOf("") }
    var message by remember(open) { mutableStateOf("") }
    var submitting by remember(open) { mutableStateOf(false) }

    // Placeholder student list (no backend yet); when backend is wired, pass real list
    val studentMatches = remember(studentSearch, selectedStudentId) {
        if (selectedStudentId.isNotEmpty() && studentSearch.isEmpty()) emptyList()
        else emptyList<String>() // Replace with real search: students.filter { ... }.take(12)
    }

    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = true
        )
    ) {
        Box(
            modifier = Modifier
                .widthIn(min = 420.dp, max = 520.dp)
                .fillMaxWidth(0.92f)
                .padding(28.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(DialogBg)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
            ) {
                // Header — green like original
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(HeaderGreen)
                        .padding(18.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Receipt, contentDescription = null, tint = Color.White, modifier = Modifier.size(20.dp))
                        }
                        Column {
                            Text("Record Payment", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Color.White)
                            Text(
                                "Record a student payment and allocate to outstanding balances.",
                                fontSize = 13.sp,
                                color = Color.White.copy(alpha = 0.9f)
                            )
                        }
                    }
                    IconButton(onClick = onClose) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White)
                    }
                }

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Student
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text("Student", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = TextSecondary)
                        Spacer(Modifier.height(4.dp))
                        if (selectedStudentId.isNotEmpty()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(InputBg)
                                    .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    "$selectedStudentName ($selectedStudentClass)",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = TextPrimary
                                )
                                Text(
                                    "Change",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = HeaderGreen,
                                    modifier = Modifier.clickable {
                                        selectedStudentId = ""
                                        selectedStudentName = ""
                                        selectedStudentClass = ""
                                        studentSearch = ""
                                    }
                                )
                            }
                        } else {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(InputBg)
                                    .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
                                    .padding(horizontal = 12.dp, vertical = 10.dp)
                            ) {
                                BasicTextField(
                                    value = studentSearch,
                                    onValueChange = { studentSearch = it },
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    textStyle = androidx.compose.ui.text.TextStyle(color = TextPrimary, fontSize = 14.sp),
                                    decorationBox = { inner ->
                                        if (studentSearch.isEmpty()) {
                                            Text("Search by name or class…", color = TextMuted, fontSize = 14.sp)
                                        }
                                        inner()
                                    }
                                )
                            }
                            if (studentMatches.isNotEmpty()) {
                                // Dropdown list would go here when we have real student data
                            }
                        }
                    }

                    // Amount
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text("Amount", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = TextSecondary)
                        Spacer(Modifier.height(4.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(InputBg)
                                .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
                                .padding(horizontal = 12.dp, vertical = 10.dp)
                        ) {
                            BasicTextField(
                                value = amount,
                                onValueChange = { amount = it.filter { c -> c.isDigit() || c == '.' } },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true,
                                textStyle = androidx.compose.ui.text.TextStyle(color = TextPrimary, fontSize = 14.sp)
                            )
                        }
                    }

                    // Payment method
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text("Payment method", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = TextSecondary)
                        Spacer(Modifier.height(4.dp))
                        Box(modifier = Modifier.fillMaxWidth()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(InputBg)
                                    .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
                                    .clickable { expandedMethod = true }
                                    .padding(horizontal = 12.dp, vertical = 12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(selectedMethod, color = TextPrimary, fontSize = 14.sp)
                                    Text("▼", color = TextMuted, fontSize = 11.sp)
                                }
                            }
                            DropdownMenu(
                                expanded = expandedMethod,
                                onDismissRequest = { expandedMethod = false }
                            ) {
                                PAYMENT_METHODS.forEach { (display, _) ->
                                    DropdownMenuItem(
                                        text = { Text(display, fontSize = 14.sp) },
                                        onClick = {
                                            selectedMethod = display
                                            expandedMethod = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // Notes (optional)
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text("Notes (optional)", fontSize = 14.sp, fontWeight = FontWeight.Medium, color = TextSecondary)
                        Spacer(Modifier.height(4.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .background(InputBg)
                                .border(1.dp, BorderSubtle, RoundedCornerShape(8.dp))
                                .padding(horizontal = 12.dp, vertical = 10.dp)
                        ) {
                            BasicTextField(
                                value = notes,
                                onValueChange = { notes = it },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = false,
                                maxLines = 3,
                                textStyle = androidx.compose.ui.text.TextStyle(color = TextPrimary, fontSize = 14.sp)
                            )
                        }
                    }

                    if (message.isNotEmpty()) {
                        Text(
                            message,
                            fontSize = 14.sp,
                            color = if (message.startsWith("Payment") || message == "Payment recorded.") TextSecondary else Color(0xFFF87171)
                        )
                    }
                }

                // Footer: Cancel + Record payment (same order and behavior as web)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(DialogHeaderBg)
                        .padding(18.dp),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = onClose,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimary),
                        border = androidx.compose.foundation.BorderStroke(2.dp, HeaderGreen)
                    ) {
                        Text("Cancel", fontSize = 14.sp)
                    }
                    Spacer(Modifier.size(12.dp))
                    Button(
                        onClick = {
                            message = ""
                            if (selectedStudentId.isEmpty() || amount.isBlank()) {
                                message = "Please select a student and enter an amount."
                                return@Button
                            }
                            val amt = amount.toDoubleOrNull() ?: 0.0
                            if (amt <= 0) {
                                message = "Please select a student and enter an amount."
                                return@Button
                            }
                            submitting = true
                            onRecordPayment(selectedStudentId, amt, PAYMENT_METHODS.find { it.first == selectedMethod }?.second ?: "other", notes)
                            submitting = false
                            message = "Payment recorded."
                            amount = ""
                            notes = ""
                            selectedStudentId = ""
                            selectedStudentName = ""
                            selectedStudentClass = ""
                            studentSearch = ""
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = HeaderGreen),
                        enabled = !submitting
                    ) {
                        Icon(Icons.Default.Receipt, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color.White)
                        Spacer(Modifier.size(8.dp))
                        Text(if (submitting) "Recording…" else "Record payment", fontSize = 14.sp, color = Color.White)
                    }
                }
            }
        }
    }
}
