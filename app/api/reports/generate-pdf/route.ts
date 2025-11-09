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
    
    // Add timeout to fetch request (optimized for faster processing)
    const controller = new AbortController();
    const timeout = process.env.VERCEL === '1' ? 2000 : 3000; // Reduced timeout for faster processing
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
    const { reportData, type, template, htmlContent } = await request.json();
    
    // If htmlContent is provided, render it directly (exact preview match)
    if (htmlContent && typeof htmlContent === 'string') {
      console.log('Rendering provided HTML content directly (exact preview match)');
      const pdfBuffer = await renderHTMLToPDF(htmlContent);
      
      const filename = type === 'single' && reportData?.students?.[0] 
        ? `${reportData.students[0].name}_${reportData.students[0].current_class}_Report_${reportData.examSet?.name || 'Report'}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_')
        : 'report.pdf';
      
      return new NextResponse(pdfBuffer as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // Fallback to original method if no htmlContent
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

// Function to render HTML directly to PDF (exact preview match)
async function renderHTMLToPDF(htmlContent: string): Promise<Buffer> {
  const isVercel = process.env.VERCEL === '1';
  let browser;
  
  try {
    if (isVercel) {
      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote'
        ],
        executablePath: await chromium.executablePath(),
        headless: true,
        timeout: 20000
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        timeout: 20000
      });
    }
  } catch (error) {
    // Fallback
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
      timeout: 20000
    });
  }

  try {
    const page = await browser.newPage();
    
    // Set viewport to match A4
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    
    // Set content - use load for faster rendering
    await page.setContent(htmlContent, { 
      waitUntil: 'load',
      timeout: 8000 
    });
    
    // Brief wait for fonts
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate PDF with exact settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      printBackground: true,
      preferCSSPageSize: false,
      scale: 1.0,
      width: '210mm',
      height: '297mm',
      timeout: 10000
    });
    
    await page.close();
    await browser.close();
    
    return pdfBuffer as Buffer;
  } catch (error) {
    await browser.close();
    throw error;
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

  // Convert images to base64 for embedding (parallel processing for faster execution)
  console.log('Converting images to base64...');
  let schoolLogoBase64 = null;
  let studentPhotoBase64 = null;
  
  // Process images in parallel with timeout protection
  const imagePromises = [
    school?.logo ? convertImageToBase64(school.logo).catch(() => null) : Promise.resolve(null),
    student?.profile_photo ? convertImageToBase64(student.profile_photo).catch(() => null) : Promise.resolve(null)
  ];
  
  // Wait for both with a maximum timeout
  try {
    const results = await Promise.allSettled(imagePromises);
    schoolLogoBase64 = results[0].status === 'fulfilled' ? results[0].value : null;
    studentPhotoBase64 = results[1].status === 'fulfilled' ? results[1].value : null;
  } catch (error) {
    console.error('Error converting images:', error);
    // Continue with null values - images are optional
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
      const isUpperSection = /(primary\s*[4567]|p\.\s*[4567]|p[4567])/i.test(currentClass);

      if (template === 'template4' || (isUpperSection && template !== 'template3')) {
        console.log('Using Primary Upper Section Template (template4)');
        htmlContent = generateTemplate4UpperSectionHTML(reportData, schoolLogoBase64, studentPhotoBase64);
      } else if (template === 'template3' || isLowerSection) {
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
        timeout: 20000 // Reduced timeout for faster startup
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
        timeout: 20000 // Reduced timeout for faster startup
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
        timeout: 20000 // Reduced timeout for faster startup
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
    
    // Set content - use load instead of networkidle0 for faster rendering
    console.log('Setting page content...');
    try {
      await page.setContent(htmlContent, { 
        waitUntil: 'load',
        timeout: 8000 
      });
      console.log('Page content set successfully with load');
    } catch (contentError) {
      console.error('Failed to set content with load, trying domcontentloaded:', contentError);
      // Fallback to domcontentloaded
      await page.setContent(htmlContent, { 
        waitUntil: 'domcontentloaded',
        timeout: 5000 
      });
      console.log('Page content set successfully with domcontentloaded');
    }
    
    // Brief wait for fonts and images (reduced from 2000ms to 500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
      timeout: 10000 // Reduced timeout for faster processing
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
          padding: 4mm 5mm 5mm;
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
          margin-bottom: 8px;
        }
        
        .school-logo {
          width: 128px;
          height: 128px;
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

        .nursery-student-info {
          margin-bottom: 12px;
        }

        .nursery-student-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          background: #ffffff;
          border: 1px solid rgba(59,130,246,0.35);
          border-radius: 12px;
          padding: 10px 12px;
          box-shadow: 0 2px 6px rgba(30,64,175,0.10);
        }

        .nursery-student-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 22px;
          font-size: 9.8pt;
        }

        .nursery-student-grid strong {
          color: #1e3a8a;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .nursery-student-grid div {
          color: #1f2937;
        }

        .nursery-student-photo {
          width: 2.1cm;
          height: 2.9cm;
          border: 1px solid rgba(59,130,246,0.45);
          background: #fff;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 4px 10px rgba(30, 64, 175, 0.12);
        }

        .nursery-student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .nursery-photo-placeholder {
          font-size: 10px;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: #f8fafc;
          font-weight: 600;
          letter-spacing: 0.08em;
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

  const streamDisplay = student?.stream
    || student?.current_stream
    || student?.stream_name
    || student?.class_stream
    || student?.section
    || 'N/A';

  const reportDateDisplay = (() => {
    const raw = examSet?.date || student?.report_date || student?.summary?.reportDate;
    if (!raw) return 'N/A';
    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? String(raw) : parsed.toLocaleDateString();
  })();

  const contactEmail = school?.contact_email || school?.email || '';
  const contactPhone = school?.contact_phone || school?.phone || '';
  const addressLine = [school?.address, school?.pobox].filter(Boolean).join(' ');
  const headerMetaItems = [
    student?.current_class ? `Class: ${student.current_class}` : null,
    streamDisplay && streamDisplay !== 'N/A' ? `Stream: ${streamDisplay}` : null,
    examSet?.term ? `Term: ${examSet.term}` : null,
    examSet?.year ? `Year: ${examSet.year}` : null,
  ].filter(Boolean) as string[];
  const headerMetaLine = headerMetaItems.join(' • ');
  const headerDividerColor = school?.header_divider_color || '#1e3a8a';
  const headerDividerLight = school?.header_divider_color ? lightenColor(school.header_divider_color) : '#60a5fa';
  const studentPhotoSrc = (() => {
    if (typeof studentPhotoBase64 === 'string' && studentPhotoBase64.length > 0) {
      return studentPhotoBase64.startsWith('data:')
        ? studentPhotoBase64
        : `data:image/png;base64,${studentPhotoBase64}`;
    }
    if (typeof student?.profile_photo === 'string' && student.profile_photo.length > 0) {
      return student.profile_photo;
    }
    return null;
  })();

  const nurserySkillRowsHtml = NURSERY_SKILL_GRID.map(row => {
    const cells = row.map(skill => {
      if (!skill.label) {
        return '<td style="border: 1px solid #000; padding: 8px 6px; min-height: 42px; background: #ffffff;">&nbsp;</td>';
      }

      const performanceWord = resolveNurseryPerformanceValue(student, skill);
      const fallbackColor = '#e2e8f0';
      const accentColor = performanceWord ? NURSERY_PERFORMANCE_COLOR_MAP[performanceWord] : fallbackColor;
      const textColor = getReadableTextColor(accentColor);
      const cellBackground = performanceWord
        ? `linear-gradient(145deg, ${lightenColor(accentColor)} 0%, ${accentColor} 100%)`
        : '#f8fafc';
      const labelColor = performanceWord
        ? (textColor === '#ffffff' ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.9)')
        : '#1f2937';
      const wordDisplay = performanceWord || 'Awaiting';
      const wordColor = performanceWord ? textColor : '#475569';
      const wordBackground = performanceWord
        ? (textColor === '#ffffff' ? 'rgba(255,255,255,0.18)' : 'rgba(15,23,42,0.12)')
        : 'rgba(148,163,184,0.22)';
      const wordBorderColor = performanceWord ? applyAlphaToHex(accentColor, 0.6) : 'rgba(148,163,184,0.45)';
      const cellBorderColor = performanceWord ? accentColor : 'rgba(15,23,42,0.15)';
      const cellShadow = performanceWord
        ? `0 12px 26px ${applyAlphaToHex(accentColor, 0.32)}`
        : 'inset 0 0 0 1px rgba(148,163,184,0.25)';
      const wordShadow = performanceWord
        ? (textColor === '#ffffff' ? 'text-shadow: 0 1px 2px rgba(15,23,42,0.3);' : 'text-shadow: 0 4px 10px rgba(15,23,42,0.12);')
        : '';
      const wordBoxShadow = performanceWord
        ? `0 8px 18px ${applyAlphaToHex(accentColor, 0.24)}`
        : 'inset 0 0 0 1px rgba(148,163,184,0.18)';

      const cellBaseStyles = [
        `border: 1px solid ${cellBorderColor}`,
        'padding: 8px 6px',
        'min-height: 48px',
        'text-align: center',
        'vertical-align: middle',
        'font-weight: 600',
        `background: ${cellBackground}`,
        `color: ${wordColor}`,
        `box-shadow: ${cellShadow}`
      ];

      return `
        <td style="${cellBaseStyles.join('; ')}">
          <div class="nursery-skill-cell">
            <span class="nursery-skill-label" style="color: ${labelColor};">${skill.label}</span>
            <span class="nursery-skill-value" style="
              display: inline-block;
              padding: 4px 14px;
              min-width: 64px;
              border-radius: 999px;
              font-size: 10pt;
              font-weight: 700;
              letter-spacing: 0.03em;
              text-transform: uppercase;
              background: ${wordBackground};
              color: ${wordColor};
              border: 1px solid ${wordBorderColor};
              box-shadow: ${wordBoxShadow};
              ${wordShadow}
              ${performanceWord ? '' : 'font-style: italic; opacity: 0.75;'}
            ">${wordDisplay}</span>
          </div>
        </td>
      `;
    }).join('');

    return `<tr>${cells}</tr>`;
  }).join('');

  const nurseryLegendHtml = NURSERY_PERFORMANCE_OPTIONS.map(({ label, color }) => `
    <div class="nursery-legend-item">
      <span class="nursery-legend-swatch" style="background: ${color}"></span>
      <span>${label}</span>
    </div>
  `).join('');

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
          padding: 0.25cm 0.35cm 0.4cm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .print-header-container {
          padding-top: 0.3cm;
          padding-bottom: 0.12cm;
          padding-right: 0.32cm;
          background: transparent;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .header-flex {
          display: flex;
          align-items: center;
          min-height: 2cm;
          position: relative;
        }
        
        .header-logo {
          width: 120px;
          height: 120px;
          position: absolute;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          border: none;
        }
        
        .header-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .header-logo-placeholder {
          width: 100%;
          height: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          color: #9ca3af;
          font-size: 9pt;
          text-align: center;
          padding: 8px;
        }
        
        .header-center {
          flex: 1;
          margin-left: 120px;
          padding-left: 0.28cm;
          text-align: center;
          font-family: 'Times New Roman', 'Times', serif;
        }
        
        .school-name {
          font-weight: 700;
          font-size: 16pt;
          font-family: Arial, Helvetica, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.045em;
          line-height: 1.06;
          margin: 0 0 0.2cm 0;
          color: ${school?.header_school_name_color || '#1e3a8a'};
          white-space: nowrap;
        }
        
        .school-subtitle {
          font-size: 11pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-weight: 400;
          color: ${school?.header_subtitle_color || '#3b82f6'};
          margin-bottom: 0.16cm;
          line-height: 1.3;
        }
        
        .school-address {
          font-size: 11pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-weight: 600;
          color: ${school?.header_address_color || '#1e40af'};
          margin-bottom: 0.16cm;
          line-height: 1.28;
        }
        
        .school-contact {
          font-size: 10.8pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-weight: 600;
          color: ${school?.header_contact_color || '#1e40af'};
          margin-bottom: 0.16cm;
          line-height: 1.28;
        }
        
        .school-motto {
          font-size: 9.8pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-style: italic;
          font-weight: 600;
          color: ${school?.header_motto_color || '#2563eb'};
          margin-bottom: 0.2cm;
          line-height: 1.32;
        }
        
        .header-divider {
          height: 1px;
          background: linear-gradient(to right, ${headerDividerColor} 0%, ${headerDividerLight} 50%, ${headerDividerColor} 100%);
          margin-top: 0.2cm;
          margin-bottom: 0.18cm;
        }
        
        .report-banner {
          text-align: center;
          margin-bottom: 0.18cm;
        }
        
        .report-chip {
          display: inline-block;
          padding: 6px 22px;
          border-radius: 18px;
          font-size: 9.2pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #1e3a8a;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }
        
        .report-meta {
          font-size: 7.5pt;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-top: 4px;
          color: #1f2937;
        }
        
        .student-info {
          margin-bottom: 18px;
          font-size: 11pt;
        }
        
        .student-info-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .student-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
          margin-bottom: 12px;
        }
        
        .student-photo {
          width: 21mm;
          height: 29mm;
          border: 1px solid #60a5fa;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          float: right;
          margin-left: 14px;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
        }
        
        .student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
          font-size: 10pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
        }
        
        th {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 600;
          text-align: center;
        }
        
        .nursery-skill-section {
          margin-bottom: 12px;
        }
        
        .nursery-heading {
          font-size: 11pt;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #0f172a;
        }

        .nursery-skill-table td {
          border: 1px solid #000;
          padding: 0;
        }

        .nursery-skill-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 40px;
          padding: 10px 6px;
        }

        .nursery-skill-label {
          font-size: 8.5pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .nursery-skill-value {
          font-size: 10pt;
          font-weight: 700;
        }

        .nursery-legend {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 18px;
          margin-top: 14px;
          font-size: 9.5pt;
        }

        .nursery-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .nursery-legend-swatch {
          width: 18px;
          height: 18px;
          border: 1px solid #0f172a;
          border-radius: 4px;
          display: inline-block;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
          font-size: 10pt;
        }
        
        .summary-card {
          border: 1px solid #94a3b8;
          padding: 8px;
          border-radius: 6px;
        }
        
        .comments {
          margin-bottom: 18px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: 600;
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
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.15;
          z-index: 0;
          pointer-events: none;
        }
        
        .watermark img {
          width: 58%;
          max-width: 550px;
          object-fit: contain;
        }
      </style>
    </head>
    <body>
      ${
        (schoolLogoBase64 || school?.logo_url || school?.logo)
          ? `
      <div class="watermark">
              <img src="${schoolLogoBase64 ? `data:image/png;base64,${schoolLogoBase64}` : (school.logo_url || school.logo)}" alt="School Watermark" />
      </div>
          `
          : ''
      }
      
      <div class="print-header-container">
        <div class="header-flex">
          <div class="header-logo">
            ${
              schoolLogoBase64
                ? `<img src="data:image/png;base64,${schoolLogoBase64}" alt="School Logo" />`
                : (school?.logo_url || school?.logo)
                  ? `<img src="${school.logo_url || school.logo}" alt="School Logo" />`
                  : `<div class="header-logo-placeholder">School<br/>Logo</div>`
            }
        </div>
          <div class="header-center">
            ${school?.name ? `<div class="school-name">${school.name}</div>` : ''}
            ${school?.subtitle ? `<div class="school-subtitle">${school.subtitle}</div>` : ''}
            ${addressLine ? `<div class="school-address">${addressLine}</div>` : ''}
            ${(contactEmail || contactPhone) ? `
              <div class="school-contact">
                ${contactEmail ? `<span>${contactEmail}</span>` : ''}
                ${(contactEmail && contactPhone) ? `<span style="margin: 0 8px; color: #64748b;">|</span>` : ''}
                ${contactPhone ? `<span>${contactPhone}</span>` : ''}
        </div>
            ` : ''}
            ${school?.motto ? `<div class="school-motto">"${school.motto}"</div>` : ''}
      </div>
        </div>
        <div class="header-divider"></div>
        <div class="report-banner">
          <div class="report-chip">MIDDLE &amp; TOP CLASS - TERMLY REPORT</div>
          ${headerMetaLine ? `<div class="report-meta">${headerMetaLine}</div>` : ''}
        </div>
      </div>

      <!-- STUDENT INFO -->
      <div class="student-info nursery-student-info">
        <div class="nursery-student-row">
          <div class="nursery-student-grid">
            <div><strong>STUDENT'S NAME:</strong> ${student.name}</div>
            <div><strong>YEAR:</strong> ${examSet?.year || new Date().getFullYear()}</div>
            <div><strong>STREAM:</strong> ${streamDisplay}</div>
            <div><strong>CLASS:</strong> ${student.current_class}</div>
            <div><strong>ADMISSION NO:</strong> ${student.admission_number || student.student_id}</div>
            <div><strong>TERM:</strong> ${examSet?.term || 'N/A'}</div>
            <div><strong>REPORT DATE:</strong> ${reportDateDisplay}</div>
          </div>
          <div class="nursery-student-photo">
            ${studentPhotoSrc
              ? `<img src="${studentPhotoSrc}" alt="Student Photo" />`
              : '<div class="nursery-photo-placeholder">PHOTO</div>'}
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

      <!-- DEVELOPMENTAL SKILLS TABLE -->
      <div class="nursery-skill-section">
        <div class="nursery-heading">Developmental Skills Checklist</div>
        <table class="nursery-skill-table">
          <tbody>
            ${nurserySkillRowsHtml}
          </tbody>
        </table>
        <div class="nursery-legend">
          ${nurseryLegendHtml}
        </div>
      </div>

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>AVERAGE SCORES:</strong> ${avg} ${avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>

      <!-- COMMENTS -->
    </body>
    </html>
  `;
}

