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
 * Generates an official, printable Interview Invitation Slip and Document Verification Card.
 * Strict no-emoji standard, institutional typography, and UNMC compliance checklist.
 */
export async function generateInterviewSlipPdf(app: AdmissionApplicationRecord): Promise<void> {
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
  doc.text('Affiliated to UNMC & Ministry of Education and Sports | Rakai Town Campus', margin + 30, 19);
  doc.text('P.O. Box 12, Rakai - Uganda | Tel: +256 701 884 192 / +256 772 391 002', margin + 30, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(254, 240, 138); // Yellow accent
  doc.text('OFFICE OF THE ACADEMIC REGISTRAR — ORAL INTERVIEW SLIP', margin + 30, 31);

  // Document Title Badge
  let y = 46;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentW, 20, 2, 2, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('CANDIDATE INTERVIEW INVITATION & VERIFICATION SLIP', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Present this physical slip together with all required original documents at the reception desk upon arrival.',
    margin + 6,
    y + 14
  );

  y += 26;

  // Candidate Particulars Table
  const interviewDate = app.interview_date || 'To be announced (Contact Registrar)';
  const interviewTime = app.interview_time || '09:00 AM';
  const interviewVenue = app.interview_venue || 'RCSN Main Campus, Rakai Town';
  const targetProgram = app.admitted_program || app.programs[0] || 'Diploma / Certificate in Nursing';

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, textColor: [71, 85, 105] },
      1: { cellWidth: 55 },
      2: { fontStyle: 'bold', cellWidth: 40, textColor: [71, 85, 105] },
      3: { cellWidth: 42 },
    },
    body: [
      ['Application Number:', app.application_number, 'Assigned Program:', targetProgram],
      ['Candidate Name:', app.full_name.toUpperCase(), 'Gender / DOB:', `${app.gender} | ${app.date_of_birth}`],
      ['Contact Phone:', app.phone, 'NIN / ID:', app.nin_or_id || 'Pending presentation'],
      ['Previous School:', app.previous_school || 'N/A', 'UNEB Index No:', app.index_number || 'N/A'],
      ['Guardian Contact:', `${app.guardian_name || 'N/A'} (${app.guardian_phone || ''})`, 'Intake Period:', app.intake],
    ],
  });

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  y = doc.lastAutoTable.finalY + 6;

  // Designated Interview Schedule Box
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.setDrawColor(16, 185, 129); // Emerald-500
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentW, 26, 2, 2, 'FD');

  doc.setTextColor(6, 95, 70);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CONFIRMED INTERVIEW APPOINTMENT', margin + 6, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Scheduled Date: ${interviewDate}`, margin + 6, y + 14);
  doc.text(`Reporting Time: ${interviewTime} (Punctuality is mandatory)`, margin + 6, y + 20);

  doc.text(`Campus Venue: ${interviewVenue}`, margin + 95, y + 14);
  doc.text(`Panel Assessment: Oral Communication, Aptitude & Medical Ethics`, margin + 95, y + 20);

  y += 32;

  // Mandatory Original Document Checklist (UNMC Mandate)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('MANDATORY DOCUMENTS TO CARRY ON INTERVIEW DAY', margin, y);

  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['No.', 'Document Description', 'Verification Status (For Official Use)']],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3,
    },
    styles: { fontSize: 8, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 125 },
      2: { cellWidth: 47, halign: 'center' },
    },
    body: [
      ['1', 'Original UCE Result Slip & Certificate (plus 3 photocopies)', '[   ] Verified Original'],
      ['2', 'Original UACE Slip (for Direct Diploma applicants) / UNMC License (for Extension)', '[   ] Verified Original'],
      ['3', 'Original National Identity Card (NIN) or Certified Birth Certificate', '[   ] Verified Original'],
      ['4', 'Four (4) recent color passport-size photographs (White background)', '[   ] Submitted'],
      ['5', 'Completed Medical Examination Certificate from a recognized Hospital', '[   ] Medically Cleared'],
      ['6', 'Recommendation Letter from Local Council (LC1) or Religious Leader', '[   ] Verified'],
      ['7', 'Application Fee Payment Slip / MoMo Transaction Receipt (UGX 50,000)', '[   ] Paid & Verified'],
    ],
  });

  // @ts-expect-error autoTable adds lastAutoTable to jsPDF instance
  y = doc.lastAutoTable.finalY + 12;

  // Official Signature & Endorsement Blocks
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);

  // Registrar Box
  doc.line(margin, y + 16, margin + 70, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('ACADEMIC REGISTRAR', margin, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature & Official Stamp', margin, y + 24);

  // Interview Panel Leader Box
  doc.line(margin + 110, y + 16, margin + 180, y + 16);
  doc.setFont('helvetica', 'bold');
  doc.text('INTERVIEW PANEL CHAIRPERSON', margin + 110, y + 20);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature & Final Recommendation Score', margin + 110, y + 24);

  // Footer Note
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Slip Generated: ${new Date().toLocaleString()} | Verification Code: ${app.application_number} | RCSN Admissions Directorate`,
    margin,
    285
  );

  doc.save(`RCSN_Interview_Slip_${app.application_number}.pdf`);
}
