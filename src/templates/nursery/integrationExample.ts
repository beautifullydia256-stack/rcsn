/**
 * Integration Example: Using Nursery Templates with Add Results System
 * 
 * This file demonstrates how to integrate nursery templates into the
 * Add Results workflow for generating report cards.
 */

import {
  isNurseryClass,
  getTemplatesForClass,
  getTemplateForNurseryClass,
  getNurseryTemplate,
  getNurseryTemplateOptions,
  mapToTemplate7Data,
  mapToTemplate8Data,
  mapToTemplate9Data,
  mapToTemplate10Data,
  mapToTemplate11Data,
  mapToTemplate12Data,
  type ExamResultsData,
  type TemplateConfig,
} from './index';

// ============================================================================
// EXAMPLE 1: Template Selection in UI
// ============================================================================

/**
 * Example: Determine which templates to show based on selected class
 */
export function getTemplateOptionsForClass(className: string) {
  // Check if this is a nursery class
  if (isNurseryClass(className)) {
    // Return nursery template options
    return getNurseryTemplateOptions();
  }
  
  // Return primary/secondary template options
  // (This would call getPrimaryTemplateOptions() or similar)
  return [];
}

/**
 * Example: Get recommended template for a class
 */
export function getRecommendedTemplate(className: string): string {
  if (isNurseryClass(className)) {
    return getTemplateForNurseryClass(className);
  }
  
  // Return primary/secondary recommended template
  return 'template1'; // Default
}

// ============================================================================
// EXAMPLE 2: Data Fetching and Mapping
// ============================================================================

/**
 * Example: Fetch exam results from database and prepare for template
 */
export async function fetchAndMapExamResults(
  studentId: string,
  examSetId: string,
  templateKey: string
): Promise<any> {
  // This is a mock example - replace with actual database queries
  
  // 1. Fetch student information
  const student = await fetchStudentInfo(studentId);
  
  // 2. Fetch school information
  const school = await fetchSchoolInfo(student.school_id);
  
  // 3. Fetch term information
  const term = await fetchTermInfo(examSetId);
  
  // 4. Fetch exam results
  const results = await fetchExamResults(studentId, examSetId);
  
  // 5. Fetch attendance
  const attendance = await fetchAttendance(studentId, term.term, term.year);
  
  // 6. Fetch teacher comments
  const comments = await fetchTeacherComments(studentId, examSetId);
  
  // 7. Calculate position
  const { position, total_students } = await calculatePosition(
    studentId,
    examSetId,
    student.current_class
  );
  
  // 8. Prepare complete data bundle
  const examData: ExamResultsData = {
    student,
    school,
    term,
    results,
    attendance,
    comments,
    position,
    total_students,
  };
  
  // 9. Map to appropriate template format
  return mapToTemplateFormat(examData, templateKey);
}

/**
 * Map exam data to specific template format
 */
function mapToTemplateFormat(data: ExamResultsData, templateKey: string) {
  switch (templateKey) {
    case 'template7':
      return mapToTemplate7Data(data);
    case 'template8':
      return mapToTemplate8Data(data);
    case 'template9':
      return mapToTemplate9Data(data);
    case 'template10':
      return mapToTemplate10Data(data);
    case 'template11':
      return mapToTemplate11Data(data);
    case 'template12':
      return mapToTemplate12Data(data);
    default:
      throw new Error(`Unknown template: ${templateKey}`);
  }
}

// ============================================================================
// EXAMPLE 3: Complete Report Generation Flow
// ============================================================================

/**
 * Example: Complete flow from class selection to PDF generation
 */
export async function generateNurseryReportCard(params: {
  className: string;
  studentId: string;
  examSetId: string;
  templateKey?: string;
}) {
  const { className, studentId, examSetId, templateKey } = params;
  
  // Step 1: Validate this is a nursery class
  if (!isNurseryClass(className)) {
    throw new Error(`${className} is not a nursery class`);
  }
  
  // Step 2: Determine template to use
  const selectedTemplate = templateKey || getTemplateForNurseryClass(className);
  
  // Step 3: Get template configuration
  const templateConfig = getNurseryTemplate(selectedTemplate);
  if (!templateConfig) {
    throw new Error(`Template ${selectedTemplate} not found`);
  }
  
  // Step 4: Fetch and map exam data
  const templateData = await fetchAndMapExamResults(
    studentId,
    examSetId,
    selectedTemplate
  );
  
  // Step 5: Generate HTML (this would call your HTML generator)
  const html = await generateTemplateHTML(selectedTemplate, templateData);
  
  // Step 6: Generate PDF (this would use Puppeteer or similar)
  const pdf = await generatePDF(html, templateConfig.pdfOptions);
  
  return {
    pdf,
    templateConfig,
    templateData,
  };
}

// ============================================================================
// EXAMPLE 4: Batch Report Generation
// ============================================================================

/**
 * Example: Generate reports for entire class
 */
export async function generateClassReports(
  className: string,
  examSetId: string,
  templateKey?: string
) {
  // Validate nursery class
  if (!isNurseryClass(className)) {
    throw new Error(`${className} is not a nursery class`);
  }
  
  // Get all students in class
  const students = await fetchStudentsInClass(className);
  
  // Determine template
  const selectedTemplate = templateKey || getTemplateForNurseryClass(className);
  
  // Generate reports for each student
  const reports = await Promise.all(
    students.map(student =>
      generateNurseryReportCard({
        className,
        studentId: student.student_id,
        examSetId,
        templateKey: selectedTemplate,
      })
    )
  );
  
  return reports;
}

