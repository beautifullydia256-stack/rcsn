import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import JSZip from 'jszip';
import { calculateGrade, formatCurrency, getAttendanceDetails, formatValue, formatPercentage, formatAttendance, formatPosition } from '@/src/lib/reportUtils';
import chromium from '@sparticuz/chromium';
import { supabase } from '@/src/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Helper function to check if class is O-Level
function isOLevelClass(className: string): boolean {
  if (!className) return false;
  const trimmed = className.trim();
  return /^(senior\s*[1-4]|s\s*[1-4])/i.test(trimmed);
}

// Helper function to load custom template from Supabase
async function loadCustomTemplate(schoolId: string, templateId?: string): Promise<{ html: string; css: string } | null> {
  try {
    // Use the imported supabase client
    
    let query = supabase
      .from('report_templates')
      .select('html_content, css_content')
      .eq('school_id', schoolId);
    
    if (templateId) {
      query = query.eq('id', templateId);
    } else {
      query = query.eq('is_default', true);
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) {
      console.log('No custom template found, using default');
      return null;
    }
    
    return {
      html: data.html_content,
      css: data.css_content || ''
    };
  } catch (error) {
    console.error('Error loading custom template:', error);
    return null;
  }
}

// Helper function to replace placeholders in custom template
function replaceTemplatePlaceholders(html: string, css: string, reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null): string {
  const { school, examSet, students } = reportData;
  const student = students[0];
  
  // Replace common placeholders
  let processedHtml = html
    .replace(/\[SCHOOL_NAME\]/g, school?.name || 'School Name')
    .replace(/\[SCHOOL_ADDRESS\]/g, school?.address || 'Address')
    .replace(/\[SCHOOL_PHONE\]/g, school?.phone || 'Phone')
    .replace(/\[SCHOOL_EMAIL\]/g, school?.email || 'Email')
    .replace(/\[SCHOOL_MOTTO\]/g, school?.motto || 'Motto')
    .replace(/\[STUDENT_ID\]/g, student.admission_number || student.student_id || '')
    .replace(/\[STUDENT_NAME\]/g, student.name || '')
    .replace(/\[STUDENT_CLASS\]/g, student.current_class || '')
    .replace(/\[TERM\]/g, examSet?.term || '')
    .replace(/\[YEAR\]/g, examSet?.year || '')
    .replace(/\[AVERAGE_SCORE\]/g, student.summary?.average || '')
    .replace(/\[OVERALL_GRADE\]/g, student.summary?.division || '')
    .replace(/\[POSITION\]/g, student.summary?.position || '')
    .replace(/\[TEACHER_COMMENT\]/g, student.comments?.class_teacher_text || '')
    .replace(/\[TEACHER_NAME\]/g, student.comments?.class_teacher_name || '')
    .replace(/\[DATE\]/g, new Date().toLocaleDateString());
  
  // Replace school logo
  if (schoolLogoBase64) {
    processedHtml = processedHtml.replace(
      /<div[^>]*class="[^"]*school-logo[^"]*"[^>]*>[\s\S]*?<\/div>/g,
      `<div class="school-logo"><img src="${schoolLogoBase64}" alt="School Logo" /></div>`
    );
  }
  
  // Replace student photo
  if (studentPhotoBase64) {
    processedHtml = processedHtml.replace(
      /<div[^>]*class="[^"]*student-photo[^"]*"[^>]*>[\s\S]*?<\/div>/g,
      `<div class="student-photo"><img src="${studentPhotoBase64}" alt="Student Photo" /></div>`
    );
  }
  
  // Replace results table with actual data
  if (student.results && student.results.length > 0) {
    const resultsRows = student.results.map((result: any) => `
      <tr>
        <td>${result.subject || ''}</td>
        <td>${result.marks_obtained || result.exam_score || ''}</td>
        <td>${result.total_marks || '100'}</td>
        <td>${result.grade || ''}</td>
        <td>${result.remark || result.overall_remark || ''}</td>
      </tr>
    `).join('');
    
    processedHtml = processedHtml.replace(
      /<tbody>[\s\S]*?<\/tbody>/g,
      `<tbody>${resultsRows}</tbody>`
    );
  }
  
  // For primary format (non O-Level), strip attendance table/fields so PDF matches preview
  try {
    const isPrimary = !isOLevelClass(student.current_class || '');
    if (isPrimary) {
      // Remove attendance placeholders if present
      processedHtml = processedHtml
        .replace(/\[DAYS_PRESENT\]/g, '')
        .replace(/\[DAYS_ABSENT\]/g, '')
        .replace(/\[TOTAL_DAYS\]/g, '');
      // Remove any table that contains Days Present/Days Absent/Total in header
      processedHtml = processedHtml.replace(/<table[\s\S]*?<thead>[\s\S]*?<tr>[\s\S]*?<th>\s*Days\s*Present\s*<\/th>[\s\S]*?<th>\s*Days\s*Absent\s*<\/th>[\s\S]*?<th>\s*Total\s*<\/th>[\s\S]*?<\/tr>[\s\S]*?<\/thead>[\s\S]*?<\/table>/i, '');
    }
  } catch {}
  
  return processedHtml;
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
  console.log('=== PDF GENERATION STARTED ===');
  console.log('Starting PDF generation for student:', reportData.students[0]?.name, 'using template:', template);
  console.log('Report data structure:', JSON.stringify(reportData, null, 2));
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
  
  // Check if this is an O-Level class and use the appropriate template
  console.log('=== TEMPLATE SELECTION DEBUG ===');
  console.log('Student class:', student.current_class);
  console.log('Is O-Level class:', isOLevelClass(student.current_class));
  console.log('Template parameter received:', template);
  console.log('Template parameter type:', typeof template);
  console.log('Template parameter === "template1":', template === 'template1');
  console.log('Template parameter === "template2":', template === 'template2');
  console.log('Template parameter === "template3":', template === 'template3');
  
  // Initialize htmlContent variable
  let htmlContent = '';
  
  // Try to load custom template if template ID is provided
  if (template && template.startsWith('custom_')) {
    const templateId = template.replace('custom_', '');
    console.log('Loading custom template with ID:', templateId);
    
    try {
      const customTemplate = await loadCustomTemplate(school.id, templateId);
      if (customTemplate) {
        console.log('✅ Using custom template');
        htmlContent = replaceTemplatePlaceholders(
          customTemplate.html, 
          customTemplate.css, 
          reportData, 
          schoolLogoBase64, 
          studentPhotoBase64
        );
      } else {
        console.log('❌ Custom template not found, falling back to default');
        // Fall back to default template logic below
      }
    } catch (error) {
      console.error('Error loading custom template:', error);
      // Fall back to default template logic below
    }
  }
  
  // Use default templates if no custom template was loaded
  if (!htmlContent) {
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
      // Non O-Level classes → decide based on selected template and class (Primary)
      const currentClass = (reportData.students?.[0]?.current_class || '').toString();
      const isLowerSection = /(primary\s*1|primary\s*2|primary\s*3|p\.\s*1|p1|p\.\s*2|p2|p\.\s*3|p3)/i.test(currentClass);

      if (template === 'template3' || isLowerSection) {
        console.log('Using Primary Lower Section Template (template3)');
        htmlContent = generateTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);
      } else if (template === 'template2') {
        console.log('Using Primary Nursery/Middle/Top template2 HTML');
        htmlContent = generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
      } else {
        console.log('Using Secondary/Default template for non O-Level');
        htmlContent = generateSecondaryReportHTML(reportData, schoolLogoBase64, studentPhotoBase64);
      }
    }
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
          margin-bottom: 12px;
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
          padding: 8px;
          margin: 12px 0;
          font-size: 12.5pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-info {
          margin-bottom: 12px;
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
          margin-bottom: 12px;
          font-size: 9.5pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 4px;
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
          margin-bottom: 10px;
          font-size: 10.5pt;
        }
        
        .summary p {
          margin-bottom: 5px;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 12px;
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

      <!-- COMMENTS (Reworked per request) -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <div style="height: 60px; border-bottom: 1px solid #000; margin-bottom: 8px;"></div>
        <p>Name: ${student.comments?.class_teacher_name || ''} | Signature: ____________________</p>

        <h3>Head Teacher's Comment</h3>
        <div style="height: 60px; border-bottom: 1px solid #000; margin-bottom: 8px;"></div>
        <p>Name: ${student.comments?.head_teacher_name || ''} | Signature: ____________________</p>
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
          font-size: 9pt;
          font-weight: normal;
          margin-bottom: 5px;
        }
        
        .school-motto {
          font-size: 10pt;
          font-weight: normal;
          font-style: italic;
          margin-bottom: 5px;
        }
        
        .report-title {
          text-align: center;
          margin: 20px 0;
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
          color: black;
        }
        
        .student-info {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .student-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
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
          <div class="school-motto">"${school?.motto || 'WITH GOD, WE CAN'}"</div>
          <div class="school-contact">P.O BOX 10 KALISIZO (U), ${school?.email || 'st.adriankasozisec@gmail.com'}, ${school?.phone || '0772/754-642058'}</div>
        </div>
      </div>

      <!-- REPORT TITLE -->
      <div class="report-title">
        MIDDLE & TOP CLASS - TERMLY REPORT
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
            <th>FULL MARKS</th>
            <th>MID TERM</th>
            <th>END OF TERM</th>
            <th>TEACHER'S REMARKS</th>
            <th>INITIALS</th>
          </tr>
        </thead>
        <tbody>
          ${student.results.length > 0 ? 
            (() => {
              // Group results by subject for processed data
              const all = Array.isArray(student.results) ? student.results : [];
              const isMid = (name: any) => {
                const n = String(name || '').trim().toLowerCase();
                return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
              };
              const isEnd = (name: any) => {
                const n = String(name || '').trim().toLowerCase();
                return n === 'end of term' || n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
              };
              
              const subjectGroups: { [key: string]: { mid?: any; end?: any; subject: string; total_marks: number; remarks: string; initials: string } } = {};
              
              all.forEach((r: any) => {
                const subject = r.subject ?? '';
                const examSetName = r.exam_set_name || '';
                
                if (!subjectGroups[subject]) {
                  subjectGroups[subject] = {
                    subject,
                    total_marks: r.total_marks ?? 100,
                    remarks: '',
                    initials: ''
                  };
                }
                
                if (isMid(examSetName)) {
                  subjectGroups[subject].mid = r.grade === 'MISSED' ? 'MISSED' : (r.marks_obtained ?? '');
                  // Use Mid Term results for remarks and initials if End of Term not available
                  if (!subjectGroups[subject].remarks) {
                    subjectGroups[subject].remarks = r.teacher_remark || '';
                    subjectGroups[subject].initials = r.teacher_initials ?? '';
                  }
                } else if (isEnd(examSetName)) {
                  subjectGroups[subject].end = r.grade === 'MISSED' ? 'MISSED' : (r.marks_obtained ?? '');
                  // Use pre-processed teacher remarks from the processed table
                  subjectGroups[subject].remarks = r.teacher_remark || '';
                  subjectGroups[subject].initials = r.teacher_initials ?? '';
                }
              });
              
              // If no remarks found from any exam set, use any available remarks
              Object.values(subjectGroups).forEach((group: any) => {
                if (!group.remarks) {
                  const anyResult = all.find((r: any) => r.subject === group.subject);
                  if (anyResult) {
                    group.remarks = anyResult.teacher_remark || '';
                    group.initials = anyResult.teacher_initials ?? '';
                  }
                }
              });
              
              const subjects = Object.values(subjectGroups);
              
              return subjects.map((group, idx) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${group.subject}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.total_marks}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.mid ?? ''}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.end ?? ''}</td>
                  <td style="border: 1px solid #000; padding: 6px;">${group.remarks}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.initials}</td>
                </tr>
              `).join('');
            })() : `
              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: center; color: #555;">No results available</td>
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
        <h3><strong>Class Teacher's Comment:</strong> ${student.results && student.results.length > 0 ? student.results[0].class_teacher_comment || 'Student is progressing well but needs to focus more on specific subjects for better results.' : 'Student is progressing well but needs to focus more on specific subjects for better results.'}</h3>
        <p>Signature: ______________________</p>

        <h3><strong>Head Teacher's Comment:</strong> ${student.results && student.results.length > 0 ? student.results[0].headteacher_comment || 'Student needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.' : 'Student needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.'}</h3>
        <p>Signature: ______________________</p>
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
  const totalFullMarks = (student.results || []).reduce((sum: number) => sum + 100, 0);

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
        
        .next-term p {
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

      <!-- SUBJECTS TABLE - LOWER SECTION (P.1 - P.3) -->
      <table style="width:100%; border-collapse:collapse; margin-bottom: 20px; font-size: 9pt;">
        <thead>
          <tr>
            <th style="border: 1px solid #000; padding: 6px; text-align: left;">SUBJECT</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">FULL MARKS</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">MID TERM</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">END OF TERM</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">TEACHER'S REMARKS</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">INITIALS</th>
          </tr>
        </thead>
        <tbody>
          ${ (() => {
            const all = Array.isArray(student.results) ? student.results : [];
            const isMid = (name: any) => {
              const n = String(name || '').trim().toLowerCase();
              return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
            };
            const isEnd = (name: any) => {
              const n = String(name || '').trim().toLowerCase();
              return n === 'end of term' || n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
            };
            
            // Group results by subject
            const subjectGroups: { [key: string]: { mid?: any; end?: any; subject: string; total_marks: number; remarks: string; initials: string } } = {};
            
            all.forEach((r: any) => {
              const subject = r.subject ?? '';
              const examSetName = r.exam_sets?.name || '';
              
              if (!subjectGroups[subject]) {
                subjectGroups[subject] = {
                  subject,
                  total_marks: r.total_marks ?? 100,
                  remarks: r.remarks || r.overall_remark || '',
                  initials: r.teacher_initials ?? ''
                };
              }
              
              if (isMid(examSetName)) {
                subjectGroups[subject].mid = r.marks_obtained ?? '';
              } else if (isEnd(examSetName)) {
                subjectGroups[subject].end = r.marks_obtained ?? '';
              }
            });
            
            const subjects = Object.values(subjectGroups);
            
            return subjects.length > 0 ? subjects.map((group) => `
              <tr>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: left;">${group.subject}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.total_marks}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.mid ?? ''}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.end ?? ''}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: left;">${group.remarks}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.initials}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: center; color: #555;">No results available</td>
              </tr>
            `;
          })()}
          <tr>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: left;">TOTAL</td>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: center;">${totalFullMarks}</td>
            <td style="border: 1px solid #000; padding: 6px;"></td>
            <td style="border: 1px solid #000; padding: 6px;"></td>
            <td style="border: 1px solid #000; padding: 6px;" colspan="2"></td>
          </tr>
        </tbody>
      </table>

      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comments:</h3>
        <p>${student.comments?.class_teacher_text || '..............................................................'}</p>
        <p>Signature: ______________________</p>

        <h3>Headteacher's Comments:</h3>
        <p>${student.comments?.head_teacher_text || '..............................................................'}</p>
        <p>Signature: ______________________</p>
      </div>

      <!-- NEXT TERM -->
      <div class="next-term">
        <p><strong>Next term begins on:</strong> ____________________</p>
        <p><strong>End on:</strong> ____________________</p>
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

  // We no longer include attendance block for primary/secondary non O-Level
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
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .school-motto {
          font-size: 11pt;
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
          font-size: 11pt;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .student-info {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
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
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">SCHOOL</div><div style="font-weight: bold;">LOGO</div></div>'}
        </div>
        
        <!-- School Info -->
        <div class="school-info">
          <div class="school-name">${school?.name || 'School Name'}</div>
          <div class="school-contact">TEL: ${school?.phone || 'Phone'} | EMAIL: ${school?.email || 'Email'} | ${school?.address || 'Address'}</div>
          <div class="school-motto">SCHOOL MOTTO: ${school?.motto || 'Education the Future'}</div>
        </div>
      </div>

      <!-- TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || ''}, ${examSet?.year || ''}
      </div>

      <!-- STUDENT META -->
      <div class="student-meta">
        <div class="student-info">
          <div><strong>LNo.</strong> ${student.admission_number || student.student_id}</div>
          <div><strong>NAME:</strong> ${student.name}</div>
          <div><strong>CLASS & STREAM:</strong> ${student.current_class}</div>
        </div>
        
        <!-- Student Photo -->
        <div class="student-photo">
          ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>'}
        </div>
      </div>

      <!-- ATTENDANCE TABLE REMOVED PER REQUIREMENT -->

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
          ${(() => {
            const coreNames = ['english','mathematics','science','social studies','sst'];
            const core = (student.results || []).filter((r:any) => coreNames.includes(String(r.subject||'').toLowerCase())).slice(0,4);
            return core.length > 0 ? core.map((result: any) => {
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
            `;
          })()}
        </tbody>
      </table>

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
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
      ${(() => {
        const all = Array.isArray(student.results) ? student.results : [];
        
        // Debug: log all exam set names to see what we're working with
        console.log('=== REPORT DEBUG ===');
        console.log('Total results found:', all.length);
        console.log('All exam set names found:', all.map(r => r.exam_sets?.name || 'NO_NAME').join(', '));
        console.log('First result structure:', JSON.stringify(all[0], null, 2));
        
        const isMid = (name: any) => {
          const n = String(name || '').trim().toLowerCase();
          return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
        };
        const isEnd = (name: any) => {
          const n = String(name || '').trim().toLowerCase();
          return n === 'end of term' || n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
        };
        const mid = all.filter((r:any) => isMid(r.exam_sets?.name || r.exam_set_name || r.exam_set || r.set_name || r.exam_set_id || r.exam_set_title));
        const end = all.filter((r:any) => isEnd(r.exam_sets?.name || r.exam_set_name || r.exam_set || r.set_name || r.exam_set_id || r.exam_set_title));
        
        // If no results are found in either category, show all results in both sections
        const hasMidResults = mid.length > 0;
        const hasEndResults = end.length > 0;
        const showAllInBoth = !hasMidResults && !hasEndResults && all.length > 0;
        
        console.log('Mid results count:', mid.length);
        console.log('End results count:', end.length);
        console.log('Show all in both:', showAllInBoth);

        const renderRows = (rows: any[]) => rows.length > 0 ? rows.map((result: any) => {
          const gradeInfo = calculateGrade(result.marks_obtained, result.total_marks);
          return `
            <tr>
              <td>${result.subject || ''}</td>
              <td class="center">${result.marks_obtained ?? ''}/${result.total_marks ?? ''}</td>
              <td class="center">${gradeInfo.grade}</td>
              <td class="center">${gradeInfo.remark}</td>
              <td class="center">${result.teacher_initials || '-'}</td>
            </tr>
          `;
        }).join('') : `
          <tr>
            <td colspan="5" class="center" style="color: #555;">N/A</td>
          </tr>
        `;

        return `
          <div style="margin-bottom: 8px; font-weight: bold;">MID TERM</div>
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
              ${renderRows(showAllInBoth ? all : mid)}
            </tbody>
          </table>

          <div style="margin: 16px 0 8px; font-weight: bold;">END OF TERM</div>
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
              ${renderRows(showAllInBoth ? all : end)}
            </tbody>
          </table>
        `;
      })()}

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
