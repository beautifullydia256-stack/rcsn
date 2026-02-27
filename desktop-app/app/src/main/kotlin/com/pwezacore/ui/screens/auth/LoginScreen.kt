package com.pwezacore.ui.screens.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.pwezacore.data.DesktopSupabase
import com.pwezacore.data.UserRoleRow
import io.github.jan.supabase.auth.providers.builtin.Email
import io.github.jan.supabase.postgrest.from
import kotlinx.coroutines.launch

// Web-style colors: gradient background + glass card
private val WebLoginBgStart = Color(0xFF020617)   // slate-950
private val WebLoginBgMid = Color(0xFF0f172a)    // slate-900
private val WebLoginBgEnd = Color(0xFF1e293b)    // slate-800
private val WebGlassCard = Color(0x1AFFFFFF)
private val WebTextPrimary = Color(0xFFFFFFFF)
private val WebTextSecondary = Color(0xCCFFFFFF)
private val WebBorder = Color(0x33FFFFFF)
private val WebBlue = Color(0xFF2563EB)
private val WebIndigo = Color(0xFF4F46E5)
private val WebBlueLight = Color(0xFF93C5FD)

/** Maps Supabase/auth exceptions to messages users can understand. Shows real error when not matched. */
private fun friendlyLoginError(e: Throwable): String {
    val msg = (e.message ?: "").lowercase()
    val causeMsg = (e.cause?.message ?: "").lowercase()
    val rawMessage = (e.message ?: e.cause?.message ?: "").trim()
    return when {
        e is NoClassDefFoundError || e is ClassNotFoundException ->
            "The app is missing a required component. Please restart the app and try again. If the problem continues, reinstall PwezaCore."
        msg.contains("invalid login") || msg.contains("invalid credentials") ||
        msg.contains("invalid login credentials") || msg.contains("invalid_credentials") ||
        msg.contains("invalid email") || msg.contains("invalid password") ||
        msg.contains("wrong password") || msg.contains("incorrect password") ->
            "The email or password you entered is incorrect. Please try again."
        msg.contains("email not confirmed") || msg.contains("confirm your email") ||
        causeMsg.contains("email not confirmed") ->
            "Please check your email and click the confirmation link before signing in."
        msg.contains("user not found") || msg.contains("no user") ||
        msg.contains("account not found") ->
            "No account found with this email. Please check the address or register."
        msg.contains("too many") || msg.contains("rate limit") || msg.contains("429") ->
            "Too many sign-in attempts. Please wait a moment and try again."
        msg.contains("captcha") || causeMsg.contains("captcha") ->
            "Your Supabase project has CAPTCHA protection enabled. For this desktop app, turn it off in Supabase Dashboard → Authentication → Bot and Abuse Protection → disable \"Enable CAPTCHA protection\"."
        msg.contains("network") || msg.contains("connection") || msg.contains("unable to connect") ||
        msg.contains("timeout") || msg.contains("failed to connect") ||
        causeMsg.contains("connection") || causeMsg.contains("timeout") ->
            "Unable to connect. Please check your internet connection and try again."
        msg.contains("server") || msg.contains("500") || msg.contains("503") ->
            "Something went wrong on our side. Please try again in a few moments."
        msg.isBlank() ->
            "Something went wrong. Please check your email and password and try again."
        else ->
            if (rawMessage.isNotEmpty())
                "Unable to sign in. $rawMessage"
            else
                "Unable to sign in. Please check your email and password and try again."
    }
}

