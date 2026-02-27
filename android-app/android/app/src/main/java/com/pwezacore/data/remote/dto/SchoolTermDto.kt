package com.pwezacore.data.remote.dto

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SchoolTermDto(
    val id: String? = null,
    @SerialName("school_id") val school_id: String? = null,
    @SerialName("term") val term: Int? = null,
    @SerialName("year") val year: Int? = null,
    @SerialName("start_date") val start_date: String? = null,
    @SerialName("end_date") val end_date: String? = null
) {
    fun displayName(): String = "Term ${term ?: 0} ${year ?: ""}".trim()
    fun termKey(): String = "${year ?: 0}-${term ?: 0}"
}
