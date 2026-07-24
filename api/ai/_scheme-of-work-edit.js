/**
 * Vercel serverless: POST /api/ai/scheme-of-work-edit
 * CommonJS (.js) — Vercel Node runs CJS; do not use ESM import in this file.
 */
'use strict';

const {
  applyAiRouteCorsHeaders,
  handleAiRouteOptions,
  parseVercelJsonBody,
  isAIConfigured,
  aiGenerateJSONForVercel,
} = require('../../lib/aiVercelGrok.js');

const MAX_ROWS = 80;
const ENTRY_FIELDS = [
  'week_number', 'period_number', 'theme', 'sub_theme', 'content',
  'competences', 'methods', 'activity', 'life_skills', 'materials', 'reference', 'remarks',
];

function sanitizeSchemeRows(rows) {
  if (!Array.isArray(rows)) throw new Error('AI response was not a JSON array');
  const clipped = rows.slice(0, MAX_ROWS);
  return clipped.map((row, i) => {
    const clean = {};
    for (const field of ENTRY_FIELDS) {
      const v = row && row[field];
      if (field === 'week_number' || field === 'period_number') {
        const n = Number(v);
        clean[field] = Number.isFinite(n) && n > 0 ? Math.round(n) : i + 1;
      } else {
        clean[field] = v == null ? '' : String(v);
      }
    }
    return clean;
  });
}

function buildSystemPrompt() {
  return `You are an expert Ugandan primary/secondary school teacher, editing an existing NCDC-style scheme of work. You will be given the CURRENT full scheme as a JSON array, and a plain-English instruction describing what to change.

Rules:
- Apply ONLY the requested change. Leave every row that isn't affected by the instruction completely untouched (same values, same order).
- Keep the exact same JSON shape as the input: week_number, period_number, theme, sub_theme, content, competences, methods, activity, life_skills, materials, reference, remarks.
- Do not add or remove weeks unless the instruction explicitly asks for that.
- Respond with ONLY the full, updated JSON array — no prose, no markdown, no code fences.`;
}

async function handler(req, res) {
  applyAiRouteCorsHeaders(res);
  if (handleAiRouteOptions(req, res)) return;

  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    if (!isAIConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'AI service is not configured. Please set GROK_API_KEY in environment variables.',
      });
    }

    const body = parseVercelJsonBody(req);
    const current_entries = Array.isArray(body.current_entries) ? body.current_entries : null;
    const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';

    if (!current_entries || !current_entries.length || !instruction) {
      return res.status(400).json({ success: false, error: 'current_entries and instruction are required.' });
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = `Current scheme of work (JSON):\n${JSON.stringify(current_entries)}\n\nInstruction: ${instruction}\n\nReturn the full updated JSON array now.`;

    let parsed;
    try {
      parsed = await aiGenerateJSONForVercel(userPrompt, systemPrompt, { temperature: 0.3, maxTokens: 6000 });
    } catch (aiErr) {
      console.error('Scheme-of-work edit AI generation error:', aiErr);
      const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      if (msg === 'Failed to parse JSON from AI response') {
        return res.status(502).json({ success: false, error: 'AI_JSON_PARSE_FAILED' });
      }
      return res.status(502).json({ success: false, error: msg });
    }

    const rows = sanitizeSchemeRows(parsed);

    return res.status(200).json({ success: true, entries: rows });
  } catch (error) {
    console.error('AI Scheme of Work Edit Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to edit scheme of work';
    return res.status(500).json({ success: false, error: message });
  }
}

handler.config = { runtime: 'nodejs', maxDuration: 60 };

module.exports = handler;
