package com.pwezacore.data

import kotlinx.serialization.Serializable

@Serializable
data class SupabaseConfig(
    val supabaseUrl: String,
    val supabaseAnonKey: String,
    /** Turnstile (Cloudflare) site key for captcha — use with Attack Protection in Supabase Dashboard. */
    val turnstileSiteKey: String? = null,
    /** Turnstile secret (same as in Supabase Dashboard → Auth → Attack Protection). */
    val turnstileSecret: String? = null
)
