import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "right" | "center";
  format?: (value: unknown, row?: Record<string, unknown>) => string;
}

export interface ExportOptions {
  title: string;
  subtitle?: string;
  schoolName?: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  filename: string;
  totalsRow?: (string | number)[];
}

// Sanitize text for jsPDF (WinAnsi only — strips Unicode that renders as garbage)
function safe(raw: unknown): string {
  if (raw == null) return "—";
  return String(raw)
    .replace(/[‒–—―]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[  ]/g, " ");
}

// ─── PDF ────────────────────────────────────────────────────────────────────

export function exportToPdf(opts: ExportOptions): void {
  const { title, subtitle, schoolName, columns, rows, filename, totalsRow } = opts;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  let y = 14;

  // School name
  if (schoolName?.trim()) {
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(safe(schoolName), pageW / 2, y, { align: "center" });
    y += 7;
  }

  // Report title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(safe(title), pageW / 2, y, { align: "center" });
  y += 5;

  // Subtitle / period
  if (subtitle?.trim()) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(safe(subtitle), pageW / 2, y, { align: "center" });
    y += 5;
  }

  // Generated date
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleString("en-UG")}`, pageW / 2, y, { align: "center" });
  doc.setTextColor(0);
  y += 4;

  // Divider line
  doc.setDrawColor(209, 213, 219);
  doc.line(14, y, pageW - 14, y);
  y += 4;

  // Build body
  const body: (string | number)[][] = rows.map((row) =>
    columns.map((col) => {
      const val = row[col.key];
      return col.format ? safe(col.format(val, row)) : safe(val);
    })
  );

  if (totalsRow) body.push(totalsRow.map((v) => safe(v)));

  autoTable(doc, {
    startY: y,
    head: [columns.map((c) => c.header)],
    body,
    styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 }, overflow: "ellipsize" },
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: columns.reduce(
      (acc, col, i) => {
        acc[i] = { halign: col.align ?? "left" };
        if (col.width) acc[i].cellWidth = col.width;
        return acc;
      },
      {} as Record<number, { halign: "left" | "right" | "center"; cellWidth?: number }>
    ),
    // Style totals row
    didParseCell: (data) => {
      if (totalsRow && data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [209, 250, 229];
        data.cell.styles.textColor = [6, 78, 59];
      }
    },
    didDrawPage: (data) => {
      const pageCount = (doc as jsPDF & { internal: { pages: unknown[] } }).internal.pages.length - 1;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageW - 14, pageH - 6, { align: "right" });
      doc.text("PwezaCore School Management", 14, pageH - 6);
      doc.setTextColor(0);
    },
  });

  doc.save(`${filename}.pdf`);
}

// ─── EXCEL ──────────────────────────────────────────────────────────────────

export function exportToExcel(opts: ExportOptions): void {
  const { title, subtitle, schoolName, columns, rows, filename, totalsRow } = opts;

  const data: (string | number)[][] = [];

  if (schoolName?.trim()) {
    data.push([schoolName]);
    data.push([]);
  }
  data.push([title]);
  if (subtitle?.trim()) data.push([subtitle]);
  data.push([`Generated: ${new Date().toLocaleString("en-UG")}`]);
  data.push([]);

  // Column headers
  data.push(columns.map((c) => c.header));

  // Data rows
  rows.forEach((row) => {
    data.push(
      columns.map((col) => {
        const val = row[col.key];
        if (col.format) return col.format(val, row);
        if (typeof val === "number") return val;
        return String(val ?? "");
      })
    );
  });

  // Totals row
  if (totalsRow) data.push(totalsRow);

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Column widths
  ws["!cols"] = columns.map((col) => ({ wch: col.width ?? 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
