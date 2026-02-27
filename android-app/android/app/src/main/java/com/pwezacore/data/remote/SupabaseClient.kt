package com.pwezacore.data.remote

import io.github.jan.supabase.SupabaseClient as SupabaseClientType
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.storage.storage
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SupabaseClient @Inject constructor() {

    companion object {
        private const val SUPABASE_URL = "https://ibnyclqobbrnjyxbbfsg.supabase.co"
        private const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzA4NTksImV4cCI6MjA3MzYwNjg1OX0.JR5mcF3o8zDsl65KUgeAsPDDAf8qVhla_wm6gTadeVw"
    }

    val client: SupabaseClientType = createSupabaseClient(
        supabaseUrl = SUPABASE_URL,
        supabaseKey = SUPABASE_ANON_KEY
    ) {
        install(Postgrest)
        install(Auth)
        install(Realtime)
        install(Storage)
    }

    val postgrest: Postgrest get() = client.postgrest
    val auth: Auth get() = client.auth
    val realtime: Realtime get() = client.realtime
    val storage: Storage get() = client.storage
}

