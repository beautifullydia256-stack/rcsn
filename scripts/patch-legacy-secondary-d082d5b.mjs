import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const p = path.join(root, 'src/services/legacySecondaryPdfTemplatesFrom3918d26.ts');
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

const importBlock = [
  "import { isALevelClass, isOLevelClass } from '../components/reports/templates/helpers';",
  "import {",
  "  generateTemplate1OLevelHTML as d082d5bTemplate1OLevelHTML,",
  "  generateTemplate2KasoziHTML as d082d5bTemplate2KasoziHTML,",
  "  generateTemplate3KyoteraHTML as d082d5bTemplate3KyoteraHTML,",
  "} from './secondaryOlevelHtmlFromD082d5b';",
];

const idxFc = lines.findIndex((l) => l.includes("import { formatCurrency }"));
if (idxFc < 0) throw new Error('formatCurrency import not found');
lines.splice(idxFc + 1, 0, '', ...importBlock);

function findIdx(sub) {
  const i = lines.findIndex((l) => l.includes(sub));
  if (i < 0) throw new Error(`not found: ${sub}`);
  return i;
}

const iTpl1 = findIdx('// --- Template 1: O-Level');
const iTpl2 = findIdx('// --- Template 2:');
const iTpl3 = findIdx('// --- Template 3:');
const iAlt = findIdx('// --- Alternate O-Level HTML');

const tpl1Replacement = [
  '// --- Template 1: O-Level (UCE-style card) — HTML from commit d082d5b ---',
  'export function generateTemplate1OLevelHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {',
  '  return d082d5bTemplate1OLevelHTML(reportData, schoolLogoBase64, studentPhotoBase64);',
  '}',
  '',
];

lines.splice(iTpl1, iTpl2 - iTpl1, ...tpl1Replacement);

const i2 = findIdx('// --- Template 2:');
const i3 = findIdx('// --- Template 3:');
if (!lines[i2 + 1].includes('generateTemplate2KasoziHTML')) {
  throw new Error('expected generateTemplate2KasoziHTML after Template 2 header');
}
const t2Body = lines.slice(i2 + 2, i3);
const t2Replacement = [
  '// --- Template 2: Kasozi — senior classes use d082d5b; primary/nursery uses checklist layout below ---',
  'export function generateTemplate2KasoziHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {',
  "  const cls = String(reportData?.students?.[0]?.current_class || '');",
  '  if (isOLevelClass(cls) || isALevelClass(cls)) {',
  '    return d082d5bTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);',
  '  }',
  '  return generateTemplate2KasoziPrimaryNurseryHTML(reportData, schoolLogoBase64, studentPhotoBase64);',
  '}',
  '',
  'function generateTemplate2KasoziPrimaryNurseryHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {',
  ...t2Body,
];
lines.splice(i2, i3 - i2, ...t2Replacement);

const i3b = findIdx('// --- Template 3:');
const iAltb = findIdx('// --- Alternate O-Level HTML');
if (!lines[i3b + 1].includes('generateTemplate3KyoteraHTML')) {
  throw new Error('expected generateTemplate3KyoteraHTML after Template 3 header');
}
const t3Body = lines.slice(i3b + 2, iAltb);
const t3Replacement = [
  '// --- Template 3: Kyotera — senior classes use d082d5b; primary lower uses professional-header layout below ---',
  'export function generateTemplate3KyoteraHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {',
  "  const cls = String(reportData?.students?.[0]?.current_class || '');",
  '  if (isOLevelClass(cls) || isALevelClass(cls)) {',
  '    return d082d5bTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);',
  '  }',
  '  return generateTemplate3KyoteraPrimaryHTML(reportData, schoolLogoBase64, studentPhotoBase64);',
  '}',
  '',
  'function generateTemplate3KyoteraPrimaryHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {',
  ...t3Body,
];
lines.splice(i3b, iAltb - i3b, ...t3Replacement);

fs.writeFileSync(p, lines.join('\n'));
console.log('OK', p);
