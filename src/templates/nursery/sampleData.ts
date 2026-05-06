/**
 * Sample Data Generators for Nursery Templates
 * 
 * This file provides realistic sample data for testing and previewing
 * all 6 nursery templates.
 */

import type {
  Template7Data,
  Template8Data,
  Template9Data,
  Template10Data,
  Template11Data,
  Template12Data
} from './types';

// ============================================================================
// TEMPLATE 7 SAMPLE DATA
// ============================================================================

export function getSampleTemplate7Data(): Template7Data {
  return {
    school: {
      name: 'PWEZACORE JUNIOR SCHOOL',
      address: 'Location Gangu Kimwanyi Busaabala Road',
      phone: '0751 230190 / 0772 604623 / 0702 086390'
    },
    student: {
      name: 'SAMPLE STUDENT NAME',
      class: 'Baby Class',
      age: '4 years',
      term: 'Term 1',
      year: '2024',
      position: '5th',
      outOf: '25'
    },
    subjects: [
      {
        name: 'LEARNING AREA 1',
        marksObtained: 85,
        outOf: 100,
        examAgg: 1,
        aggGrade: 'A',
        remarks: 'Excellent performance',
        initials: 'JD'
      },
      {
        name: 'LEARNING AREA 2',
        marksObtained: 78,
        outOf: 100,
        examAgg: 2,
        aggGrade: 'B',
        remarks: 'Very good work',
        initials: 'JD'
      },
      {
        name: 'LEARNING AREA 3',
        marksObtained: 82,
        outOf: 100,
        examAgg: 1,
        aggGrade: 'A',
        remarks: 'Outstanding',
        initials: 'JD'
      },
      {
        name: 'LEARNING AREA 4',
        marksObtained: 75,
        outOf: 100,
        examAgg: 2,
        aggGrade: 'B',
        remarks: 'Good progress',
        initials: 'JD'
      },
      {
        name: 'LEARNING AREA 5',
        marksObtained: 88,
        outOf: 100,
        examAgg: 1,
        aggGrade: 'A',
        remarks: 'Excellent',
        initials: 'JD'
      },
      {
        name: 'GEN. KNOWLEDGE',
        marksObtained: 80,
        outOf: 100,
        examAgg: 1,
        aggGrade: 'A',
        remarks: 'Very good',
        initials: 'JD'
      }
    ],
    total: 488,
    comments: {
      classTeacher: {
        text: 'An excellent student who shows great enthusiasm for learning. Keep up the good work!',
        signature: 'Ms. Jane Doe'
      },
      headteacher: {
        text: 'Outstanding performance. Well done!',
        signature: 'Mr. John Smith'
      }
    },
    requirements: 'School Requirements: 2 exercise books, 1 pencil, 1 eraser, 1 ruler',
    termDates: {
      endDate: '15th December 2024',
      nextTermBegins: '20th January 2025'
    }
  };
}

// ============================================================================
// TEMPLATE 8 SAMPLE DATA
// ============================================================================

