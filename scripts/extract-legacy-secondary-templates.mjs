import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const srcPath = join(root, '_tmp_route_3918d26.ts');
const outPath = join(root, 'src', 'services', 'legacySecondaryPdfTemplatesFrom3918d26.ts');

const lines = readFileSync(srcPath, 'utf8').split(/\r?\n/);

function slice(a, b) {
  return lines.slice(a - 1, b).join('\n');
}

function exportKeyFunctions(code) {
  return code
    .replace(/^function (generateTemplate1OLevelHTML)/m, 'export function $1')
    .replace(/^function (generateTemplate2KasoziHTML)/m, 'export function $1')
    .replace(/^function (generateTemplate3KyoteraHTML)/m, 'export function $1')
    .replace(/^function (generateOLevelReportHTML)/m, 'export function $1')
    .replace(/^function (generateSecondaryReportHTML)/m, 'export function $1');
}

const header = `/**
 * Secondary and O-Level report HTML — restored verbatim from git commit 3918d26
 * \`app/api/reports/generate-pdf/route.ts\` (before SPA streamlining).
 *
 * Line map (that file, 1-based):
 * - Nursery helpers for Kasozi Template 2 grid: 4761–5071
 * - lightenColor + generateProfessionalHeaderHTML: 4677–4759
 * - generateTemplate1OLevelHTML: 714–1223
 * - generateTemplate2KasoziHTML: 1225–1910
 * - generateTemplate3KyoteraHTML: 2966–3493
 * - generateOLevelReportHTML: 3495–3936
 * - generateSecondaryReportHTML (A-Level style marks layout): 3938–4306
 *
 * Regenerate: \`git show 3918d26:app/api/reports/generate-pdf/route.ts > _tmp_route_3918d26.ts\`
 * then \`node scripts/extract-legacy-secondary-templates.mjs\`.
 */

import { formatCurrency } from '../lib/reportUtils';

`;

const body = [
  '// --- Nursery helpers (Kasozi / Template 2 skill colour grid) ---',
  slice(4761, 5071),
  '',
  '// --- Header helpers (Kyotera / Template 3) ---',
  slice(4677, 4759),
  '',
  '// --- Template 1: O-Level (UCE-style card) ---',
  exportKeyFunctions(slice(714, 1223)),
  '',
  '// --- Template 2: Kasozi (secondary) ---',
  exportKeyFunctions(slice(1225, 1910)),
  '',
  '// --- Template 3: Kyotera ---',
  exportKeyFunctions(slice(2966, 3493)),
  '',
  '// --- Alternate O-Level HTML (legacy route) ---',
  exportKeyFunctions(slice(3495, 3936)),
  '',
  '// --- Secondary / A-Level marks layout ---',
  exportKeyFunctions(slice(3938, 4306)),
].join('\n');

writeFileSync(outPath, header + body);
console.log('Wrote', outPath, 'lines:', (header + body).split('\n').length);
