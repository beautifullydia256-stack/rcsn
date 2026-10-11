import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AdmissionApplicationRecord } from '@/services/admissionsService';
import { RCSN_OFFICIAL_BANK_ACCOUNT } from '@/lib/rcsnBankDetails';

async function loadImageAsDataUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString('en-US')}`;
}

export interface InvoiceItem {
  code: string;
  description: string;
  category: 'Tuition' | 'Accommodation' | 'Clinical' | 'Requirements' | 'Statutory';
  amount: number;
}

export function getAdmissionFeeItems(program: string, isResident: boolean): InvoiceItem[] {
  const isDiploma = program.toLowerCase().includes('diploma');
  const baseTuition = isDiploma ? 1200000 : 1000000;

  const items: InvoiceItem[] = [
    { code: 'TUI-01', description: 'Base Academic Tuition & Lecturer Instruction', category: 'Tuition', amount: baseTuition },
    { code: 'CLN-02', description: 'Hospital Clinical Placement & Skills Lab Instruction', category: 'Clinical', amount: 250000 },
    { code: 'REQ-03', description: 'Official RCSN Clinical Uniforms (2 Sets) & Epaulettes', category: 'Requirements', amount: 200000 },
    { code: 'REQ-04', description: 'Institutional T-Shirts (2 Pieces)', category: 'Requirements', amount: 60000 },
    { code: 'GLD-05', description: 'UNASNM & RCSN Guild Council Representation Fee', category: 'Statutory', amount: 200000 },
    { code: 'EXM-06', description: 'UHPAB / HTIN National Assessment Fee', category: 'Statutory', amount: 250000 },
    { code: 'MAN-07', description: 'Clinical Training Log Book & Practical Manual', category: 'Requirements', amount: 25000 },
    { code: 'MED-08', description: 'Medical Insurance & Clinical Ward Health Screening', category: 'Clinical', amount: 15000 },
    { code: 'ADM-09', description: 'Student Identity Card & Biometric Registration', category: 'Requirements', amount: 85000 },
  ];

  if (isResident) {
    items.splice(1, 0, {
      code: 'HST-10',
      description: 'Hostel Accommodation, Bedding Space & Utilities',
      category: 'Accommodation',
      amount: 600000,
    });
  }

  return items;
}

/**
 * Generates the official Pro-Forma Admission & Semester 1 Tuition Invoice PDF.
 */
export async function generateAdmissionInvoicePdf(app: AdmissionApplicationRecord): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 14;
  const contentW = W - margin * 2;

  const isResident = (app.residential_preference || 'Resident') === 'Resident';
  const program = app.admitted_program || app.programs[0] || 'Certificate in Nursing';
  const items = getAdmissionFeeItems(program, isResident);
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const invoiceNumber = `INV-ADM-${new Date().getFullYear()}-${app.application_number.slice(-4)}`;

  // Header Banner: RCSN Dark Navy & Forest Green Accent
  doc.setFillColor(15, 43, 72); // #0f2b48
  doc.rect(0, 0, W, 34, 'F');

  doc.setFillColor(0, 135, 62); // #00873e
  doc.rect(0, 34, W, 2.5, 'F');

  // School Logo
  try {
    const logoData = await loadImageAsDataUrl('/images/rcsn/logo.png');
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin, 4, 25, 25);
    }
  } catch {
    // continue if logo fails
  }

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RAKAI COMMUNITY SCHOOL OF NURSING', margin + 28, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('P.O. Box 12, Rakai — Uganda | Rakai Town Main Campus | admissions@rcsn.ac.ug', margin + 28, 18);
  doc.text('Tel: +256 701 884 192 / +256 772 846 174 | Official Web: www.rcsn.ac.ug', margin + 28, 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(147, 197, 253);
  doc.text('DIRECTORATE OF FINANCE & STUDENT ACCOUNTS', margin + 28, 29);

  let y = 43;

  // Title Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentW, 11, 1.5, 1.5, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OFFICIAL PRO-FORMA ADMISSION INVOICE (SEMESTER 1)', margin + 4, y + 7.5);

  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text(`INVOICE NO: ${invoiceNumber}`, W - margin - 4, y + 7.5, { align: 'right' });

  y += 16;

  // Candidate Details Grid
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);

  const leftX = margin + 2;
  const midX = margin + 98;

  doc.text('BILLED TO (CANDIDATE):', leftX, y);
  doc.text('INVOICE METADATA:', midX, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text(app.full_name.toUpperCase(), leftX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-GB')}`, midX, y);
  y += 4.5;

  doc.text(`Application Ref: ${app.application_number}`, leftX, y);
  doc.text(`Academic Intake: ${app.intake || 'August/September 2026'}`, midX, y);
  y += 4.5;

  doc.text(`Contact Phone: ${app.phone}`, leftX, y);
  doc.text(`Status: ${isResident ? 'Resident (Boarding Scholar)' : 'Non-Resident (Day Scholar)'}`, midX, y);
  y += 4.5;

  doc.text(`Course: ${program}`, leftX, y);
  doc.text(`Payment Status: Unpaid (Pro-Forma)`, midX, y);

  y += 8;

  // Invoice Items Table
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.8, textColor: [15, 23, 42] },
    headStyles: {
      fillColor: [15, 43, 72],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold', textColor: [71, 85, 105] },
      1: { cellWidth: 105 },
      2: { cellWidth: 28, textColor: [71, 85, 105] },
      3: { cellWidth: 31, halign: 'right', fontStyle: 'bold' },
    },
    head: [['Item Code', 'Description of Fee / Requirement Item', 'Category', 'Amount (UGX)']],
    body: items.map((item) => [
      item.code,
      item.description,
      item.category,
      formatUGX(item.amount).replace('UGX ', ''),
    ]),
    foot: [
      [
        '',
        'TOTAL PAYABLE FOR SEMESTER 1',
        '',
        formatUGX(totalAmount),
      ],
    ],
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 43, 72],
      fontStyle: 'bold',
      fontSize: 9.5,
      halign: 'right',
    },
  });

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  y = doc.lastAutoTable.finalY + 6;

  // Payment Breakdown Summary Notice
  doc.setFillColor(254, 243, 199); // Amber tint
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(margin, y, contentW, 14, 1.5, 1.5, 'FD');

  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('INSTALMENT PAYMENT POLICY & MINIMUM INITIAL COMMITMENT', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    `Admitted candidates are permitted to report upon settlement of at least 60% of total term fees (${formatUGX(Math.round(totalAmount * 0.6))}). The balance must be cleared by Mid-Semester.`,
    margin + 4,
    y + 9.5,
    { maxWidth: contentW - 8 }
  );

  y += 18;

  // Banking Channels
  doc.setFillColor(236, 253, 245); // Emerald tint
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(margin, y, contentW, 22, 1.5, 1.5, 'FD');

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('OFFICIAL RCSN REVENUE COLLECTION BANK ACCOUNTS', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(`Bank 1: Centenary Bank | Account Name: ${RCSN_OFFICIAL_BANK_ACCOUNT.accountName}`, margin + 4, y + 10);
  doc.text(`Account No: ${RCSN_OFFICIAL_BANK_ACCOUNT.accountNumber} | Branch: ${RCSN_OFFICIAL_BANK_ACCOUNT.branch}`, margin + 4, y + 14);
  doc.text(`Stanbic Bank: Rakai Branch | Account No: 9030018849201 | SchoolPay Payment Code: RCSN-ADM-${app.application_number.slice(-4)}`, margin + 4, y + 18);

  y += 28;

  // Signatures Row
  doc.setDrawColor(203, 213, 225);
  doc.line(margin + 5, y + 6, margin + 55, y + 6);
  doc.line(W - margin - 55, y + 6, W - margin - 5, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('CHIEF BURSAR / ACCOUNTANT', margin + 10, y + 10);
  doc.text('ACADEMIC REGISTRAR', W - margin - 50, y + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Rakai Community School of Nursing', margin + 11, y + 13.5);
  doc.text('Board of Admissions & Registry', W - margin - 52, y + 13.5);

  // Trigger browser download
  doc.save(`RCSN_Admission_Invoice_${app.application_number}.pdf`);
}