export function getSampleTemplate8Data(): Template8Data {
  return {
    school: {
      name: 'PWEZACORE INFANT AND PRIMARY SCHOOL',
      address: 'P. O. BOX 7, RAKAI',
      phone: '0783124136 / 0706779395'
    },
    student: {
      name: 'SAMPLE STUDENT NAME',
      class: 'Middle Class',
      year: '2024',
      term: 'Term 1',
      age: '5 years',
      date: '15/12/2024',
      linNo: 'LIN12345'
    },
    skillsAssessment: [
      // Row 1
      { skill: 'Toilet', status: 'Very Good' },
      { skill: 'Recognition of numbers', status: 'Good' },
      { skill: 'Property care', status: 'Very Good' },
      { skill: 'Handling of pencil', status: 'Good' },
      { skill: 'Re-sighting Alphabet', status: 'Tries' },
      { skill: 'Attention span', status: 'Good' },
      { skill: 'Punctuality', status: 'Very Good' },
      { skill: 'Shading', status: 'Good' },
      // Row 2
      { skill: 'Nose care', status: 'Very Good' },
      { skill: 'Recognition of shapes', status: 'Good' },
      { skill: 'Respect', status: 'Very Good' },
      { skill: 'Arrival time', status: 'Good' },
      { skill: 'Counting number sequence', status: 'Tries' },
      { skill: 'Re-sighting Poems', status: 'Good' },
      { skill: 'Love or Interest', status: 'Promising' },
      { skill: 'Drawing', status: 'Good' },
      // Row 3
      { skill: 'Recognition of letters', status: 'Good' },
      { skill: 'Sharing', status: 'Very Good' },
      { skill: 'Friendship', status: 'Very Good' },
      { skill: 'Colours', status: 'Good' },
      { skill: 'Playing', status: 'Very Good' },
      { skill: 'Emotional', status: 'Good' },
      { skill: 'Smartness', status: 'Very Good' }
    ],
    subjects: [
      {
        name: 'Social Development 1',
        midTerm: 'A',
        endOfTerm: 'A',
        outOf: 100,
        teacherRemarks: 'Excellent progress in all areas. Shows great enthusiasm and dedication.',
        signature: 'JD'
      },
      {
        name: 'Language Development 1',
        midTerm: 'B',
        endOfTerm: 'A',
        outOf: 100
      },
      {
        name: 'Health Habits',
        midTerm: 'A',
        endOfTerm: 'A',
        outOf: 100
      },
      {
        name: 'Mathematical Concept',
        midTerm: 'B',
        endOfTerm: 'B',
        outOf: 100
      },
      {
        name: 'Language Development II',
        midTerm: 'A',
        endOfTerm: 'A',
        outOf: 100
      },
      {
        name: 'Writing',
        midTerm: 'B',
        endOfTerm: 'A',
        outOf: 100
      },
      {
        name: 'TOTAL',
        midTerm: '520',
        endOfTerm: '560',
        outOf: 600
      }
    ],
    total: 560,
    comments: {
      classTeacher: {
        text: 'A wonderful student with great potential. Shows excellent progress.',
        signature: 'Ms. Jane Doe'
      },
      headteacher: {
        text: 'Keep up the excellent work!',
        signature: 'Mr. John Smith'
      }
    },
    termDates: {
      nextTermBegins: '20th January 2025',
      endsOn: '15th April 2025'
    },
    requirements: {
      boarding: [
        'Mattress',
        'Bedsheets (2)',
        'Blankets (2)',
        'Mosquito net',
        'Toiletries (soap, toothbrush, toothpaste)',
        'Towels (2)',
        'Uniform (3 sets)',
        'Casual clothes'
      ],
      day: [
        'School fees: UGX 500,000',
        '2 exercise books',
        '1 pencil',
        '1 eraser',
        '1 ruler',
        'Crayons',
        'Water bottle',
        'Lunch box'
      ]
    }
  };
}

// ============================================================================
// TEMPLATE 9 SAMPLE DATA
// ============================================================================

export function getSampleTemplate9Data(): Template9Data {
  return {
    school: {
      name: 'PWEZACORE ACADEMY',
      subtitle: 'Mixed Day & Boarding nursery and primary school',
      address: 'P.O BOX 001 KLA',
      phone: '2567851268021',
      email: 'info@pwezacore.ac.ug',
      website: 'http://pwezacore.ac.ug',
      motto: 'NEVER GIVE UP'
    },
    student: {
      name: 'SAMPLE STUDENT NAME',
      studentId: 'STU001',
      paymentCode: 'PAY12345',
      class: 'Top Class',
      stream: 'A',
      sex: 'MALE',
      overallGroup: 'A',
      lin: 'LIN001'
    },
    reportTitle: 'END OF TERM ONE STUDENT REPORT CARD',
    subjects: [
      {
        learningArea: 'READING',
        mot: 85,
        eot: 88,
        avg: 86.5,
        grade: 'A',
        comment: 'Excellent reading skills',
        initial: 'JD'
      },
      {
        learningArea: 'WRITTING',
        mot: 78,
        eot: 82,
        avg: 80,
        grade: 'B',
        comment: 'Good improvement',
        initial: 'JD'
      },
      {
        learningArea: 'Language Development',
        mot: 82,
        eot: 85,
        avg: 83.5,
        grade: 'A',
        comment: 'Very good',
        initial: 'JD'
      },
      {
        learningArea: 'Numeracy',
        mot: 90,
        eot: 92,
        avg: 91,
        grade: 'A',
        comment: 'Outstanding',
        initial: 'JD'
      },
      {
        learningArea: 'Social Studies',
        mot: 75,
        eot: 78,
        avg: 76.5,
        grade: 'B',
        comment: 'Good work',
        initial: 'JD'
      },
      {
        learningArea: 'General Knowledge',
        mot: 88,
        eot: 90,
        avg: 89,
        grade: 'A',
        comment: 'Excellent',
        initial: 'JD'
      }
    ],
    summary: {
      totalMark: 506,
      averageMark: 84.3
    },
    comments: {
      classTeacher: {
        text: 'An outstanding student who consistently performs well.',
        signature: 'Ms. Jane Doe'
      },
      headTeacher: {
        text: 'Excellent performance. Keep it up!',
        signature: 'Mr. John Smith'
      }
    },
    termDates: {
      nextTermBegins: '20th January 2025',
      endsOn: '15th April 2025'
    },
    requirements: 'School Requirements: 2 exercise books, 1 pencil, 1 eraser',
    gradingScale: {
      ranges: ['0.0 - 19.9', '20.0 - 39.9', '40.0 - 69.9', '70.0 - 89.9', '90.0 - 100.0'],
      grades: ['E', 'D', 'C', 'B', 'A']
    }
  };
}

