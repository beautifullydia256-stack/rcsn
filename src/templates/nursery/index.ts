/**
 * Nursery Report Templates Registry
 * 
 * This module manages the 6 new nursery report card templates (Templates 7-12)
 * for Baby Class, Middle Class, and Top Class.
 * 
 * Each template is designed as an empty/blank template for dynamic data filling.
 */

// Export data mapping functions
export * from './dataMapping';

// Export type definitions
export * from './types';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export type NurserySection = 'Baby Class' | 'Middle Class' | 'Top Class' | 'All Nursery';
export type LayoutType = 'table' | 'grid' | 'card';

export interface ColorTheme {
  primary: string;
  secondary?: string;
  accent?: string;
  text: string;
  border: string;
}

export interface PdfGenerationOptions {
  format: 'A4';
  margin: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  printBackground: boolean;
  preferCSSPageSize: boolean;
}

export interface TemplateConfig {
  key: string;
  id: string;
  name: string;
  description: string;
  section: NurserySection;
  schoolType: 'Nursery/Primary';
  subjects: readonly string[];
  colorTheme: ColorTheme;
  layoutType: LayoutType;
  pdfOptions: PdfGenerationOptions;
}

export interface TemplateFilter {
  section?: NurserySection;
  layoutType?: LayoutType;
}

// ============================================================================
// NURSERY TEMPLATES REGISTRY
// ============================================================================

export const NURSERY_TEMPLATES = {
  template7: {
    key: 'template7',
    id: 'nursery_junior_template',
    name: 'Junior Nursery Report Template',
    description: 'Simple green-bordered report with learning areas',
    section: 'All Nursery' as const,
    schoolType: 'Nursery/Primary' as const,
    subjects: [
      'LEARNING AREA 1',
      'LEARNING AREA 2',
      'LEARNING AREA 3',
      'LEARNING AREA 4',
      'LEARNING AREA 5',
      'GEN. KNOWLEDGE'
    ],
    colorTheme: {
      primary: '#006b4d',
      text: '#000000',
      border: '#006b4d'
    },
    layoutType: 'table' as const,
    pdfOptions: {
      format: 'A4' as const,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true,
      preferCSSPageSize: true
    }
  },

  template8: {
    key: 'template8',
    id: 'nursery_detail_colour_marks',
    name: 'Detail Colour Marks Report Template',
    description: 'Complex report with skills grid and academic table',
    section: 'All Nursery' as const,
    schoolType: 'Nursery/Primary' as const,
    subjects: [
      'Social Development 1',
      'Language Development 1',
      'Health Habits',
      'Mathematical Concept',
      'Language Development II',
      'Writing'
    ],
    colorTheme: {
      primary: '#000000',
      text: '#000000',
      border: '#000000'
    },
    layoutType: 'grid' as const,
    pdfOptions: {
      format: 'A4' as const,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
      printBackground: true,
      preferCSSPageSize: true
    }
  },

  template9: {
    key: 'template9',
    id: 'nursery_academy_professional',
    name: 'Academy Professional Report',
    description: 'Modern professional report with navy blue theme',
    section: 'All Nursery' as const,
    schoolType: 'Nursery/Primary' as const,
    subjects: [
      'READING',
      'WRITTING',
      'Language Development',
      'Numeracy',
      'Social Studies',
      'General Knowledge'
    ],
    colorTheme: {
      primary: '#002366',
      text: '#002366',
      border: '#002366'
    },
    layoutType: 'table' as const,
    pdfOptions: {
      format: 'A4' as const,
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' },
      printBackground: true,
      preferCSSPageSize: true
    }
  },

  template10: {
    key: 'template10',
    id: 'nursery_excellent_clean',
    name: 'Excellent Nursery Clean Template',
    description: 'Split-view template with activities grid',
    section: 'All Nursery' as const,
    schoolType: 'Nursery/Primary' as const,
    subjects: [
      'Taking care of myself for proper growth and development',
      'Interacting, exploring, knowing and using my environment',
      'Relating with others in an acceptable way.',
      'Developing and using my Language appropriately',
      'Developing and using Mathematical Concepts'
    ],
    colorTheme: {
      primary: '#000000',
      accent: '#8B2323',
      text: '#000000',
      border: '#000000'
    },
    layoutType: 'card' as const,
    pdfOptions: {
      format: 'A4' as const,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true,
      preferCSSPageSize: true
    }
  },

  template11: {
    key: 'template11',
    id: 'nursery_simple_template',
    name: 'Simple Nursery Template',
    description: 'Grid-based activities with central watermark',
    section: 'All Nursery' as const,
    schoolType: 'Nursery/Primary' as const,
    subjects: [], // Activities-based, not subject-based
    colorTheme: {
      primary: '#000000',
      accent: '#FF0000',
      text: '#000000',
      border: '#000000'
    },
    layoutType: 'grid' as const,
    pdfOptions: {
      format: 'A4' as const,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true,
      preferCSSPageSize: true
    }
  },

  template12: {
    key: 'template12',
    id: 'nursery_modern_template',
    name: 'Modern Nursery Template',
    description: 'Linear progress layout with numerical achievement focus',
    section: 'All Nursery' as const,
    schoolType: 'Nursery/Primary' as const,
    subjects: [
      'Taking care of myself for proper growth and development',
      'Interacting, exploring, knowing and using my environment',
      'Relating with others in an acceptable way.',
      'Developing and using my Language appropriately',
      'Developing and using Mathematical Concepts in my day-to-day'
    ],
    colorTheme: {
      primary: '#000000',
      accent: '#FF8C00',
      secondary: '#6B4C93',
      text: '#000000',
      border: '#000000'
    },
    layoutType: 'table' as const,
    pdfOptions: {
      format: 'A4' as const,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      printBackground: true,
      preferCSSPageSize: true
    }
  }
} as const;

