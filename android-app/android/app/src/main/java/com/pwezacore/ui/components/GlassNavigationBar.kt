package com.pwezacore.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.pwezacore.ui.theme.GlassConstants
import com.pwezacore.ui.theme.glassHeavyBlur

data class GlassNavItem(
    val label: String,
    val icon: ImageVector,
    val selectedIcon: ImageVector? = null,
    val route: String
)

/**
 * GlassNavigationBar - Fully translucent navigation bar with heavy blur
 * Icons look etched into glass
 * No solid backgrounds
 */
@Composable
fun GlassNavigationBar(
    items: List<GlassNavItem>,
    selectedRoute: String?,
    onItemClick: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(64.dp)
            .clip(RoundedCornerShape(topStart = GlassConstants.CORNER_RADIUS_LARGE.dp, topEnd = GlassConstants.CORNER_RADIUS_LARGE.dp))
            .glassHeavyBlur(GlassConstants.CORNER_RADIUS_LARGE.dp)
    ) {
        NavigationBar(
            modifier = Modifier.fillMaxWidth(),
            containerColor = Color.Transparent,
            tonalElevation = 0.dp
        ) {
            items.forEach { item ->
                val isSelected = selectedRoute == item.route
                val icon = if (isSelected && item.selectedIcon != null) item.selectedIcon else item.icon
                
                NavigationBarItem(
                    icon = {
                        Icon(
                            imageVector = icon,
                            contentDescription = item.label
                        )
                    },
                    label = { Text(item.label) },
                    selected = isSelected,
                    onClick = { onItemClick(item.route) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = MaterialTheme.colorScheme.primary,
                        selectedTextColor = MaterialTheme.colorScheme.primary,
                        indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.2f),
                        unselectedIconColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        unselectedTextColor = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                )
            }
        }
    }
}




