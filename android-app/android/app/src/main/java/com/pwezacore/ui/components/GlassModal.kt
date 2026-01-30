package com.pwezacore.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.pwezacore.ui.theme.GlassAnimations
import com.pwezacore.ui.theme.GlassConstants
import com.pwezacore.ui.theme.glassFadeIn
import com.pwezacore.ui.theme.glassHeavyBlur
import com.pwezacore.ui.theme.glassSlideIn

/**
 * GlassModal - Slide in like physical glass panes
 * Stronger blur under modal
 * Slight edge glow
 * Rounded corners
 * Spring-based entrance animations
 */
@Composable
fun GlassModal(
    visible: Boolean,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    cornerRadius: androidx.compose.ui.unit.Dp = GlassConstants.CORNER_RADIUS_XLARGE.dp,
    content: @Composable BoxScope.() -> Unit
) {
    if (!visible) return
    
    // Backdrop
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.3f))
            .glassFadeIn(visible)
            .clickable(onClick = onDismiss)
    ) {
        // Modal content
        Box(
            modifier = modifier
                .align(Alignment.Center)
                .fillMaxSize(0.9f)
                .clip(RoundedCornerShape(cornerRadius))
                .glassHeavyBlur(cornerRadius)
                .glassSlideIn(offset = 1000f, visible = visible)
                .padding(24.dp),
            content = content
        )
    }
}

/**
 * GlassDialog - A smaller modal for dialogs
 */
@Composable
fun GlassDialog(
    visible: Boolean,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    cornerRadius: androidx.compose.ui.unit.Dp = GlassConstants.CORNER_RADIUS_LARGE.dp,
    content: @Composable BoxScope.() -> Unit
) {
    if (!visible) return
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.3f))
            .glassFadeIn(visible)
            .clickable(onClick = onDismiss)
    ) {
        Box(
            modifier = modifier
                .align(Alignment.Center)
                .fillMaxSize(0.85f)
                .clip(RoundedCornerShape(cornerRadius))
                .glassHeavyBlur(cornerRadius)
                .glassSlideIn(offset = 500f, visible = visible)
                .padding(20.dp),
            content = content
        )
    }
}




