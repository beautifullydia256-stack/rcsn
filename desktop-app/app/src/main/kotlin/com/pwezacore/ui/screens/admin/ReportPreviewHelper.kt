package com.pwezacore.ui.screens.admin

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.awt.Graphics
import java.awt.Graphics2D
import java.awt.print.PageFormat
import java.awt.print.Printable
import java.awt.print.PrinterJob
import java.io.File
import javax.swing.JFileChooser
import javax.swing.filechooser.FileNameExtensionFilter

/**
 * Builds plain text and HTML from generated report_data (JsonObject) for preview, print, and save.
 */
object ReportPreviewHelper {

    fun reportDataToPlainText(reportData: JsonObject?): String {
        if (reportData == null) return "No report data."
        val sb = StringBuilder()
        val school = reportData["school"]?.jsonObject
        val examSet = reportData["examSet"]?.jsonObject
        val students = reportData["students"]?.jsonArray
        sb.appendLine(school?.get("name")?.jsonPrimitive?.content ?: "School")
        sb.appendLine(school?.get("address")?.jsonPrimitive?.content?.take(80) ?: "")
        sb.appendLine()
        sb.appendLine("${examSet?.get("name")?.jsonPrimitive?.content ?: ""} - Term ${examSet?.get("term")?.jsonPrimitive?.content ?: ""} ${examSet?.get("year")?.jsonPrimitive?.content ?: ""}")
        sb.appendLine("────────────────────────────────────────")
        for (s in students?.mapNotNull { it.jsonObject } ?: emptyList()) {
            sb.appendLine("Student: ${s["name"]?.jsonPrimitive?.content ?: "—"}")
            sb.appendLine("Class: ${s["current_class"]?.jsonPrimitive?.content ?: "—"}")
            sb.appendLine("Admission: ${s["admission_number"]?.jsonPrimitive?.content ?: "—"}")
            val results = s["results"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
            if (results.isNotEmpty()) {
                sb.appendLine()
                sb.appendLine("Subject\tMarks\tTotal\tGrade")
                for (r in results) {
                    sb.appendLine("${r["subject"]?.jsonPrimitive?.content ?: ""}\t${r["marks_obtained"]?.jsonPrimitive?.content ?: ""}\t${r["total_marks"]?.jsonPrimitive?.content ?: ""}\t${r["grade"]?.jsonPrimitive?.content ?: ""}")
                }
            }
            val summary = s["summary"]?.jsonObject
            if (summary != null) {
                sb.appendLine()
                sb.appendLine("Total marks: ${summary["totalMarks"]?.jsonPrimitive?.content ?: "—"}")
                sb.appendLine("Average: ${summary["average"]?.jsonPrimitive?.content ?: "—"}%")
                sb.appendLine("Position: ${summary["classPosition"]?.jsonPrimitive?.content ?: "—"}")
                sb.appendLine("Division: ${summary["division"]?.jsonPrimitive?.content ?: "—"}")
            }
            val comments = s["comments"]?.jsonObject
            if (comments != null) {
                sb.appendLine("Class teacher: ${comments["class_teacher_text"]?.jsonPrimitive?.content?.take(100) ?: "—"}")
                sb.appendLine("Head teacher: ${comments["headteacher_text"]?.jsonPrimitive?.content?.take(100) ?: "—"}")
            }
        }
        return sb.toString()
    }

    fun reportDataToHtml(reportData: JsonObject?): String {
        if (reportData == null) return "<p>No report data.</p>"
        val school = reportData["school"]?.jsonObject
        val examSet = reportData["examSet"]?.jsonObject
        val students = reportData["students"]?.jsonArray
        val schoolName = school?.get("name")?.jsonPrimitive?.content?.escapeHtml() ?: "School"
        val examName = examSet?.get("name")?.jsonPrimitive?.content?.escapeHtml() ?: ""
        val term = examSet?.get("term")?.jsonPrimitive?.content ?: ""
        val year = examSet?.get("year")?.jsonPrimitive?.content ?: ""
        val sb = StringBuilder()
        sb.append("""<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report</title>
<style>body{font-family:Segoe UI,sans-serif;margin:24px;background:#fff;color:#111;}
h1{font-size:18px;} h2{font-size:14px;margin-top:16px;} table{border-collapse:collapse;margin:8px 0;}
th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;}
th{background:#f0f0f0;} .summary{margin-top:12px;}</style></head><body>""")
        sb.append("<h1>$schoolName</h1>")
        sb.append("<p>${examName} — Term $term $year</p>")
        sb.append("<hr>")
        for (s in students?.mapNotNull { it.jsonObject } ?: emptyList()) {
            sb.append("<h2>${(s["name"]?.jsonPrimitive?.content ?: "—").escapeHtml()}</h2>")
            sb.append("<p>Class: ${(s["current_class"]?.jsonPrimitive?.content ?: "—").escapeHtml()} &nbsp; Admission: ${(s["admission_number"]?.jsonPrimitive?.content ?: "—").escapeHtml()}</p>")
            val results = s["results"]?.jsonArray?.mapNotNull { it.jsonObject } ?: emptyList()
            if (results.isNotEmpty()) {
                sb.append("<table><tr><th>Subject</th><th>Marks</th><th>Total</th><th>Grade</th></tr>")
                for (r in results) {
                    sb.append("<tr><td>${(r["subject"]?.jsonPrimitive?.content ?: "").escapeHtml()}</td><td>${(r["marks_obtained"]?.jsonPrimitive?.content ?: "").escapeHtml()}</td><td>${(r["total_marks"]?.jsonPrimitive?.content ?: "").escapeHtml()}</td><td>${(r["grade"]?.jsonPrimitive?.content ?: "").escapeHtml()}</td></tr>")
                }
                sb.append("</table>")
            }
            val summary = s["summary"]?.jsonObject
            if (summary != null) {
                sb.append("""<div class="summary"><strong>Total:</strong> ${(summary["totalMarks"]?.jsonPrimitive?.content ?: "—").escapeHtml()} &nbsp; 
<strong>Average:</strong> ${(summary["average"]?.jsonPrimitive?.content ?: "—").escapeHtml()}% &nbsp; 
<strong>Position:</strong> ${(summary["classPosition"]?.jsonPrimitive?.content ?: "—").escapeHtml()} &nbsp; 
<strong>Division:</strong> ${(summary["division"]?.jsonPrimitive?.content ?: "—").escapeHtml()}</div>""")
            }
            val comments = s["comments"]?.jsonObject
            if (comments != null) {
                sb.append("<p><strong>Class teacher:</strong> ${(comments["class_teacher_text"]?.jsonPrimitive?.content ?: "—").escapeHtml()}</p>")
                sb.append("<p><strong>Head teacher:</strong> ${(comments["headteacher_text"]?.jsonPrimitive?.content ?: "—").escapeHtml()}</p>")
            }
        }
        sb.append("</body></html>")
        return sb.toString()
    }

    private fun String.escapeHtml(): String = this
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;")

    fun printReport(plainText: String): Boolean {
        return try {
            val job = PrinterJob.getPrinterJob()
            job.setPrintable(ReportPrintable(plainText))
            if (job.printDialog()) {
                job.print()
                true
            } else false
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Save report as HTML; returns the file path or null if user cancelled.
     * Caller can open with Desktop.getDesktop().browse(file.toURI()).
     */
    fun saveReportAsHtml(html: String, defaultName: String = "report.html"): File? {
        return try {
            val chooser = JFileChooser().apply {
                dialogTitle = "Save report as HTML"
                selectedFile = File(defaultName)
                fileFilter = FileNameExtensionFilter("HTML files", "html", "htm")
            }
            if (chooser.showSaveDialog(null) == JFileChooser.APPROVE_OPTION) {
                var path = chooser.selectedFile.absolutePath
                if (!path.endsWith(".html", ignoreCase = true)) path += ".html"
                val file = File(path)
                file.writeText(html)
                file
            } else null
        } catch (e: Exception) { null }
    }

    private class ReportPrintable(private val text: String) : Printable {
        override fun print(g: Graphics?, pf: PageFormat?, pageIndex: Int): Int {
            if (pageIndex > 0) return Printable.NO_SUCH_PAGE
            val g2 = g as? Graphics2D ?: return Printable.NO_SUCH_PAGE
            g2.translate(pf?.imageableX ?: 0.0, pf?.imageableY ?: 0.0)
            val lineHeight = g2.fontMetrics.height
            val maxY = (pf?.imageableHeight ?: 0.0).toInt()
            var y = lineHeight
            text.lines().forEach { line ->
                if (y + lineHeight > maxY) return@forEach
                g2.drawString(line, 0f, y.toFloat())
                y += lineHeight
            }
            return Printable.PAGE_EXISTS
        }
    }
}
