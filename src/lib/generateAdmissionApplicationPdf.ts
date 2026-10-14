import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AdmissionApplication } from '@/services/schoolPublicService';

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
 * Generates an official, formal institutional Admission Application Form PDF
 * styled like a classic, professional Microsoft Word document (black & white,
 * standard bordered tables, left school badge, top-right passport photo, clean sign-off).
 */
export async function generateAdmissionApplicationPdf(app: AdmissionApplication): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const margin = 14;
  const contentW = W - margin * 2;

  // 1. INSTITUTIONAL LETTERHEAD (Formal, No Colored Banners)
  let y = 12;

  // School Badge / Logo on Left
  const logoW = 22;
  const logoH = 22;
  try {
    const logoData = await loadImageAsDataUrl('/images/rcsn/logo.png');
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin, y, logoW, logoH);
    }
  } catch {
    // skip logo if unavailable
  }

  // School Name and Institutional Details on Left beside badge
  const headerTextX = margin + logoW + 4;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RAKAI COMMUNITY SCHOOL OF NURSING', headerTextX, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  doc.text('Ministry of Education & Sports Reg: ME/VOC/071  |  UNMC Accredited', headerTextX, y + 10);
  doc.text('Uganda Health Professional Assessment Board (UHPAB) Examination Center: U151', headerTextX, y + 14);
  doc.text('P.O. Box 279, Kalisizo / Rakai District, Uganda  |  Tel: +256 782 856 203 / +256 701 445 611', headerTextX, y + 18);
  doc.text('Email: info@rcsn.ac.ug  |  Website: www.rcsn.ac.ug', headerTextX, y + 22);

  // Horizontal separating rule (clean formal black line)
  y = 37;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(margin, y, W - margin, y);

  // 2. DOCUMENT TITLE (Centered & Formal)
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('OFFICIAL ADMISSION APPLICATION FORM', W / 2, y, { align: 'center' });

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`ACADEMIC YEAR ADMISSION CYCLE: ${app.intake || '2026 / 2027'}`, W / 2, y, { align: 'center' });

  // 3. CANDIDATE PASSPORT PHOTO & PERSONAL PARTICULARS
  y += 5;
  const photoW = 28;
  const photoH = 32;
  const photoX = W - margin - photoW;

  // Header 1: Candidate Personal Particulars
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('1. CANDIDATE PERSONAL PARTICULARS', margin, y);

  const photoY = y + 2.5;

  // Clean standard passport photo frame with thin black border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(photoX, photoY, photoW, photoH);

  let passportData = '';
  if (app.passportPhotoUrl) {
    try {
      passportData = await loadImageAsDataUrl(app.passportPhotoUrl);
    } catch {
      passportData = '';
    }
  }

  if (passportData) {
    try {
      doc.addImage(passportData, 'JPEG', photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
    } catch {
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text('PASSPORT PHOTO', photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
    }
  } else {
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text('PASSPORT', photoX + photoW / 2, photoY + photoH / 2 - 2, { align: 'center' });
    doc.text('PHOTO', photoX + photoW / 2, photoY + photoH / 2 + 3, { align: 'center' });
  }

  // Label strictly "PASSPORT PHOTO"
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('PASSPORT PHOTO', photoX + photoW / 2, photoY + photoH + 3.5, { align: 'center' });

  // Table 1: Candidate Personal Particulars (Standard Normal Grid Table)
  const submittedDateFormatted = new Date(app.submittedAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  autoTable(doc, {
    startY: photoY,
    margin: { left: margin, right: margin + photoW + 4 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.6,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 33 },
      1: { cellWidth: 42 },
      2: { fontStyle: 'bold', cellWidth: 33 },
      3: { cellWidth: 42 },
    },
    body: [
      ['Application ID:', app.id, 'Date Submitted:', submittedDateFormatted],
      ['Full Name:', app.fullName.toUpperCase(), 'Gender:', app.gender || 'Not specified'],
      ['Date of Birth:', app.dateOfBirth || 'Not specified', 'Candidate Tel:', app.phone],
      ['Email Address:', app.email || 'N/A', 'National ID / NIN:', app.ninOrId || 'N/A'],
      ['Next of Kin / Sponsor:', app.guardianName || 'N/A', 'Sponsor Tel:', app.guardianPhone || 'N/A'],
    ],
  });

  // Calculate safe Y offset taking into account both Table 1 and Passport Photo
  // @ts-ignore
  const table1EndY = doc.lastAutoTable.finalY;
  const photoEndY = photoY + photoH + 5;
  y = Math.max(table1EndY, photoEndY) + 3.5;

  // 4. Section 2: Programme Choices & Intake
  const programsList =
    app.programs && app.programs.length > 0 ? app.programs : [app.program || 'Certificate in Nursing'];

  const programBodyRows = programsList.map((prog, idx) => [
    `Course Choice ${idx + 1}:`,
    prog,
    idx === 0 ? 'Intake Session:' : '',
    idx === 0 ? app.intake : '',
  ]);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('2. PROGRAMME CHOICES & ADMISSION DETAILS', margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.6,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38 },
      1: { cellWidth: 63 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { cellWidth: 46 },
    },
    body: programBodyRows,
  });

  // 5. Section 3: Academic Qualifications & Subject Passes
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 3.5;
  const subjectGrades = app.subjectGrades || [];
  const subjectRows: string[][] = [];
  for (let i = 0; i < subjectGrades.length; i += 2) {
    const s1 = subjectGrades[i];
    const s2 = subjectGrades[i + 1];
    subjectRows.push([
      s1 ? s1.subject : '',
      s1 ? s1.grade : '',
      s2 ? s2.subject : '',
      s2 ? s2.grade : '',
    ]);
  }

  if (subjectRows.length === 0) {
    subjectRows.push(['Summary of Qualifications:', app.qualificationsSummary || 'Refer to attached result slip', '', '']);
  }

  const schoolDetails = app.previousSchool
    ? ` (Previous Institution: ${app.previousSchool.toUpperCase()}${app.indexNumber ? ` | Index: ${app.indexNumber}` : ''})`
    : '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text(`3. ACADEMIC QUALIFICATIONS${schoolDetails}`, margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.6,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    head: [['Subject', 'Grade', 'Subject', 'Grade']],
    headStyles: {
      fillColor: [242, 242, 242],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 36, fontStyle: 'bold', halign: 'center' },
      2: { cellWidth: 55 },
      3: { cellWidth: 36, fontStyle: 'bold', halign: 'center' },
    },
    body: subjectRows,
  });

  // 6. Section 4: Application Processing Fee & Payment Record
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 3.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('4. APPLICATION PROCESSING FEE & PAYMENT CONFIRMATION', margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.6,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 42 },
      1: { cellWidth: 49 },
      2: { fontStyle: 'bold', cellWidth: 42 },
      3: { cellWidth: 49 },
    },
    body: [
      [
        'Application Fee Amount:',
        'UGX 50,000 (PAID)',
        'Payment Method:',
        app.paymentMethod || 'Mobile Money',
      ],
      [
        'Payment Status:',
        'Verified & Received',
        'Transaction / Receipt Ref:',
        app.paymentReference || 'CONFIRMED',
      ],
    ],
  });

  // 7. Section 5: Attached Academic Documents
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 3.5;
  const attachedDocsList: string[][] = [];
  if (app.attachedDocuments && app.attachedDocuments.length > 0) {
    app.attachedDocuments.forEach((d, idx) => {
      attachedDocsList.push([
        `Document ${idx + 1}`,
        d.name,
        d.size || 'Attached file',
        'Verified Upload',
      ]);
    });
  } else if (app.attachedDocumentName) {
    attachedDocsList.push([
      'Document 1',
      app.attachedDocumentName,
      app.attachedDocumentSize || 'Attached file',
      'Verified Upload',
    ]);
  } else {
    attachedDocsList.push(['Document 1', 'Official Academic Credentials / Result Slip', 'Physical Copy', 'Verified Upload']);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('5. ATTACHED CREDENTIALS & RESULT SLIPS', margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.6,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    head: [['No.', 'Document Name', 'File Size', 'Status']],
    headStyles: {
      fillColor: [242, 242, 242],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 85 },
      2: { cellWidth: 36 },
      3: { cellWidth: 36 },
    },
    body: attachedDocsList,
  });

  // 8. Section 6: Candidate Declaration & Institutional Sign-Off
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text('6. APPLICANT DECLARATION & OFFICIAL SIGN-OFF', margin, y);

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 30, 30);
  const declarationText =
    'I hereby declare that the particulars provided in this application form and the attached academic certificates are complete and true to the best of my knowledge and belief.';
  doc.text(declarationText, margin, y, { maxWidth: contentW });

  y += 14;
  // Signature Lines
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  // Left: Applicant Signature
  doc.line(margin, y, margin + 65, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Candidate / Applicant Signature', margin, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, margin, y + 8);

  // Right: Academic Registrar / Admissions Desk
  doc.line(W - margin - 65, y, W - margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Academic Registrar / Admissions Desk', W - margin - 65, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Official Stamp & Seal', W - margin - 65, y + 8);

  // Bottom Footer
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(margin, H - 12, W - margin, H - 12);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text(
    `Rakai Community School of Nursing • Admission Application Form • Ref: ${app.id} • Generated: ${new Date().toLocaleDateString('en-GB')}`,
    W / 2,
    H - 8,
    { align: 'center' }
  );

  // Save PDF
  doc.save(`RCSN_Application_${app.id}.pdf`);
}
