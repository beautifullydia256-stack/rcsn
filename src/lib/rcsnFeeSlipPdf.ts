import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RCSN_OFFICIAL_BANK_ACCOUNT } from './rcsnBankDetails';

export interface FeeSlipItem {
  name: string;
  amount: number;
}

export interface FeeSlipData {
  studentName: string;
  admissionNumber?: string | null;
  className: string;
  intake?: string | null;
  semesterLabel?: string | null;
  boardingType?: string | null;
  tuitionAmount: number;
  functionalItems: FeeSlipItem[];
  amountPaid?: number;
  balanceDue?: number;
}

function fmt(n: number): string {
  return `${Math.round(n || 0).toLocaleString()}/=`;
}

/**
 * Generates an official RCSN Fee Structure & Payment Slip PDF matching the
 * institutional circular layout.
 */
export function generateRcsnFeeSlipPdf(data: FeeSlipData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  let y = 14;

  // 1. Institution Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(24, 75, 45); // RCSN green brand
  doc.text('RAKAI COMMUNITY SCHOOL OF NURSING', pageWidth / 2, y, { align: 'center' });

  y += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('P. O. BOX 321, Kyotera (Uganda) | Tel: 0392 878 552 / 0783 399 322', pageWidth / 2, y, { align: 'center' });

  y += 4.5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text('“We serve for better health”', pageWidth / 2, y, { align: 'center' });

  // Divider
  y += 3.5;
  doc.setDrawColor(24, 75, 45);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.2);
  doc.line(margin, y + 0.8, pageWidth - margin, y + 0.8);

  // 2. Document Title Banner
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  const progTitle = data.className
    ? `FEES STRUCTURE & PAYMENT ADVICE — ${data.className.toUpperCase()}`
    : 'FEES STRUCTURE & PAYMENT ADVICE';
  doc.text(progTitle, pageWidth / 2, y, { align: 'center' });

  // 3. Student Details Card
  y += 5;
  doc.setFillColor(248, 250, 248);
  doc.setDrawColor(220, 226, 220);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);

  // Left col
  doc.setFont('helvetica', 'bold');
  doc.text('Student Name:', margin + 4, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.studentName || '—', margin + 30, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Admission / Reg No:', margin + 4, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(data.admissionNumber || '—', margin + 38, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Programme / Class:', margin + 4, y + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.className || '—', margin + 35, y + 16.5);

  // Right col
  const rightColX = margin + 105;
  doc.setFont('helvetica', 'bold');
  doc.text('Intake / Cohort:', rightColX, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.intake || 'Current Intake', rightColX + 27, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Period / Semester:', rightColX, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.text(data.semesterLabel || 'Semester 1', rightColX + 31, y + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('Residency:', rightColX, y + 16.5);
  doc.setFont('helvetica', 'normal');
  doc.text(data.boardingType || 'Day Scholar', rightColX + 20, y + 16.5);

  y += 24;

  // 4. Base Tuition Section
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.5 },
    headStyles: { fillColor: [240, 244, 240], textColor: [20, 20, 20], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.72, fontStyle: 'bold' },
      1: { cellWidth: contentWidth * 0.28, halign: 'right', fontStyle: 'bold' },
    },
    head: [['ACADEMIC TUITION', data.semesterLabel ? data.semesterLabel.toUpperCase() : 'SEMESTER 1']],
    body: [['TUITION (Instructional / Core Academic Fee)', fmt(data.tuitionAmount)]],
  });

  y = (doc as any).lastAutoTable.finalY + 4;

  // 5. Functional Fees Section
  const functionalRows = (data.functionalItems || []).map((it, idx) => [
    `${idx + 1}.  ${it.name}`,
    fmt(it.amount),
  ]);

  const totalFunctional = (data.functionalItems || []).reduce((acc, it) => acc + (it.amount || 0), 0);
  const grandTotal = data.tuitionAmount + totalFunctional;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [24, 75, 45], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [250, 252, 250] },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.72 },
      1: { cellWidth: contentWidth * 0.28, halign: 'right', fontStyle: 'bold' },
    },
    head: [['FUNCTIONAL LEVIES (Operational, Clinical & Welfare)', 'AMOUNT (UGX)']],
    body: [
      ...functionalRows,
      [
        { content: 'TOTAL FUNCTIONAL FEES', styles: { fontStyle: 'bold', fillColor: [235, 243, 237] } },
        { content: fmt(totalFunctional), styles: { fontStyle: 'bold', halign: 'right', fillColor: [235, 243, 237] } },
      ],
      [
        { content: 'GRAND TOTAL PAYABLE (TUITION + FUNCTIONAL)', styles: { fontStyle: 'bold', fontSize: 9.5, textColor: [24, 75, 45], fillColor: [220, 235, 225] } },
        { content: fmt(grandTotal), styles: { fontStyle: 'bold', fontSize: 9.5, halign: 'right', textColor: [24, 75, 45], fillColor: [220, 235, 225] } },
      ],
    ],
  });

  y = (doc as any).lastAutoTable.finalY + 5;

  // 6. Payment Status (if available)
  if (data.amountPaid !== undefined || data.balanceDue !== undefined) {
    const paid = data.amountPaid || 0;
    const bal = data.balanceDue !== undefined ? data.balanceDue : Math.max(0, grandTotal - paid);

    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(215, 220, 225);
    doc.roundedRect(margin, y, contentWidth, 10, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 30, 30);
    doc.text(`Total Paid to Date: UGX ${fmt(paid)}`, margin + 6, y + 6.5);

    const balColor = bal > 0 ? [185, 28, 28] : [16, 140, 90];
    doc.setTextColor(balColor[0], balColor[1], balColor[2]);
    doc.text(`Outstanding Balance: UGX ${fmt(bal)}`, margin + contentWidth - 6, y + 6.5, { align: 'right' });

    y += 14;
  }

  // 7. Official Bank Instructions Card (Centenary Bank)
  const bank = RCSN_OFFICIAL_BANK_ACCOUNT;
  const bankCardH = 34;

  doc.setFillColor(254, 253, 245); // Subtle warm parchment
  doc.setDrawColor(225, 205, 140);
  doc.roundedRect(margin, y, contentWidth, bankCardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(130, 90, 10);
  doc.text('OFFICIAL BANK PAYMENT INSTRUCTIONS', margin + 5, y + 5.5);

  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.text('Bank Name:', margin + 5, y + 10.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${bank.bankName} (${bank.branch})`, margin + 28, y + 10.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Account Name:', margin + 5, y + 15.5);
  doc.setFont('helvetica', 'normal');
  doc.text(bank.accountName, margin + 28, y + 15.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Account Number:', margin + 5, y + 20.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 30, 30);
  doc.text(bank.accountNumber, margin + 30, y + 20.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 80, 50);
  doc.text(`• ${bank.policyNotes[0]}`, margin + 5, y + 26);
  doc.text(`• ${bank.policyNotes[1]} ${bank.policyNotes[2]}`, margin + 5, y + 30);

  // 8. Footer
  const bottomY = 286;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text('RCSN Official Finance Document · Generated from School Management Portal', margin, bottomY);
  doc.text(`Date Printed: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin, bottomY, { align: 'right' });

  return doc;
}
