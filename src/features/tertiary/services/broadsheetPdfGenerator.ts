import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { BroadsheetRow, BroadsheetSubject, BroadsheetSummary } from '../components/NoticeBoardBroadsheet';

export interface GenerateBroadsheetPdfOptions {
  schoolName: string;
  schoolLogoUrl?: string | null;
  schoolMotto?: string | null;
  schoolAddress?: string | null;
  schoolContact?: string | null;
  className: string;
  academicYearSession: string;
  examinationTitle?: string;
  subjects: BroadsheetSubject[];
  rows: BroadsheetRow[];
  summary?: BroadsheetSummary | null;
  filename?: string;
}

/**
 * Generates an executive, professional multi-page Landscape A4 Broadsheet PDF.
 * Ensures:
 * 1. Clean row pagination (18 rows on Page 1, 22 rows on subsequent pages).
 * 2. Absolutely zero sliced/cut rows across pages.
 * 3. Complete repeated table headers on every page so all columns and subjects are 100% identifiable.
 * 4. High-contrast colors with explicit inline styles so text is never washed out or invisible.
 * 5. Running page headers, footer page counts (Page X of Y), and summary verification statistics on the final page.
 */
export async function downloadBroadsheetPdf(options: GenerateBroadsheetPdfOptions): Promise<void> {
  const {
    schoolName,
    schoolLogoUrl,
    schoolMotto,
    schoolAddress,
    schoolContact,
    className,
    academicYearSession,
    examinationTitle = 'Internal Assessment Semester Examination Results',
    subjects,
    rows,
    summary,
    filename,
  } = options;

  const actualSummary: BroadsheetSummary = summary || {
    totalStudents: rows.length,
    passedCount: rows.filter((r) => r.standing === 'Pass (NP)').length,
    retakeCount: rows.filter((r) => r.standing !== 'Pass (NP)').length,
    highestCGPA: rows.reduce((max, r) => (r.cgpa > max ? r.cgpa : max), 0),
    lowestCGPA: rows.reduce((min, r) => (r.cgpa < min ? r.cgpa : min), rows[0]?.cgpa ?? 0),
    averageCGPA: rows.length > 0 ? rows.reduce((sum, r) => sum + r.cgpa, 0) / rows.length : 0,
  };

  // Pagination parameters calibrated for A4 Landscape (297mm x 210mm)
  const P1_LIMIT = 18;
  const P2_LIMIT = 22;

  // Split rows into page batches
  const pagesData: BroadsheetRow[][] = [];
  if (rows.length === 0) {
    pagesData.push([]);
  } else {
    pagesData.push(rows.slice(0, P1_LIMIT));
    let start = P1_LIMIT;
    while (start < rows.length) {
      pagesData.push(rows.slice(start, start + P2_LIMIT));
      start += P2_LIMIT;
    }
  }

  const totalPages = pagesData.length;

  // Create staging container off-screen
  const stagingEl = document.createElement('div');
  stagingEl.id = 'broadsheet-pdf-staging-container';
  stagingEl.style.position = 'fixed';
  stagingEl.style.left = '-10000px';
  stagingEl.style.top = '0';
  stagingEl.style.width = '1122px'; // Standard A4 Landscape pixel width @ 96DPI
  stagingEl.style.backgroundColor = '#ffffff';
  stagingEl.style.zIndex = '-9999';
  document.body.appendChild(stagingEl);

  try {
    // Build HTML for each page
    pagesData.forEach((pageRows, pageIdx) => {
      const pageNum = pageIdx + 1;
      const isFirstPage = pageNum === 1;
      const isLastPage = pageNum === totalPages;

      const pageEl = document.createElement('div');
      pageEl.className = 'broadsheet-render-page';
      pageEl.style.width = '1122px';
      pageEl.style.height = '793px'; // Exact A4 Landscape pixel height @ 96DPI
      pageEl.style.padding = '22px 28px';
      pageEl.style.boxSizing = 'border-box';
      pageEl.style.backgroundColor = '#ffffff';
      pageEl.style.color = '#0f172a';
      pageEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      pageEl.style.display = 'flex';
      pageEl.style.flexDirection = 'column';
      pageEl.style.justifyContent = 'space-between';
      pageEl.style.position = 'relative';

      // ─── Header Section ───
      let headerHtml = '';
      if (isFirstPage) {
        headerHtml = `
          <div style="border-bottom: 2px solid #0f2238; padding-bottom: 8px; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
              <div style="width: 58px; height: 58px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; padding: 2px;">
                ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" style="max-height: 100%; max-width: 100%; object-fit: contain;" />` : `<div style="font-size: 11px; font-weight: 800; color: #64748b;">CREST</div>`}
              </div>
              <div style="flex: 1; text-align: center;">
                <h1 style="margin: 0; font-size: 21px; font-weight: 900; text-transform: uppercase; color: #0b192c; letter-spacing: -0.01em;">
                  ${schoolName || 'Health Training Institution'}
                </h1>
                ${schoolMotto ? `<p style="margin: 2px 0 0 0; font-size: 10.5px; font-style: italic; color: #475569;">"${schoolMotto}"</p>` : ''}
                <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">
                  ${schoolAddress || 'Uganda'} ${schoolContact ? `| Tel: ${schoolContact}` : ''}
                </p>
                <div style="display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 4px; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; background: #eff6ff; color: #1e3a8a; border: 1px solid #bfdbfe;">
                  ${examinationTitle}
                </div>
              </div>
              <div style="width: 60px; text-align: right; font-size: 9.5px; color: #64748b;">
                <div>Date:</div>
                <div style="font-weight: 700; color: #0f172a;">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            </div>
            <div style="margin-top: 6px; padding-top: 5px; border-top: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; font-size: 10.5px; color: #334155;">
              <div><span>Cohort / Class: </span><strong style="color: #0f172a; text-transform: uppercase;">${className}</strong></div>
              <div><span>Academic Session: </span><strong style="color: #0f172a;">${academicYearSession}</strong></div>
              <div><span>Official Document: </span><strong style="color: #1e3a8a;">Notice Board Final Master Marksheet</strong></div>
            </div>
          </div>
        `;
      } else {
        headerHtml = `
          <div style="border-bottom: 2px solid #0f2238; padding-bottom: 6px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 11px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="text-transform: uppercase; color: #0b192c; font-size: 12px;">${schoolName}</strong>
              <span style="color: #94a3b8;">•</span>
              <span style="font-weight: 600; color: #1e3a8a;">Notice Board Master Marksheet (Continuation)</span>
            </div>
            <div style="color: #475569; font-size: 10.5px;">
              <span>Cohort: <strong>${className}</strong></span>
              <span style="margin: 0 6px; color: #cbd5e1;">|</span>
              <span>Session: <strong>${academicYearSession}</strong></span>
              <span style="margin: 0 6px; color: #cbd5e1;">|</span>
              <span style="font-weight: 700; color: #1e3a8a;">Page ${pageNum} of ${totalPages}</span>
            </div>
          </div>
        `;
      }

      // ─── Table Header ───
      const subjectHeadersHtml = subjects
        .map(
          (s) => `
          <th colspan="3" style="padding: 4px 3px; border: 1px solid #334155; text-align: center; background-color: #1e293b; color: #ffffff;">
            <div style="font-size: 10.5px; font-weight: 800; color: #ffffff; white-space: nowrap;">
              ${s.code} <span style="color: #38bdf8; font-weight: 700;">(${s.creditUnits}CU)</span>
            </div>
          </th>
        `
        )
        .join('');

      const subjectSubheadersHtml = subjects
        .map(
          () => `
          <th style="padding: 3px 2px; border: 1px solid #334155; text-align: center; font-size: 9.5px; font-weight: 800; background-color: #0f172a; color: #f8fafc; width: 34px;">Mark</th>
          <th style="padding: 3px 2px; border: 1px solid #334155; text-align: center; font-size: 9.5px; font-weight: 800; background-color: #0f172a; color: #2dd4bf; width: 28px;">Grd</th>
          <th style="padding: 3px 2px; border: 1px solid #334155; text-align: center; font-size: 9.5px; font-weight: 800; background-color: #0f172a; color: #fbbf24; width: 28px;">GP</th>
        `
        )
        .join('');

      // ─── Table Rows ───
      const rowsHtml = pageRows
        .map((r, rIdx) => {
          const isEven = rIdx % 2 === 0;
          const isFail = r.standing.toLowerCase().includes('retake') || r.standing.toLowerCase().includes('probation');
          const rowBg = isFail ? '#fef2f2' : isEven ? '#ffffff' : '#f8fafc';

          const scoresHtml = subjects
            .map((sub) => {
              const sc = r.subjectScores[sub.code] || { mark: 0, grade: 'F', gp: 0, isRetake: true };
              const isRetake = sc.grade === 'F' || sc.gp === 0 || sc.isRetake;
              const markColor = isRetake ? '#dc2626' : '#0f172a';
              const gradeColor = isRetake ? '#dc2626' : '#0f766e';
              const cellBg = isRetake ? '#fee2e2' : 'transparent';

              return `
                <td style="padding: 4px 2px; text-align: center; font-size: 10px; font-weight: 700; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #cbd5e1; background-color: ${cellBg}; color: ${markColor};">
                  ${sc.mark}
                </td>
                <td style="padding: 4px 2px; text-align: center; font-size: 10px; font-weight: 800; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #cbd5e1; background-color: ${cellBg}; color: ${gradeColor};">
                  ${sc.grade}
                </td>
                <td style="padding: 4px 2px; text-align: center; font-size: 10px; font-weight: 600; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; background-color: ${cellBg}; color: #334155;">
                  ${sc.gp.toFixed(1)}
                </td>
              `;
            })
            .join('');

          return `
            <tr style="background-color: ${rowBg};">
              <td style="padding: 4px 4px; text-align: center; font-weight: 800; font-size: 10px; color: #0f172a; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                ${r.rank}
              </td>
              <td style="padding: 4px 6px; font-size: 10px; font-weight: 600; font-family: monospace; white-space: nowrap; color: #334155; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                ${r.regNo || ''}
              </td>
              <td style="padding: 4px 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0f172a; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">
                ${r.studentName}
              </td>
              ${scoresHtml}
              <td style="padding: 4px 4px; text-align: center; font-size: 10.5px; font-weight: 900; background-color: ${isEven ? '#fefce8' : '#fef9c3'}; color: #713f12; border-right: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                ${r.cgpa.toFixed(2)}
              </td>
              <td style="padding: 4px 6px; text-align: center; font-size: 9.5px; font-weight: 800; border-bottom: 1px solid #cbd5e1; color: ${isFail ? '#b91c1c' : '#047857'}; white-space: nowrap;">
                ${r.standing}
              </td>
            </tr>
          `;
        })
        .join('');

      // ─── Summary Box (Only on Last Page) ───
      let summaryHtml = '';
      if (isLastPage) {
        summaryHtml = `
          <div style="margin-top: 10px; padding: 8px 14px; background-color: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 10px;">
            <div style="display: flex; align-items: center; gap: 18px;">
              <div><span style="color: #64748b;">Total Students:</span> <strong style="color: #0f172a; font-size: 11px;">${actualSummary.totalStudents}</strong></div>
              <div><span style="color: #64748b;">Normal Progress (NP):</span> <strong style="color: #047857; font-size: 11px;">${actualSummary.passedCount}</strong></div>
              <div><span style="color: #64748b;">Retakes / Probation:</span> <strong style="color: #dc2626; font-size: 11px;">${actualSummary.retakeCount}</strong></div>
              <div><span style="color: #64748b;">Highest CGPA:</span> <strong style="color: #1e3a8a; font-size: 11px;">${actualSummary.highestCGPA.toFixed(2)}</strong></div>
              <div><span style="color: #64748b;">Class Average CGPA:</span> <strong style="color: #1e3a8a; font-size: 11px;">${actualSummary.averageCGPA.toFixed(2)}</strong></div>
            </div>
            <div style="display: flex; items-center; gap: 30px; color: #475569; font-size: 9.5px;">
              <div>Academic Registrar: ____________________</div>
              <div>Principal / Dean: ____________________</div>
            </div>
          </div>
        `;
      }

      // ─── Footer Line ───
      const footerHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 9px; color: #64748b; padding-top: 6px; border-top: 1px solid #e2e8f0; margin-top: auto;">
          <div>PwezaCore Tertiary Health & Clinical Training System • Official Academic Broadsheet</div>
          <div>Page ${pageNum} of ${totalPages}</div>
        </div>
      `;

      pageEl.innerHTML = `
        <div>
          ${headerHtml}
          <table style="width: 100%; border-collapse: collapse; text-align: left; border: 2px solid #0f2238; background-color: #ffffff;">
            <thead>
              <tr style="background-color: #0f2238; color: #ffffff;">
                <th rowspan="2" style="padding: 5px 4px; border: 1px solid #334155; text-align: center; width: 32px; background-color: #0f2238; color: #ffffff; font-size: 10px; font-weight: 800;">RNK</th>
                <th rowspan="2" style="padding: 5px 6px; border: 1px solid #334155; text-align: left; width: 95px; background-color: #0f2238; color: #ffffff; font-size: 10px; font-weight: 800; white-space: nowrap;">REG NO.</th>
                <th rowspan="2" style="padding: 5px 8px; border: 1px solid #334155; text-align: left; min-width: 160px; background-color: #0f2238; color: #ffffff; font-size: 10px; font-weight: 800;">STUDENT NAME</th>
                ${subjectHeadersHtml}
                <th rowspan="2" style="padding: 5px 4px; border: 1px solid #334155; text-align: center; width: 44px; background-color: #451a03; color: #fef08a; font-size: 10.5px; font-weight: 900;">CGPA</th>
                <th rowspan="2" style="padding: 5px 6px; border: 1px solid #334155; text-align: center; width: 85px; background-color: #0f2238; color: #ffffff; font-size: 10px; font-weight: 800;">STANDING</th>
              </tr>
              <tr style="background-color: #0f172a; color: #ffffff;">
                ${subjectSubheadersHtml}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          ${summaryHtml}
        </div>
        ${footerHtml}
      `;

      stagingEl.appendChild(pageEl);
    });

    // Generate jsPDF document
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const renderedPages = stagingEl.querySelectorAll<HTMLElement>('.broadsheet-render-page');

    for (let i = 0; i < renderedPages.length; i++) {
      if (i > 0) {
        pdf.addPage('a4', 'landscape');
      }

      const pageEl = renderedPages[i];
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1122,
        height: 793,
        windowWidth: 1122,
        windowHeight: 793,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
    }

    const safeName = filename || `Notice_Board_Broadsheet_${className.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    pdf.save(safeName);
  } finally {
    // Clean up staging element
    if (stagingEl.parentNode) {
      stagingEl.parentNode.removeChild(stagingEl);
    }
  }
}
