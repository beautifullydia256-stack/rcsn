import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const path = join(__dirname, '..', 'src', 'services', 'templateHTMLGenerator.ts');
let s = readFileSync(path, 'utf8');

const start = s.indexOf(
  '// ============================================================================\n// TEMPLATE HTML GENERATION FUNCTIONS'
);
const end = s.indexOf(
  '/**\n * Select appropriate template based on class and template key'
);

if (start === -1 || end === -1) {
  console.error('markers not found', { start, end });
  process.exit(1);
}

const replacement = `// ============================================================================
// SECONDARY / O-LEVEL TEMPLATES (verbatim restore: git 3918d26 generate-pdf route)
// Full source: ./legacySecondaryPdfTemplatesFrom3918d26.ts
// ============================================================================

export {
  generateTemplate1OLevelHTML,
  generateTemplate2KasoziHTML,
  generateTemplate3KyoteraHTML,
  generateOLevelReportHTML,
  generateSecondaryReportHTML,
} from './legacySecondaryPdfTemplatesFrom3918d26';

/**
 * Generate Template 4 Upper Section HTML (Primary Report)
 * Still pending extraction into this module; primary PDFs use api/pdf built-ins.
 */
export function generateTemplate4UpperSectionHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  void reportData;
  void schoolLogoBase64;
  void studentPhotoBase64;
  throw new Error(
    'generateTemplate4UpperSectionHTML — implement or use api/pdf buildTemplate4UpperSectionHTML'
  );
}

/**
 * Template 6 Nursery HTML — still pending full port from 3918d26 route (lines 1912–2964).
 */
export function generateTemplateNurseryCindrelinahHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null,
  nurseryAutoComments?: NurseryAutoCommentMap
): string {
  void reportData;
  void schoolLogoBase64;
  void studentPhotoBase64;
  void nurseryAutoComments;
  throw new Error(
    'generateTemplateNurseryCindrelinahHTML — full HTML not yet ported from historical route'
  );
}

/**
 * Primary Report HTML (Template 4 duplicate) — not used when api/pdf built-ins run.
 */
export function generatePrimaryReportHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  void reportData;
  void schoolLogoBase64;
  void studentPhotoBase64;
  throw new Error('generatePrimaryReportHTML — use primary built-in PDF path');
}

`;

s = s.slice(0, start) + replacement + s.slice(end);
writeFileSync(path, s);
console.log('Patched', path);
