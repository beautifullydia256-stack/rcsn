package com.pwezacore.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Used to decode the `users` table row (role and user_id for filter). */
@Serializable
data class UserRoleRow(
    @SerialName("user_id") val userId: String? = null,
    @SerialName("role") val role: String? = null
)
