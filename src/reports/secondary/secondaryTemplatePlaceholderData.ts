/**
 * Sample `reportData` for secondary previews — labels like "[Placeholder]" so layouts are
 * testable before real exam snapshots exist (see SECONDARY_REPORT_CARD_TEMPLATES_PLAN.md).
 */

import { isALevelClass, isOLevelClass } from '../../components/reports/templates/helpers';
import type { SecondaryTemplateKey } from '../../templates/secondary';

/** All four built-in secondary layouts (for sample preview UI). */
export const ALL_SECONDARY_TEMPLATE_KEYS: SecondaryTemplateKey[] = [
  'template1',
  'template2',
  'template3',
  'template4',
];

/**
 * `renderTemplateHTML` routes by `student.current_class`. For layout-only previews, map the
 * chosen template to a class label in the correct band (e.g. Alevel → S.5 if user picked S.1).
 */
export function placeholderRoutingClassForTemplate(
  templateKey: SecondaryTemplateKey,
  selectedClass: string
): string {
  const trimmed = (selectedClass || '').trim();
  if (templateKey === 'template4') {
    return isALevelClass(trimmed) ? trimmed : 'S.5';
  }
  return isOLevelClass(trimmed) ? trimmed : 'S.1 WEST';
}

const demoSchool = {
  name: '[School name — placeholder]',
  phone: 'Tel: 0700 000 000',
  email: 'info@school.sc.ug',
  address: 'P.O. Box 000, Uganda',
  motto: 'Dedicate, Educate, Inspire',
};

const baseExamSet = () => ({
  term: 2,
  year: 2025,
  name: 'End of Term Two',
});

function templateStandard() {
  return {
    school: { ...demoSchool },
    examSet: baseExamSet(),
    students: [
      {
        student_id: 'placeholder-s1',
        name: '[Learner name — placeholder]',
        admission_number: 'ADM/2025/0001',
        current_class: 'S.1 WEST',
        summary: {
          average: '72.4',
          division: 'II',
          performanceRemark: 'Satisfactory overall performance (placeholder).',
          attendanceDetails: { presentDays: 58, totalSchoolDays: 62 },
        },
        comments: {
          class_teacher_name: '[Class teacher — placeholder]',
          head_teacher_name: '[Head teacher — placeholder]',
        },
        results: [
          {
            subject: 'English',
            topic: 'Composition & comprehension (placeholder unit)',
            activity_score: '2.5',
            descriptor: 'Outstanding',
            formative_score: '16',
            exam_score: '64',
            final_score: '80',
            grade: 'A',
            overall_remark: 'Good progress.',
            teacher_initials: 'AB',
          },
          {
            subject: 'Mathematics',
            topic: 'Algebra & geometry (placeholder)',
            activity_score: '2.2',
            descriptor: 'Moderate',
            formative_score: '14',
            exam_score: '52',
            final_score: '66',
            grade: 'C',
            overall_remark: 'More practice needed.',
            teacher_initials: 'CD',
          },
          {
            subject: 'Integrated Science',
            topic: 'Matter & energy (placeholder)',
            activity_score: '2.4',
            descriptor: 'Outstanding',
            formative_score: '15',
            exam_score: '58',
            final_score: '73',
            grade: 'B',
            overall_remark: 'Steady improvement.',
            teacher_initials: 'EF',
          },
          {
            subject: 'Social Studies',
            topic: 'Citizenship (placeholder)',
            activity_score: '2.0',
            descriptor: 'Moderate',
            formative_score: '13',
            exam_score: '48',
            final_score: '61',
            grade: 'C',
            overall_remark: '',
            teacher_initials: 'GH',
          },
        ],
      },
    ],
  };
}

