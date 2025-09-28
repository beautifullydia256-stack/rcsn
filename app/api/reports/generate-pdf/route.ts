import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import JSZip from 'jszip';
import { calculateGrade, formatCurrency, getAttendanceDetails, formatValue, formatPercentage, formatAttendance, formatPosition } from '@/src/lib/reportUtils';
import chromium from '@sparticuz/chromium';

// Helper function to check if class is O-Level
function isOLevelClass(className: string): boolean {
  if (!className) return false;
  const trimmed = className.trim();
  return /^(senior\s*[1-4]|s\s*[1-4])/i.test(trimmed);
}

// Helper function to convert image URL to base64 data URL
async function convertImageToBase64(url: string): Promise<string | null> {
  try {
    if (!url || url.trim() === '') {
      console.log('No image URL provided');
      return null;
    }
    
    console.log('Converting image to base64:', url);
    
    // Add timeout to fetch request (optimized for Vercel)
    const controller = new AbortController();
    const timeout = process.env.VERCEL === '1' ? 3000 : 5000; // Shorter timeout for Vercel
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.log('Image fetch failed:', response.status, response.statusText);
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      console.log('Image buffer is empty');
      return null;
    }
    
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    console.log('Image converted successfully, size:', buffer.byteLength, 'bytes, type:', contentType);
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('PDF generation request received');
    const { reportData, type, template } = await request.json();
    console.log('Report data received, type:', type, 'template:', template);
    console.log('Template type:', typeof template);
    console.log('Template value:', JSON.stringify(template));

    // Validate required data
    if (!reportData) {
      console.error('No report data provided');
      return NextResponse.json({ error: 'No report data provided' }, { status: 400 });
    }

    if (!reportData.students || !Array.isArray(reportData.students) || reportData.students.length === 0) {
      console.error('No students data provided');
      return NextResponse.json({ error: 'No students data provided' }, { status: 400 });
    }

    if (type === 'single') {
      console.log('Calling generateSingleReportPDF with template:', template);
      const pdfBuffer = await generateSingleReportPDF(reportData, template);
      
      const student = reportData.students[0];
      const filename = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    } else if (type === 'class') {
      console.log('Generating class reports with template:', template);
      const zip = new JSZip();
      
      for (const student of reportData.students) {
        const studentReportData = {
          ...reportData,
          students: [student]
        };
        console.log('Generating PDF for student:', student.name, 'with template:', template);
        const pdfBuffer = await generateSingleReportPDF(studentReportData, template);
        const filename = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
        zip.file(filename, pdfBuffer);
      }
      
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      const classFilename = `${reportData.students[0].current_class}_Reports_${reportData.examSet.name}.zip`.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      return new NextResponse(zipBuffer as any, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${classFilename}"`
        }
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json({ error: 'Failed to generate PDF report' }, { status: 500 });
  }
}

