const fs = require('fs');
const path = require('path');

const blockPath = path.join(__dirname, '..', 'src', 'components', 'reports', 'templates', 'primaryReportTemplatesBlock.txt');
const outPath = path.join(__dirname, '..', 'src', 'components', 'reports', 'templates', 'primaryReportTemplates.tsx');

const block = fs.readFileSync(blockPath, 'utf8');
const lines = block.split('\n');

// Skip lines 1-19 (helpers)
const withoutHelpers = lines.slice(19).join('\n');

// Remove inline lightenColor (lines in withoutHelpers: Template 4 comment + lightenColor function)
const lines2 = withoutHelpers.split('\n');
const idx = lines2.findIndex(l => l.includes('function lightenColor(hex'));
let body;
if (idx >= 0) {
  const start = lines2.findIndex((l, i) => i < idx && l.includes('// Template 4 - Report for Upper Section'));
  const cutStart = start >= 0 ? start : idx - 2;
  const endIdx = lines2.findIndex((l, i) => i > idx && l.trim().startsWith('function Template4UpperSectionReport'));
  body = lines2.slice(0, cutStart).join('\n') + '\n\n' + lines2.slice(endIdx).join('\n');
} else {
  body = withoutHelpers;
}

const header = `/**
 * Primary report templates ported from app/dashboard/admin/reports/generate (older system).
 * Template selection follows getTemplateForClass; each class uses its assigned template.
 */
import React from 'react';
import {
  NURSERY_PERFORMANCE_OPTIONS,
  NURSERY_PERFORMANCE_COLOR_MAP,
  NURSERY_SKILL_GRID,
  resolveNurseryPerformanceValue,
  getReadableTextColor,
  applyAlphaToHex
} from '../../../templates/primary/nurseryPerformance';
import { lightenColor } from './helpers';

`;

const footer = '\n\nexport { ReportPreview };\n';

fs.writeFileSync(outPath, header + body + footer);
console.log('Written', outPath);
