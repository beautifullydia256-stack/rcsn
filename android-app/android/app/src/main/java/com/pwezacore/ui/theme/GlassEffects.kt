package com.pwezacore.ui.theme

import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asComposeRenderEffect
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Creates a blur render effect for glass surfaces
 * Uses RenderEffect.createBlurEffect() for real-time background blur
 */
@Composable
fun Modifier.glassBlur(
    blurRadius: Float = GlassConstants.BLUR_RADIUS_MEDIUM
): Modifier {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        this.graphicsLayer {
            renderEffect = RenderEffect
                .createBlurEffect(blurRadius, blurRadius, Shader.TileMode.CLAMP)
                .asComposeRenderEffect()
        }
    } else {
        // Fallback for older Android versions - use alpha instead
        this
    }
}

/**
 * Creates a translucent glass surface with blur effect
 */
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
        .glassBlur(blurRadius)
}

/**
 * Adds a subtle edge highlight to glass surfaces
 * Creates the effect of light reflection on glass edges
 */
@Composable
fun Modifier.glassEdgeHighlight(
    highlightWidth: Dp = GlassConstants.EDGE_HIGHLIGHT_WIDTH.dp,
    cornerRadius: Dp = GlassConstants.CORNER_RADIUS_MEDIUM.dp
): Modifier {
    // Use a subtle white highlight that works in both light and dark modes
    val highlightColor = Color.White.copy(alpha = 0.2f)
    
    return this.border(
        width = highlightWidth,
        color = highlightColor,
        shape = RoundedCornerShape(cornerRadius)
    )
}

/**
 * Adds specular highlight for active/pressed elements
 */
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

/**
 * Composable that creates a glass container with blur and edge highlights.
 * Blur is applied only to the background layer so content stays sharp and readable.
 */
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
        // Layer 1: blurred background only (content must not be blurred)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .glassSurface(transparency, blurRadius, cornerRadius)
        )
        // Layer 2: content on top, sharp
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

/**
 * Creates a heavy blur effect for navigation bars and modals
 */
@Composable
fun Modifier.glassHeavyBlur(
    cornerRadius: Dp = 0.dp
): Modifier {
    return this
        .glassSurface(
            transparency = GlassConstants.TRANSPARENCY_HEAVY,
            blurRadius = GlassConstants.BLUR_RADIUS_HEAVY,
            cornerRadius = cornerRadius
        )
        .glassEdgeHighlight(
            highlightWidth = GlassConstants.EDGE_HIGHLIGHT_WIDTH.dp,
            cornerRadius = cornerRadius
        )
}

/**
 * Creates a light blur effect for subtle glass overlays
 */
@Composable
fun Modifier.glassLightBlur(
    cornerRadius: Dp = GlassConstants.CORNER_RADIUS_SMALL.dp
): Modifier {
    return this
        .glassSurface(
            transparency = GlassConstants.TRANSPARENCY_LIGHT,
            blurRadius = GlassConstants.BLUR_RADIUS_LIGHT,
            cornerRadius = cornerRadius
        )
        .glassEdgeHighlight(
            highlightWidth = GlassConstants.EDGE_HIGHLIGHT_WIDTH.dp,
            cornerRadius = cornerRadius
        )
}

// Edge highlight colors are defined in LiquidGlassTheme.kt