async function generateSingleReportPDF(reportData: any, template: string = 'template1') {
  console.log('Starting PDF generation for student:', reportData.students[0]?.name, 'using template:', template);
  const { school, examSet, students } = reportData;
  const student = students[0];

  // Validate required data
  if (!student) {
    throw new Error('No student data provided');
  }

  if (!school) {
    throw new Error('No school data provided');
  }

  if (!examSet) {
    throw new Error('No exam set data provided');
  }

  // Log data validation for debugging
  console.log('Data validation passed:');
  console.log('- Student:', student.name, 'Class:', student.current_class);
  console.log('- School:', school.name);
  console.log('- Exam Set:', examSet.name);
  console.log('- Student summary exists:', !!student.summary);
  console.log('- Student subjects count:', student.subjects?.length || 0);

  // Convert images to base64 for embedding
  console.log('Converting images to base64...');
  let schoolLogoBase64 = null;
  let studentPhotoBase64 = null;
  
  try {
    schoolLogoBase64 = school?.logo ? await convertImageToBase64(school.logo) : null;
  } catch (error) {
    console.error('Failed to convert school logo:', error);
    schoolLogoBase64 = null; // Ensure it's null if conversion fails
  }
  
  try {
    studentPhotoBase64 = student?.profile_photo ? await convertImageToBase64(student.profile_photo) : null;
  } catch (error) {
    console.error('Failed to convert student photo:', error);
    studentPhotoBase64 = null; // Ensure it's null if conversion fails
  }
  
  console.log('School logo converted:', !!schoolLogoBase64);
  console.log('Student photo converted:', !!studentPhotoBase64);

  // Generate HTML with embedded images using the correct template
  console.log('Generating HTML with embedded images using template:', template);
  
  let htmlContent: string;
  
  // Check if this is an O-Level class and use the appropriate template
  console.log('=== TEMPLATE SELECTION DEBUG ===');
  console.log('Student class:', student.current_class);
  console.log('Is O-Level class:', isOLevelClass(student.current_class));
  console.log('Template parameter received:', template);
  console.log('Template parameter type:', typeof template);
  console.log('Template parameter === "template1":', template === 'template1');
  console.log('Template parameter === "template2":', template === 'template2');
  console.log('Template parameter === "template3":', template === 'template3');
  
  if (isOLevelClass(student.current_class)) {
    console.log('Using O-Level template selection logic');
    switch (template) {
      case 'template1':
        console.log('✅ SELECTED: Generating Template 1 (O-Level) HTML');
        htmlContent = generateTemplate1OLevelHTML(reportData, schoolLogoBase64, studentPhotoBase64);
        break;
      case 'template2':
        console.log('✅ SELECTED: Generating Template 2 (Kasozi) HTML');
        htmlContent = generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
        break;
      case 'template3':
        console.log('✅ SELECTED: Generating Template 3 (Kyotera) HTML');
        htmlContent = generateTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);
        break;
      default:
        console.log('❌ DEFAULT: Template not recognized, defaulting to Template 1');
        console.log('Template value was:', JSON.stringify(template));
        htmlContent = generateTemplate1OLevelHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    }
  } else {
    console.log('Using Secondary template (non-O-Level class)');
    // For non-O-Level classes, use the secondary template
    htmlContent = generateSecondaryReportHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  console.log('=== END TEMPLATE SELECTION DEBUG ===');
  
  // Use the generated HTML content from the template
  const htmlContentFinal = htmlContent;
  
  // Add error handling for HTML generation
  if (!htmlContent || htmlContent.length === 0) {
    console.error('HTML content is empty or undefined');
    throw new Error('Failed to generate HTML content');
  }
  
  console.log('HTML content generated, length:', htmlContent.length);
  console.log('School logo URL:', school?.logo);
  console.log('Student photo URL:', student.profile_photo);

  // Launch Puppeteer with Vercel-compatible configuration
  console.log('Launching Puppeteer browser...');
  let browser;
  
  // Check if we're running on Vercel
  const isVercel = process.env.VERCEL === '1';
  console.log('Environment:', isVercel ? 'Vercel' : 'Local');
  
  try {
    if (isVercel) {
      // Vercel-specific configuration
      console.log('Using Vercel-optimized Puppeteer configuration...');
      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--single-process',
          '--no-zygote',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        defaultViewport: { width: 1200, height: 800 },
        executablePath: await chromium.executablePath(),
        headless: true,
        timeout: 30000
      });
      console.log('Puppeteer browser launched successfully with Vercel configuration');
    } else {
      // Local development configuration
      console.log('Using local development Puppeteer configuration...');
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--run-all-compositor-stages-before-draw',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        timeout: 30000
      });
      console.log('Puppeteer browser launched successfully with local configuration');
    }
  } catch (browserError) {
    console.error('Failed to launch Puppeteer browser:', browserError);
    
    // Fallback configuration for both environments
    try {
      console.log('Trying fallback configuration...');
      browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--single-process'
        ],
        headless: true,
        timeout: 30000
      });
      console.log('Puppeteer browser launched successfully with fallback configuration');
    } catch (fallbackError) {
      console.error('Failed to launch Puppeteer browser with fallback config:', fallbackError);
      throw new Error(`Failed to launch browser: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
    }
  }

  try {
    console.log('Creating new page...');
    const page = await browser.newPage();
    console.log('Page created successfully');
    
    // Set viewport for perfect WYSIWYG rendering to match A4 exactly
    const viewportConfig = { 
      width: 794, 
      height: 1123, 
      deviceScaleFactor: 1 // Consistent 1:1 scaling for perfect WYSIWYG
    };
    await page.setViewport(viewportConfig);
    console.log('Viewport set for WYSIWYG fidelity');
    
    // Set content with proper wait for images to load
    console.log('Setting page content...');
    try {
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 15000 
      });
      console.log('Page content set successfully with networkidle0');
    } catch (contentError) {
      console.error('Failed to set content with networkidle0, trying domcontentloaded:', contentError);
      // Fallback to domcontentloaded
      await page.setContent(htmlContent, { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      console.log('Page content set successfully with domcontentloaded');
    }
    
    // Wait for fonts and images to load completely for perfect WYSIWYG
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate PDF with perfect WYSIWYG settings to match preview exactly
    console.log('Generating PDF with WYSIWYG fidelity...');
    const pdfOptions = {
      format: 'A4' as const,
      margin: {
        top: '0mm',
        right: '0mm', 
        bottom: '0mm',
        left: '0mm'
      },
      printBackground: true,
      preferCSSPageSize: false, // Use our custom page size
      scale: 1.0, // No scaling - exact 1:1 match
      width: '210mm', // Exact A4 width
      height: '297mm', // Exact A4 height
      timeout: 15000
    };
    
    const pdfBuffer = await page.pdf(pdfOptions);
    console.log('PDF generated successfully, buffer size:', pdfBuffer.length);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }

    return pdfBuffer;
  } catch (error) {
    console.error('Puppeteer PDF generation error:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // If there's an error, still try to generate a basic PDF with Template 1 as fallback
    console.log('Attempting fallback PDF generation with Template 1...');
    try {
      const fallbackHtml = generateTemplate1OLevelHTML(reportData, null, null);
      const fallbackPage = await browser.newPage();
      await fallbackPage.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
      await fallbackPage.setContent(fallbackHtml, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const fallbackPdf = await fallbackPage.pdf({
        format: 'A4',
        margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        printBackground: true,
        preferCSSPageSize: false,
        scale: 1.0,
        width: '210mm',
        height: '297mm'
      });
      
      await fallbackPage.close();
      console.log('Fallback PDF generated successfully');
      return fallbackPdf;
    } catch (fallbackError) {
      console.error('Fallback PDF generation also failed:', fallbackError);
      throw error; // Throw original error if fallback also fails
    }
  } finally {
    console.log('Closing browser...');
    try {
      if (browser) {
        await browser.close();
        console.log('Browser closed successfully');
      }
    } catch (closeError) {
      console.error('Error closing browser:', closeError);
    }
  }
}

// Template 1 - O-Level Report Card (matches the preview exactly)
function generateTemplate1OLevelHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? '';
  const totalDays = attendance.totalSchoolDays ?? '';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : '';
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  // O-Level calculation functions (matching exam results page logic)
  const calculateDescriptor = (activityScore: number): "Missed" | "Moderate" | "Outstanding" => {
    if (activityScore < 1) return "Missed";
    if (activityScore < 2.5) return "Moderate";
    return "Outstanding";
  };

  const calculateGrade = (finalScore: number): "A"|"B"|"C"|"D"|"E" => {
    if (finalScore >= 80) return "A";
    if (finalScore >= 70) return "B";
    if (finalScore >= 60) return "C";
    if (finalScore >= 50) return "D";
    return "E";
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', 'Times', serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .school-logo {
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: none;
        }
        
        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border: none;
        }
        
        .school-info {
          text-align: right;
          flex: 1;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 18pt;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        
        .school-contact {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .school-motto {
          font-size: 11pt;
          font-weight: bold;
          font-style: italic;
        }
        
        .student-photo {
          width: 80px;
          height: 96px;
          border: 2px solid #ccc;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        
        .student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .report-title {
          background: #4CAF50;
          color: white;
          text-align: center;
          padding: 10px;
          margin: 20px 0;
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-info {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .student-info div {
          margin-bottom: 5px;
        }
        
        .student-info strong {
          font-weight: bold;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
        }
        
        th {
          background: #4CAF50;
          color: white;
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .summary p {
          margin-bottom: 5px;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .next-term {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 20px;
        }
        
        .grading-system h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .description-table th {
          background: #f0f0f0;
          color: black;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9pt;
          margin-top: 20px;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.1;
          z-index: -1;
          pointer-events: none;
        }
        
        .watermark img {
          width: 900px;
          height: 900px;
          object-fit: contain;
        }
        
        .watermark-placeholder {
          width: 900px;
          height: 900px;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          font-size: 108pt;
          font-weight: bold;
          color: #ccc;
          text-align: center;
          line-height: 1.2;
        }
      </style>
    </head>
    <body>
      <!-- WATERMARK -->
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER - School Logo and Info -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">SCHOOL</div><div style="font-weight: bold;">LOGO</div></div>'}
        </div>
        
        <!-- School Name and Contact -->
        <div class="school-info">
          <div class="school-name">${school?.name || 'EMIRATES COLLEGE SCHOOL'}</div>
          <div class="school-contact">TEL :: ${school?.phone || '0701395594'} | EMAIL :: ${school?.email || 'info@emiratescollege.sc.ug'} | ${school?.address || 'P.O.BOX 31175, KAMPALA, UGANDA'}</div>
          <div class="school-motto">SCHOOL MOTTO: ${school?.motto || 'Education the Future'}</div>
        </div>
        
      </div>

      <!-- REPORT TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || '2'}, ${examSet?.year || '2025'}
      </div>

      <!-- Student Info and Photo - Side by side -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <!-- LEARNER INFO - Left side -->
        <div class="student-info" style="margin-bottom: 0;">
          <div><strong>LNo.:</strong> ${student.admission_number || student.student_id}</div>
          <div><strong>NAME:</strong> ${student.name}</div>
          <div><strong>CLASS & STREAM:</strong> ${student.current_class}</div>
        </div>
        
        <!-- Student Photo - Right side -->
        <div class="student-photo">
          ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">STUDENT<br/>PHOTO</div>'}
        </div>
      </div>

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>Subjects & Topics Covered</th>
            <th>Activity Score [3]</th>
            <th>Descriptor</th>
            <th>Formative Score [20%]</th>
            <th>Exam Score [80%]</th>
            <th>Final Score [100%]</th>
            <th>Grade</th>
            <th>Overall Remark</th>
            <th>Subject Teacher</th>
          </tr>
        </thead>
        <tbody>
          ${student.results.length > 0 ? 
            student.results.map((result: any) => {
              const activity = result.activity_score ?? '';
              const activityNum = parseFloat(activity) || 0;
              const descriptor = result.descriptor || (activityNum < 1 ? 'Missed' : activityNum < 2.5 ? 'Moderate' : 'Outstanding');
              const formative = result.formative_score ?? '';
              const exam = result.exam_score ?? '';
              const finalScore = result.final_score ?? '';
              const finalNum = parseFloat(finalScore) || 0;
              const gradeText = result.grade || (finalNum >= 80 ? 'A' : finalNum >= 70 ? 'B' : finalNum >= 60 ? 'C' : finalNum >= 50 ? 'D' : 'E');
              const overallRemark = result.overall_remark ?? '';
              const teacherInitials = result.teacher_initials ?? '';
              const topic = result.topic || '';

              return `
                <tr>
                  <td>
                    <strong>${result.subject}</strong>
                    <div style="font-size: 9pt; line-height: 1.2; margin-top: 2px;">
                      ${topic}
                    </div>
                  </td>
                  <td class="center">${activity}</td>
                  <td class="center">${descriptor}</td>
                  <td class="center">${formative}</td>
                  <td class="center">${exam}</td>
                  <td class="center">${finalScore}</td>
                  <td class="center">${gradeText}</td>
                  <td style="font-size: 9pt;">${overallRemark}</td>
                  <td class="center">${teacherInitials}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="9" class="center" style="color: #555;">N/A - Student did not sit for this term</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>AVERAGE SCORES:</strong> ${avg} ${avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>

      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <p>${student.comments?.class_teacher_text || 'Shafic is progressing well but needs to focus more on specific subject for better results.'}</p>
        <p>Name: ${student.comments?.class_teacher_name || '__________'} | Signature: ${student.comments?.class_teacher_signature || '__________'} | Date: ${student.comments?.class_teacher_date || '17 September, 2025'}</p>

        <h3>Head Teacher's Comment</h3>
        <p>${student.comments?.head_teacher_text || 'Shafic needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.'}</p>
        <p>Name: ${student.comments?.head_teacher_name || 'NAKIYINGI MARIAM'} | Signature: ${student.comments?.head_teacher_signature || '__________'} | Date: ${student.comments?.head_teacher_date || '17 September, 2025'}</p>
      </div>

      <div class="next-term">
        <strong>Next Term Begins:</strong> ${student?.nextTermBegins || 'Saturday, 13 September, 2025'}
      </div>

      <!-- Grading system & descriptions -->
      <div class="grading-system">
        <h3>Grading System</h3>
        <p><strong>80 - A | 70 - B | 50 - C | 40 - D | 0 - E</strong></p>
        
        <h3>Description</h3>
        <table class="description-table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Achievement Level</th>
              <th>Descriptor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A</td>
              <td>Exceptional</td>
              <td>Demonstrates an extraordinary level of competence by applying innovatively and creatively the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>B</td>
              <td>Outstanding</td>
              <td>Demonstrates a high level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>C</td>
              <td>Satisfactory</td>
              <td>Demonstrates an adequate level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>D</td>
              <td>Basic</td>
              <td>Demonstrates a minimum level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>E</td>
              <td>Elementary</td>
              <td>Demonstrates below the basic level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>Printed from: Pwezacore</div>
        <div>School Motto: '${school?.motto || 'Education the Future'}'</div>
      </div>
    </body>
    </html>
  `;
}

function generateTemplate2KasoziHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? '';
  const totalDays = attendance.totalSchoolDays ?? '';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : '';
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', 'Times', serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        
        .school-logo {
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: none;
          flex-shrink: 0;
        }
        
        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border: none;
        }
        
        .school-info {
          text-align: right;
          flex: 1;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 18pt;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        
        .school-contact {
          font-size: 13pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .school-motto {
          font-size: 13pt;
          font-weight: bold;
          font-style: italic;
        }
        
        .report-title {
          background: #2E7D32;
          color: white;
          text-align: center;
          padding: 12px;
          margin: 20px 0;
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-info {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .student-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .student-photo {
          width: 80px;
          height: 96px;
          border: 2px solid #ccc;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          float: right;
          margin-left: 20px;
        }
        
        .student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
        }
        
        th {
          background: #f0f0f0;
          color: black;
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .summary p {
          margin-bottom: 5px;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .footer {
          text-align: center;
          font-size: 9pt;
          margin-top: 20px;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.1;
          z-index: -1;
          pointer-events: none;
        }
        
        .watermark img {
          width: 900px;
          height: 900px;
          object-fit: contain;
        }
        
        .watermark-placeholder {
          width: 900px;
          height: 900px;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          font-size: 108pt;
          font-weight: bold;
          color: #ccc;
          text-align: center;
          line-height: 1.2;
        }
      </style>
    </head>
    <body>
      <!-- WATERMARK -->
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">ST. ADRIAN</div><div style="font-weight: bold;">KASOZI</div><div style="font-weight: bold;">SECONDARY</div><div style="font-weight: bold;">SCHOOL</div></div>'}
        </div>
        
        <!-- School Info -->
        <div class="school-info">
          <div class="school-name">${school?.name || 'ST. ADRIAN KASOZI SECONDARY SCHOOL'}</div>
          <div class="school-contact">P.O. BOX 12345, KAMPALA | TEL: ${school?.phone || '0414-123456'} | EMAIL: ${school?.email || 'info@kasozi.sc.ug'}</div>
          <div class="school-motto">MOTTO: "${school?.motto || 'Excellence Through Discipline'}"</div>
        </div>
      </div>

      <!-- REPORT TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || 'THREE'}, ${examSet?.year || '2022'}
      </div>

      <!-- STUDENT INFO -->
      <div class="student-info">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="student-info-grid">
            <div><strong>Report Number:</strong> ${student.admission_number || student.student_id}</div>
            <div><strong>Term:</strong> ${examSet?.term || 'THREE'}</div>
            <div><strong>Name:</strong> ${student.name}</div>
            <div><strong>Year:</strong> ${examSet?.year || '2022'}</div>
            <div><strong>Class:</strong> ${student.current_class}</div>
          </div>
          
          <!-- Student Photo -->
          <div class="student-photo">
            ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>'}
          </div>
        </div>
      </div>

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>SUBJECT</th>
            <th>FORMATIVE SCORE [20%]</th>
            <th>EOY SUMMATIVE ASSESSMENT (80%)</th>
            <th>TOTAL (100%)</th>
            <th>GRADE</th>
            <th>LEVEL OF ACHIEVEMENT/3</th>
            <th>DESCRIPTOR</th>
            <th>TR'S INITIAL</th>
          </tr>
        </thead>
        <tbody>
          ${student.results.length > 0 ? 
            student.results.map((result: any) => {
              // Correct Template 2 data mapping as specified
              const subject = result.subject ?? '';
              const formative = result.formative_score ?? ''; // Formative Score [20%]
              const exam = result.exam_score ?? ''; // EOY Summative Assessment (80%)
              const finalScore = result.final_score ?? ''; // Total (100%)
              const grade = result.grade ?? '';
              const levelOfAchievement = result.activity_score ?? ''; // Level of Achievement/3 (Activity Score [3])
              // Provide fallback for descriptor if not available
              const descriptor = result.descriptor ?? (() => {
                const activityNum = parseFloat(levelOfAchievement) || 0;
                if (activityNum >= 2.5) return 'Outstanding';
                if (activityNum >= 1.5) return 'Moderate';
                if (activityNum >= 0.9) return 'Basic';
                return '';
              })();
              const teacherInitials = result.teacher_initials ?? ''; // TR's Initial

              return `
                <tr>
                  <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${subject}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${formative}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${exam}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${finalScore}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${grade}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${levelOfAchievement}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${descriptor}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${teacherInitials}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="8" style="border: 1px solid #000; padding: 8px; text-align: center; color: #555;">N/A - Student did not sit for this term</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>AVERAGE SCORES:</strong> ${avg} ${avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>

      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <p>${student.comments?.class_teacher_text || 'Student is progressing well but needs to focus more on specific subjects for better results.'}</p>
        <p>Name: ${student.comments?.class_teacher_name || '__________'} | Signature: ${student.comments?.class_teacher_signature || '__________'} | Date: ${student.comments?.class_teacher_date || '17 September, 2025'}</p>

        <h3>Head Teacher's Comment</h3>
        <p>${student.comments?.head_teacher_text || 'Student needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.'}</p>
        <p>Name: ${student.comments?.head_teacher_name || 'NAKIYINGI MARIAM'} | Signature: ${student.comments?.head_teacher_signature || '__________'} | Date: ${student.comments?.head_teacher_date || '17 September, 2025'}</p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>Printed from: Pwezacore</div>
        <div>School Motto: '${school?.motto || 'Excellence Through Discipline'}'</div>
      </div>
    </body>
    </html>
  `;
}

function generateTemplate3KyoteraHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  // Calculate identifier based on grade/score (Template 3 specific)
  const getIdentifier = (score: number) => {
    if (score >= 80) return '3'; // Accomplished
    if (score >= 60) return '2'; // Moderate
    if (score >= 50) return '1'; // Basic
    return ''; // Blank for absent
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', 'Times', serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        
        .school-logo {
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: none;
          flex-shrink: 0;
        }
        
        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border: none;
        }
        
        .school-info {
          text-align: right;
          flex: 1;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 18pt;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        
        .school-contact {
          font-size: 13pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .report-title {
          font-size: 12pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        
        .report-number {
          font-size: 10pt;
          margin-bottom: 20px;
        }
        
        .student-info {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .student-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .student-photo {
          width: 80px;
          height: 96px;
          border: 2px solid #ccc;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          float: right;
          margin-left: 20px;
        }
        
        .student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 9pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 4px;
          text-align: left;
        }
        
        th {
          background: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .key-terms {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .key-terms h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .footer {
          text-align: center;
          font-size: 9pt;
          margin-top: 20px;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.1;
          z-index: -1;
          pointer-events: none;
        }
        
        .watermark img {
          width: 900px;
          height: 900px;
          object-fit: contain;
        }
        
        .watermark-placeholder {
          width: 900px;
          height: 900px;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          font-size: 108pt;
          font-weight: bold;
          color: #ccc;
          text-align: center;
          line-height: 1.2;
        }
      </style>
    </head>
    <body>
      <!-- WATERMARK -->
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">KYOTERA</div><div style="font-weight: bold;">PARENTS\'</div><div style="font-weight: bold;">SECONDARY</div><div style="font-weight: bold;">SCHOOL</div></div>'}
        </div>
        
        <!-- School Info -->
        <div class="school-info">
          <div class="school-name">${school?.name || 'KYOTERA PARENTS\' SECONDARY SCHOOL'}</div>
          <div class="school-contact">
            ${school?.address || 'P.O.BOX 11, Kyotera- Uganda'} | 
            Tel: ${school?.phone || '0701861636 / 0700338061'} | 
            E-mail: ${school?.email || 'kasumbaj2009@gmail.com'}
          </div>
          <div class="report-title">END OF TERM ONE STUDENT'S PROGRESSIVE REPORT</div>
          <div class="report-number">No. ${student.admission_number || student.student_id}</div>
        </div>
      </div>

      <!-- STUDENT INFO -->
      <div class="student-info">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="student-info-grid">
            <div><strong>STUDENT'S NAME:</strong> ${student.name}</div>
            <div><strong>YEAR:</strong> ${examSet?.year || '2025'}</div>
            <div><strong>STREAM:</strong> EAST</div>
            <div><strong>CLASS:</strong> ${student.current_class}</div>
            <div><strong>LIN:</strong> __________</div>
            <div><strong>Date:</strong> ${examSet?.date || '26/05/2025'}</div>
          </div>
          
          <!-- Student Photo -->
          <div class="student-photo">
            ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>'}
          </div>
        </div>
      </div>

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>SUBJECT</th>
            <th>AVG SCORE/20</th>
            ${student.results.some((r: any) => r.activity_score_2 !== undefined && r.activity_score_2 !== null && r.activity_score_2 !== '') ? '<th>C2</th>' : ''}
            <th>FINAL EXAM/80</th>
            <th>TOTAL SCORE 100%</th>
            <th>C1</th>
            <th>IDENTIFIER</th>
            <th>DESCRIPTOR</th>
            <th>INIT</th>
          </tr>
        </thead>
        <tbody>
          ${student.results.length > 0 ? 
            student.results.map((result: any) => {
              // Correct Template 3 data mapping as specified
              const subject = result.subject ?? '';
              const avgScore = result.formative_score ?? ''; // AVG SCORE/20 (Formative Score [20%])
              const c2 = result.activity_score_2 ?? ''; // C2 (Activity Score [3] of second set of exam)
              const finalExam = result.exam_score ?? ''; // FINAL EXAM/80 (Exam Score [80%])
              const totalScore = result.final_score ?? ''; // TOTAL SCORE 100% (Final Score [100%])
              const c1 = result.activity_score ?? ''; // C1 (Activity Score [3] of first set of exam)
              const identifier = result.activity_score ?? ''; // IDENTIFIER (Activity Score [3])
              // Provide fallback for descriptor if not available
              const descriptor = result.descriptor ?? (() => {
                const activityNum = parseFloat(c1) || 0;
                if (activityNum >= 2.5) return 'Outstanding';
                if (activityNum >= 1.5) return 'Moderate';
                if (activityNum >= 0.9) return 'Basic';
                return '';
              })();
              const teacherInitials = result.teacher_initials ?? ''; // INIT (Subject Teacher)
              
              // Check if C2 data is available for this result
              const hasC2 = c2 !== undefined && c2 !== null && c2 !== '';
              const c2Column = hasC2 ? `<td style="border: 1px solid #000; padding: 4px; text-align: center;">${c2}</td>` : '';

              return `
                <tr>
                  <td style="border: 1px solid #000; padding: 4px; font-weight: bold;">${subject}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${avgScore}</td>
                  ${c2Column}
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${finalExam}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${totalScore}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${c1}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${identifier}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${descriptor}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center;">${teacherInitials}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="${student.results.some((r: any) => r.activity_score_2 !== undefined && r.activity_score_2 !== null && r.activity_score_2 !== '') ? '9' : '8'}" style="border: 1px solid #000; padding: 8px; text-align: center; color: #555;">N/A - Student did not sit for this term</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- SUMMARY -->
      <div class="summary">
        <div style="display: flex; align-items: center; gap: 20px;">
          <div><strong>AVERAGE SCORE / PTS (OUT OF 20) / IDENTIFIER:</strong> 17</div>
        </div>
        <div style="margin-top: 10px;">
          <div><strong>Overall Total Score:</strong> ${avg}</div>
          <div><strong>Overall Identifier:</strong> 2</div>
          <div><strong>Overall Learner Achievement:</strong> Moderate (Corresponding to Identifier 2)</div>
        </div>
      </div>

      <!-- KEY TERMS -->
      <div class="key-terms">
        <h3>KEY TERMS</h3>
        <p><strong>3:</strong> Accomplished (80% and above)</p>
        <p><strong>2:</strong> Moderate (60% - 79%)</p>
        <p><strong>1:</strong> Basic (50% - 59%)</p>
        <p><strong>Blank:</strong> Below Basic (Below 50%)</p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>Printed from: Pwezacore</div>
        <div>School Motto: '${school?.motto || 'Education the Future'}'</div>
      </div>
    </body>
    </html>
  `;
}

function generateOLevelReportHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? '';
  const totalDays = attendance.totalSchoolDays ?? '';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : '';
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', 'Times', serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .school-logo {
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: none;
        }
        
        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border: none;
        }
        
        .school-info {
          text-align: right;
          flex: 1;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 18pt;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        
        .school-contact {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .school-motto {
          font-size: 11pt;
          font-weight: bold;
          font-style: italic;
        }
        
        .student-photo {
          width: 80px;
          height: 96px;
          border: 2px solid #ccc;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        
        .student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .report-title {
          background: #4CAF50;
          color: white;
          text-align: center;
          padding: 10px;
          margin: 20px 0;
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-info {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .student-info div {
          margin-bottom: 5px;
        }
        
        .student-info strong {
          font-weight: bold;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
        }
        
        th {
          background: #4CAF50;
          color: white;
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .summary p {
          margin-bottom: 5px;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .next-term {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 20px;
        }
        
        .grading-system h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .description-table th {
          background: #f0f0f0;
          color: black;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9pt;
          margin-top: 20px;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.1;
          z-index: -1;
          pointer-events: none;
        }
        
        .watermark img {
          width: 900px;
          height: 900px;
          object-fit: contain;
        }
        
        .watermark-placeholder {
          width: 900px;
          height: 900px;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          font-size: 108pt;
          font-weight: bold;
          color: #ccc;
          text-align: center;
          line-height: 1.2;
        }
      </style>
    </head>
    <body>
      <!-- WATERMARK -->
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER - School Logo and Info -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">SCHOOL</div><div style="font-weight: bold;">LOGO</div></div>'}
        </div>
        
        <!-- School Name and Contact -->
        <div class="school-info">
          <div class="school-name">${school?.name || 'EMIRATES COLLEGE SCHOOL'}</div>
          <div class="school-contact">TEL :: ${school?.phone || '0701395594'} | EMAIL :: ${school?.email || 'info@emiratescollege.sc.ug'} | ${school?.address || 'P.O.BOX 31175, KAMPALA, UGANDA'}</div>
          <div class="school-motto">SCHOOL MOTTO: ${school?.motto || 'Education the Future'}</div>
        </div>
        
      </div>

      <!-- REPORT TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || '2'}, ${examSet?.year || '2025'}
      </div>

      <!-- Student Info and Photo - Side by side -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <!-- LEARNER INFO - Left side -->
        <div class="student-info" style="margin-bottom: 0;">
          <div><strong>LNo.:</strong> ${student.admission_number || student.student_id}</div>
          <div><strong>NAME:</strong> ${student.name}</div>
          <div><strong>CLASS & STREAM:</strong> ${student.current_class}</div>
        </div>
        
        <!-- Student Photo - Right side -->
        <div class="student-photo">
          ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">STUDENT<br/>PHOTO</div>'}
        </div>
      </div>

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>Subjects & Topics Covered</th>
            <th>Activity Score [3]</th>
            <th>Descriptor</th>
            <th>Formative Score [20%]</th>
            <th>Exam Score [80%]</th>
            <th>Final Score [100%]</th>
            <th>Grade</th>
            <th>Overall Remark</th>
            <th>Subject Teacher</th>
          </tr>
        </thead>
        <tbody>
          ${student.results.length > 0 ? 
            student.results.map((result: any) => {
              const activity = result.activity_score ?? '';
              const activityNum = parseFloat(activity) || 0;
              const descriptor = result.descriptor || (activityNum < 1 ? 'Missed' : activityNum < 2.5 ? 'Moderate' : 'Outstanding');
              const formative = result.formative_score ?? '';
              const exam = result.exam_score ?? '';
              const finalScore = result.final_score ?? '';
              const finalNum = parseFloat(finalScore) || 0;
              const gradeText = result.grade || (finalNum >= 80 ? 'A' : finalNum >= 70 ? 'B' : finalNum >= 60 ? 'C' : finalNum >= 50 ? 'D' : 'E');
              const overallRemark = result.overall_remark ?? '';
              const teacherInitials = result.teacher_initials ?? '';
              const topic = result.topic || '';

              return `
                <tr>
                  <td>
                    <strong>${result.subject}</strong>
                    <div style="font-size: 9pt; line-height: 1.2; margin-top: 2px;">
                      ${topic}
                    </div>
                  </td>
                  <td class="center">${activity}</td>
                  <td class="center">${descriptor}</td>
                  <td class="center">${formative}</td>
                  <td class="center">${exam}</td>
                  <td class="center">${finalScore}</td>
                  <td class="center">${gradeText}</td>
                  <td style="font-size: 9pt;">${overallRemark}</td>
                  <td class="center">${teacherInitials}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="9" class="center" style="color: #555;">N/A - Student did not sit for this term</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>AVERAGE SCORES:</strong> ${avg} ${avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>

      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <p>${student.comments?.class_teacher_text || 'Shafic is progressing well but needs to focus more on specific subject for better results.'}</p>
        <p>Name: ${student.comments?.class_teacher_name || '__________'} | Signature: ${student.comments?.class_teacher_signature || '__________'} | Date: ${student.comments?.class_teacher_date || '17 September, 2025'}</p>

        <h3>Head Teacher's Comment</h3>
        <p>${student.comments?.head_teacher_text || 'Shafic needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.'}</p>
        <p>Name: ${student.comments?.head_teacher_name || 'NAKIYINGI MARIAM'} | Signature: ${student.comments?.head_teacher_signature || '__________'} | Date: ${student.comments?.head_teacher_date || '17 September, 2025'}</p>
      </div>

      <div class="next-term">
        <strong>Next Term Begins:</strong> ${student?.nextTermBegins || 'Saturday, 13 September, 2025'}
      </div>

      <!-- Grading system & descriptions -->
      <div class="grading-system">
        <h3>Grading System</h3>
        <p><strong>80 - A | 70 - B | 50 - C | 40 - D | 0 - E</strong></p>
        
        <h3>Description</h3>
        <table class="description-table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Achievement Level</th>
              <th>Descriptor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A</td>
              <td>Exceptional</td>
              <td>Demonstrates an extraordinary level of competence by applying innovatively and creatively the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>B</td>
              <td>Outstanding</td>
              <td>Demonstrates a high level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>C</td>
              <td>Satisfactory</td>
              <td>Demonstrates an adequate level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>D</td>
              <td>Basic</td>
              <td>Demonstrates a minimum level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>E</td>
              <td>Elementary</td>
              <td>Demonstrates below the basic level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>Printed from: Pwezacore</div>
        <div>School Motto: '${school?.motto || 'Education the Future'}'</div>
      </div>
    </body>
    </html>
  `;
}

function generateSecondaryReportHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const nextTermBegins = student?.nextTermBegins || reportData?.nextTermBegins || '______________________';

  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays != null ? String(attendance.presentDays) : 'N/A';
  const totalDays = attendance.totalSchoolDays != null ? String(attendance.totalSchoolDays) : 'N/A';
  const daysAbsent = (attendance.presentDays != null && attendance.totalSchoolDays != null)
    ? String(Math.max(attendance.totalSchoolDays - attendance.presentDays, 0))
    : 'N/A';

  const avg = student.summary.average != null ? String(student.summary.average) : 'N/A';
  const avgGrade = student.summary.division != null ? String(student.summary.division) : 'N/A';
  const overallPerf = student.summary.performanceRemark != null ? String(student.summary.performanceRemark) : 'N/A';
  const projects = Array.isArray(student.projects) ? student.projects : [];
  const comments = student.comments || null;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', 'Times', serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .school-logo {
          width: 200px;
          height: 200px;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #f0f0f0;
          margin: 0 auto 15px;
        }
        
        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 18pt;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        
        .school-contact {
          font-size: 13pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .school-motto {
          font-size: 13pt;
          font-weight: bold;
          font-style: italic;
        }
        
        .report-title {
          text-align: center;
          margin: 20px 0;
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-meta {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .student-photo {
          width: 80px;
          height: 96px;
          border: 2px solid #ccc;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          float: right;
          margin-left: 20px;
        }
        
        .student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 9pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 4px;
          text-align: left;
        }
        
        th {
          background: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .next-term {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .grading-system h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          margin-bottom: 5px;
        }
        
        .footer {
          text-align: center;
          font-size: 9pt;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <!-- WATERMARK -->
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">SCHOOL</div><div style="font-weight: bold;">LOGO</div></div>'}
        </div>
        
        <div class="school-name">${school?.name || 'School Name'}</div>
        <div class="school-motto">"${school?.motto || 'Education the Future'}"</div>
        <div class="school-contact">TEL: ${school?.phone || 'Phone'} | EMAIL: ${school?.email || 'Email'} | ${school?.address || 'Address'}</div>
      </div>

      <!-- TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || ''}, ${examSet?.year || ''}
      </div>

      <!-- STUDENT META -->
      <div class="student-meta">
        <div class="student-photo">
          <div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>
        </div>
        <div>LNo. ${student.admission_number || student.student_id}    NAME: ${student.name}    CLASS & STREAM: ${student.current_class}</div>
      </div>

      <!-- ATTENDANCE TABLE -->
      <table>
        <thead>
          <tr>
            <th>Days Present</th>
            <th>Days Absent</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="center">${daysPresent}</td>
            <td class="center">${daysAbsent}</td>
            <td class="center">${totalDays}</td>
          </tr>
        </tbody>
      </table>

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>SUBJECT & PAPER</th>
            <th>MARKS OBTAINED</th>
            <th>TOTAL MARKS</th>
            <th>GRADE</th>
            <th>REMARK</th>
            <th>INITIALS</th>
          </tr>
        </thead>
        <tbody>
          ${student.results.length > 0 ? 
            student.results.map((result: any) => {
              const subject = result.subject ?? '';
              const marksObtained = result.marks_obtained != null ? String(result.marks_obtained) : '';
              const totalMarks = result.total_marks != null ? String(result.total_marks) : '';
              const grade = result.grade ?? '';
              const remark = result.remark ?? result.overall_remark ?? '';
              const initials = result.teacher_initials ?? result.teacher_name ?? '';

              return `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${subject}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${marksObtained}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${totalMarks}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grade}</td>
                  <td style="border: 1px solid #000; padding: 6px;">${remark}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${initials}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: center; color: #555;">N/A - Student did not sit for this term</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>AVERAGE SCORES:</strong> ${avg} ${avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>


      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <p>${comments?.class_teacher_text ?? '..............................................................'}</p>
        <p>Name: ${comments?.class_teacher_name ?? '__________'} | Signature: ${comments?.class_teacher_signature ?? '__________'} | Date: ${comments?.class_teacher_date ?? '__________'}</p>

        <h3>Head Teacher's Comment</h3>
        <p>${comments?.head_teacher_text ?? '..............................................................'}</p>
        <p>Name: ${comments?.head_teacher_name ?? '__________'} | Signature: ${comments?.head_teacher_signature ?? '__________'} | Date: ${comments?.head_teacher_date ?? '__________'}</p>
      </div>

      <!-- NEXT TERM & GRADING -->
      <div class="next-term">
        <strong>Next Term Begins:</strong> ${nextTermBegins}
      </div>

      <div class="grading-system">
        <h3>Grading System</h3>
        <p><strong>A (80–100) | B (70–79) | C (50–69) | D (40–49) | E (0–39)</strong></p>
        
        <h3>Grade Descriptions</h3>
        <p>A: Excellent mastery and application of concepts.</p>
        <p>B: Very good understanding with minor gaps.</p>
        <p>C: Satisfactory performance with notable room for improvement.</p>
        <p>D: Below average; needs significant improvement.</p>
        <p>E: Poor performance; urgent intervention required.</p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        Printed from: Pwezacore
      </div>
    </body>
    </html>
  `;
}

function generatePrimaryReportHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', 'Times', serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 16pt;
          margin-bottom: 10px;
        }
        
        .school-motto {
          font-size: 12pt;
          margin-bottom: 5px;
        }
        
        .school-contact {
          font-size: 10pt;
        }
        
        .report-title {
          text-align: center;
          margin: 20px 0;
          font-size: 14pt;
          font-weight: bold;
        }
        
        .section-title {
          font-size: 12pt;
          font-weight: bold;
          margin: 20px 0 10px 0;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
        }
        
        th {
          background: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .footer {
          text-align: center;
          font-size: 10pt;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <!-- School Header -->
      <div class="header">
        <div class="school-name">${school?.name || 'School Name'}</div>
        <div class="school-motto">${school?.motto || 'School Motto'}</div>
        <div class="school-contact">${school?.address || 'School Address'} | Tel: ${school?.phone || 'Phone'} | Email: ${school?.email || 'Email'}</div>
      </div>

      <!-- Report Title -->
      <div class="report-title">STUDENT REPORT</div>

      <!-- Student Information -->
      <div class="section-title">Student Information</div>
      <table>
        <tr>
          <td><strong>Name:</strong></td>
          <td>${student.name}</td>
        </tr>
        <tr>
          <td><strong>Admission No:</strong></td>
          <td>${student.admission_number || student.student_id}</td>
        </tr>
        <tr>
          <td><strong>Class:</strong></td>
          <td>${student.current_class}</td>
        </tr>
        <tr>
          <td><strong>Year:</strong></td>
          <td>${examSet.year}</td>
        </tr>
        <tr>
          <td><strong>Term:</strong></td>
          <td>${examSet.term}</td>
        </tr>
        <tr>
          <td><strong>Exam Set:</strong></td>
          <td>${examSet.name}</td>
        </tr>
      </table>

      <!-- Subject Performance -->
      <div class="section-title">Subject Performance</div>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Marks</th>
            <th>Grade</th>
            <th>Remarks</th>
            <th>Teacher Initials</th>
          </tr>
        </thead>
        <tbody>
          ${student.results.length > 0 ? 
            student.results.map((result: any) => {
              const gradeInfo = calculateGrade(result.marks_obtained, result.total_marks);
              return `
                <tr>
                  <td>${result.subject}</td>
                  <td class="center">${result.marks_obtained}/${result.total_marks}</td>
                  <td class="center">${gradeInfo.grade}</td>
                  <td class="center">${gradeInfo.remark}</td>
                  <td class="center">-</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="5" class="center" style="color: #555;">N/A - Student did not sit for this exam set</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- Summary -->
      <div class="section-title">Summary</div>
      <table>
        <tr>
          <td><strong>Total Marks:</strong></td>
          <td>${formatValue(student.summary.totalMarks)}/${formatValue(student.summary.totalPossibleMarks)}</td>
        </tr>
        <tr>
          <td><strong>Average:</strong></td>
          <td>${formatPercentage(student.summary.average)}</td>
        </tr>
        <tr>
          <td><strong>Aggregate:</strong></td>
          <td>${formatValue(student.summary.aggregate)}</td>
        </tr>
        <tr>
          <td><strong>Division:</strong></td>
          <td>${formatValue(student.summary.division)}</td>
        </tr>
        <tr>
          <td><strong>Class Position:</strong></td>
          <td>${formatPosition(student.summary.classPosition, student.summary.average)}</td>
        </tr>
        <tr>
          <td><strong>Stream Position:</strong></td>
          <td>${formatPosition(student.summary.streamPosition, student.summary.average)}</td>
        </tr>
        <tr>
          <td><strong>Attendance:</strong></td>
          <td>${formatAttendance(student.summary.attendanceDetails.presentDays, student.summary.attendanceDetails.totalSchoolDays, student.summary.attendancePercentage)}</td>
        </tr>
        <tr>
          <td><strong>Performance:</strong></td>
          <td>${formatValue(student.summary.performanceRemark)}</td>
        </tr>
      </table>

      <!-- Remarks -->
      <div class="section-title">Remarks</div>
      <p><strong>Class Teacher's Remarks:</strong></p>
      <p>&nbsp;</p>
      <p>&nbsp;</p>
      <p>&nbsp;</p>
      <p><strong>Head Teacher's Remarks:</strong></p>
      <p>&nbsp;</p>
      <p>&nbsp;</p>
      <p>&nbsp;</p>

      <!-- Footer -->
      <div class="footer">Printed from: Pwezacore</div>
    </body>
    </html>
  `;
}
