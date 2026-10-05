import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AdmissionApplicationRecord } from '@/services/admissionsService';

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

/**
 * Generates the official Provisional Admission Offer Letter & Fee Schedule Package.
 * Strictly adheres to UNMC regulations, institutional standards, zero emojis.
 */
export async function generateAdmissionLetterPdf(app: AdmissionApplicationRecord): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const margin = 14;
  const contentW = W - margin * 2;

  // Header Banner: RCSN Green (#00873E)
  doc.setFillColor(0, 135, 62);
  doc.rect(0, 0, W, 36, 'F');

  // Gold accent strip
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 36, W, 2.5, 'F');

  // School Logo
  try {
    const logoData = await loadImageAsDataUrl('/images/rcsn/logo.png');
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin, 5, 26, 26);
    }
  } catch {
    // continue if logo fails
  }

  // Header Titles
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RAKAI COMMUNITY SCHOOL OF NURSING', margin + 30, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Recognized by UNMC & Ministry of Education and Sports | Rakai Town Campus', margin + 30, 19);
  doc.text('P.O. Box 12, Rakai - Uganda | Email: admissions@rcsn.ac.ug | Tel: +256 701 884 192', margin + 30, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(254, 240, 138);
  doc.text('OFFICE OF THE ACADEMIC REGISTRAR & BOARD OF ADMISSIONS', margin + 30, 31);

  let y = 46;

  // Reference & Date Row
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Ref: ${app.admission_letter_number || `RCSN/ADM/2026/${app.application_number.slice(-4)}`}`, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin + 115, y);

  y += 6;

  // Recipient Box
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text(`To: ${app.full_name.toUpperCase()}`, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Application Number: ${app.application_number} | Phone: ${app.phone}`, margin, y);
  y += 4;
  doc.text(`Home District: ${app.district || 'Uganda'} | UNEB Index: ${app.index_number || 'N/A'}`, margin, y);

  y += 8;

  // Formal Salutation & Offer Title
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentW, 10, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  const admittedCourse = app.admitted_program || app.programs[0] || 'Diploma in Nursing';
  doc.text(`OFFICIAL OFFER OF PROVISIONAL ADMISSION: ${admittedCourse.toUpperCase()}`, margin + 4, y + 6.5);

  y += 15;

  // Formal Letter Body
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const introText =
    `Dear ${app.first_name || app.full_name},\n\n` +
    `On behalf of the Governing Board, Principal, and Academic Staff of Rakai Community School of Nursing, I am pleased to inform you that following your oral interview and academic vetting, you have been offered provisional admission to pursue the following program:`;
  doc.text(introText, margin, y, { maxWidth: contentW });

  y += 18;

  // Course Details Table
  const isResident = (app.residential_preference || 'Resident') === 'Resident';
  const tuitionAmount = isResident ? 'UGX 1,850,000' : 'UGX 1,350,000';

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [15, 23, 42] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, fillColor: [248, 250, 252] },
      1: { cellWidth: 132 },
    },
    body: [
      ['Program of Study:', admittedCourse],
      ['Academic Intake:', app.intake || 'August / September 2026 Intake'],
      ['Approved Status:', isResident ? 'Resident (Full Boarding Scholar)' : 'Non-Resident (Day Scholar)'],
      ['Reporting / Orientation Date:', 'Monday, 24th August 2026 (8:00 AM)'],
      ['First Term Tuition Estimate:', `${tuitionAmount} per Semester`],
    ],
  });

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  y = doc.lastAutoTable.finalY + 6;

  // Conditions & Requirements Section
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CONDITIONS OF ADMISSION & REPORTING REQUIREMENTS:', margin, y);

  y += 5;

  const conditions = [
    '1. Original Academic Credentials: You must bring original UCE/UACE slips and certificates for final matriculation registration.',
    '2. Medical Fitness Clearance: Present the certified medical examination form completed by an authorized Medical Officer.',
    '3. Uniform & Equipment: Mandatory clinical white uniforms, clinical epaulettes, watch with second hand, and stethoscope.',
    '4. Boarding Requirements (Residents): Mattress (3ft), 2 sets of bed sheets, mosquito net, and personal hygiene items.',
    '5. Fees Payment: At least 60% of term fees must be settled via the School Bank Account or SchoolPay before key allocation.',
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  for (const c of conditions) {
    doc.text(c, margin + 2, y, { maxWidth: contentW - 4 });
    y += 5;
  }

  y += 6;

  // Institutional Banking Details
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(margin, y, contentW, 18, 1.5, 1.5, 'FD');

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('OFFICIAL TUITION PAYMENT CHANNELS', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('Bank Name: Stanbic Bank Uganda | Account Name: Rakai Community School of Nursing', margin + 4, y + 10);
  doc.text('Account Number: 9030018849201 | Branch: Kyotera / Rakai | SchoolPay Code: Available at Accounts Desk', margin + 4, y + 15);

  y += 24;

  // Signatures Row
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y + 14, margin + 65, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('ACADEMIC REGISTRAR', margin, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text('RCSN Admissions Directorate', margin, y + 22);

  doc.line(margin + 115, y + 14, margin + 180, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.text('PRINCIPAL / DEPUTY PRINCIPAL', margin + 115, y + 18);
  doc.setFont('helvetica', 'normal');
  doc.text('Rakai Community School of Nursing', margin + 115, y + 22);

  // Footer Note
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Official Admission Document | Application ID: ${app.application_number} | Valid upon confirmation of matriculation fees`,
    margin,
    286
  );

  doc.save(`RCSN_Admission_Letter_${app.application_number}.pdf`);
}
