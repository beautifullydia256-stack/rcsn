package com.pwezacore.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Glass Material Constants
object GlassConstants {
    // Blur radius for different surfaces
    const val BLUR_RADIUS_LIGHT = 20f
    const val BLUR_RADIUS_MEDIUM = 30f
    const val BLUR_RADIUS_HEAVY = 40f
    
    // Transparency levels (0f = fully transparent, 1f = fully opaque)
    const val TRANSPARENCY_LIGHT = 0.15f
    const val TRANSPARENCY_MEDIUM = 0.25f
    const val TRANSPARENCY_HEAVY = 0.35f
    
    // Edge highlight width
    const val EDGE_HIGHLIGHT_WIDTH = 0.5f // dp
    const val EDGE_HIGHLIGHT_WIDTH_THICK = 1f // dp
    
    // Border radius
    const val CORNER_RADIUS_SMALL = 12f // dp
    const val CORNER_RADIUS_MEDIUM = 16f // dp
    const val CORNER_RADIUS_LARGE = 24f // dp
    const val CORNER_RADIUS_XLARGE = 32f // dp
}

// Light Mode - Clear Milky Glass
private val LightGlassBackground = Color(0xFFFFFFFF) // White base
private val LightGlassSurface = Color(0xF5FFFFFF) // Milky white with transparency
private val LightGlassSurfaceVariant = Color(0xE8FFFFFF) // Slightly more opaque
private val LightGlassPrimary = Color(0xFF1A1A2E) // Dark text on glass
private val LightGlassSecondary = Color(0xFF6366F1) // Accent color
private val LightGlassTertiary = Color(0xFF8B5CF6) // Secondary accent
private val LightGlassError = Color(0xFFEF4444)
private val LightGlassOnSurface = Color(0xFF1A1A1A) // High contrast but softened
private val LightGlassOnPrimary = Color(0xFFFFFFFF)

// Dark Mode - Smoked Glass (NOT pure black)
private val DarkGlassBackground = Color(0xFF0F0F16) // Very dark gray, not black
private val DarkGlassSurface = Color(0x4D1A1A2E) // Smoked glass with transparency
private val DarkGlassSurfaceVariant = Color(0x661A1A2E) // Slightly more opaque
private val DarkGlassPrimary = Color(0xFF6366F1) // Accent color
private val DarkGlassSecondary = Color(0xFF8B5CF6)
private val DarkGlassTertiary = Color(0xFFA78BFA)
private val DarkGlassError = Color(0xFFEF4444)
private val DarkGlassOnSurface = Color(0xFFFFFFFF) // Soft white
private val DarkGlassOnPrimary = Color(0xFFFFFFFF)

// Edge highlight colors (subtle light reflection)
val LightEdgeHighlight = Color(0x33FFFFFF) // Very subtle white
val DarkEdgeHighlight = Color(0x33FFFFFF) // Subtle white on dark too

// Specular highlight (for active elements)
val LightSpecularHighlight = Color(0x66FFFFFF)
val DarkSpecularHighlight = Color(0x66FFFFFF)

private val LightColorScheme = lightColorScheme(
    primary = LightGlassPrimary,
    secondary = LightGlassSecondary,
    tertiary = LightGlassTertiary,
    error = LightGlassError,
    background = LightGlassBackground,
    surface = LightGlassSurface,
    surfaceVariant = LightGlassSurfaceVariant,
    onPrimary = LightGlassOnPrimary,
    onSecondary = LightGlassOnPrimary,
    onBackground = LightGlassOnSurface,
    onSurface = LightGlassOnSurface,
    onError = LightGlassOnPrimary
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkGlassPrimary,
    secondary = DarkGlassSecondary,
    tertiary = DarkGlassTertiary,
    error = DarkGlassError,
    background = DarkGlassBackground,
    surface = DarkGlassSurface,
    surfaceVariant = DarkGlassSurfaceVariant,
    onPrimary = DarkGlassOnPrimary,
    onSecondary = DarkGlassOnPrimary,
    onBackground = DarkGlassOnSurface,
    onSurface = DarkGlassOnSurface,
    onError = DarkGlassOnPrimary
)

// Typography - Clean sans-serif, high contrast but softened
val GlassTypography = Typography(
    displayLarge = androidx.compose.material3.MaterialTheme.typography.displayLarge.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    displayMedium = androidx.compose.material3.MaterialTheme.typography.displayMedium.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    displaySmall = androidx.compose.material3.MaterialTheme.typography.displaySmall.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    headlineLarge = androidx.compose.material3.MaterialTheme.typography.headlineLarge.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    headlineMedium = androidx.compose.material3.MaterialTheme.typography.headlineMedium.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    headlineSmall = androidx.compose.material3.MaterialTheme.typography.headlineSmall.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    titleLarge = androidx.compose.material3.MaterialTheme.typography.titleLarge.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    titleMedium = androidx.compose.material3.MaterialTheme.typography.titleMedium.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    titleSmall = androidx.compose.material3.MaterialTheme.typography.titleSmall.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    bodyLarge = androidx.compose.material3.MaterialTheme.typography.bodyLarge.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    bodyMedium = androidx.compose.material3.MaterialTheme.typography.bodyMedium.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    bodySmall = androidx.compose.material3.MaterialTheme.typography.bodySmall.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    labelLarge = androidx.compose.material3.MaterialTheme.typography.labelLarge.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    labelMedium = androidx.compose.material3.MaterialTheme.typography.labelMedium.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    ),
    labelSmall = androidx.compose.material3.MaterialTheme.typography.labelSmall.copy(
        fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif
    )
)

@Composable
fun LiquidGlassTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = GlassTypography,
        content = content
    )
}

@Composable
private fun isSystemInDarkTheme(): Boolean {
    return androidx.compose.ui.platform.LocalConfiguration.current.uiMode and
            android.content.res.Configuration.UI_MODE_NIGHT_MASK ==
            android.content.res.Configuration.UI_MODE_NIGHT_YES
}




