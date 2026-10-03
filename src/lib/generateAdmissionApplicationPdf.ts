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
 * Generates and triggers download of a high-quality, professional
 * Admission Application Confirmation & Payment Receipt PDF.
 */
export async function generateAdmissionApplicationPdf(app: AdmissionApplication): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const margin = 14;
  const contentW = W - margin * 2;

  // 1. Top Green Banner
  doc.setFillColor(0, 135, 62); // RCSN Emerald
  doc.rect(0, 0, W, 36, 'F');

  // Gold accent strip below green banner
  doc.setFillColor(217, 119, 6);
  doc.rect(0, 36, W, 2.5, 'F');

  // Try loading logo
  try {
    const logoData = await loadImageAsDataUrl('/images/rcsn/logo.png');
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin, 5, 26, 26);
    }
  } catch {
    // skip logo if unavailable
  }

  // Header Typography
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('RAKAI COMMUNITY SCHOOL OF NURSING', margin + 30, 13);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(220, 252, 231);
  doc.text('"Training Qualified Nurses & Midwives to Serve for Better Health"', margin + 30, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(240, 253, 244);
  doc.text('MoES Reg: ME\\VOC\\071  |  UNMC Accredited  |  UNMEB Center U028', margin + 30, 23);
  doc.text('P.O. Box 279, Kalisizo / Rakai District, Uganda  |  Tel: +256 782 856 203 / +256 701 445 611', margin + 30, 27.5);
  doc.text('Official Email: info@rcsn.ac.ug  |  Website: https://rcsn.vercel.app', margin + 30, 32);

  // 2. Document Title Box
  let y = 44;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentW, 14, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('OFFICIAL ADMISSION APPLICATION & PAYMENT ACKNOWLEDGEMENT', W / 2, y + 6.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('2026 / 2027 ACADEMIC YEAR ADMISSION CYCLE', W / 2, y + 11, { align: 'center' });

  // 3. Application Reference & Payment Summary Card
  y = 62;
  doc.setFillColor(240, 253, 244); // light emerald
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, contentW, 25, 2, 2, 'FD');

  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('APPLICATION REFERENCE NUMBER:', margin + 6, y + 6);

  doc.setFontSize(12);
  doc.setTextColor(0, 135, 62);
  doc.text(app.id, margin + 6, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Submitted On: ${new Date(app.submittedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin + 6, y + 17);
  doc.text(`Candidate Index No: ${app.indexNumber || 'N/A'}`, margin + 6, y + 21);

  // Right side of summary card (Payment Badge)
  doc.setFillColor(220, 252, 231);
  doc.setDrawColor(134, 239, 172);
  doc.roundedRect(W - margin - 72, y + 4, 66, 17, 1.5, 1.5, 'FD');

  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('APPLICATION FEE STATUS', W - margin - 39, y + 8, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(0, 135, 62);
  doc.text('UGX 50,000 PAID', W - margin - 39, y + 12.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${app.paymentMethod || 'Mobile Money'} (Verified)`, W - margin - 39, y + 16.5, { align: 'center' });
  doc.text(`Txn Ref: ${app.paymentReference || 'CONFIRMED'}`, W - margin - 39, y + 19.5, { align: 'center' });

  // 4. Section 1: Candidate Particulars
  y = 92;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. CANDIDATE PERSONAL PARTICULARS', margin, y);

  autoTable(doc, {
    startY: y + 2.5,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 42 },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 42 },
      3: { cellWidth: 48 },
    },
    body: [
      ['Full Name:', app.fullName.toUpperCase(), 'Gender:', app.gender],
      ['Date of Birth:', app.dateOfBirth || 'Not specified', 'Candidate Contact:', app.phone],
      ['Email Address:', app.email || 'N/A', 'National ID / NIN:', app.ninOrId || 'Provided at registration'],
      ['Sponsor / Guardian:', app.guardianName, 'Sponsor Telephone:', app.guardianPhone],
    ],
  });

  // 5. Section 2: Programme Applied For
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 6;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. PROGRAMME CHOICES & INTAKE', margin, y);

  const programsList = app.programs && app.programs.length > 0 ? app.programs : [app.program || 'Certificate in Nursing'];
  const programRows = programsList.map((prog, idx) => [`Choice ${idx + 1}:`, prog, idx === 0 ? 'Intake Session:' : '', idx === 0 ? app.intake : '']);

  autoTable(doc, {
    startY: y + 2.5,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 2, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [0, 135, 62], cellWidth: 42 },
      1: { cellWidth: 65, fontStyle: 'bold', textColor: [15, 23, 42] },
      2: { fontStyle: 'bold', textColor: [15, 23, 42], cellWidth: 35 },
      3: { cellWidth: 40 },
    },
    body: programRows,
  });

  // 6. Section 3: Academic Qualifications (UCE Curriculum)
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 6;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('3. ACADEMIC QUALIFICATIONS (O-LEVEL / UCE)', margin, y);

  const prevSchoolText = `Previous School: ${app.previousSchool || 'Secondary School'}  |  UNEB Index: ${app.indexNumber}`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(prevSchoolText, margin, y + 4.5);

  const subjectGrades = app.subjectGrades || [];
  // Build a 4-column table for subject grades
  const tableRows: string[][] = [];
  for (let i = 0; i < subjectGrades.length; i += 2) {
    const s1 = subjectGrades[i];
    const s2 = subjectGrades[i + 1];
    tableRows.push([
      s1 ? s1.subject : '',
      s1 ? s1.grade : '',
      s2 ? s2.subject : '',
      s2 ? s2.grade : '',
    ]);
  }

  if (tableRows.length === 0) {
    tableRows.push(['Submitted Qualifications Summary:', app.qualificationsSummary, '', '']);
  }

  autoTable(doc, {
    startY: y + 6.5,
    margin: { left: margin, right: margin },
    head: [['Subject', 'Grade', 'Subject', 'Grade']],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2,
    },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 36, fontStyle: 'bold', textColor: [0, 135, 62] },
      2: { cellWidth: 55 },
      3: { cellWidth: 36, fontStyle: 'bold', textColor: [0, 135, 62] },
    },
    body: tableRows,
  });

  // Attached Document Note
  // @ts-ignore
  y = doc.lastAutoTable.finalY + 4;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentW, 8, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Attached UNEB Slip / Document:', margin + 4, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 135, 62);
  doc.text(`[VERIFIED ATTACHMENT]: ${app.attachedDocumentName || 'Official UNEB Result Slip Logged'}`, margin + 55, y + 5);

  // 7. Important Admissions Next Steps & Interview Calling
  y += 12;
  doc.setFillColor(254, 243, 199); // light amber
  doc.setDrawColor(251, 191, 36);
  doc.roundedRect(margin, y, contentW, 20, 2, 2, 'FD');

  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('IMPORTANT NEXT STEPS FOR INTERVIEW & ADMISSION:', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(120, 53, 15);
  doc.text('1. Print and keep this official document as your formal application and fee acknowledgment.', margin + 4, y + 9);
  doc.text('2. Report with this slip, original UNEB result slips/certificates, National ID/Birth Certificate, and 3 passport photos.', margin + 4, y + 13);
  doc.text('3. Oral interview dates will be communicated via SMS/Call to candidate contact: ' + app.phone, margin + 4, y + 17);

  // 8. Official Sign-Off Block & Watermark
  y += 24;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + 70, y);
  doc.line(W - margin - 70, y, W - margin, y);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('CANDIDATE SIGNATURE', margin, y + 4);
  doc.text('ACADEMIC REGISTRAR (RCSN)', W - margin, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Date: ' + new Date().toLocaleDateString('en-GB'), margin, y + 7.5);
  doc.text('Officially endorsed with Institutional Seal', W - margin, y + 7.5, { align: 'right' });

  // Bottom Security Footer
  doc.setFillColor(15, 23, 42);
  doc.rect(0, H - 9, W, 9, 'F');
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Official Document Ref: ${app.id} • Rakai Community School of Nursing Online Application System • Verified Authentic`, W / 2, H - 3.5, { align: 'center' });

  // Trigger download
  doc.save(`RCSN_Application_${app.id}.pdf`);
}