// ============================================================================
// TEMPLATE 10 SAMPLE DATA
// ============================================================================

export function getSampleTemplate10Data(): Template10Data {
  return {
    school: {
      name: 'PWEZACORE UGANDA NURSERY SCHOOL',
      address: 'P. O. Box, 212 Kampala',
      website: 'www.pwezacore.net',
      phone: '+256 776960740',
      motto: 'Have to Give'
    },
    reportTitle: "LEARNER'S ASSESSMENT REPORT TERM 3, 2024",
    student: {
      name: 'SAMPLE STUDENT NAME',
      class: 'Baby Class',
      regNo: 'REG001',
      daysAttended: 58,
      daysAbsent: 2,
      totalDays: 60,
      feesBal: 0,
      code: 'CODE123'
    },
    learningAreas: [
      {
        number: 1,
        description: 'Taking care of myself for proper growth and development',
        score: 85,
        remark: 'Excellent self-care skills',
        signature: 'JD'
      },
      {
        number: 2,
        description: 'Interacting, exploring, knowing and using my environment',
        score: 88,
        remark: 'Very curious and engaged',
        signature: 'JD'
      },
      {
        number: 3,
        description: 'Relating with others in an acceptable way.',
        score: 90,
        remark: 'Outstanding social skills',
        signature: 'JD'
      },
      {
        number: 4,
        description: 'Developing and using my Language appropriately',
        score: 82,
        remark: 'Good language development',
        signature: 'JD'
      },
      {
        number: 5,
        description: 'Developing and using Mathematical Concepts',
        score: 86,
        remark: 'Excellent numeracy skills',
        signature: 'JD'
      }
    ],
    activities: {
      writing: 'Good',
      listening: 'Excellent',
      reading: 'Very Good',
      speaking: 'Good',
      drawing: 'Excellent',
      games: 'Very Good',
      rhymes: 'Good',
      music: 'Excellent',
      health: 'Very Good',
      toilet: 'Excellent'
    },
    summary: {
      total: 500,
      scored: 431,
      position: 3,
      outOf: 25
    },
    comments: {
      classTeacher: {
        report: 'An excellent student with great potential.',
        name: 'Ms. Jane Doe'
      },
      behaviorsAndCleanliness: {
        report: 'Very clean and well-behaved.',
        name: 'Ms. Mary Johnson'
      },
      headTeacher: {
        comment: 'Outstanding performance. Keep it up!',
        name: 'Mr. John Smith'
      }
    },
    footer: {
      dateOfIssue: '15th December 2024',
      nextTermBegins: '20th January 2025',
      requirements: '2 exercise books, 1 pencil, 1 eraser'
    }
  };
}

// ============================================================================
// TEMPLATE 11 SAMPLE DATA
// ============================================================================

