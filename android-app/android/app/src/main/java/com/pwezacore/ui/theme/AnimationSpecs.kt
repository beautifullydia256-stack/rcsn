package com.pwezacore.ui.theme

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.graphicsLayer

/**
 * Spring animation configuration for soft, natural, fluid motion
 * No sharp easing curves - everything uses spring physics
 */
object GlassAnimations {
    // Standard spring for most UI interactions
    val standardSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessMedium
    )
    
    // Gentle spring for subtle animations
    val gentleSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioHighBouncy,
        stiffness = Spring.StiffnessLow
    )
    
    // Quick spring for press states
    val quickSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessHigh
    )
    
    // Navigation transition spring
    val navigationSpring = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessMediumLow
    )
    
    // Scale animation for button press
    val buttonPressScale = 0.95f
    val buttonReleaseScale = 1.0f
}

/**
 * Creates a scale animation modifier for press states
 * Used for buttons and interactive elements
 */
@Composable
fun Modifier.glassPressScale(
    isPressed: Boolean
): Modifier {
    val scale by animateFloatAsState(
        targetValue = if (isPressed) GlassAnimations.buttonPressScale else GlassAnimations.buttonReleaseScale,
        animationSpec = GlassAnimations.quickSpring,
        label = "press_scale"
    )
    
    return this.scale(scale)
}

/**
 * Creates a brightness animation for press states
 * Increases brightness when pressed
 */
@Composable
fun Modifier.glassPressBrightness(
    isPressed: Boolean
): Modifier {
    val brightness by animateFloatAsState(
        targetValue = if (isPressed) 1.1f else 1.0f,
        animationSpec = GlassAnimations.quickSpring,
        label = "press_brightness"
    )
    
    return this.graphicsLayer {
        alpha = brightness
    }
}

/**
 * Creates a combined press animation (scale + brightness)
 * Used for glass buttons
 */
@Composable
fun Modifier.glassPressAnimation(
    isPressed: Boolean
): Modifier {
    return this
        .glassPressScale(isPressed)
        .glassPressBrightness(isPressed)
}

/**
 * Creates a gentle fade-in animation
 */
@Composable
fun Modifier.glassFadeIn(
    visible: Boolean
): Modifier {
    val alpha by animateFloatAsState(
        targetValue = if (visible) 1.0f else 0.0f,
        animationSpec = GlassAnimations.gentleSpring,
        label = "fade_in"
    )
    
    return this.graphicsLayer {
        this.alpha = alpha
    }
}

/**
 * Creates a slide-in animation for modals and bottom sheets
 */
@Composable
fun Modifier.glassSlideIn(
    offset: Float,
    visible: Boolean
): Modifier {
    val animatedOffset by animateFloatAsState(
        targetValue = if (visible) 0f else offset,
        animationSpec = GlassAnimations.navigationSpring,
        label = "slide_in"
    )
    
    return this.graphicsLayer {
        translationY = animatedOffset
    }
}

/**
 * Spring-based animation spec for navigation transitions
 */
val glassNavigationSpec = GlassAnimations.navigationSpring

/**
 * Micro-animation for focus states
 */
@Composable
fun Modifier.glassFocusGlow(
    isFocused: Boolean
): Modifier {
    val glowIntensity by animateFloatAsState(
        targetValue = if (isFocused) 0.3f else 0.0f,
        animationSpec = GlassAnimations.gentleSpring,
        label = "focus_glow"
    )
    
    return this.graphicsLayer {
        // Glow effect would be applied here
        // For now, we use alpha as a simple representation
        alpha = 1.0f + glowIntensity * 0.1f
    }
}




