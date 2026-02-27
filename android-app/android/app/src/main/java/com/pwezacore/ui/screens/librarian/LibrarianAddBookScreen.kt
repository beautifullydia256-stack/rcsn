package com.pwezacore.ui.screens.librarian

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.pwezacore.data.local.entities.BookEntity
import com.pwezacore.ui.components.GlassButton

@Composable
fun LibrarianAddBookScreen(
    onBack: () -> Unit = {},
    onSaved: () -> Unit = {},
    modifier: Modifier = Modifier,
    viewModel: LibrarianAddBookViewModel = hiltViewModel()
) {
    val categories by viewModel.categories.collectAsState(initial = emptyList())
    var title by remember { mutableStateOf("") }
    var author by remember { mutableStateOf("") }
    var isbn by remember { mutableStateOf("") }
    var categoryId by remember { mutableStateOf<String?>(null) }
    var categoryExpanded by remember { mutableStateOf(false) }
    var subject by remember { mutableStateOf("") }
    var classLevel by remember { mutableStateOf("") }
    var publisher by remember { mutableStateOf("") }
    var yearStr by remember { mutableStateOf("") }
    var quantityStr by remember { mutableStateOf("1") }
    var shelfLocation by remember { mutableStateOf("") }
    var condition by remember { mutableStateOf("Good") }
    var conditionExpanded by remember { mutableStateOf(false) }
    var barcode by remember { mutableStateOf("") }
    var saving by remember { mutableStateOf(false) }

    val scrollState = rememberScrollState()
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(16.dp)
            .verticalScroll(scrollState),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(
            text = "Add Book",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        OutlinedTextField(
            value = title,
            onValueChange = { title = it },
            label = { Text("Title *") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        OutlinedTextField(
            value = author,
            onValueChange = { author = it },
            label = { Text("Author *") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        OutlinedTextField(
            value = isbn,
            onValueChange = { isbn = it },
            label = { Text("ISBN") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Box(modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = categories.find { it.category_id == categoryId }?.name ?: "",
                onValueChange = {},
                readOnly = true,
                label = { Text("Category") },
                modifier = Modifier.fillMaxWidth().clickable { categoryExpanded = true }
            )
            DropdownMenu(
                expanded = categoryExpanded,
                onDismissRequest = { categoryExpanded = false }
            ) {
                categories.forEach { cat ->
                    DropdownMenuItem(
                        text = { Text(cat.name) },
                        onClick = {
                            categoryId = cat.category_id
                            categoryExpanded = false
                        }
                    )
                }
            }
        }
        OutlinedTextField(
            value = subject,
            onValueChange = { subject = it },
            label = { Text("Subject") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        OutlinedTextField(
            value = classLevel,
            onValueChange = { classLevel = it },
            label = { Text("Class level") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        OutlinedTextField(
            value = publisher,
            onValueChange = { publisher = it },
            label = { Text("Publisher") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        OutlinedTextField(
            value = yearStr,
            onValueChange = { yearStr = it },
            label = { Text("Year") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
        )
        OutlinedTextField(
            value = quantityStr,
            onValueChange = { quantityStr = it },
            label = { Text("Quantity *") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
        )
        OutlinedTextField(
            value = shelfLocation,
            onValueChange = { shelfLocation = it },
            label = { Text("Shelf location") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Box(modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = condition,
                onValueChange = {},
                readOnly = true,
                label = { Text("Condition") },
                modifier = Modifier.fillMaxWidth().clickable { conditionExpanded = true }
            )
            DropdownMenu(
                expanded = conditionExpanded,
                onDismissRequest = { conditionExpanded = false }
            ) {
                listOf("New", "Good", "Damaged").forEach { c ->
                    DropdownMenuItem(
                        text = { Text(c) },
                        onClick = {
                            condition = c
                            conditionExpanded = false
                        }
                    )
                }
            }
        }
        OutlinedTextField(
            value = barcode,
            onValueChange = { barcode = it },
            label = { Text("Barcode (optional)") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
        Spacer(modifier = Modifier.height(8.dp))
        GlassButton(
            text = "Save",
            onClick = {
                saving = true
                val qty = quantityStr.toIntOrNull() ?: 1
                val year = yearStr.toIntOrNull()
                val book = BookEntity(
                    title = title,
                    author = author,
                    isbn = isbn,
                    category_id = categoryId,
                    subject = subject,
                    class_level = classLevel,
                    publisher = publisher,
                    year = year,
                    quantity = qty,
                    available_quantity = qty,
                    shelf_location = shelfLocation,
                    condition = condition,
                    barcode = barcode.ifBlank { null }
                )
                viewModel.addBook(book) { saving = false; onSaved() }
            },
            modifier = Modifier.fillMaxWidth()
        )
        TextButton(onClick = onBack) {
            Text("Cancel")
        }
    }
}
