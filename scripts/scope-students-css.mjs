import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(
  process.env.USERPROFILE || '',
  'Downloads',
  'pwezacore-students-redesign.html'
);
const raw = fs.readFileSync(src, 'utf8');
const styleMatch = raw.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) throw new Error('No <style> block');
let css = styleMatch[1];

css = css.replace(
  /\/\* ── SIDEBAR ── \*\/[\s\S]*?\/\* ── PAGE CONTENT ── \*\//,
  ''
);
css = css.replace(/^:root\s*\{/m, '.pw-students {');
css = css.replace(
  /^\*, \*::before, \*::after \{[\s\S]*?\n\}/m,
  `.pw-students *, .pw-students *::before, .pw-students *::after {
  box-sizing: border-box; margin: 0; padding: 0;
}`
);
css = css.replace(/^body \{[\s\S]*?\n\}/m, '');

/** Prefix any rule starting with .class (not .pw-students) */
function prefixLineRules(block) {
  return block.replace(
    /^(\s*)(\.)(?!pw-students)([\s\S]+?)\s*\{/gm,
    (full, indent, dot, selBody) => {
      const trimmed = selBody.trim();
      return `${indent}.pw-students ${dot}${trimmed} {`;
    }
  );
}

css = prefixLineRules(css);

css = css.replace(/@media[^{]+\{([\s\S]*?)\n\}/g, (full, inner) => {
  return full.replace(inner, prefixLineRules(inner));
});

css = css.replace(/\.pw-students \.pw-students/g, '.pw-students');

// Scrollbar pseudo-elements (not matched by line-based prefixer)
css = css.replace(
  /^::-webkit-scrollbar/gm,
  '.pw-students ::-webkit-scrollbar'
);

const out = path.join(__dirname, '../src/assets/pwezacore-students-scoped.css');
fs.writeFileSync(out, css);
console.log('Wrote', out, css.length, 'bytes');