// ============================================================================
// EXAMPLE 5: Template Preview
// ============================================================================

/**
 * Example: Generate preview with sample data
 */
export function generateTemplatePreview(templateKey: string) {
  // Get template config
  const templateConfig = getNurseryTemplate(templateKey);
  if (!templateConfig) {
    throw new Error(`Template ${templateKey} not found`);
  }
  
  // Create sample data
  const sampleData = createSampleExamData(templateKey);
  
  // Map to template format
  const templateData = mapToTemplateFormat(sampleData, templateKey);
  
  return {
    templateConfig,
    templateData,
  };
}

/**
 * Create sample exam data for preview
 */
function createSampleExamData(templateKey: string): ExamResultsData {
  return {
    student: {
      student_id: 'sample-123',
      student_name: 'Sample Student',
      current_class: 'Baby Class',
      age: '4 years',
      registration_number: 'BC001',
      fees_balance: 50000,
      schoolpay_code: 'SP123',
    },
    school: {
      school_id: 'school-1',
      school_name: 'Sample Nursery School',
      address: 'P.O. Box 123, Kampala',
      phone: '0700 000000',
      email: 'info@sample.com',
      website: 'www.sample.com',
      motto: 'Excellence in Education',
    },
    term: {
      term: 1,
      year: 2024,
      end_date: '2024-04-15',
      next_term_begins: '2024-05-06',
    },
    results: [
      {
        subject_name: 'LEARNING AREA 1',
        marks_obtained: 85,
        total_marks: 100,
        grade: 'A',
        remarks: 'Excellent performance',
        teacher_initials: 'JD',
      },
      {
        subject_name: 'LEARNING AREA 2',
        marks_obtained: 78,
        total_marks: 100,
        grade: 'B',
        remarks: 'Good progress',
        teacher_initials: 'JD',
      },
      {
        subject_name: 'LEARNING AREA 3',
        marks_obtained: 92,
        total_marks: 100,
        grade: 'A',
        remarks: 'Outstanding',
        teacher_initials: 'JD',
      },
      {
        subject_name: 'LEARNING AREA 4',
        marks_obtained: 88,
        total_marks: 100,
        grade: 'A',
        remarks: 'Very good',
        teacher_initials: 'JD',
      },
      {
        subject_name: 'LEARNING AREA 5',
        marks_obtained: 75,
        total_marks: 100,
        grade: 'B',
        remarks: 'Good work',
        teacher_initials: 'JD',
      },
    ],
    attendance: {
      days_attended: 60,
      days_absent: 5,
      total_days: 65,
    },
    comments: {
      class_teacher_comment: 'Excellent student with great potential. Keep up the good work!',
      headteacher_comment: 'Well done this term. Continue working hard.',
      behaviors_comment: 'Well behaved and respectful to others.',
    },
    position: 3,
    total_students: 25,
  };
}

// ============================================================================
// MOCK DATABASE FUNCTIONS (Replace with actual implementations)
// ============================================================================

async function fetchStudentInfo(studentId: string) {
  // Mock implementation - replace with actual database query
  return {
    student_id: studentId,
    student_name: 'John Doe',
    current_class: 'Baby Class',
    school_id: 'school-1',
    age: '4 years',
    registration_number: 'BC001',
    fees_balance: 50000,
    schoolpay_code: 'SP123',
  };
}

async function fetchSchoolInfo(schoolId: string) {
  // Mock implementation
  return {
    school_id: schoolId,
    school_name: 'Cindrelinah Junior School',
    address: 'Location Gangu Kimwanyi',
    phone: '0751 230190',
    email: 'info@school.com',
    website: 'www.school.com',
    motto: 'Excellence in Education',
  };
}

async function fetchTermInfo(examSetId: string) {
  // Mock implementation
  return {
    term: 1,
    year: 2024,
    end_date: '2024-04-15',
    next_term_begins: '2024-05-06',
  };
}

async function fetchExamResults(studentId: string, examSetId: string) {
  // Mock implementation
  return [
    {
      subject_name: 'LEARNING AREA 1',
      marks_obtained: 85,
      total_marks: 100,
      grade: 'A',
      remarks: 'Excellent',
      teacher_initials: 'JD',
    },
  ];
}

async function fetchAttendance(studentId: string, term: number, year: number) {
  // Mock implementation
  return {
    days_attended: 60,
    days_absent: 5,
    total_days: 65,
  };
}

async function fetchTeacherComments(studentId: string, examSetId: string) {
  // Mock implementation
  return {
    class_teacher_comment: 'Good progress this term',
    headteacher_comment: 'Keep up the good work',
    behaviors_comment: 'Well behaved',
  };
}

async function calculatePosition(
  studentId: string,
  examSetId: string,
  className: string
) {
  // Mock implementation
  return {
    position: 3,
    total_students: 25,
  };
}

async function fetchStudentsInClass(className: string) {
  // Mock implementation
  return [
    { student_id: '1', student_name: 'Student 1' },
    { student_id: '2', student_name: 'Student 2' },
  ];
}

async function generateTemplateHTML(templateKey: string, data: any): Promise<string> {
  // Mock implementation - replace with actual HTML generator
  return '<html><body>Report Card</body></html>';
}

async function generatePDF(html: string, options: any): Promise<Buffer> {
  // Mock implementation - replace with actual PDF generator (Puppeteer)
  return Buffer.from('PDF content');
}
