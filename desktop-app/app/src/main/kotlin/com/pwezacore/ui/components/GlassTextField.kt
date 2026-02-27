package com.pwezacore.ui.components

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.pwezacore.ui.theme.GlassConstants
import com.pwezacore.ui.theme.glassFocusGlow
import com.pwezacore.ui.theme.glassFocusGlow

@Composable
fun GlassTextField(
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    label: @Composable (() -> Unit)? = null,
    placeholder: @Composable (() -> Unit)? = null,
    leadingIcon: @Composable (() -> Unit)? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    isError: Boolean = false,
    enabled: Boolean = true,
    readOnly: Boolean = false,
    visualTransformation: VisualTransformation = VisualTransformation.None,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    singleLine: Boolean = false,
    maxLines: Int = if (singleLine) 1 else Int.MAX_VALUE,
    minLines: Int = 1
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isFocused by interactionSource.collectIsFocusedAsState()
    val surfaceColor = MaterialTheme.colorScheme.surface.copy(alpha = GlassConstants.TRANSPARENCY_MEDIUM)
    val borderColor = when {
        isFocused -> MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
        isError -> MaterialTheme.colorScheme.error.copy(alpha = 0.3f)
        else -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.1f)
    }
    val textFieldColors = OutlinedTextFieldDefaults.colors(
        focusedContainerColor = surfaceColor,
        unfocusedContainerColor = surfaceColor,
        disabledContainerColor = surfaceColor.copy(alpha = 0.5f),
        errorContainerColor = surfaceColor,
        focusedBorderColor = borderColor,
        unfocusedBorderColor = borderColor,
        disabledBorderColor = borderColor.copy(alpha = 0.5f),
        errorBorderColor = MaterialTheme.colorScheme.error.copy(alpha = 0.5f),
        focusedTextColor = MaterialTheme.colorScheme.onSurface,
        unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
        disabledTextColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
        errorTextColor = MaterialTheme.colorScheme.onSurface,
        focusedLabelColor = MaterialTheme.colorScheme.primary,
        unfocusedLabelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
        disabledLabelColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
        errorLabelColor = MaterialTheme.colorScheme.error,
        focusedPlaceholderColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
        unfocusedPlaceholderColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
        disabledPlaceholderColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.3f),
        errorPlaceholderColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
        focusedLeadingIconColor = MaterialTheme.colorScheme.primary,
        unfocusedLeadingIconColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
        disabledLeadingIconColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
        errorLeadingIconColor = MaterialTheme.colorScheme.error,
        focusedTrailingIconColor = MaterialTheme.colorScheme.primary,
        unfocusedTrailingIconColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
        disabledTrailingIconColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
        errorTrailingIconColor = MaterialTheme.colorScheme.error
    )
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(GlassConstants.CORNER_RADIUS_MEDIUM.dp))
            .glassFocusGlow(isFocused)
    ) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            label = label,
            placeholder = placeholder,
            leadingIcon = leadingIcon,
            trailingIcon = trailingIcon,
            isError = isError,
            enabled = enabled,
            readOnly = readOnly,
            visualTransformation = visualTransformation,
            keyboardOptions = keyboardOptions,
            keyboardActions = keyboardActions,
            singleLine = singleLine,
            maxLines = maxLines,
            minLines = minLines,
            interactionSource = interactionSource,
            colors = textFieldColors,
            shape = RoundedCornerShape(GlassConstants.CORNER_RADIUS_MEDIUM.dp)
        )
    }
}