function templateBasic() {
  const subjects = [
    ['English', '14', '58', '72', 'B', 'Moderate'],
    ['Mathematics', '15', '52', '67', 'C', 'Moderate'],
    ['Physics', '13', '55', '68', 'C', 'Moderate'],
    ['Chemistry', '14', '50', '64', 'C', 'Moderate'],
    ['Biology', '16', '60', '76', 'B', 'Outstanding'],
    ['History & Pol. Educ.', '12', '48', '60', 'D', 'Moderate'],
    ['Geography', '15', '54', '69', 'C', 'Moderate'],
    ['ICT', '15', '56', '71', 'B', 'Moderate'],
    ['Entrepreneurship', '13', '49', '62', 'C', 'Moderate'],
    ['Luganda', '14', '51', '65', 'C', 'Moderate'],
    ['CRE', '13', '47', '60', 'D', 'Moderate'],
    ['Art', '16', '58', '74', 'B', 'Outstanding'],
    ['Agriculture', '14', '50', '64', 'C', 'Moderate'],
    ['Swahili', '12', '45', '57', 'D', 'Moderate'],
    ['Physical Education', '15', '55', '70', 'B', 'Moderate'],
  ] as const;

  return {
    school: { ...demoSchool },
    examSet: { ...baseExamSet(), year: 2024 },
    students: [
      {
        student_id: 'placeholder-basic',
        name: '[Learner name — placeholder]',
        admission_number: 'ADM/2024/0142',
        current_class: 'S.3 EAST',
        nextTermBegins: '6 February 2026',
        comments: {
          class_teacher_text:
            '[Class teacher comment — placeholder] Continues to engage well in class discussions.',
          head_teacher_text: '[Head teacher comment — placeholder] Encouraged to maintain effort in science subjects.',
        },
        results: subjects.map(([subject, fo, ex, tot, grade, desc]) => ({
          subject,
          formative_score: fo,
          exam_score: ex,
          final_score: tot,
          grade,
          descriptor: desc,
          teacher_initials: 'TR',
        })),
      },
    ],
  };
}

function templateProgressive() {
  return {
    school: { ...demoSchool },
    examSet: { term: 1, year: 2025, name: 'End of Term One', date: '26/05/2025' },
    students: [
      {
        student_id: 'placeholder-prog',
        name: '[Learner name — placeholder]',
        admission_number: 'ADM/2025/0200',
        current_class: 'S.4',
        stream: 'EAST',
        report_serial: 'S418',
        lin: '',
        progressiveFeesBalance: 0,
        nextTermBegins: '26/05/2025',
        comments: {
          class_teacher_text: '[Class teacher — placeholder] Good term; focus on examination technique.',
          head_teacher_text: '[Head teacher — placeholder] Keep up the disciplined approach.',
        },
        results: [
          { subject: 'Mathematics', continuous_exam_sets_in_line: 2, continuous_c1: '8', continuous_c2: '9', exam_score: '62', final_score: '79', teacher_initials: 'MK' },
          { subject: 'English', continuous_exam_sets_in_line: 2, continuous_c1: '7', continuous_c2: '8', exam_score: '58', final_score: '73', teacher_initials: 'JN' },
          { subject: 'Physics', continuous_exam_sets_in_line: 2, continuous_c1: '8', continuous_c2: '7', exam_score: '55', final_score: '70', teacher_initials: 'PK' },
          { subject: 'Biology', continuous_exam_sets_in_line: 2, continuous_c1: '9', continuous_c2: '8', exam_score: '59', final_score: '75', teacher_initials: 'LB' },
          { subject: 'Chemistry', continuous_exam_sets_in_line: 2, continuous_c1: '7', continuous_c2: '7', exam_score: '52', final_score: '66', teacher_initials: 'RC' },
          { subject: 'Geography', continuous_exam_sets_in_line: 2, continuous_c1: '8', continuous_c2: '8', exam_score: '54', final_score: '70', teacher_initials: 'SG' },
          { subject: 'History & Political Educ.', continuous_exam_sets_in_line: 2, continuous_c1: '7', continuous_c2: '7', exam_score: '50', final_score: '64', teacher_initials: 'HT' },
          { subject: 'Religious Education', continuous_exam_sets_in_line: 2, continuous_c1: '8', continuous_c2: '9', exam_score: '56', final_score: '72', teacher_initials: 'RE' },
          { subject: 'ICT', continuous_exam_sets_in_line: 2, continuous_c1: '9', continuous_c2: '8', exam_score: '60', final_score: '76', teacher_initials: 'IT' },
          { subject: 'Entrepreneurship', formative_score: '', exam_score: '', final_score: '', teacher_initials: '' },
          { subject: 'Fine Art', formative_score: '', exam_score: '', final_score: '', teacher_initials: '' },
          { subject: 'Agriculture', formative_score: '', exam_score: '', final_score: '', teacher_initials: '' },
          { subject: 'Kiswahili', formative_score: '', exam_score: '', final_score: '', teacher_initials: '' },
          { subject: 'Luganda', formative_score: '', exam_score: '', final_score: '', teacher_initials: '' },
        ],
      },
    ],
  };
}

