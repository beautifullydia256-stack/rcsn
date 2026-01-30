package com.pwezacore.ui.components

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.pwezacore.ui.theme.GlassConstants
import com.pwezacore.ui.theme.GlassContainer

/**
 * GlassCard - A floating glass sheet with blur effect
 * Content appears embedded inside glass
 * No elevation, depth via blur/transparency
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    transparency: Float = GlassConstants.TRANSPARENCY_MEDIUM,
    blurRadius: Float = GlassConstants.BLUR_RADIUS_MEDIUM,
    cornerRadius: androidx.compose.ui.unit.Dp = GlassConstants.CORNER_RADIUS_MEDIUM.dp,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    content: @Composable BoxScope.() -> Unit
) {
    GlassContainer(
        modifier = modifier.fillMaxWidth(),
        transparency = transparency,
        blurRadius = blurRadius,
        cornerRadius = cornerRadius,
        showEdgeHighlight = true
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(contentPadding),
            content = content
        )
    }
}

/**
 * Light glass card for subtle overlays
 */
@Composable
fun LightGlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: androidx.compose.ui.unit.Dp = GlassConstants.CORNER_RADIUS_MEDIUM.dp,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    content: @Composable BoxScope.() -> Unit
) {
    GlassCard(
        modifier = modifier,
        transparency = GlassConstants.TRANSPARENCY_LIGHT,
        blurRadius = GlassConstants.BLUR_RADIUS_LIGHT,
        cornerRadius = cornerRadius,
        contentPadding = contentPadding,
        content = content
    )
}

/**
 * Heavy glass card for prominent content
 */
@Composable
fun HeavyGlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: androidx.compose.ui.unit.Dp = GlassConstants.CORNER_RADIUS_LARGE.dp,
    contentPadding: PaddingValues = PaddingValues(20.dp),
    content: @Composable BoxScope.() -> Unit
) {
    GlassCard(
        modifier = modifier,
        transparency = GlassConstants.TRANSPARENCY_HEAVY,
        blurRadius = GlassConstants.BLUR_RADIUS_HEAVY,
        cornerRadius = cornerRadius,
        contentPadding = contentPadding,
        content = content
    )
}




