/**
 * Regenerates src/services/legacySecondaryPdfTemplatesFrom3918d26.ts from
 * git d082d5b app/api/reports/generate-pdf/route.ts (lines: template1 … generateSecondaryReportHTML).
 */
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const route = execSync(
  'git show d082d5b:app/api/reports/generate-pdf/route.ts',
  { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
);

const startMark = '\n// Template 1 - O-Level Report Card (matches the preview exactly)';
const endMark = '\nfunction generatePrimaryReportHTML';

const si = route.indexOf(startMark);
const ei = route.indexOf(endMark);
if (si === -1 || ei === -1 || ei <= si) {
  console.error('Markers not found', { si, ei });
  process.exit(1);
}

let body = route.slice(si + 1, ei).trimEnd();

body = body.replace(/^function (generateTemplate1OLevelHTML|generateTemplate2KasoziHTML|generateTemplate3KyoteraHTML|generateOLevelReportHTML|generateSecondaryReportHTML)/gm, 'export function $1');

const header = `/**
 * Secondary / O-Level built-in report HTML — verbatim extract from git commit d082d5b
 * app/api/reports/generate-pdf/route.ts (through generateSecondaryReportHTML; excludes generatePrimaryReportHTML).
 *
 * Regenerate: node scripts/extract-d082d5b-secondary-templates.mjs
 */
`;

writeFileSync(join(root, 'src', 'services', 'legacySecondaryPdfTemplatesFrom3918d26.ts'), header + '\n' + body + '\n', 'utf8');
console.log('Wrote src/services/legacySecondaryPdfTemplatesFrom3918d26.ts');