function templateAlevel() {
  return {
    school: { ...demoSchool },
    examSet: baseExamSet(),
    students: [
      {
        student_id: 'placeholder-a1',
        name: '[Learner name — placeholder]',
        admission_number: 'GSS2923701',
        current_class: 'S.5',
        stream: 'TERM TWO WINNERS',
        combination: 'BAG/SM (Biology, Agriculture, Geography / Subsidiary Math — placeholder)',
        closing_date: '22/08/2025',
        opening_date: '15/09/2025',
        comments: {
          class_teacher_text:
            '[Class teacher comment — placeholder] Dedicated learner; continue targeting paper timing.',
          headteacher_text:
            '[Principal comment — placeholder] Commended for consistent attendance and class participation.',
          head_teacher_name: '[Principal — placeholder]',
          class_teacher_name: '[Class teacher — placeholder]',
        },
        results: [],
      },
    ],
    alevel: {
      principalPasses: 1,
      subsidiaryPasses: 2,
      totalPointsNumerator: 6,
      totalPointsDenominator: 20,
      classTeacherName: '[Class teacher — placeholder]',
      principalName: '[Principal — placeholder]',
      closingDate: '22/08/2025',
      openingDate: '15/09/2025',
      zorakiUsername: 'gss2923701@gss',
      lineChartStudentVsClass: [
        { xLabel: 'Bio', studentMetric: 72, classMetric: 65 },
        { xLabel: 'Agr', studentMetric: 68, classMetric: 62 },
        { xLabel: 'Geo', studentMetric: 75, classMetric: 70 },
        { xLabel: 'Sub', studentMetric: 60, classMetric: 58 },
      ],
      barChartByPeriod: [{ periodLabel: 'S5 T2, 2025', studentMetric: 6 }],
      paperRows: [
        {
          subjectLabel: 'Biology',
          paperCode: 'P530/1',
          marksPercent: 71,
          gradeDisplay: 'D2',
          comment: 'Solid grasp of core concepts (placeholder).',
          teacherDisplayName: 'S. Nambi',
        },
        {
          subjectLabel: 'Geography',
          paperCode: 'P250/1',
          marksPercent: 68,
          gradeDisplay: 'D2',
          comment: 'Case studies need more depth (placeholder).',
          teacherDisplayName: 'J. Ssemakula',
        },
        {
          subjectLabel: 'Geography',
          paperCode: 'P250/2',
          marksPercent: 64,
          gradeDisplay: 'D2',
          comment: '',
          teacherDisplayName: 'J. Ssemakula',
        },
        {
          subjectLabel: 'Geography (Overall)',
          paperCode: '—',
          marksPercent: null,
          gradeDisplay: 'O',
          comment: 'Satisfactory performance (placeholder).',
          teacherDisplayName: '—',
        },
        {
          subjectLabel: 'Agriculture',
          paperCode: 'S475/1',
          marksPercent: 66,
          gradeDisplay: 'D2',
          comment: '',
          teacherDisplayName: 'M. Nabirye',
        },
        {
          subjectLabel: 'Subsidiary Mathematics',
          paperCode: 'S101/1',
          marksPercent: 58,
          gradeDisplay: 'F9',
          comment: 'Paper practice (placeholder).',
          teacherDisplayName: 'F. Kampindi',
        },
        {
          subjectLabel: 'General Paper',
          paperCode: 'P900/1',
          marksPercent: 62,
          gradeDisplay: 'PB',
          comment: '',
          teacherDisplayName: 'E. Katabazi',
        },
      ],
    },
  };
}

export function getSecondaryPlaceholderReportData(key: SecondaryTemplateKey) {
  switch (key) {
    case 'template1':
      return templateStandard();
    case 'template2':
      return templateBasic();
    case 'template3':
      return templateProgressive();
    case 'template4':
      return templateAlevel();
    default:
      return templateStandard();
  }
}
