/**
 * TypeScript Data Interfaces for Nursery Report Templates
 * 
 * This file defines the data structures for all 6 nursery templates (Templates 7-12).
 * Each interface represents the complete data model required to generate a template.
 */

// ============================================================================
// TEMPLATE 7: Junior Nursery Report Template
// ============================================================================

export interface Template7Data {
  school: {
    name: string;
    address: string;
    phone: string;
  };
  student: {
    name: string;
    class: string;
    age: string;
    term: string;
    year: string;
    position?: string;
    outOf?: string;
    admissionNo?: string;
    paymentCode?: string;
  };
  subjects: Array<{
    name: string;
    marksObtained: number;
    outOf: number;
    examAgg: number;
    aggGrade: string;
    remarks: string;
    initials?: string;
  }>;
  total: number;
  comments: {
    classTeacher: {
      text: string;
      signature?: string;
    };
    headteacher: {
      text: string;
      signature?: string;
    };
  };
  requirements: string;
  termDates: {
    endDate: string;
    nextTermBegins: string;
  };
}

// ============================================================================
// TEMPLATE 8: Detail Colour Marks Report Template
// ============================================================================

export type SkillStatus = 
  | 'Very Good' 
  | 'Good' 
  | 'Tries' 
  | 'Fair' 
  | 'Still a Problem' 
  | 'Promising' 
  | null;

export interface Template8Data {
  school: {
    name: string;
    address: string;
    phone: string;
    logo?: string; // base64 or URL
  };
  student: {
    name: string;
    class: string;
    year: string;
    term: string;
    age: string;
    date: string;
    linNo?: string;
  };
  skillsAssessment: Array<{
    skill: string;
    status: SkillStatus;
  }>;
  subjects: Array<{
    name: string;
    midTerm: string; // Grade letter
    endOfTerm?: string;
    outOf: number;
    teacherRemarks?: string;
    signature?: string;
  }>;
  total: number;
  comments: {
    classTeacher: {
      text: string;
      signature?: string;
    };
    headteacher: {
      text: string;
      signature?: string;
    };
  };
  termDates: {
    nextTermBegins: string;
    endsOn: string;
  };
  requirements: {
    boarding: string[];
    day: string[];
  };
}

// ============================================================================
// TEMPLATE 9: Academy Professional Report
// ============================================================================

export interface Template9Data {
  school: {
    name: string;
    subtitle: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    motto: string;
    logo?: string; // base64 or URL
  };
  student: {
    name: string;
    studentId: string;
    paymentCode: string;
    class: string;
    stream: string;
    sex: 'MALE' | 'FEMALE';
    overallGroup: string; // Grade letter
    lin: string;
    photo?: string; // base64 or URL
  };
  reportTitle: string; // e.g., "END OF TERM ONE STUDENT REPORT CARD"
  subjects: Array<{
    learningArea: string;
    mot: number; // Mid of Term
    eot: number; // End of Term
    avg: number; // Average
    grade: string;
    comment: string;
    initial?: string;
  }>;
  summary: {
    totalMark: number;
    averageMark: number;
  };
  comments: {
    classTeacher: {
      text: string;
      signature?: string;
    };
    headTeacher: {
      text: string;
      signature?: string;
    };
  };
  termDates: {
    nextTermBegins: string;
    endsOn: string;
  };
  requirements: string;
  gradingScale: {
    ranges: string[]; // ['0.0 - 19.9', '20.0 - 39.9', ...]
    grades: string[]; // ['E', 'D', 'C', 'B', 'A']
  };
}

// ============================================================================
// TEMPLATE 10: Excellent Nursery Clean Template
// ============================================================================

