/**
 * Visual Template Designer - Component Metadata
 * 
 * This file defines metadata for all component types in the component library.
 * Metadata includes display names, descriptions, icons, categories, and default properties.
 * 
 * This metadata is used by:
 * - ComponentLibrary UI (Task 10) to display components with proper labels and icons
 * - Category filtering logic (Task 4.2) to determine which components are available
 * - Component creation logic to initialize components with sensible defaults
 */

import type { ComponentType, TemplateCategory } from '../types/enums';
import type { LayoutProperties } from '../types/layout';

/**
 * Component category groups related components together in the UI.
 */
export type ComponentCategory = 
  | 'School Info'
  | 'Student Info'
  | 'Academic'
  | 'Financial'
  | 'Static';

/**
 * Metadata for a single component type.
 */
export interface ComponentMetadata {
  type: ComponentType;
  displayName: string;
  description: string;
  icon: string; // Icon name or identifier (e.g., for icon library)
  category: ComponentCategory;
  defaultProperties: Partial<LayoutProperties>;
  dataBindingField?: string; // Default data binding field for dynamic components
}

/**
 * Complete metadata for all component types.
 * Organized by component type for easy lookup.
 */
export const COMPONENT_METADATA: Record<ComponentType, ComponentMetadata> = {
  // School Info Components
  SCHOOL_LOGO: {
    type: 'SCHOOL_LOGO',
    displayName: 'School Logo',
    description: 'Displays the school logo image',
    icon: 'image',
    category: 'School Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 100, height: 100, unit: 'px', aspectRatioLocked: true },
      rotation: 0,
      imagefit: 'contain'
    },
    dataBindingField: 'school.logo_url'
  },
  SCHOOL_NAME: {
    type: 'SCHOOL_NAME',
    displayName: 'School Name',
    description: 'Displays the school name',
    icon: 'text',
    category: 'School Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 300, height: 40, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 24,
        weight: 'bold',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'center'
    },
    dataBindingField: 'school.name'
  },
  SCHOOL_MOTTO: {
    type: 'SCHOOL_MOTTO',
    displayName: 'School Motto',
    description: 'Displays the school motto or tagline',
    icon: 'text',
    category: 'School Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 300, height: 30, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 14,
        weight: 'normal',
        style: 'italic'
      },
      color: {
        text: '#333333'
      },
      alignment: 'center'
    },
    dataBindingField: 'school.motto'
  },
  SCHOOL_ADDRESS: {
    type: 'SCHOOL_ADDRESS',
    displayName: 'School Address',
    description: 'Displays the school physical address',
    icon: 'map-pin',
    category: 'School Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 250, height: 60, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 12,
        weight: 'normal',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'left'
    },
    dataBindingField: 'school.address'
  },
  SCHOOL_CONTACT: {
    type: 'SCHOOL_CONTACT',
    displayName: 'School Contact',
    description: 'Displays school contact information (phone, email)',
    icon: 'phone',
    category: 'School Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 250, height: 40, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 12,
        weight: 'normal',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'left'
    },
    dataBindingField: 'school.contact'
  },
  SCHOOL_POBOX: {
    type: 'SCHOOL_POBOX',
    displayName: 'School P.O. Box',
    description: 'Displays the school postal box address',
    icon: 'mail',
    category: 'School Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 200, height: 25, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 11, weight: 'normal', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'left'
    },
    dataBindingField: 'school.pobox'
  },

  // Student Info Components
  STUDENT_NAME: {
    type: 'STUDENT_NAME',
    displayName: 'Student Name',
    description: 'Displays the student full name',
    icon: 'user',
    category: 'Student Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 250, height: 30, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 16,
        weight: 'bold',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'left'
    },
    dataBindingField: 'student.full_name'
  },
  STUDENT_PHOTO: {
    type: 'STUDENT_PHOTO',
    displayName: 'Student Photo',
    description: 'Displays the student photograph',
    icon: 'camera',
    category: 'Student Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 120, height: 150, unit: 'px', aspectRatioLocked: true },
      rotation: 0,
      imagefit: 'cover',
      border: {
        width: 1,
        color: '#CCCCCC',
        style: 'solid'
      }
    },
    dataBindingField: 'student.photo_url'
  },
  STUDENT_CLASS: {
    type: 'STUDENT_CLASS',
    displayName: 'Student Class',
    description: 'Displays the student class/grade level',
    icon: 'book',
    category: 'Student Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 150, height: 25, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 14,
        weight: 'normal',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'left'
    },
    dataBindingField: 'student.class'
  },
  STUDENT_STREAM: {
    type: 'STUDENT_STREAM',
    displayName: 'Student Stream',
    description: 'Displays the student stream/section',
    icon: 'layers',
    category: 'Student Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 100, height: 25, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 14,
        weight: 'normal',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'left'
    },
    dataBindingField: 'student.stream'
  },
  STUDENT_NUMBER: {
    type: 'STUDENT_NUMBER',
    displayName: 'Student Number',
    description: 'Displays the student identification number',
    icon: 'hash',
    category: 'Student Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 150, height: 25, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 12,
        weight: 'normal',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'left'
    },
    dataBindingField: 'student.student_number'
  },
  STUDENT_ATTENDANCE: {
    type: 'STUDENT_ATTENDANCE',
    displayName: 'Student Attendance',
    description: 'Displays student attendance statistics',
    icon: 'calendar-check',
    category: 'Student Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 200, height: 25, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'left'
    },
    dataBindingField: 'student.attendance'
  },
  STUDENT_GENDER: {
    type: 'STUDENT_GENDER',
    displayName: 'Student Gender',
    description: 'Displays the student gender (Male / Female)',
    icon: 'user',
    category: 'Student Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 120, height: 25, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'left'
    },
    dataBindingField: 'student.gender'
  },
  STUDENT_DOB: {
    type: 'STUDENT_DOB',
    displayName: 'Date of Birth',
    description: 'Displays the student date of birth',
    icon: 'calendar',
    category: 'Student Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 160, height: 25, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'left'
    },
    dataBindingField: 'student.date_of_birth'
  },
  STUDENT_GUARDIAN: {
    type: 'STUDENT_GUARDIAN',
    displayName: 'Guardian Name',
    description: "Displays the student's parent / guardian name",
    icon: 'users',
    category: 'Student Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 220, height: 25, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'left'
    },
    dataBindingField: 'student.guardian_name'
  },
  BOARDING_TYPE: {
    type: 'BOARDING_TYPE',
    displayName: 'Boarding Type',
    description: 'Displays whether the student is a boarder or day scholar',
    icon: 'home',
    category: 'Student Info',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 140, height: 25, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'left'
    },
    dataBindingField: 'student.boarding_type'
  },

  // Academic Components
  RESULTS_TABLE: {
    type: 'RESULTS_TABLE',
    displayName: 'Results Table',
    description: 'Displays a table of subject scores and grades',
    icon: 'table',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 500, height: 300, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 12,
        weight: 'normal',
        style: 'normal'
      }
    },
    dataBindingField: 'student.results'
  },
  SUBJECT_SCORES: {
    type: 'SUBJECT_SCORES',
    displayName: 'Subject Scores',
    description: 'Displays individual subject scores',
    icon: 'list',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 300, height: 200, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 12,
        weight: 'normal',
        style: 'normal'
      },
      color: {
        text: '#000000'
      }
    },
    dataBindingField: 'student.subject_scores'
  },
  GRADE_DISPLAY: {
    type: 'GRADE_DISPLAY',
    displayName: 'Grade Display',
    description: 'Displays the overall grade or letter grade',
    icon: 'award',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 100, height: 40, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 24,
        weight: 'bold',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'center'
    },
    dataBindingField: 'student.grade'
  },
  AGGREGATE_DISPLAY: {
    type: 'AGGREGATE_DISPLAY',
    displayName: 'Aggregate Display',
    description: 'Displays the aggregate score or total points',
    icon: 'calculator',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 150, height: 30, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 16,
        weight: 'bold',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'center'
    },
    dataBindingField: 'student.aggregate'
  },
  DIVISION_DISPLAY: {
    type: 'DIVISION_DISPLAY',
    displayName: 'Division Display',
    description: 'Displays the division or performance category',
    icon: 'trending-up',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 150, height: 30, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 14,
        weight: 'bold',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'center'
    },
    dataBindingField: 'student.division'
  },
  TEACHER_REMARKS: {
    type: 'TEACHER_REMARKS',
    displayName: 'Teacher Remarks',
    description: 'Displays teacher comments and remarks',
    icon: 'message-square',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 400, height: 80, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 12,
        weight: 'normal',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'left'
    },
    dataBindingField: 'student.teacher_remarks'
  },
  HEAD_TEACHER_COMMENTS: {
    type: 'HEAD_TEACHER_COMMENTS',
    displayName: 'Head Teacher Comments',
    description: 'Displays head teacher or principal comments',
    icon: 'file-text',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 400, height: 80, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'left'
    },
    dataBindingField: 'student.head_teacher_comments'
  },
  CLASS_POSITION: {
    type: 'CLASS_POSITION',
    displayName: 'Class Position',
    description: "Displays the student's position in class (e.g. 3rd out of 42)",
    icon: 'trending-up',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 180, height: 25, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'bold', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'left'
    },
    dataBindingField: 'academic.class_position'
  },
  PERCENTAGE_DISPLAY: {
    type: 'PERCENTAGE_DISPLAY',
    displayName: 'Percentage Score',
    description: "Displays the student's overall percentage score",
    icon: 'percent',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 140, height: 25, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 14, weight: 'bold', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'center'
    },
    dataBindingField: 'academic.percentage'
  },
  TERM_DISPLAY: {
    type: 'TERM_DISPLAY',
    displayName: 'Term',
    description: 'Displays the current school term (e.g. Term 1)',
    icon: 'calendar',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 120, height: 25, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'left'
    },
    dataBindingField: 'term.term'
  },
  YEAR_DISPLAY: {
    type: 'YEAR_DISPLAY',
    displayName: 'Year',
    description: 'Displays the academic year (e.g. 2025)',
    icon: 'calendar',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 100, height: 25, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'left'
    },
    dataBindingField: 'term.year'
  },
  NEXT_TERM_DATE: {
    type: 'NEXT_TERM_DATE',
    displayName: 'Next Term Begins',
    description: 'Displays the date when the next term begins',
    icon: 'calendar',
    category: 'Academic',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 200, height: 25, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000' },
      alignment: 'left'
    },
    dataBindingField: 'academic.next_term_begins_date'
  },

  // Financial Components
  FEES_BALANCE: {
    type: 'FEES_BALANCE',
    displayName: 'Fees Balance',
    description: 'Displays the current fees balance or amount due',
    icon: 'dollar-sign',
    category: 'Financial',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 200, height: 30, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 16,
        weight: 'bold',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'right'
    },
    dataBindingField: 'student.fees_balance'
  },
  PAYMENT_SUMMARY: {
    type: 'PAYMENT_SUMMARY',
    displayName: 'Payment Summary',
    description: 'Displays a summary of payments made',
    icon: 'credit-card',
    category: 'Financial',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 350, height: 150, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 12,
        weight: 'normal',
        style: 'normal'
      },
      color: {
        text: '#000000'
      }
    },
    dataBindingField: 'student.payment_summary'
  },
  FEE_STRUCTURE: {
    type: 'FEE_STRUCTURE',
    displayName: 'Fee Structure',
    description: 'Displays the fee structure breakdown',
    icon: 'list-ordered',
    category: 'Financial',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 350, height: 200, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000' }
    },
    dataBindingField: 'school.fee_structure'
  },
  REQUIREMENTS_TABLE: {
    type: 'REQUIREMENTS_TABLE',
    displayName: 'Requirements',
    description: 'Displays the list of items required from the student (e.g. books, uniform)',
    icon: 'clipboard-list',
    category: 'Financial',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 350, height: 180, unit: 'px' },
      rotation: 0,
      font: { family: 'Arial', size: 12, weight: 'normal', style: 'normal' },
      color: { text: '#000000' }
    },
    dataBindingField: 'student.requirements'
  },

  // Static Components
  LINE: {
    type: 'LINE',
    displayName: 'Line',
    description: 'A horizontal or vertical line for visual separation',
    icon: 'minus',
    category: 'Static',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 200, height: 2, unit: 'px' },
      rotation: 0,
      color: {
        background: '#000000'
      }
    }
  },
  BORDER: {
    type: 'BORDER',
    displayName: 'Border',
    description: 'A rectangular border frame',
    icon: 'square',
    category: 'Static',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 300, height: 200, unit: 'px' },
      rotation: 0,
      border: {
        width: 2,
        color: '#000000',
        style: 'solid'
      }
    }
  },
  RECTANGLE: {
    type: 'RECTANGLE',
    displayName: 'Rectangle',
    description: 'A filled rectangle shape',
    icon: 'square',
    category: 'Static',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 200, height: 100, unit: 'px' },
      rotation: 0,
      color: {
        background: '#EEEEEE'
      },
      border: {
        width: 1,
        color: '#000000',
        style: 'solid'
      }
    }
  },
  CIRCLE: {
    type: 'CIRCLE',
    displayName: 'Circle',
    description: 'A circular shape',
    icon: 'circle',
    category: 'Static',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 100, height: 100, unit: 'px', aspectRatioLocked: true },
      rotation: 0,
      color: {
        background: '#EEEEEE'
      },
      border: {
        width: 1,
        color: '#000000',
        style: 'solid'
      }
    }
  },
  BACKGROUND_IMAGE: {
    type: 'BACKGROUND_IMAGE',
    displayName: 'Background Image',
    description: 'A background image for the template',
    icon: 'image',
    category: 'Static',
    defaultProperties: {
      position: { x: 0, y: 0, unit: 'px' },
      size: { width: 595, height: 842, unit: 'px' }, // A4 size in pixels at 72 DPI
      rotation: 0,
      imagefit: 'cover'
    }
  },
  WATERMARK: {
    type: 'WATERMARK',
    displayName: 'Watermark',
    description: 'A watermark image or text overlay',
    icon: 'droplet',
    category: 'Static',
    defaultProperties: {
      position: { x: 150, y: 300, unit: 'px' },
      size: { width: 300, height: 200, unit: 'px' },
      rotation: 45,
      color: {
        text: '#CCCCCC'
      },
      font: {
        family: 'Arial',
        size: 48,
        weight: 'bold',
        style: 'normal'
      },
      alignment: 'center'
    }
  },
  TEXT_LABEL: {
    type: 'TEXT_LABEL',
    displayName: 'Text Label',
    description: 'A static text label',
    icon: 'type',
    category: 'Static',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 200, height: 30, unit: 'px' },
      rotation: 0,
      font: {
        family: 'Arial',
        size: 14,
        weight: 'normal',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'left'
    }
  },
  SIGNATURE_FIELD: {
    type: 'SIGNATURE_FIELD',
    displayName: 'Signature Field',
    description: 'A field for signatures with optional label',
    icon: 'edit-3',
    category: 'Static',
    defaultProperties: {
      position: { x: 50, y: 50, unit: 'px' },
      size: { width: 200, height: 60, unit: 'px' },
      rotation: 0,
      border: {
        width: 0,
        color: '#000000',
        style: 'solid'
      },
      font: {
        family: 'Arial',
        size: 12,
        weight: 'normal',
        style: 'normal'
      },
      color: {
        text: '#000000'
      },
      alignment: 'center'
    }
  }
};

/**
 * Get metadata for a specific component type.
 */
export function getComponentMetadata(type: ComponentType): ComponentMetadata {
  return COMPONENT_METADATA[type];
}

/**
 * Get all component types for a specific category.
 */
export function getComponentsByCategory(category: ComponentCategory): ComponentType[] {
  return Object.values(COMPONENT_METADATA)
    .filter(metadata => metadata.category === category)
    .map(metadata => metadata.type);
}

/**
 * Get all available component categories.
 */
export function getAllComponentCategories(): ComponentCategory[] {
  return ['School Info', 'Student Info', 'Academic', 'Financial', 'Static'];
}