@Composable
fun LoginScreen(
    onLoginSuccess: (role: String) -> Unit,
    onNavigateToRegister: () -> Unit,
    onNavigateToForgotPassword: () -> Unit,
    modifier: Modifier = Modifier
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(WebLoginBgStart, WebLoginBgMid, WebLoginBgEnd)
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Surface(
                modifier = Modifier.widthIn(max = 420.dp).fillMaxWidth(0.95f),
                shape = RoundedCornerShape(24.dp),
                color = WebGlassCard,
                shadowElevation = 24.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(20.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = Color.Transparent
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(
                                        brush = Brush.linearGradient(
                                            colors = listOf(WebBlue, WebIndigo)
                                        ),
                                        shape = RoundedCornerShape(12.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                androidx.compose.material3.Icon(
                                    imageVector = Icons.Default.School,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(24.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.size(12.dp))
                        Text(
                            text = "PwezaCore",
                            color = WebBlueLight,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "Sign in to your account",
                        color = WebTextSecondary,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    if (errorMessage != null) {
                        Text(
                            text = errorMessage!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                        )
                    }
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it; errorMessage = null },
                        label = { Text("Email / Username", color = WebTextSecondary) },
                        placeholder = { Text("you@example.com", color = WebTextSecondary.copy(alpha = 0.6f)) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isLoading,
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            focusedTextColor = WebTextPrimary,
                            unfocusedTextColor = WebTextPrimary,
                            focusedLabelColor = WebTextSecondary,
                            unfocusedLabelColor = WebTextSecondary,
                            cursorColor = WebBlueLight,
                            focusedBorderColor = WebBorder,
                            unfocusedBorderColor = WebBorder
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; errorMessage = null },
                        label = { Text("Password", color = WebTextSecondary) },
                        placeholder = { Text("••••••••", color = WebTextSecondary.copy(alpha = 0.6f)) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isLoading,
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            focusedTextColor = WebTextPrimary,
                            unfocusedTextColor = WebTextPrimary,
                            focusedLabelColor = WebTextSecondary,
                            unfocusedLabelColor = WebTextSecondary,
                            cursorColor = WebBlueLight,
                            focusedBorderColor = WebBorder,
                            unfocusedBorderColor = WebBorder
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                    Button(
                        onClick = {
                            val emailTrim = email.trim()
                            if (emailTrim.isBlank() || password.isBlank()) return@Button
                            errorMessage = null
                            isLoading = true
                            scope.launch {
                                try {
                                    var loginEmail = emailTrim
                                    if (!loginEmail.contains("@")) {
                                        loginEmail = "$loginEmail@school.local"
                                    }
                                    DesktopSupabase.auth.signInWith(Email) {
                                        this.email = loginEmail
                                        this.password = password
                                    }
                                    val userId = DesktopSupabase.auth.currentSessionOrNull()?.user?.id
                                        ?: run {
                                            errorMessage = "Unable to get your account. Please try again."
                                            return@launch
                                        }
                                    val role = try {
                                        DesktopSupabase.postgrest.from("users")
                                            .select {
                                                filter {
                                                    UserRoleRow::userId eq userId
                                                }
                                            }
                                            .decodeSingle<UserRoleRow>()
                                            .role?.lowercase()?.trim()
                                    } catch (_: Throwable) { null }
                                    val resolvedRole = role?.takeIf { it.isNotEmpty() } ?: "admin"
                                    onLoginSuccess(resolvedRole)
                                } catch (e: Throwable) {
                                    errorMessage = friendlyLoginError(e)
                                } finally {
                                    isLoading = false
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        enabled = email.isNotBlank() && password.isNotBlank() && !isLoading,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = WebBlue,
                            contentColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp),
                        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(24.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text("Sign In", fontWeight = FontWeight.SemiBold)
                        }
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Don't have an account? ",
                            color = WebTextSecondary,
                            fontSize = 14.sp
                        )
                        TextButton(
                            onClick = onNavigateToRegister,
                            colors = ButtonDefaults.textButtonColors(contentColor = WebBlueLight)
                        ) {
                            Text("Register your school", fontWeight = FontWeight.Medium)
                        }
                    }
                    TextButton(
                        onClick = onNavigateToForgotPassword
                    ) {
                        Text("Forgot password?", color = WebBlueLight, fontSize = 14.sp)
                    }
                }
            }
        }
    }
}
