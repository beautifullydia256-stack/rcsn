package com.pwezacore.data.pdf

import android.graphics.pdf.PdfDocument
import java.io.File
import java.io.FileOutputStream

/**
 * Generates a PDF file from report data for Android. Uses Android PdfDocument API.
 * Per MASTER_ARCHITECTURE_DIRECTIVE: PDF must be generated locally without server.
 */
object PdfGenerator {

    /**
     * Write a simple PDF to [outputFile]. Content can be built from report data JSON.
     * Call from a context that has access to resources if needed.
     */
    fun generateToFile(outputFile: File, title: String = "Report") {
        outputFile.parentFile?.mkdirs()
        val doc = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = doc.startPage(pageInfo)
        val canvas = page.canvas
        val paint = android.graphics.Paint().apply { textSize = 12f }
        canvas.drawText(title, 72f, 72f, paint)
        doc.finishPage(page)
        FileOutputStream(outputFile).use { doc.writeTo(it) }
        doc.close()
    }
}