export type NurseryTemplateKey = keyof typeof NURSERY_TEMPLATES;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all nursery template options for dropdowns/selectors
 */
export function getNurseryTemplateOptions() {
  return Object.entries(NURSERY_TEMPLATES).map(([key, value]) => ({
    value: key,
    label: value.name,
    description: value.description,
    section: value.section
  }));
}

/**
 * Get a specific nursery template by key
 */
export function getNurseryTemplate(key: string): TemplateConfig | null {
  const template = NURSERY_TEMPLATES[key as NurseryTemplateKey];
  return template || null;
}

/**
 * List templates with optional filtering
 */
export function listNurseryTemplates(filter?: TemplateFilter): TemplateConfig[] {
  let templates = Object.values(NURSERY_TEMPLATES);

  if (filter?.section) {
    templates = templates.filter(t => t.section === filter.section || t.section === 'All Nursery');
  }

  if (filter?.layoutType) {
    templates = templates.filter(t => t.layoutType === filter.layoutType);
  }

  return templates;
}

/**
 * Get templates available for a specific nursery class
 * All 6 nursery templates are available for all nursery classes
 */
export function getTemplatesForClass(className: string): TemplateConfig[] {
  const normalized = className.toLowerCase().trim();
  
  // Check if this is a nursery class
  const isNurseryClass = 
    normalized.includes('baby') ||
    normalized.includes('middle') ||
    normalized.includes('top') ||
    normalized.includes('nursery');
  
  if (!isNurseryClass) {
    return [];
  }
  
  // All 6 templates are available for all nursery classes
  return Object.values(NURSERY_TEMPLATES);
}

/**
 * Get template for a specific nursery class (default/recommended template)
 * This provides a sensible default but schools can choose any template
 */
export function getTemplateForNurseryClass(className: string): string {
  const normalized = className.toLowerCase().trim();

  // Default mapping - can be customized per school
  if (normalized.includes('baby')) {
    return 'template7'; // Junior Nursery Report Template
  }

  if (normalized.includes('middle')) {
    return 'template8'; // Detail Colour Marks Report Template
  }

  if (normalized.includes('top')) {
    return 'template9'; // Academy Professional Report
  }

  // Default to template7 for any nursery class
  return 'template7';
}

/**
 * Check if a class is a nursery class
 */
export function isNurseryClass(className: string): boolean {
  const normalized = className.toLowerCase().trim();
  return (
    normalized.includes('baby') ||
    normalized.includes('middle') ||
    normalized.includes('top') ||
    normalized.includes('nursery')
  );
}
