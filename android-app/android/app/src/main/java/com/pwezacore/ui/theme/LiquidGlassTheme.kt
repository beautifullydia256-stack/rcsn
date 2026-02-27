package com.pwezacore.ui.theme

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Vibrant accent palette for sidebar icons and app highlights
object AppAccentColors {
    val Dashboard = Color(0xFF6366F1)   // Indigo
    val Students = Color(0xFF10B981)    // Emerald
    val Teachers = Color(0xFF3B82F6)     // Blue
    val Parents = Color(0xFFF59E0B)      // Amber
    val Staff = Color(0xFF14B8A6)        // Teal
    val Finance = Color(0xFF22C55E)      // Green
    val Reports = Color(0xFF8B5CF6)     // Violet
    val Attendance = Color(0xFFF97316)  // Orange
    val ExamSets = Color(0xFF06B6D4)    // Cyan
    val Identity = Color(0xFFA855F7)    // Purple
    val Classes = Color(0xFF0EA5E9)      // Sky
    val JobVacancies = Color(0xFFEC4899) // Pink
    val SystemSettings = Color(0xFF64748B) // Slate
    val Notifications = Color(0xFFE11D48)  // Rose
}
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

    // Extra-strong blur for drawer / modal glass (frosted background)
    const val BLUR_RADIUS_DRAWER = 55f
}
// Light Mode - Clear Milky Glass with richer accents
private val LightGlassBackground = Color(0xFFF8FAFC)
private val LightGlassSurface = Color(0xFFF1F5F9)
private val LightGlassSurfaceVariant = Color(0xFFE2E8F0)
private val LightGlassPrimary = Color(0xFF4F46E5)
private val LightGlassSecondary = Color(0xFF6366F1)
private val LightGlassTertiary = Color(0xFF8B5CF6)
private val LightGlassError = Color(0xFFDC2626)
private val LightGlassOnSurface = Color(0xFF1E293B)
private val LightGlassOnPrimary = Color(0xFFFFFFFF)
private val LightGlassPrimaryContainer = Color(0xFFE0E7FF)
private val LightGlassSecondaryContainer = Color(0xFFE0E7FF)
private val LightGlassTertiaryContainer = Color(0xFFEDE9FE)

// Dark Mode - Smoked Glass with vibrant accents
private val DarkGlassBackground = Color(0xFF0F172A)
private val DarkGlassSurface = Color(0xFF1E293B)
private val DarkGlassSurfaceVariant = Color(0xFF334155)
private val DarkGlassPrimary = Color(0xFF818CF8)
private val DarkGlassSecondary = Color(0xFFA78BFA)
private val DarkGlassTertiary = Color(0xFFC4B5FD)
private val DarkGlassError = Color(0xFFF87171)
private val DarkGlassOnSurface = Color(0xFFF8FAFC)
private val DarkGlassOnPrimary = Color(0xFF1E1B4B)
private val DarkGlassPrimaryContainer = Color(0xFF3730A3)
private val DarkGlassSecondaryContainer = Color(0xFF5B21B6)
private val DarkGlassTertiaryContainer = Color(0xFF6D28D9)

// Edge highlight colors (subtle light reflection)
val LightEdgeHighlight = Color(0x33FFFFFF) // Very subtle white
val DarkEdgeHighlight = Color(0x33FFFFFF) // Subtle white on dark too

// Specular highlight (for active elements)
val LightSpecularHighlight = Color(0x66FFFFFF)
val DarkSpecularHighlight = Color(0x66FFFFFF)

private val LightColorScheme = lightColorScheme(
    primary = LightGlassPrimary,
    onPrimary = LightGlassOnPrimary,
    primaryContainer = LightGlassPrimaryContainer,
    onPrimaryContainer = LightGlassOnSurface,
    secondary = LightGlassSecondary,
    onSecondary = LightGlassOnPrimary,
    secondaryContainer = LightGlassSecondaryContainer,
    onSecondaryContainer = LightGlassOnSurface,
    tertiary = LightGlassTertiary,
    onTertiary = LightGlassOnPrimary,
    tertiaryContainer = LightGlassTertiaryContainer,
    onTertiaryContainer = LightGlassOnSurface,
    error = LightGlassError,
    onError = LightGlassOnPrimary,
    background = LightGlassBackground,
    onBackground = LightGlassOnSurface,
    surface = LightGlassSurface,
    onSurface = LightGlassOnSurface,
    surfaceVariant = LightGlassSurfaceVariant,
    onSurfaceVariant = LightGlassOnSurface
)

private val DarkColorScheme = darkColorScheme(
    primary = DarkGlassPrimary,
    onPrimary = DarkGlassOnPrimary,
    primaryContainer = DarkGlassPrimaryContainer,
    onPrimaryContainer = DarkGlassOnSurface,
    secondary = DarkGlassSecondary,
    onSecondary = DarkGlassOnPrimary,
    secondaryContainer = DarkGlassSecondaryContainer,
    onSecondaryContainer = DarkGlassOnSurface,
    tertiary = DarkGlassTertiary,
    onTertiary = DarkGlassOnPrimary,
    tertiaryContainer = DarkGlassTertiaryContainer,
    onTertiaryContainer = DarkGlassOnSurface,
    error = DarkGlassError,
    onError = DarkGlassOnPrimary,
    background = DarkGlassBackground,
    onBackground = DarkGlassOnSurface,
    surface = DarkGlassSurface,
    onSurface = DarkGlassOnSurface,
    surfaceVariant = DarkGlassSurfaceVariant,
    onSurfaceVariant = DarkGlassOnSurface
)

// Default typography for building GlassTypography (no MaterialTheme at top level)
private val DefaultTypography = Typography()

@Composable
fun LiquidGlassTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val typography = Typography(
        displayLarge = DefaultTypography.displayLarge.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        displayMedium = DefaultTypography.displayMedium.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        displaySmall = DefaultTypography.displaySmall.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        headlineLarge = DefaultTypography.headlineLarge.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        headlineMedium = DefaultTypography.headlineMedium.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        headlineSmall = DefaultTypography.headlineSmall.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        titleLarge = DefaultTypography.titleLarge.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        titleMedium = DefaultTypography.titleMedium.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        titleSmall = DefaultTypography.titleSmall.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        bodyLarge = DefaultTypography.bodyLarge.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        bodyMedium = DefaultTypography.bodyMedium.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        bodySmall = DefaultTypography.bodySmall.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        labelLarge = DefaultTypography.labelLarge.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        labelMedium = DefaultTypography.labelMedium.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif),
        labelSmall = DefaultTypography.labelSmall.copy(fontFamily = androidx.compose.ui.text.font.FontFamily.SansSerif)
    )
    MaterialTheme(
        colorScheme = colorScheme,
        typography = typography,
        content = content
    )
}

@Composable
private fun isSystemInDarkTheme(): Boolean {
    return androidx.compose.ui.platform.LocalConfiguration.current.uiMode and
            android.content.res.Configuration.UI_MODE_NIGHT_MASK ==
            android.content.res.Configuration.UI_MODE_NIGHT_YES
}




