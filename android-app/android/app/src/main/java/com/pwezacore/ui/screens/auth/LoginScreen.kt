package com.pwezacore.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

// Reference-style colors: dark blue-gray background, solid card, vibrant blue CTA
private val LoginBackgroundCenter = Color(0xFF252B3B)
private val LoginBackgroundEdge = Color(0xFF161B26)
private val LoginCardBackground = Color(0xFF2D3343)
private val LoginInputBackground = Color(0xFF3D4455)
private val LoginPrimaryBlue = Color(0xFF2563EB)
private val LoginPrimaryBlueDark = Color(0xFF1D4ED8)
private val LoginBrandBlue = Color(0xFF60A5FA)
private val LoginTextPrimary = Color(0xFFF1F5F9)
private val LoginTextSecondary = Color(0xFF94A3B8)
private val LoginDividerGray = Color(0xFF475569)

@Composable
fun LoginScreen(
    onLoginSuccess: (role: String) -> Unit,
    onNavigateToRegister: () -> Unit,
    onNavigateToForgotPassword: () -> Unit,
    viewModel: LoginViewModel = hiltViewModel(),
    modifier: Modifier = Modifier
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val errorMessage by viewModel.errorMessage.collectAsStateWithLifecycle()

    BoxWithConstraints(
        modifier = modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        val density = LocalDensity.current
        val centerPx = with(density) {
            Offset(maxWidth.toPx() / 2f, maxHeight.toPx() / 2f)
        }
        val radiusPx = with(density) { maxOf(maxWidth, maxHeight).toPx() * 0.8f }
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(LoginBackgroundCenter, LoginBackgroundEdge),
                        center = centerPx,
                        radius = radiusPx
                    )
                )
                .padding(24.dp),
            contentAlignment = Alignment.Center
        ) {
        Surface(
            modifier = Modifier
                .widthIn(max = 420.dp)
                .fillMaxWidth(0.9f)
                .verticalScroll(rememberScrollState()),
            shape = RoundedCornerShape(16.dp),
            color = LoginCardBackground
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                // Logo + app name
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Cloud,
                        contentDescription = null,
                        tint = LoginBrandBlue,
                        modifier = Modifier.size(32.dp)
                    )
                    Spacer(modifier = Modifier.size(12.dp))
                    Text(
                        text = "PwezaCore",
                        color = LoginBrandBlue,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
                Text(
                    text = "Sign in to your account",
                    color = LoginTextSecondary,
                    fontSize = 14.sp
                )
                Spacer(modifier = Modifier.height(8.dp))

                if (errorMessage != null) {
                    Text(
                        text = errorMessage!!,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error
                    )
                }

                // Email / Username
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email / Username", color = LoginTextSecondary) },
                    placeholder = { Text("you@example.com", color = LoginTextSecondary.copy(alpha = 0.6f)) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isLoading,
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = LoginInputBackground,
                        unfocusedContainerColor = LoginInputBackground,
                        disabledContainerColor = LoginInputBackground.copy(alpha = 0.7f),
                        focusedTextColor = LoginTextPrimary,
                        unfocusedTextColor = LoginTextPrimary,
                        focusedLabelColor = LoginTextSecondary,
                        unfocusedLabelColor = LoginTextSecondary,
                        cursorColor = LoginBrandBlue,
                        focusedBorderColor = LoginBrandBlue.copy(alpha = 0.5f),
                        unfocusedBorderColor = LoginDividerGray.copy(alpha = 0.5f)
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                // Password
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password", color = LoginTextSecondary) },
                    placeholder = { Text("********", color = LoginTextSecondary.copy(alpha = 0.6f)) },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !isLoading,
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = LoginInputBackground,
                        unfocusedContainerColor = LoginInputBackground,
                        disabledContainerColor = LoginInputBackground.copy(alpha = 0.7f),
                        focusedTextColor = LoginTextPrimary,
                        unfocusedTextColor = LoginTextPrimary,
                        focusedLabelColor = LoginTextSecondary,
                        unfocusedLabelColor = LoginTextSecondary,
                        cursorColor = LoginBrandBlue,
                        focusedBorderColor = LoginBrandBlue.copy(alpha = 0.5f),
                        unfocusedBorderColor = LoginDividerGray.copy(alpha = 0.5f)
                    ),
                    shape = RoundedCornerShape(12.dp)
                )

                // Sign In button
                Button(
                    onClick = {
                        viewModel.signIn(email, password, onSuccess = onLoginSuccess)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    enabled = email.isNotBlank() && password.isNotBlank() && !isLoading,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = LoginPrimaryBlue,
                        contentColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
                ) {
                    Text("Sign In", fontWeight = FontWeight.SemiBold)
                }

                // Don't have an account?
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Don't have an account? ",
                        color = LoginTextSecondary,
                        fontSize = 14.sp
                    )
                    TextButton(
                        onClick = onNavigateToRegister,
                        colors = ButtonDefaults.textButtonColors(contentColor = LoginBrandBlue),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Text("Register your school", fontWeight = FontWeight.Medium)
                    }
                }
            }
        }
        }
    }
}
