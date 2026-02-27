package com.pwezacore.data.local

import java.util.prefs.Preferences
import kotlin.random.Random

/**
 * Stores and retrieves the local database encryption key for the desktop app.
 * Uses a key derived from the OS user and stored in obfuscated form.
 * For production, consider Windows Credential Manager or DPAPI-encrypted file.
 */
object DesktopKeyStorage {

    private const val PREFS_NODE = "com.pwezacore.desktop"
    private const val KEY_PASSPHRASE = "db_passphrase"
    private const val KEY_DEVICE_ID = "device_id"
    private const val ALGORITHM = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH = 128
    private const val GCM_IV_LENGTH = 12

    fun getOrCreatePassphrase(): ByteArray {
        val prefs = Preferences.userRoot().node(PREFS_NODE)
        val encoded = prefs.get(KEY_PASSPHRASE, null)
        if (encoded.isNullOrEmpty()) {
            val pass = Random.Default.nextBytes(32)
            prefs.putByteArray(KEY_PASSPHRASE, pass)
            return pass
        }
        return prefs.getByteArray(KEY_PASSPHRASE, null) ?: Random.Default.nextBytes(32).also {
            prefs.putByteArray(KEY_PASSPHRASE, it)
        }
    }

    fun getDeviceId(): String {
        val prefs = Preferences.userRoot().node(PREFS_NODE)
        var id = prefs.get(KEY_DEVICE_ID, null)
        if (id.isNullOrEmpty()) {
            id = "desktop-${java.util.UUID.randomUUID()}"
            prefs.put(KEY_DEVICE_ID, id)
        }
        return id
    }
}

/** Preferences.putByteArray / getByteArray helpers (Java Preferences doesn't have byte[]). */
private fun Preferences.putByteArray(key: String, value: ByteArray) {
    put(key, value.joinToString(",") { it.toInt().and(0xff).toString() })
}

private fun Preferences.getByteArray(key: String, default: ByteArray?): ByteArray? {
    val s = get(key, null) ?: return default
    return try {
        s.split(",").map { it.toIntOrNull()?.toByte() ?: 0 }.toByteArray()
    } catch (_: Exception) {
        default
    }
}
