package com.pwezacore.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.util.UUID

/**
 * Provides the SQLCipher database encryption key. Key is generated once and stored
 * in EncryptedSharedPreferences (backed by Android Keystore). Never hardcode the key.
 */
object DatabaseKeyProvider {

    private const val PREFS_NAME = "pwezacore_secure_prefs"
    private const val KEY_DB_PASSPHRASE = "db_passphrase"
    private const val KEY_DEVICE_ID = "device_id"

    fun getOrCreatePassphrase(context: Context): ByteArray {
        val prefs = encryptedPrefs(context)
        var pass = prefs.getString(KEY_DB_PASSPHRASE, null)
        if (pass.isNullOrEmpty()) {
            pass = UUID.randomUUID().toString()
            prefs.edit().putString(KEY_DB_PASSPHRASE, pass).apply()
        }
        return pass.toByteArray(Charsets.UTF_8)
    }

    fun getDeviceId(context: Context): String {
        val prefs = encryptedPrefs(context)
        var id = prefs.getString(KEY_DEVICE_ID, null)
        if (id.isNullOrEmpty()) {
            id = "android-${UUID.randomUUID()}"
            prefs.edit().putString(KEY_DEVICE_ID, id).apply()
        }
        return id
    }

    private fun encryptedPrefs(context: Context) =
        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
}
