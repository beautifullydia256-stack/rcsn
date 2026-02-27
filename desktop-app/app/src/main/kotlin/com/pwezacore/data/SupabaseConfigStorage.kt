package com.pwezacore.data

import kotlinx.serialization.json.Json
import java.io.File

/**
 * Stores Supabase URL and anon key. Load order: (1) env SUPABASE_URL + SUPABASE_ANON_KEY,
 * (2) user file ~/.pwezacore/supabase_config.json, (3) bundled resource supabase_config.json,
 * (4) built-in default so the app always goes straight to Login.
 */
object SupabaseConfigStorage {

    private const val ENV_URL = "SUPABASE_URL"
    private const val ENV_ANON_KEY = "SUPABASE_ANON_KEY"

    private const val DEFAULT_SUPABASE_URL = "https://ibnyclqobbrnjyxbbfsg.supabase.co"
    private const val DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzA4NTksImV4cCI6MjA3MzYwNjg1OX0.JR5mcF3o8zDsl65KUgeAsPDDAf8qVhla_wm6gTadeVw"

    private val json = Json { encodeDefaults = true }
    private val configDir: File by lazy {
        val home = System.getProperty("user.home") ?: "."
        File(home, ".pwezacore").apply { mkdirs() }
    }
    private val configFile: File by lazy { File(configDir, "supabase_config.json") }

    fun hasConfig(): Boolean = load() != null

    fun load(): SupabaseConfig? {
        // 1) Prefer environment variables so credentials are never written to disk
        val envUrl = System.getenv(ENV_URL)?.trim()?.takeIf { it.isNotEmpty() }
        val envKey = System.getenv(ENV_ANON_KEY)?.trim()?.takeIf { it.isNotEmpty() }
        if (envUrl != null && envKey != null) {
            val turnstileSiteKey = System.getenv("TURNSTILE_SITE_KEY")?.trim()?.takeIf { it.isNotEmpty() }
            val turnstileSecret = System.getenv("TURNSTILE_SECRET")?.trim()?.takeIf { it.isNotEmpty() }
            return SupabaseConfig(
                supabaseUrl = envUrl.removeSuffix("/"),
                supabaseAnonKey = envKey,
                turnstileSiteKey = turnstileSiteKey,
                turnstileSecret = turnstileSecret
            )
        }
        // 2) User's saved config (e.g. from Setup or previous run)
        try {
            if (configFile.exists()) {
                val text = configFile.readText()
                if (text.isNotBlank()) {
                    return json.decodeFromString(SupabaseConfig.serializer(), text)
                }
            }
        } catch (_: Exception) { }
        // 3) Bundled config (e.g. app/src/main/resources/supabase_config.json)
        try {
            val resource = javaClass.getResource("/supabase_config.json")
            if (resource != null) {
                resource.openStream().use { stream ->
                    val text = stream.bufferedReader().readText().trim()
                    if (text.isNotEmpty()) {
                        return json.decodeFromString(SupabaseConfig.serializer(), text)
                    }
                }
            }
        } catch (_: Exception) { }
        // 4) Built-in default — app always has config, goes straight to Login
        return SupabaseConfig(
            supabaseUrl = DEFAULT_SUPABASE_URL,
            supabaseAnonKey = DEFAULT_ANON_KEY,
            turnstileSiteKey = null,
            turnstileSecret = null
        )
    }

    fun save(url: String, anonKey: String, turnstileSiteKey: String? = null, turnstileSecret: String? = null) {
        val existing = try {
            if (configFile.exists()) json.decodeFromString(SupabaseConfig.serializer(), configFile.readText()) else null
        } catch (_: Exception) { null }
        val config = SupabaseConfig(
            supabaseUrl = url.trim().removeSuffix("/"),
            supabaseAnonKey = anonKey.trim(),
            turnstileSiteKey = turnstileSiteKey?.trim()?.takeIf { it.isNotEmpty() } ?: existing?.turnstileSiteKey,
            turnstileSecret = turnstileSecret?.trim()?.takeIf { it.isNotEmpty() } ?: existing?.turnstileSecret
        )
        configFile.writeText(json.encodeToString(SupabaseConfig.serializer(), config))
        restrictToCurrentUserOnly()
    }

    /** Restrict config file so only the current user can read/write (not other accounts or processes). */
    private fun restrictToCurrentUserOnly() {
        if (!configFile.exists()) return
        try {
            // Unix: owner read/write only (no group/other)
            configFile.setReadable(true, true)
            configFile.setWritable(true, true)
            configFile.setExecutable(false, true)
            configDir.setReadable(true, true)
            configDir.setWritable(true, true)
            configDir.setExecutable(true, true)
        } catch (_: Exception) { }
    }
}