export interface Template10Data {
  school: {
    name: string;
    address: string;
    website: string;
    phone: string;
    motto: string;
    logo?: string; // base64 or URL
  };
  reportTitle: string; // e.g., "LEARNER'S ASSESSMENT REPORT TERM 3, 2024"
  student: {
    name: string;
    class: string;
    regNo: string;
    daysAttended: number;
    daysAbsent: number;
    totalDays: number;
    feesBal: number | string;
    code: string;
    photo?: string; // base64 or URL
  };
  learningAreas: Array<{
    number: number; // 1-5
    description: string;
    score: number; // out of 100
    remark: string;
    signature?: string;
  }>;
  activities: {
    writing: string | boolean;
    listening: string | boolean;
    reading: string | boolean;
    speaking: string | boolean;
    drawing: string | boolean;
    games: string | boolean;
    rhymes: string | boolean;
    music: string | boolean;
    health: string | boolean;
    toilet: string | boolean;
  };
  summary: {
    total: number; // 500
    scored: number;
    position: number;
    outOf: number;
  };
  comments: {
    classTeacher: {
      report: string;
      name: string;
    };
    behaviorsAndCleanliness: {
      report: string;
      name: string;
    };
    headTeacher: {
      comment: string;
      name: string;
    };
  };
  footer: {
    dateOfIssue: string;
    nextTermBegins: string;
    requirements: string;
  };
}

// ============================================================================
// TEMPLATE 11: Simple Nursery Template
// ============================================================================

export interface Template11Data {
  school: {
    name: string;
    address: string;
    email: string;
    website: string;
    phone: string;
    motto: string;
    logo?: string; // base64 or URL (used for both header and watermark)
  };
  reportTitle: string; // e.g., "LEARNER'S ASSESSMENT REPORT, TERM 3, 2024"
  student: {
    regNo: string;
    class: string;
    name: string;
    feesBal: number | string;
    schoolPayCode: string;
    daysAttended: number;
    daysAbsent: number;
    totalDays: number;
    photo?: string; // base64 or URL
  };
  activities: Array<{
    name: string; // e.g., "WRITING", "LISTENING"
    illustration?: string; // base64 or URL for clipart icon
    comment?: string; // Teacher's remark/assessment
    rating?: string; // Optional rating/grade
  }>;
  comments: {
    classTeacher: {
      report: string;
    };
    behaviorsAndCleanliness: {
      report: string;
    };
    headTeacher: {
      comment: string;
    };
  };
  footer: {
    dateOfIssue: string;
    nextTermBegins: string;
    requirements: string;
  };
}

// ============================================================================
// TEMPLATE 12: Modern Nursery Template
// ============================================================================

export interface Template12Data {
  school: {
    name: string;
    address: string;
    email: string;
    website: string;
    phone: string;
    motto: string;
    logo?: string; // base64 or URL
  };
  reportTitle: string; // e.g., "LEARNER'S ASSESSMENT REPORT, TERM 3, 2024"
  student: {
    regNo: string;
    class: string;
    name: string;
    feesBal: number | string;
    schoolPayCode: string;
    daysAttended: number;
    daysAbsent: number;
    totalDays: number;
    photo?: string; // base64 or URL
  };
  learningAreas: Array<{
    number: number; // 1-5
    description: string;
    achievementScore: number; // out of 100
    position: number | string; // ordinal ranking (1st, 2nd, 3rd)
    comments: string;
    signature?: string;
  }>;
  summary: {
    total: number; // 500
    scored: number;
    position: number | string; // ordinal ranking
    outOf: number;
  };
  comments: {
    classTeacher: {
      report: string;
    };
    behaviorsAndCleanliness: {
      report: string;
    };
    headTeacher: {
      comment: string;
    };
  };
  footer: {
    dateOfIssue: string;
    nextTermBegins: string;
    requirements: string;
  };
}

// ============================================================================
// UNION TYPE FOR ALL NURSERY TEMPLATES
// ============================================================================

export type NurseryTemplateData =
  | Template7Data
  | Template8Data
  | Template9Data
  | Template10Data
  | Template11Data
  | Template12Data;
