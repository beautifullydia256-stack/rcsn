package com.pwezacore.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.pwezacore.ui.theme.GlassAnimations
import com.pwezacore.ui.theme.GlassConstants
import com.pwezacore.ui.theme.glassEdgeHighlight
import com.pwezacore.ui.theme.glassPressAnimation
import com.pwezacore.ui.theme.glassSpecularHighlight

@Composable
fun GlassButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isPrimary: Boolean = true
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    val transparency = if (isPrimary) GlassConstants.TRANSPARENCY_MEDIUM else GlassConstants.TRANSPARENCY_LIGHT
    val surfaceColor = MaterialTheme.colorScheme.surface.copy(alpha = transparency)
    
    // Inner highlight effect
    val innerHighlight = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)
    
    Box(
        modifier = modifier
            .glassPressAnimation(isPressed)
            .clip(RoundedCornerShape(GlassConstants.CORNER_RADIUS_MEDIUM.dp))
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        surfaceColor,
                        surfaceColor.copy(alpha = transparency * 0.8f)
                    )
                )
            )
            .glassEdgeHighlight(
                highlightWidth = GlassConstants.EDGE_HIGHLIGHT_WIDTH.dp,
                cornerRadius = GlassConstants.CORNER_RADIUS_MEDIUM.dp
            )
            .then(if (isPressed) Modifier.glassSpecularHighlight(isActive = true) else Modifier)
    ) {
        Button(
            onClick = onClick,
            enabled = enabled,
            interactionSource = interactionSource,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.Transparent,
                contentColor = if (isPrimary) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                disabledContainerColor = Color.Transparent,
                disabledContentColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
            ),
            contentPadding = PaddingValues(vertical = 16.dp, horizontal = 24.dp),
            shape = RoundedCornerShape(GlassConstants.CORNER_RADIUS_MEDIUM.dp)
        ) {
            Text(
                text = text,
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold
            )
        }
        
        // Inner highlight overlay
        if (isPrimary) {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .clip(RoundedCornerShape(GlassConstants.CORNER_RADIUS_MEDIUM.dp))
                    .background(innerHighlight)
            )
        }
    }
}

@Composable
fun GlassTextButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    val alpha by animateFloatAsState(
        targetValue = if (isPressed) 0.7f else 1.0f,
        animationSpec = GlassAnimations.quickSpring,
        label = "text_button_alpha"
    )
    
    Button(
        onClick = onClick,
        enabled = enabled,
        interactionSource = interactionSource,
        modifier = modifier,
        colors = ButtonDefaults.textButtonColors(
            contentColor = MaterialTheme.colorScheme.primary.copy(alpha = alpha)
        ),
        contentPadding = PaddingValues(vertical = 12.dp, horizontal = 16.dp)
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge
        )
    }
}




