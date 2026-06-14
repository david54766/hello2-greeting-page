package com.preschoolprimadonna.app.ui

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val PrimaPink = Color(0xFFF000A8)
val PrimaInk = Color(0xFF171016)
val PrimaSurface = Color(0xFFFFF7FA)
val PrimaSoft = Color(0xFFFFEEF6)
val PrimaGold = Color(0xFFC49A48)

private val ColorScheme = lightColorScheme(
    primary = PrimaPink,
    onPrimary = Color.White,
    secondary = PrimaGold,
    onSecondary = PrimaInk,
    background = PrimaSurface,
    onBackground = PrimaInk,
    surface = Color.White,
    onSurface = PrimaInk,
    surfaceVariant = PrimaSoft,
    onSurfaceVariant = Color(0xFF5F5360),
    outline = Color(0xFFEBD9E3)
)

@Composable
fun PrimaDonnaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ColorScheme,
        typography = MaterialTheme.typography,
        content = content
    )
}
