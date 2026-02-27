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
