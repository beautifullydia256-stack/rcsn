package com.pwezacore.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

import com.pwezacore.ui.theme.GlassConstants

/** Desktop: no native blur; use transparency only. */
@Composable
fun Modifier.glassBlur(
    blurRadius: Float = GlassConstants.BLUR_RADIUS_MEDIUM
): Modifier = this

@Composable
fun Modifier.glassSurface(
    transparency: Float = GlassConstants.TRANSPARENCY_MEDIUM,
    blurRadius: Float = GlassConstants.BLUR_RADIUS_MEDIUM,
    cornerRadius: Dp = GlassConstants.CORNER_RADIUS_MEDIUM.dp
): Modifier {
    val surfaceColor = MaterialTheme.colorScheme.surface.copy(alpha = transparency)
    return this
        .clip(RoundedCornerShape(cornerRadius))
        .background(surfaceColor)
}

@Composable
fun Modifier.glassEdgeHighlight(
    highlightWidth: Dp = GlassConstants.EDGE_HIGHLIGHT_WIDTH.dp,
    cornerRadius: Dp = GlassConstants.CORNER_RADIUS_MEDIUM.dp
): Modifier {
    val highlightColor = Color.White.copy(alpha = 0.2f)
    return this.border(
        width = highlightWidth,
        color = highlightColor,
        shape = RoundedCornerShape(cornerRadius)
    )
}

@Composable
fun Modifier.glassSpecularHighlight(
    isActive: Boolean = false
): Modifier {
    if (!isActive) return this
    val highlightColor = Color.White.copy(alpha = 0.4f)
    return this.background(
        color = highlightColor,
        shape = RoundedCornerShape(GlassConstants.CORNER_RADIUS_MEDIUM.dp)
    )
}

@Composable
fun GlassContainer(
    modifier: Modifier = Modifier,
    transparency: Float = GlassConstants.TRANSPARENCY_MEDIUM,
    blurRadius: Float = GlassConstants.BLUR_RADIUS_MEDIUM,
    cornerRadius: Dp = GlassConstants.CORNER_RADIUS_MEDIUM.dp,
    showEdgeHighlight: Boolean = true,
    content: @Composable BoxScope.() -> Unit
) {
    Box(modifier = modifier) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .glassSurface(transparency, blurRadius, cornerRadius)
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .then(if (showEdgeHighlight) Modifier.glassEdgeHighlight(
                    highlightWidth = GlassConstants.EDGE_HIGHLIGHT_WIDTH.dp,
                    cornerRadius = cornerRadius
                ) else Modifier),
            content = content
        )
    }
}

@Composable
fun Modifier.glassHeavyBlur(
    cornerRadius: Dp = 0.dp
): Modifier = this
    .glassSurface(
        transparency = GlassConstants.TRANSPARENCY_HEAVY,
        blurRadius = GlassConstants.BLUR_RADIUS_HEAVY,
        cornerRadius = cornerRadius
    )
    .glassEdgeHighlight(
        highlightWidth = GlassConstants.EDGE_HIGHLIGHT_WIDTH.dp,
        cornerRadius = cornerRadius
    )

@Composable
fun Modifier.glassLightBlur(
    cornerRadius: Dp = GlassConstants.CORNER_RADIUS_SMALL.dp
): Modifier = this
    .glassSurface(
        transparency = GlassConstants.TRANSPARENCY_LIGHT,
        blurRadius = GlassConstants.BLUR_RADIUS_LIGHT,
        cornerRadius = cornerRadius
    )
    .glassEdgeHighlight(
        highlightWidth = GlassConstants.EDGE_HIGHLIGHT_WIDTH.dp,
        cornerRadius = cornerRadius
    )
