package com.pwezacore.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.pwezacore.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class LoginViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun signIn(email: String, password: String, onSuccess: (role: String) -> Unit) {
        if (email.isBlank() || password.isBlank()) {
            _errorMessage.value = "Email and password are required"
            return
        }
        _errorMessage.value = null
        _isLoading.value = true
        viewModelScope.launch {
            val result = authRepository.signIn(email.trim(), password)
            _isLoading.value = false
            result.fold(
                onSuccess = { user ->
                    onSuccess(user.role)
                },
                onFailure = { e ->
                    _errorMessage.value = e.message ?: "Sign in failed"
                }
            )
        }
    }

    fun clearError() {
        _errorMessage.value = null
    }
}