function generateTemplate3KyoteraHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const summary = student.summary || {};
  const attendance = summary.attendanceDetails || {};
  const overallPerf = summary.performanceRemark ?? summary.performance_remark ?? '';
  const classPosition = summary.classPosition ?? summary.class_position ?? 'N/A';
  const totalStudents = summary.totalStudents ?? summary.total_students ?? 'N/A';
  const attendancePresent = attendance.presentDays ?? attendance.present_days ?? 'N/A';
  const attendanceTotal = attendance.totalSchoolDays ?? attendance.total_school_days ?? 'N/A';
  const attendanceAbsent = attendance.absentDays ?? attendance.absent_days ?? (
    typeof attendanceTotal === 'number' && typeof attendancePresent === 'number'
      ? Math.max(attendanceTotal - attendancePresent, 0)
      : 'N/A'
  );
  const attendancePercentage = summary.attendancePercentage ?? summary.attendance_percentage ?? 'N/A';
  const feesBalance = student?.feesBalance ?? 0;

  const classTeacherComment = student.comments?.class_teacher_text
    || student.comments?.class_teacher_comment
    || student.results?.[0]?.class_teacher_comment
    || '..............................................................';

  const headTeacherComment = student.comments?.head_teacher_text
    || student.comments?.head_teacher_comment
    || student.results?.[0]?.headteacher_comment
    || '..............................................................';

  const nextTermRaw = student?.next_term_begins_date
    || student?.results?.[0]?.next_term_begins_date
    || reportData?.nextTermBegins
    || '';
  const nextTermDisplay = nextTermRaw ? new Date(nextTermRaw).toLocaleDateString() : '____________________';

  const isBeginning = (name: any) => {
    const n = String(name || '').trim().toLowerCase();
    return n === 'beginning of term' || n.includes('beginning') || n.includes('bot');
  };
  const isMid = (name: any) => {
    const n = String(name || '').trim().toLowerCase();
    return n === 'mid term' || n === 'midterm' || n.includes('mid');
  };
  const isEnd = (name: any) => {
    const n = String(name || '').trim().toLowerCase();
    return n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
  };

  let showMidTermColumn = true;
  let showEndOfTermColumn = true;
  if (examSet?.name) {
    const selectedName = String(examSet.name).trim().toLowerCase();
    if (selectedName.includes('all exam sets')) {
      showMidTermColumn = true;
      showEndOfTermColumn = true;
    } else if (isMid(selectedName)) {
      showMidTermColumn = true;
      showEndOfTermColumn = false;
    } else if (isEnd(selectedName)) {
      showMidTermColumn = false;
      showEndOfTermColumn = true;
    } else if (isBeginning(selectedName)) {
      showMidTermColumn = false;
      showEndOfTermColumn = false;
    }
  }

  const results = Array.isArray(student.results) ? student.results : [];
  const subjectGroups: Record<string, {
    subject: string;
    total_marks: number;
    remarks: string;
    initials: string;
    mid_marks?: string | number;
    end_marks?: string | number;
    bot_marks?: string | number;
  }> = {};

  const getExamSetName = (result: any) => String(result?.exam_set_name || result?.exam_sets?.name || '').trim().toLowerCase();

  results.forEach((result: any) => {
    const subject = result?.subject ?? '';
    if (!subject) return;
    const examSetName = getExamSetName(result);
    const isMissedEntry = (result.marks_obtained === 0 || result.marks_obtained === null) && result.teacher_remark === 'MISSED';
    const displayMarks = isMissedEntry ? 'MISSED' : (result.marks_obtained ?? '');

    if (!subjectGroups[subject]) {
      subjectGroups[subject] = {
        subject,
        total_marks: Number(result.total_marks ?? 100),
        remarks: '',
        initials: '',
      };
    } else if (result.total_marks != null) {
      subjectGroups[subject].total_marks = Number(result.total_marks);
    }

    if (isBeginning(examSetName)) {
      if (!isMissedEntry || !subjectGroups[subject].bot_marks) {
        subjectGroups[subject].bot_marks = displayMarks;
      }
    } else if (isMid(examSetName)) {
      if (!isMissedEntry || !subjectGroups[subject].mid_marks) {
        subjectGroups[subject].mid_marks = displayMarks;
      }
    } else if (isEnd(examSetName)) {
      if (!isMissedEntry || !subjectGroups[subject].end_marks) {
        subjectGroups[subject].end_marks = displayMarks;
      }
    }

    if (!isMissedEntry) {
      if (!subjectGroups[subject].remarks) {
        subjectGroups[subject].remarks = result.teacher_remark || result.overall_remark || '';
      }
      if (!subjectGroups[subject].initials && (result.teacher_initials || result.teacher_name)) {
        subjectGroups[subject].initials = result.teacher_initials || result.teacher_name || '';
      }
    }
  });

  Object.values(subjectGroups).forEach((group) => {
    if (!group.remarks) {
      const fallback = results.find((r: any) => r.subject === group.subject && (r.teacher_remark || r.overall_remark));
      if (fallback) {
        group.remarks = fallback.teacher_remark || fallback.overall_remark || '';
      }
    }
    if (!group.initials) {
      const fallback = results.find((r: any) => r.subject === group.subject && (r.teacher_initials || r.teacher_name));
      if (fallback) {
        group.initials = fallback.teacher_initials || fallback.teacher_name || '';
      }
    }
  });

  const prioritySubjects = ['English', 'Mathematics', 'Science'];
  const sortedSubjects = Object.values(subjectGroups).sort((a, b) => {
    const aIndex = prioritySubjects.indexOf(a.subject);
    const bIndex = prioritySubjects.indexOf(b.subject);
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return a.subject.localeCompare(b.subject);
  });

  const totalColumns = 2 + (showMidTermColumn ? 1 : 0) + (showEndOfTermColumn ? 1 : 0) + 2;
  let totalFullMarks = 0;

  const subjectRows = sortedSubjects.length > 0
    ? sortedSubjects.map((group, index) => {
        const totalMarksValue = Number(group.total_marks ?? 0) || 0;
        totalFullMarks += totalMarksValue;
        const rowBackground = index % 2 === 0
          ? 'background: rgba(255, 255, 255, 0.97);'
          : 'background: rgba(191, 219, 254, 0.20);';
        return `
          <tr style="${rowBackground}">
            <td class="subject-cell">${group.subject}</td>
            <td class="numeric-cell">${group.total_marks ?? ''}</td>
            ${showMidTermColumn ? `<td class="numeric-cell">${group.mid_marks ?? ''}</td>` : ''}
            ${showEndOfTermColumn ? `<td class="numeric-cell">${group.end_marks ?? ''}</td>` : ''}
            <td class="remarks-cell">${group.remarks || ''}</td>
            <td class="numeric-cell">${group.initials || ''}</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="${totalColumns}" class="empty-row">No results available</td></tr>`;

  const totalRow = sortedSubjects.length > 0 ? `
    <tr class="total-row">
      <td>TOTAL</td>
      <td>${totalFullMarks}</td>
      ${showMidTermColumn ? '<td></td>' : ''}
      ${showEndOfTermColumn ? '<td></td>' : ''}
      <td colspan="2"></td>
    </tr>
  ` : '';

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
          padding: 0.5mm 1.8mm 1mm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .content-stack {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .page-section {
          margin-bottom: 3px;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .student-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          padding: 8px 10px;
          font-size: 10.8pt;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(191, 219, 254, 0.45);
          border-radius: 10px;
        }
        
        .student-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .student-photo {
          width: 66px;
          height: 82px;
          border: 1px solid rgba(191, 219, 254, 0.45);
          border-radius: 9px;
          background: #ffffff;
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

        .subjects-card {
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(191, 219, 254, 0.45);
          border-radius: 10px;
          overflow: hidden;
        }
        
        .subjects-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.8pt;
        }

        .subjects-table th,
        .subjects-table td {
          border: 1px solid rgba(191, 219, 254, 0.45);
          padding: 4.6px 6.2px;
        }
        
        .subjects-table th {
          background: rgba(191, 219, 254, 0.68);
          color: #1e3a8a;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
        }
        
        .subject-cell {
          font-weight: 600;
          color: #0f172a;
        }

        .numeric-cell {
          text-align: center;
        }
        
        .remarks-cell {
          text-align: left;
          color: #1f2937;
        }

        .empty-row {
          padding: 8px;
          text-align: center;
          color: #64748b;
          font-style: italic;
        }

        .total-row {
          background: rgba(191, 219, 254, 0.45);
          font-weight: 700;
          text-align: center;
        }
        
        .total-row td:first-child {
          text-align: left;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 4.6px;
          margin-bottom: 5.2px;
        }
        
        .summary-card {
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(191, 219, 254, 0.45);
          border-radius: 10px;
          padding: 6.2px 7px 6.4px;
          font-size: 8.7pt;
          line-height: 1.3;
          min-height: 52px;
        }
        
        .summary-card strong {
          color: #1e3a8a;
        }

        .comments-card {
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(191, 219, 254, 0.45);
          border-radius: 10px;
          padding: 6.6px 7.4px;
          font-size: 8.6pt;
          line-height: 1.3;
          margin-bottom: 5.2px;
        }

        .comments-card h3 {
          font-size: 9pt;
          font-weight: 600;
          color: #1e3a8a;
          margin-bottom: 3.2px;
        }
        
        .comment-block {
          margin-bottom: 4.8px;
        }
        
        .comment-block:last-child {
          margin-bottom: 0;
        }

        .comment-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 5px;
          margin-top: 6px;
          border-top: 1px solid rgba(191, 219, 254, 0.5);
          font-size: 8.1pt;
        }

        .signature-line {
          display: block;
          margin-top: 3.6px;
        }
        
        .footer-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          background: rgba(239, 246, 255, 0.6);
          border: 1px solid rgba(191, 219, 254, 0.5);
          border-radius: 10px;
          padding: 7px 9px;
          font-size: 8.8pt;
          margin-bottom: 8px;
        }
        
        .footer {
          text-align: center;
          font-size: 7.2pt;
          color: #475569;
          margin-top: 10px;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.08;
          z-index: -1;
          pointer-events: none;
        }
        
        .watermark img {
          max-width: 55%;
          height: auto;
        }
        
        .watermark-placeholder {
          width: 55%;
          max-width: 360px;
          border: 1px dashed rgba(191, 219, 254, 0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(239, 246, 255, 0.45);
          font-size: 48pt;
          font-weight: bold;
          color: rgba(148, 163, 184, 0.75);
          text-align: center;
          line-height: 1.2;
          padding: 20px;
          margin: 0 auto;
        }

        @media print {
          .page-section {
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      ${generateProfessionalHeaderHTML(
        school,
        schoolLogoBase64,
        `STUDENT'S PROGRESSIVE REPORT OF ${examSet?.term ? `TERM ${examSet.term}` : 'TERM'}`,
        examSet
      )}

      <div class="content-stack">
      <div class="student-info page-section">
          <div class="student-info-grid">
            <div><strong>STUDENT'S NAME:</strong> ${student.name}</div>
            <div><strong>YEAR:</strong> ${examSet?.year || '2025'}</div>
            <div><strong>STREAM:</strong> EAST</div>
            <div><strong>CLASS:</strong> ${student.current_class}</div>
          <div><strong>LIN:</strong> ${student.admission_number || student.student_id || '__________'}</div>
            <div><strong>Date:</strong> ${examSet?.date || '26/05/2025'}</div>
          </div>
          <div class="student-photo">
            ${
              studentPhotoSrc
                ? `<img src="${studentPhotoSrc}" alt="Student Photo" />`
                : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; background: #f8fafc;">PHOTO</div>'
            }
        </div>
      </div>

      <div class="subjects-card page-section">
        <table class="subjects-table">
        <thead>
          <tr>
              <th>SUBJECT</th>
              <th>FULL MARKS</th>
              ${showMidTermColumn ? '<th>MID TERM</th>' : ''}
              ${showEndOfTermColumn ? '<th>END OF TERM</th>' : ''}
              <th>TEACHER\'S REMARKS</th>
              <th>INITIALS</th>
          </tr>
        </thead>
        <tbody>
            ${subjectRows}
            ${totalRow}
        </tbody>
      </table>
      </div>

      <div class="summary-grid page-section">
        <div class="summary-card">
          <div><strong>Total Marks:</strong> ${summary.totalMarks ?? summary.total_marks ?? 'N/A'}</div>
          <div><strong>Average:</strong> ${summary.average ?? 'N/A'}</div>
          <div><strong>Division:</strong> ${summary.division ?? 'N/A'}</div>
        </div>
        <div class="summary-card">
          <div><strong>Class Position:</strong> ${classPosition}</div>
          <div><strong>Out of:</strong> ${totalStudents} students</div>
          <div><strong>Overall Performance:</strong> ${overallPerf || 'N/A'}</div>
        </div>
        <div class="summary-card">
          <div><strong>Attendance:</strong></div>
          <div>Days Present: ${attendancePresent}</div>
          <div>Days Absent: ${attendanceAbsent}</div>
          <div>Total Days: ${attendanceTotal}</div>
          <div>Attendance %: ${attendancePercentage}</div>
        </div>
      </div>

      <div class="comments-card page-section">
        <div class="comment-block">
          <h3>Class Teacher's Comments:</h3>
          <p>${classTeacherComment}</p>
          <span class="signature-line">Signature: ______________________</span>
        </div>
        <div class="comment-block">
        <h3>Headteacher's Comments:</h3>
          <p>${headTeacherComment}</p>
          <span class="signature-line">Signature: ______________________</span>
      </div>
        <div class="comment-footer">
          <div><strong>Next term begins on:</strong> ${nextTermDisplay}</div>
          <div><strong>Fees Balance:</strong> ${formatCurrency(feesBalance)}</div>
      </div>
      </div>
      <div class="footer">Generated by PwezaCore School Management System</div>
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
          padding: 2mm 3mm 3mm;
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
          margin-bottom: 6px;
        }
        
        .school-logo {
          width: 120px;
          height: 120px;
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
          font-size: 14pt;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        
        .school-contact {
          font-size: 9pt;
          font-weight: normal;
          margin-bottom: 4px;
        }
        
        .school-motto {
          font-size: 10pt;
          font-weight: normal;
          font-style: italic;
          margin-bottom: 4px;
        }
        
        .student-photo {
          width: 54px;
          height: 72px;
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
          background: #1e3a8a;
          color: white;
          text-align: center;
          padding: 5px 12px;
          margin: 6px 0 6px;
          font-size: 10.3pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 6px;
          padding: 5px 6px;
          font-size: 9.4pt;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(191, 219, 254, 0.45);
          border-radius: 9px;
        }
        
        .student-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5px;
        }
        
        .student-info div {
          margin-bottom: 3px;
        }
        
        .student-info strong {
          font-weight: bold;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
        }
        
        th, td {
          border: 1px solid rgba(191, 219, 254, 0.45);
          padding: 3.2px 4.8px;
          text-align: left;
        }
        
        th {
          background: rgba(191, 219, 254, 0.68);
          color: #1e3a8a;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 10px;
          font-size: 9.5pt;
        }
        
        .summary p {
          margin-bottom: 5px;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 12px;
          font-size: 9pt;
        }
        
        .comments h3 {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .next-term {
          margin-bottom: 15px;
          font-size: 9pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 15px;
          font-size: 9pt;
        }
        
        .grading-system h3 {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          margin-bottom: 5px;
        }
        
        .description-table th {
          background: #f0f0f0;
          color: black;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 7.6pt;
          margin-top: 5px;
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
          width: 480px;
          height: 480px;
          object-fit: contain;
        }
        
        .watermark-placeholder {
          width: 480px;
          height: 480px;
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
          padding: 1mm 1.8mm 1.8mm;
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
          margin-bottom: 4px;
        }
        
        .school-logo {
          width: 128px;
          height: 128px;
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
          background: #1e3a8a;
          color: white;
          text-align: center;
          padding: 4px 11px;
          margin: 4px 0 5px;
          font-size: 10.1pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 5px;
          padding: 4px 5px;
          font-size: 9.3pt;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(191, 219, 254, 0.45);
          border-radius: 9px;
        }
        
        .student-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 4px;
        }
        
        .student-photo {
          width: 66px;
          height: 82px;
          border: 1px solid rgba(191, 219, 254, 0.45);
          border-radius: 9px;
          background: #ffffff;
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
          font-size: 8.4pt;
        }
        
        th, td {
          border: 1px solid rgba(191, 219, 254, 0.45);
          padding: 3px 4.5px;
          text-align: left;
        }
        
        th {
          background: rgba(191, 219, 254, 0.68);
          color: #1e3a8a;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 10px;
          font-size: 9.5pt;
        }
        
        .summary p {
          margin-bottom: 5px;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 12px;
          font-size: 9pt;
        }
        
        .comments h3 {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .next-term {
          margin-bottom: 15px;
          font-size: 9pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 15px;
          font-size: 9pt;
        }
        
        .grading-system h3 {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          margin-bottom: 5px;
        }
        
        .description-table th {
          background: #f0f0f0;
          color: black;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 7.6pt;
          margin-top: 5px;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.08;
          z-index: -1;
          pointer-events: none;
        }
        
        .watermark img {
          max-width: 55%;
          height: auto;
        }
        
        .watermark-placeholder {
          width: 55%;
          max-width: 360px;
          border: 1px dashed rgba(191, 219, 254, 0.5);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(239, 246, 255, 0.45);
          font-size: 48pt;
          font-weight: bold;
          color: rgba(148, 163, 184, 0.75);
          text-align: center;
          line-height: 1.2;
          padding: 20px;
          margin: 0 auto;
        }

        @media print {
          .page-section {
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>

      ${generateProfessionalHeaderHTML(
        school,
        schoolLogoBase64,
        `STUDENT'S PROGRESSIVE REPORT OF ${examSet?.term ? `TERM ${examSet.term}` : 'TERM'}`,
        examSet
      )}

      <div class="content-stack">
      <div class="student-info page-section">
        <div class="student-info-grid">
          <div><strong>STUDENT'S NAME:</strong> ${student.name}</div>
          <div><strong>YEAR:</strong> ${examSet?.year || '2025'}</div>
          <div><strong>STREAM:</strong> EAST</div>
          <div><strong>CLASS:</strong> ${student.current_class}</div>
          <div><strong>LIN:</strong> ${student.admission_number || student.student_id || '__________'}</div>
          <div><strong>Date:</strong> ${examSet?.date || '26/05/2025'}</div>
        </div>
        <div class="student-photo">
          ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>'}
        </div>
      </div>

      <div class="subjects-card page-section">
        <table class="subjects-table">
            <thead>
              <tr>
              <th>SUBJECT</th>
              <th>FULL MARKS</th>
              ${showMidTermColumn ? '<th>MID TERM</th>' : ''}
              ${showEndOfTermColumn ? '<th>END OF TERM</th>' : ''}
              <th>TEACHER\'S REMARKS</th>
              <th>INITIALS</th>
              </tr>
            </thead>
            <tbody>
            ${subjectRows}
            ${totalRow}
            </tbody>
          </table>
      </div>

      <div class="summary-grid page-section">
        <div class="summary-card">
          <div><strong>Total Marks:</strong> ${summary.totalMarks ?? summary.total_marks ?? 'N/A'}</div>
          <div><strong>Average:</strong> ${summary.average ?? 'N/A'}</div>
          <div><strong>Division:</strong> ${summary.division ?? 'N/A'}</div>
        </div>
        <div class="summary-card">
          <div><strong>Class Position:</strong> ${classPosition}</div>
          <div><strong>Out of:</strong> ${totalStudents} students</div>
          <div><strong>Overall Performance:</strong> ${overallPerf || 'N/A'}</div>
        </div>
        <div class="summary-card">
          <div><strong>Attendance:</strong></div>
          <div>Days Present: ${attendancePresent}</div>
          <div>Days Absent: ${attendanceAbsent}</div>
          <div>Total Days: ${attendanceTotal}</div>
          <div>Attendance %: ${attendancePercentage}</div>
        </div>
      </div>

      <div class="comments-card page-section">
        <div class="comment-block">
          <h3>Class Teacher's Comments:</h3>
          <p>${classTeacherComment}</p>
          <span class="signature-line">Signature: ______________________</span>
        </div>
        <div class="comment-block">
          <h3>Headteacher's Comments:</h3>
          <p>${headTeacherComment}</p>
          <span class="signature-line">Signature: ______________________</span>
        </div>
        <div class="comment-footer">
          <div><strong>Next term begins on:</strong> ${nextTermDisplay}</div>
          <div><strong>Fees Balance:</strong> ${formatCurrency(feesBalance)}</div>
        </div>
      </div>
      <div class="footer">Generated by PwezaCore School Management System</div>
      </div>
    </body>
    </html>
  `;
}

// Helper function to lighten a hex color for gradient
function lightenColor(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const lighten = (color: number) => Math.min(255, Math.round(color + (255 - color) * 0.5));
  const toHex = (n: number) => {
    const hex = n.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(lighten(r))}${toHex(lighten(g))}${toHex(lighten(b))}`;
}

// Helper function to generate professional header HTML matching Template 3 and Template 4
function generateProfessionalHeaderHTML(
  school: any,
  schoolLogoBase64: string | null,
  reportTitle: string,
  examSet: any
): string {
  const schoolNameColor = school?.header_school_name_color || '#1e3a8a';
  const subtitleColor = school?.header_subtitle_color || '#3b82f6';
  const addressColor = school?.header_address_color || '#1e40af';
  const contactColor = school?.header_contact_color || '#1e40af';
  const mottoColor = school?.header_motto_color || '#2563eb';
  const dividerColor = school?.header_divider_color || '#1e3a8a';
  const dividerGradient = `linear-gradient(to right, ${dividerColor} 0%, ${lightenColor(dividerColor)} 50%, ${dividerColor} 100%)`;

  return `
    <div class="print-header-container" style="padding-top: 0.1cm; padding-bottom: 0.04cm; padding-left: 0; padding-right: 0.45cm; background: transparent; -webkit-print-color-adjust: exact; print-color-adjust: exact; page-break-inside: avoid; break-inside: avoid;">
      <div style="display: flex; align-items: center; min-height: 2.1cm; position: relative;">
        <div style="width: 150px; height: 150px; display: flex; align-items: center; justify-content: center; position: absolute; left: 0; margin-left: 0;">
          ${schoolLogoBase64 ? `
            <img src="${schoolLogoBase64}" alt="School Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
          ` : `
            <div style="width: 100%; height: 100%; border: 1px solid #d1d5db; border-radius: 4px; display: flex; align-items: center; justify-content: center; background: #f9fafb;">
              <span style="font-size: 9pt; color: #9ca3af; text-align: center; padding: 8px;">School<br/>Logo</span>
            </div>
          `}
        </div>
        <div style="flex: 1; text-align: center; font-family: 'Times New Roman', serif; margin-left: 150px; padding-left: 0.35cm;">
          ${school?.name ? `
            <h1 style="font-size: 17pt; font-weight: 700; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.1; margin: 0 0 0.28cm 0; color: ${schoolNameColor}; white-space: nowrap;">
              ${school.name}
            </h1>
          ` : ''}
          ${school?.subtitle ? `
            <div style="font-size: 11pt; font-family: 'Times New Roman', Georgia, serif; font-weight: 400; color: ${subtitleColor}; margin-bottom: 0.22cm; line-height: 1.4;">
              ${school.subtitle}
            </div>
          ` : ''}
          ${(school?.address || school?.pobox) ? `
            <div style="font-size: 11pt; font-family: 'Times New Roman', Georgia, serif; font-weight: 600; color: ${addressColor}; margin-bottom: 0.2cm; line-height: 1.4;">
              ${school?.address || ''}${school?.address && school?.pobox ? ' ' : ''}${school?.pobox || ''}
            </div>
          ` : ''}
          ${(school?.contact_email || school?.contact_phone) ? `
            <div style="font-size: 11pt; font-family: 'Times New Roman', Georgia, serif; font-weight: 600; color: ${contactColor}; margin-bottom: 0.22cm; line-height: 1.4;">
              ${school?.contact_email || ''}${school?.contact_email && school?.contact_phone ? ' <span style="margin: 0 8px; color: #64748b;">|</span> ' : ''}${school?.contact_phone || ''}
            </div>
          ` : ''}
          ${school?.motto ? `
            <div style="font-size: 10.2pt; font-family: 'Times New Roman', Georgia, serif; font-style: italic; font-weight: 600; color: ${mottoColor}; margin-bottom: 0.3cm; line-height: 1.4; letter-spacing: 0.02em;">
              &quot;${school.motto}&quot;
            </div>
          ` : ''}
        </div>
      </div>
      <div style="height: 1px; background: ${dividerGradient}; margin-top: 0.35cm; margin-bottom: 0.12cm; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>
      <div style="text-align: center; margin-bottom: 0.15cm;">
        <div style="display: inline-block; padding: 5px 18px; border-radius: 16px; font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #1e3a8a; background: #eff6ff; border: 1px solid #bfdbfe; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
          ${reportTitle}
        </div>
        ${(examSet?.name || examSet?.year) ? `
          <div style="font-size: 8pt; font-family: Arial, Helvetica, sans-serif; color: #64748b; margin-top: 0.2cm; font-weight: 400;">
            ${examSet?.name || 'Term Report'} - ${examSet?.year || new Date().getFullYear()}
          </div>
        ` : ''}
      </div>
    </div>
  `
}

const NURSERY_PERFORMANCE_OPTIONS = [
  { label: 'Very Good', color: '#4CAF50' },
  { label: 'Good', color: '#42A5F5' },
  { label: 'Tries', color: '#FFEB3B' },
  { label: 'Still a Problem', color: '#FF7043' },
  { label: 'Promising', color: '#BA68C8' }
] as const;

type NurserySkillCell = {
  key: string;
  label: string;
};

const NURSERY_PERFORMANCE_COLOR_MAP: Record<string, string> = NURSERY_PERFORMANCE_OPTIONS.reduce((acc, option) => {
  acc[option.label] = option.color;
  return acc;
}, {} as Record<string, string>);

const NURSERY_PERFORMANCE_NORMALIZED_MAP = (() => {
  const map = new Map<string, string>();

  const addVariant = (label: string, ...variants: string[]) => {
    variants.forEach(variant => {
      map.set(variant, label);
    });
  };

  NURSERY_PERFORMANCE_OPTIONS.forEach(({ label }) => {
    const normalized = label.trim().toLowerCase();
    const collapsed = normalized.replace(/\s+/g, '');
    addVariant(label, normalized, collapsed);
  });

  addVariant('Very Good', 'vg');
  addVariant('Good', 'g');
  addVariant('Tries', 't');
  addVariant('Still a Problem', 'stillaproblem', 'still_problem', 'sap', 'problem', 'needsattention');
  addVariant('Promising', 'p', 'promising', 'prom', 'progressing');

  return map;
})();

const NURSERY_SKILL_GRID: NurserySkillCell[][] = [
  [
    { key: 'toilet', label: 'Toilet' },
    { key: 'recognition_of_numbers', label: 'Recognition of numbers' },
    { key: 'property_care', label: 'Property care' },
    { key: 'handling_of_pencil', label: 'Handling of pencil' },
    { key: 're_sighting_alphabet', label: 'Re-sighting Alphabet' },
    { key: 'attention_span', label: 'Attention span' },
    { key: 'punctuality', label: 'Punctuality' },
    { key: 'shading', label: 'Shading' }
  ],
  [
    { key: 'nose_care', label: 'Nose care' },
    { key: 'recognition_of_shapes', label: 'Recognition of shapes' },
    { key: 'respect', label: 'Respect' },
    { key: 'arrival_time', label: 'Arrival time' },
    { key: 'counting_number_sequence', label: 'Counting number sequence' },
    { key: 're_sighting_poems', label: 'Re-sighting Poems' },
    { key: 'love_or_interest', label: 'Love or Interest' },
    { key: 'drawing', label: 'Drawing' }
  ],
  [
    { key: 'recognition_of_letters', label: 'Recognition of letters' },
    { key: 'sharing', label: 'Sharing' },
    { key: 'friendship', label: 'Friendship' },
    { key: 'colours', label: 'Colours' },
    { key: 'playing', label: 'Playing' },
    { key: 'emotional', label: 'Emotional' },
    { key: 'smartness', label: 'Smartness' },
    { key: 'placeholder', label: '' }
  ]
];

const sanitizeNurseryKey = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const normalizeNurseryPerformanceWord = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const normalized = raw.toLowerCase();
  const collapsed = normalized.replace(/\s+/g, '');

  if (NURSERY_PERFORMANCE_NORMALIZED_MAP.has(normalized)) {
    return NURSERY_PERFORMANCE_NORMALIZED_MAP.get(normalized)!;
  }

  if (NURSERY_PERFORMANCE_NORMALIZED_MAP.has(collapsed)) {
    return NURSERY_PERFORMANCE_NORMALIZED_MAP.get(collapsed)!;
  }

  for (const [key, canonical] of NURSERY_PERFORMANCE_NORMALIZED_MAP.entries()) {
    if (key === normalized || key === collapsed) {
      return canonical;
    }
  }

  return null;
};

const getNurserySkillKeyVariants = (skill: NurserySkillCell): string[] => {
  const label = skill.label || '';
  const key = skill.key || '';
  const cleanedLabel = label.replace(/&/g, 'and');

  const variants = [
    key,
    cleanedLabel,
    label,
    key.replace(/_/g, ' '),
    key.replace(/_/g, ''),
    cleanedLabel.toLowerCase(),
    label.toLowerCase(),
    cleanedLabel.replace(/\s+/g, '_'),
    cleanedLabel.replace(/\s+/g, ''),
    key.toLowerCase(),
    key.replace(/_/g, '-'),
    cleanedLabel.replace(/\s+/g, '-')
  ];

  const unique = new Set<string>();
  variants.forEach(variant => {
    const sanitized = sanitizeNurseryKey(variant);
    if (sanitized) {
      unique.add(sanitized);
    }
  });

  return Array.from(unique);
};

const gatherNurseryPerformanceSources = (student: any): any[] => {
  const sources: any[] = [];
  const pushIfPresent = (value: any) => {
    if (value !== null && value !== undefined) {
      sources.push(value);
    }
  };

  pushIfPresent(student?.nursery_performance);
  pushIfPresent(student?.nurseryPerformance);
  pushIfPresent(student?.nursery_skills);
  pushIfPresent(student?.nurserySkills);
  pushIfPresent(student?.developmentalSkills);
  pushIfPresent(student?.developmental_skills);
  pushIfPresent(student?.skillAssessments);
  pushIfPresent(student?.skillsChecklist);
  pushIfPresent(student?.skills_checklist);
  pushIfPresent(student?.skills);
  pushIfPresent(student?.summary?.nurserySkills);
  pushIfPresent(student?.summary?.nursery_skills);
  pushIfPresent(student?.summary?.developmentalSkills);
  pushIfPresent(student?.summary?.developmental_skills);
  pushIfPresent(student?.summary?.skillsChecklist);
  pushIfPresent(student?.summary?.skills_checklist);

  if (Array.isArray(student?.results)) {
    student.results.forEach((result: any) => {
      pushIfPresent(result?.nurserySkills);
      pushIfPresent(result?.nursery_skills);
      pushIfPresent(result?.developmentalSkills);
      pushIfPresent(result?.developmental_skills);
      pushIfPresent(result?.skillsChecklist);
      pushIfPresent(result?.skills_checklist);
    });
  }

  return sources;
};

const extractPerformanceFromSource = (source: any, targetKeys: Set<string>): string | null => {
  const tryPush = (rawKey: unknown, rawValue: unknown): string | null => {
    const key = sanitizeNurseryKey(rawKey);
    if (!key || !targetKeys.has(key)) return null;
    const normalizedValue = normalizeNurseryPerformanceWord(rawValue);
    return normalizedValue;
  };

  if (Array.isArray(source)) {
    for (const entry of source) {
      if (!entry) continue;

      if (typeof entry === 'string') {
        const parts = entry.split(/[:\-]/);
        if (parts.length >= 2) {
          const keyCandidate = parts[0];
          const valueCandidate = parts.slice(1).join('-').trim();
          const result = tryPush(keyCandidate, valueCandidate);
          if (result) return result;
        }
        continue;
      }

      if (typeof entry === 'object') {
        const keyCandidates = [
          entry.key,
          entry.skill,
          entry.skill_name,
          entry.skillName,
          entry.name,
          entry.label,
          entry.title,
          entry.description,
          entry.field
        ];

        const valueCandidates = [
          entry.value,
          entry.performance,
          entry.status,
          entry.level,
          entry.assessment,
          entry.rating,
          entry.result,
          entry.word,
          entry.selection,
          entry.score
        ];

        for (const keyCandidate of keyCandidates) {
          if (!keyCandidate) continue;
          for (const valueCandidate of valueCandidates) {
            const result = tryPush(keyCandidate, valueCandidate);
            if (result) return result;
          }
        }

        if (entry.text) {
          const parts = String(entry.text).split(/[:\-]/);
          if (parts.length >= 2) {
            const keyCandidate = parts[0];
            const valueCandidate = parts.slice(1).join('-').trim();
            const result = tryPush(keyCandidate, valueCandidate);
            if (result) return result;
          }
        }
      }
    }
    return null;
  }

  if (typeof source === 'object' && source !== null) {
    for (const [rawKey, rawValue] of Object.entries(source)) {
      const result = tryPush(rawKey, rawValue);
      if (result) return result;
    }
    return null;
  }

  if (typeof source === 'string') {
    try {
      const parsed = JSON.parse(source);
      return extractPerformanceFromSource(parsed, targetKeys);
    } catch {
      const parts = source.split(/[:\-]/);
      if (parts.length >= 2) {
        const keyCandidate = parts[0];
        const valueCandidate = parts.slice(1).join('-').trim();
        return tryPush(keyCandidate, valueCandidate);
      }
    }
  }

  return null;
};

const resolveNurseryPerformanceValue = (student: any, skill: NurserySkillCell): string | null => {
  if (!skill.label) return null;
  const targetKeys = new Set(getNurserySkillKeyVariants(skill));
  const sources = gatherNurseryPerformanceSources(student);

  for (const source of sources) {
    const value = extractPerformanceFromSource(source, targetKeys);
    if (value) return value;
  }

  return null;
};

const getReadableTextColor = (hex: string): string => {
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized.split('').map(char => char + char).join('');
  }

  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#111827' : '#ffffff';
};

const applyAlphaToHex = (hex: string | null, alpha: number): string => {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  let normalized = hex.replace('#', '');
  if (normalized.length === 3) {
    normalized = normalized.split('').map(char => char + char).join('');
  }

  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
};