export function getSampleTemplate11Data(): Template11Data {
  return {
    school: {
      name: 'PWEZACORE UGANDA NURSERY SCHOOL',
      address: 'P. O. Box, 212 Kampala',
      email: 'info@pwezacore.net',
      website: 'www.pwezacore.net',
      phone: '+256 776960740',
      motto: 'Have to Give'
    },
    reportTitle: "LEARNER'S ASSESSMENT REPORT, TERM 3, 2024",
    student: {
      regNo: 'REG001',
      class: 'Middle Class',
      name: 'SAMPLE STUDENT NAME',
      feesBal: 0,
      schoolPayCode: 'CODE123',
      daysAttended: 58,
      daysAbsent: 2,
      totalDays: 60
    },
    activities: [
      { name: 'WRITING', comment: 'Good handwriting skills', rating: 'Good' },
      { name: 'LISTENING', comment: 'Attentive listener', rating: 'Excellent' },
      { name: 'READING', comment: 'Reading well', rating: 'Very Good' },
      { name: 'SPEAKING', comment: 'Clear speech', rating: 'Good' },
      { name: 'DRAWING', comment: 'Creative drawings', rating: 'Excellent' },
      { name: 'GAMES', comment: 'Enjoys games', rating: 'Very Good' },
      { name: 'RHYMES / STORIES', comment: 'Loves stories', rating: 'Good' },
      { name: 'MUSIC', comment: 'Musical talent', rating: 'Excellent' },
      { name: 'HEALTH HABITS', comment: 'Very clean', rating: 'Very Good' },
      { name: 'TOILET HABITS', comment: 'Independent', rating: 'Excellent' }
    ],
    comments: {
      classTeacher: {
        report: 'An excellent student with great potential.'
      },
      behaviorsAndCleanliness: {
        report: 'Very clean and well-behaved.'
      },
      headTeacher: {
        comment: 'Outstanding performance. Keep it up!'
      }
    },
    footer: {
      dateOfIssue: '15th December 2024',
      nextTermBegins: '20th January 2025',
      requirements: '2 exercise books, 1 pencil, 1 eraser'
    }
  };
}

// ============================================================================
// TEMPLATE 12 SAMPLE DATA
// ============================================================================

export function getSampleTemplate12Data(): Template12Data {
  return {
    school: {
      name: 'PWEZACORE UGANDA NURSERY SCHOOL',
      address: 'P. O. Box, 212 Kampala',
      email: 'info@pwezacore.net',
      website: 'www.pwezacore.net',
      phone: '+256 776960740',
      motto: 'Have to Give'
    },
    reportTitle: "LEARNER'S ASSESSMENT REPORT, TERM 3, 2024",
    student: {
      regNo: 'REG001',
      class: 'Top Class',
      name: 'SAMPLE STUDENT NAME',
      feesBal: 0,
      schoolPayCode: 'CODE123',
      daysAttended: 58,
      daysAbsent: 2,
      totalDays: 60
    },
    learningAreas: [
      {
        number: 1,
        description: 'Taking care of myself for proper growth and development',
        achievementScore: 85,
        position: '2nd',
        comments: 'Excellent self-care skills',
        signature: 'JD'
      },
      {
        number: 2,
        description: 'Interacting, exploring, knowing and using my environment',
        achievementScore: 88,
        position: '1st',
        comments: 'Very curious and engaged',
        signature: 'JD'
      },
      {
        number: 3,
        description: 'Relating with others in an acceptable way.',
        achievementScore: 90,
        position: '1st',
        comments: 'Outstanding social skills',
        signature: 'JD'
      },
      {
        number: 4,
        description: 'Developing and using my Language appropriately',
        achievementScore: 82,
        position: '3rd',
        comments: 'Good language development',
        signature: 'JD'
      },
      {
        number: 5,
        description: 'Developing and using Mathematical Concepts in my day-to-day',
        achievementScore: 86,
        position: '2nd',
        comments: 'Excellent numeracy skills',
        signature: 'JD'
      }
    ],
    summary: {
      total: 500,
      scored: 431,
      position: '3rd',
      outOf: 25
    },
    comments: {
      classTeacher: {
        report: 'An excellent student with great potential.'
      },
      behaviorsAndCleanliness: {
        report: 'Very clean and well-behaved.'
      },
      headTeacher: {
        comment: 'Outstanding performance. Keep it up!'
      }
    },
    footer: {
      dateOfIssue: '15th December 2024',
      nextTermBegins: '20th January 2025',
      requirements: '2 exercise books, 1 pencil, 1 eraser'
    }
  };
}
