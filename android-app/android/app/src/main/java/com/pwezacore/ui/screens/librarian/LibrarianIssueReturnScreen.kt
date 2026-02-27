package com.pwezacore.ui.screens.librarian

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.pwezacore.ui.components.GlassButton

@Composable
fun LibrarianIssueReturnScreen(
    onBack: () -> Unit = {},
    onViewStudentProfile: (String) -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: LibrarianIssueReturnViewModel = hiltViewModel()
) {
    var selectedTab by remember { mutableStateOf(0) }
    var borrowerQuery by remember { mutableStateOf("") }
    var bookQuery by remember { mutableStateOf("") }
    var returnDateStr by remember { mutableStateOf("") }
    var barcodeOrBookQuery by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }

    Column(modifier = modifier.fillMaxWidth().padding(16.dp)) {
        Text(
            text = "Issue / Return",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        TabRow(selectedTabIndex = selectedTab) {
            Tab(
                selected = selectedTab == 0,
                onClick = { selectedTab = 0 },
                text = { Text("Issue") }
            )
            Tab(
                selected = selectedTab == 1,
                onClick = { selectedTab = 1 },
                text = { Text("Return") }
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        when (selectedTab) {
            0 -> {
                OutlinedTextField(
                    value = borrowerQuery,
                    onValueChange = { borrowerQuery = it },
                    label = { Text("Student/Teacher name or ID") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = bookQuery,
                    onValueChange = { bookQuery = it },
                    label = { Text("Book title, author or barcode") },
                    modifier = Modifier.fillMaxWidth()
                )
                OutlinedTextField(
                    value = returnDateStr,
                    onValueChange = { returnDateStr = it },
                    label = { Text("Return date (e.g. YYYY-MM-DD)") },
                    modifier = Modifier.fillMaxWidth()
                )
                if (message.isNotEmpty()) {
                    Text(text = message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(top = 8.dp))
                }
                GlassButton(
                    text = "Issue book",
                    onClick = {
                        viewModel.issueBook(
                            borrowerQuery = borrowerQuery,
                            bookQuery = bookQuery,
                            returnDateStr = returnDateStr,
                            onResult = { msg -> message = msg; if (msg.isEmpty()) message = "Issued." },
                            onError = { message = it }
                        )
                    },
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                )
            }
            1 -> {
                OutlinedTextField(
                    value = barcodeOrBookQuery,
                    onValueChange = { barcodeOrBookQuery = it },
                    label = { Text("Scan barcode or enter book title") },
                    modifier = Modifier.fillMaxWidth()
                )
                if (message.isNotEmpty()) {
                    Text(text = message, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(top = 8.dp))
                }
                GlassButton(
                    text = "Return book",
                    onClick = {
                        viewModel.returnBook(
                            barcodeOrBookQuery = barcodeOrBookQuery,
                            onResult = { msg -> message = msg },
                            onError = { message = it }
                        )
                    },
                    modifier = Modifier.fillMaxWidth().padding(top = 8.dp)
                )
            }
        }
        TextButton(onClick = onBack) { Text("Back") }
    }
}
