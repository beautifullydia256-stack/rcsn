package com.pwezacore.data.local.entities

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.util.UUID

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey
    val category_id: String = UUID.randomUUID().toString(),
    val name: String,
    val shelf_code: String = ""
)
