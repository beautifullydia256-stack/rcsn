import { jsPDF } from 'jspdf';
import type { IDCardStudent, IDCardSchool } from './IDCard';

// CR80 card in mm: 85.6 × 53.98
const W = 85.6;
const H = 53.98;

const NAVY = [15, 45, 92] as [number, number, number];
const STRIPE = [26, 74, 138] as [number, number, number];
const GOLD = [232, 160, 32] as [number, number, number];
const LIGHT = [238, 243, 251] as [number, number, number];
const WHITE: [number, number, number] = [255, 255, 255];
const BODY: [number, number, number] = [247, 250, 255];

function safe(v: unknown): string {
  if (v == null) return '—';
  return String(v).trim() || '—';
}

function fmtDob(d: string | null | undefined): string {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function currentAcademicYear(): string {
  const y = new Date().getFullYear();
  return new Date().getMonth() >= 1 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

function resolveFullName(s: IDCardStudent): string {
  const parts = [s.first_name, s.middle_name, s.last_name]
    .filter((x) => x != null && String(x).trim())
    .map((x) => String(x).trim());
  return parts.length ? parts.join(' ') : (s.name || '—').trim();
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

async function loadImg(url: string): Promise<string | null> {
  if (!url?.trim()) return null;
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function imgFormat(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
}

async function generateBarcode(value: string): Promise<string | null> {
  try {
    const { default: JsBarcode } = await import('jsbarcode');
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, value, { format: 'CODE128', width: 1.5, height: 35, displayValue: false, margin: 2, background: '#f7faff' });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

// Draw the FRONT face of the ID card in the doc at offset (ox, oy)
async function drawFront(
  doc: jsPDF,
  student: IDCardStudent,
  school: IDCardSchool,
  ox: number,
  oy: number,
  logoImg: string | null,
  photoImg: string | null,
  barcodeImg: string | null,
) {
  const cardId = student.admission_number || student.student_id;
  const fullName = resolveFullName(student);
  const schoolName = (school.name || 'School').toUpperCase();
  const address = [school.location || school.address, school.pobox && `P.O.Box ${school.pobox}`].filter(Boolean).join('  ·  ');
  const year = currentAcademicYear();

  // White card background
  doc.setFillColor(...WHITE);
  doc.roundedRect(ox, oy, W, H, 2, 2, 'F');

  // Header gradient (simulate with two rects)
  doc.setFillColor(...NAVY);
  doc.roundedRect(ox, oy, W, 15, 2, 2, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(ox, oy + 8, W, 7, 'F'); // fill bottom of rounded corners

  // Gold right stripe
  doc.setFillColor(...GOLD);
  doc.rect(ox + W - 2, oy, 2, 15, 'F');

  // School logo circle
  if (logoImg) {
    doc.addImage(logoImg, imgFormat(logoImg), ox + 2.5, oy + 2.5, 10, 10);
  } else {
    doc.setFillColor(...STRIPE);
    doc.circle(ox + 7.5, oy + 7.5, 5, 'F');
  }
  // Logo border circle
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.circle(ox + 7.5, oy + 7.5, 5.5);

  // School name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(schoolName, ox + 15, oy + 6.5);

  // Address
  if (address) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(200, 210, 230);
    doc.text(address, ox + 15, oy + 10);
  }

  // "Student Identity Card" badge
  doc.setFillColor(...GOLD);
  doc.roundedRect(ox + 15, oy + 11.2, 32, 3, 0.5, 0.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(...NAVY);
  doc.text('STUDENT IDENTITY CARD', ox + 31, oy + 13.1, { align: 'center' });

  // Body background
  doc.setFillColor(...BODY);
  doc.rect(ox, oy + 15, W, H - 15 - 11, 'F');

  // Photo box
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ox + 3, oy + 17, 19, 24, 1, 1, 'F');
  if (photoImg) {
    doc.addImage(photoImg, imgFormat(photoImg), ox + 3, oy + 17, 19, 24);
  } else {
    // Initials
    doc.setFillColor(...NAVY);
    doc.roundedRect(ox + 3, oy + 17, 19, 24, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    doc.text(initials(fullName), ox + 12.5, oy + 31, { align: 'center' });
  }
  // Gold border
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.roundedRect(ox + 3, oy + 17, 19, 24, 1, 1);

  // Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  const nameTrunc = fullName.length > 26 ? fullName.slice(0, 24) + '…' : fullName;
  doc.text(nameTrunc, ox + 25, oy + 21);

  // "Student" label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(...GOLD);
  doc.text('STUDENT', ox + 25, oy + 24.5);

  // Details grid
  const rows: [string, string][] = [
    ['CLASS', safe(student.current_class)],
    ['ADM No.', safe(cardId)],
    ['D.O.B', fmtDob(student.date_of_birth)],
    ['YEAR', year],
  ];
  let dy = 0;
  for (let i = 0; i < rows.length; i++) {
    const col = i % 2;
    if (i > 0 && col === 0) dy += 7;
    const lx = col === 0 ? ox + 25 : ox + 55;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.setTextColor(138, 155, 181);
    doc.text(rows[i][0], lx, oy + 29 + dy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...NAVY);
    doc.text(rows[i][1], lx, oy + 32.5 + dy);
  }

  // Footer strip
  doc.setFillColor(...BODY);
  doc.rect(ox, oy + H - 11, W, 11, 'F');
  doc.setDrawColor(15, 45, 92, 0.15);
  doc.setLineWidth(0.3);
  doc.line(ox, oy + H - 11, ox + W, oy + H - 11);

  // Barcode
  if (barcodeImg) {
    doc.addImage(barcodeImg, 'PNG', ox + W / 2 - 22, oy + H - 10.5, 44, 6.5);
  }
  // ID text
  doc.setFont('courier', 'bold');
  doc.setFontSize(5.5);
  doc.setTextColor(...NAVY);
  doc.text(safe(cardId), ox + W / 2, oy + H - 1.5, { align: 'center' });
}

// Draw the BACK face of the ID card at offset (ox, oy)
async function drawBack(
  doc: jsPDF,
  student: IDCardStudent,
  school: IDCardSchool,
  ox: number,
  oy: number,
  logoImg: string | null,
) {
  const cardId = student.admission_number || student.student_id;
  const fullName = resolveFullName(student);
  const schoolName = (school.name || 'School').toUpperCase();
  const returnAddress = [school.address || school.location, school.contact_phone].filter(Boolean).join('  ·  ');

  // Card background (light blue)
  doc.setFillColor(...LIGHT);
  doc.roundedRect(ox, oy, W, H, 2, 2, 'F');

  // Header strip
  doc.setFillColor(...NAVY);
  doc.roundedRect(ox, oy, W, 10, 2, 2, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(ox, oy + 5, W, 5, 'F');
  doc.setFillColor(...GOLD);
  doc.rect(ox + W - 2, oy, 2, 10, 'F');

  // Small logo
  if (logoImg) {
    doc.addImage(logoImg, imgFormat(logoImg), ox + 2, oy + 1.5, 7, 7);
  } else {
    doc.setFillColor(...STRIPE);
    doc.circle(ox + 5.5, oy + 5, 3.5, 'F');
  }
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.circle(ox + 5.5, oy + 5, 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...WHITE);
  doc.text(schoolName, ox + 12, oy + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.5);
  doc.setTextColor(...GOLD);
  doc.text('Student ID · Back', ox + 12, oy + 8.5);

  // First name badge (right side of header)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...WHITE);
  doc.text(fullName.split(' ')[0], ox + W - 15, oy + 5.5, { align: 'left' });

  // Content area
  const fields: Array<{ label: string; value: string; wide?: boolean; highlight?: boolean }> = [
    { label: 'Emergency Contact', value: safe(student.guardian_name), wide: true },
    { label: 'Phone', value: safe(student.guardian_phone), wide: true },
    { label: 'Blood Group', value: safe(student.blood_group), highlight: true },
    { label: 'Medical Notes', value: safe(student.medical_condition) },
  ];

  let cy = oy + 13;
  let i = 0;
  while (i < fields.length) {
    const f = fields[i];
    if (f.wide) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(4.5);
      doc.setTextColor(138, 155, 181);
      doc.text(f.label.toUpperCase(), ox + 4, cy);
      cy += 3;
      if (f.highlight && f.value !== '—') {
        doc.setFillColor(254, 226, 226);
        doc.roundedRect(ox + 4, cy - 2, 18, 5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(185, 28, 28);
        doc.text(f.value, ox + 5, cy + 2);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...NAVY);
        doc.text(f.value, ox + 4, cy + 2);
      }
      cy += 6;
      i++;
    } else {
      // Two columns
      const left = fields[i];
      const right = fields[i + 1];
      for (const [idx, field] of [[0, left], [1, right]] as [number, typeof left | undefined][]) {
        if (!field) continue;
        const lx = idx === 0 ? ox + 4 : ox + W / 2 + 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.5);
        doc.setTextColor(138, 155, 181);
        doc.text(field.label.toUpperCase(), lx, cy);

        if ((field as typeof left).highlight && field.value !== '—') {
          doc.setFillColor(254, 226, 226);
          doc.roundedRect(lx, cy + 1, 14, 5, 1, 1, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(185, 28, 28);
          doc.text(field.value, lx + 1, cy + 5);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(...NAVY);
          doc.text(field.value, lx, cy + 5);
        }
      }
      cy += 9;
      i += 2;
    }
  }

  // Bottom return bar
  doc.setFillColor(...NAVY);
  doc.roundedRect(ox, oy + H - 12, W, 12, 2, 2, 'F');
  doc.setFillColor(...NAVY);
  doc.rect(ox, oy + H - 12, W, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(...GOLD);
  doc.text('IF FOUND, PLEASE RETURN TO:', ox + W / 2, oy + H - 8.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...WHITE);
  doc.text(returnAddress || schoolName, ox + W / 2, oy + H - 5.5, { align: 'center' });
  doc.setFont('courier', 'normal');
  doc.setFontSize(4);
  doc.setTextColor(180, 195, 220);
  doc.text(safe(cardId), ox + W / 2, oy + H - 2, { align: 'center' });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Batch PDF: all fronts on page 1 (2 cols × 5 rows per A4), all backs on page 2
 * in the same order — ready for double-sided printing and cutting.
 */
export async function generateBatchIdCardPdf(
  students: IDCardStudent[],
  school: IDCardSchool,
  filename = 'id-cards-batch'
): Promise<void> {
  if (!students.length) return;

  // Load school logo once
  const logoImg = await loadImg(school.logo_url || '');

  // Load all student photos in parallel
  const photoImgs = await Promise.all(
    students.map((s) => loadImg(s.photoUrl || ''))
  );

  // Load all barcodes in parallel
  const barcodeImgs = await Promise.all(
    students.map((s) => generateBarcode(s.admission_number || s.student_id))
  );

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;

  // Grid: 2 columns, 5 rows = 10 cards per page
  const cols = 2;
  const rows = 5;
  const perPage = cols * rows;
  const gapX = 6; // horizontal gap between cards
  const gapY = 8; // vertical gap between cards

  const totalGridW = cols * W + (cols - 1) * gapX;
  const totalGridH = rows * H + (rows - 1) * gapY;
  const ox0 = (pageW - totalGridW) / 2;
  const oy0 = (pageH - totalGridH) / 2;

  const pages = Math.ceil(students.length / perPage);

  for (let p = 0; p < pages; p++) {
    const slice = students.slice(p * perPage, (p + 1) * perPage);

    // ── Fronts page ──
    if (p > 0) doc.addPage();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(160, 170, 185);
    doc.text(`FRONT  ·  Page ${p + 1} of ${pages}`, pageW / 2, 8, { align: 'center' });

    for (let i = 0; i < slice.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ox = ox0 + col * (W + gapX);
      const oy = oy0 + row * (H + gapY);
      await drawFront(doc, slice[i], school, ox, oy, logoImg, photoImgs[p * perPage + i], barcodeImgs[p * perPage + i]);
    }

    // ── Backs page (same order = aligns on double-sided print) ──
    doc.addPage();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(160, 170, 185);
    doc.text(`BACK  ·  Page ${p + 1} of ${pages}`, pageW / 2, 8, { align: 'center' });

    for (let i = 0; i < slice.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ox = ox0 + col * (W + gapX);
      const oy = oy0 + row * (H + gapY);
      await drawBack(doc, slice[i], school, ox, oy, logoImg);
    }
  }

  doc.save(`${filename}.pdf`);
}

export async function generateIdCardPdf(student: IDCardStudent, school: IDCardSchool): Promise<void> {
  const cardId = student.admission_number || student.student_id;
  const fullName = resolveFullName(student);

  // Load all assets in parallel
  const [logoImg, photoImg, barcodeImg] = await Promise.all([
    loadImg(school.logo_url || ''),
    loadImg(student.photoUrl || ''),
    generateBarcode(cardId),
  ]);

  // A4 portrait — place front and back centered on the page with guides
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;

  // Centered layout: front card centered horizontally, back card below with gap
  const gap = 12;
  const totalH = H * 2 + gap;
  const startY = (pageH - totalH) / 2;
  const startX = (pageW - W) / 2;

  // Cut guides (dashed lines)
  doc.setDrawColor(200, 210, 220);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([1, 1], 0);
  // Front card guides
  doc.rect(startX - 3, startY - 3, W + 6, H + 6);
  // Back card guides
  doc.rect(startX - 3, startY + H + gap - 3, W + 6, H + 6);
  doc.setLineDashPattern([], 0);

  // Labels
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(160, 170, 185);
  doc.text('FRONT', startX - 3, startY - 4.5);
  doc.text('BACK', startX - 3, startY + H + gap - 4.5);
  doc.text('Cut along dashed lines', startX + W + 4, startY + H / 2, { angle: 90 });

  // Draw both faces
  await drawFront(doc, student, school, startX, startY, logoImg, photoImg, barcodeImg);
  await drawBack(doc, student, school, startX, startY + H + gap, logoImg);

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(180, 190, 205);
  doc.text(`PwezaCore · ${(school.name || '').toUpperCase()} · Generated ${new Date().toLocaleDateString('en-UG')}`, pageW / 2, pageH - 8, { align: 'center' });

  const safeName = fullName.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase();
  doc.save(`id-card-${safeName}.pdf`);
}
