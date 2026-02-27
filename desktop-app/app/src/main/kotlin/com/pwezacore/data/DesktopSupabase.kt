package com.pwezacore.data

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.storage.storage

/**
 * Supabase client for the desktop app. URL and anon key come from [SupabaseConfigStorage]
 * (env, user file, or bundled supabase_config.json). When config exists, app shows Login first.
 * [getClientOrNull] is null only when no config is present (Setup screen).
 */
object DesktopSupabase {

    @Volatile
    private var cachedClient: SupabaseClient? = null

    fun getClientOrNull(): SupabaseClient? {
        var c = cachedClient
        if (c != null) return c
        val config = SupabaseConfigStorage.load() ?: return null
        c = createSupabaseClient(
            supabaseUrl = config.supabaseUrl,
            supabaseKey = config.supabaseAnonKey
        ) {
            install(Postgrest)
            install(Auth)
            install(Realtime)
            install(Storage)
        }
        cachedClient = c
        return c
    }

    /** Call after saving URL + anon key in Setup so the client is recreated with new config. */
    fun updateConfig(url: String, anonKey: String) {
        SupabaseConfigStorage.save(url, anonKey)
        cachedClient = null
    }

    val client: SupabaseClient get() = getClientOrNull()!!

    val auth: Auth get() = client.auth
    val postgrest: Postgrest get() = client.postgrest
}
