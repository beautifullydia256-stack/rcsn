import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, '_d082d5b_generate_pdf_route.ts'), 'utf8');
const lines = src.split(/\r?\n/);
// 1-based lines 572-1760 inclusive → slice(571, 1760)
const chunk = lines.slice(571, 1760).join('\n');
const header = `/**
 * O-Level built-in report HTML: verbatim from commit d082d5b
 * app/api/reports/generate-pdf/route.ts (lines 572-1760).
 * Used for senior secondary preview/PDF only; primary/nursery uses separate layouts.
 */

`;
const body = chunk.replace(/^function /gm, 'export function ');
fs.writeFileSync(path.join(root, 'src/services/secondaryOlevelHtmlFromD082d5b.ts'), header + body);
console.log('Wrote src/services/secondaryOlevelHtmlFromD082d5b.ts');
