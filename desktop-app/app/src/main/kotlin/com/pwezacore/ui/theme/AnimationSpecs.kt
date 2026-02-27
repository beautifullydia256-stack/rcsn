package com.pwezacore.ui.theme

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.graphicsLayer

object GlassAnimations {
    val standardSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessMedium
    )
    val gentleSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioHighBouncy,
        stiffness = Spring.StiffnessLow
    )
    val quickSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessHigh
    )
    val navigationSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessMediumLow
    )
    const val buttonPressScale = 0.95f
    const val buttonReleaseScale = 1.0f
}

@Composable
fun Modifier.glassPressScale(isPressed: Boolean): Modifier {
    val scale by animateFloatAsState(
        targetValue = if (isPressed) GlassAnimations.buttonPressScale else GlassAnimations.buttonReleaseScale,
        animationSpec = GlassAnimations.quickSpring,
        label = "press_scale"
    )
    return this.scale(scale)
}

@Composable
fun Modifier.glassPressBrightness(isPressed: Boolean): Modifier {
    val brightness by animateFloatAsState(
        targetValue = if (isPressed) 1.1f else 1.0f,
        animationSpec = GlassAnimations.quickSpring,
        label = "press_brightness"
    )
    return this.graphicsLayer { alpha = brightness }
}

@Composable
fun Modifier.glassPressAnimation(isPressed: Boolean): Modifier = this
    .glassPressScale(isPressed)
    .glassPressBrightness(isPressed)

@Composable
fun Modifier.glassFocusGlow(isFocused: Boolean): Modifier {
    val glowIntensity by animateFloatAsState(
        targetValue = if (isFocused) 0.3f else 0.0f,
        animationSpec = GlassAnimations.gentleSpring,
        label = "focus_glow"
    )
    return this.graphicsLayer {
        alpha = 1.0f + glowIntensity * 0.1f
    }
}
