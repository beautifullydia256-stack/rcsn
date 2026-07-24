/**
 * Vercel serverless: POST /api/ai/scheme-of-work
 * CommonJS (.js) — Vercel Node runs CJS; do not use ESM import in this file.
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const {
  applyAiRouteCorsHeaders,
  handleAiRouteOptions,
  parseVercelJsonBody,
  isAIConfigured,
  aiGenerateJSONForVercel,
} = require('../../lib/aiVercelGrok.js');

const MAX_ROWS = 80; // generous cap — a full 13-week, 3-lesson-per-week scheme is well under this
const ENTRY_FIELDS = [
  'week_number', 'period_number', 'theme', 'sub_theme', 'content',
  'competences', 'methods', 'activity', 'life_skills', 'materials', 'reference', 'remarks',
];

function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Curated content tables are PwezaCore-owned reference data (public-read) — anon key is enough,
 *  no per-teacher auth needed to read them, matching every other AI endpoint's no-auth pattern. */
async function loadGrounding(supabase, { education_level, class_name, subject, term }) {
  if (!supabase) return { topics: [], example: null };

  let topicsQuery = supabase
    .from('curriculum_topics')
    .select('sequence_order, theme, sub_theme, learning_outcome, content_summary, suggested_competences, suggested_methods, suggested_life_skills, suggested_materials, source_reference')
    .eq('education_level', education_level)
    .eq('class_name', class_name)
    .eq('term', term)
    .order('sequence_order', { ascending: true });
  topicsQuery = subject ? topicsQuery.eq('subject', subject) : topicsQuery.is('subject', null);
  const { data: topics } = await topicsQuery;

  let exampleQuery = supabase
    .from('curriculum_scheme_examples')
    .select('source_school, example_entries')
    .eq('education_level', education_level)
    .eq('class_name', class_name)
    .eq('term', term)
    .limit(1);
  exampleQuery = subject ? exampleQuery.eq('subject', subject) : exampleQuery.is('subject', null);
  const { data: examples } = await exampleQuery;

  return { topics: topics || [], example: (examples && examples[0]) || null };
}

function buildSystemPrompt() {
  return `You are an expert Ugandan primary/secondary school teacher and curriculum specialist, deeply familiar with the National Curriculum Development Centre (NCDC) scheme-of-work conventions used in Uganda.

A scheme of work in Uganda is a week-by-week teacher planning document, always including: Week, Period, Theme, Sub-topic, Content, Competences (what learners will be able to do — for the competency-based curriculum, phrase these as specific, measurable, action-oriented outcomes), Methods/Techniques used to teach, Learner Activities, Life Skills and Values (e.g. effective communication, critical thinking, self-awareness, responsibility, cooperation), Instructional Materials, References (textbook/page or curriculum page), and Remarks (left blank for the teacher to fill in after teaching).

Always respond with ONLY a JSON array of row objects — no prose, no markdown, no code fences. Each object must have exactly these string/number fields: week_number (integer), period_number (integer), theme, sub_theme, content, competences, methods, activity, life_skills, materials, reference, remarks (remarks should be an empty string).`;
}

function buildUserPrompt({ class_name, subject, term, topics, example }) {
  const subjectLine = subject ? `Subject: ${subject}` : 'Subject: Integrated thematic curriculum (no single subject — this class teaches Mathematics, Literacy, English, and Creative Arts together under one weekly theme, as per Uganda\'s lower-primary thematic curriculum)';

  let prompt = `Generate a complete scheme of work for:\nClass: ${class_name}\n${subjectLine}\nTerm: ${term}\n\n`;

  if (topics.length > 0) {
    prompt += `You MUST follow this official curriculum content, in this exact order — do not invent different topics:\n\n`;
    topics.forEach((t, i) => {
      prompt += `${i + 1}. Theme: ${t.theme} — Sub-topic: ${t.sub_theme}\n`;
      prompt += `   Expected learning outcome: ${t.learning_outcome}\n`;
      prompt += `   Official content: ${t.content_summary}\n`;
      if (t.suggested_competences) prompt += `   Suggested competences: ${t.suggested_competences}\n`;
      if (t.suggested_methods) prompt += `   Suggested methods: ${t.suggested_methods}\n`;
      if (t.suggested_life_skills) prompt += `   Suggested life skills/values: ${t.suggested_life_skills}\n`;
      if (t.suggested_materials) prompt += `   Suggested materials: ${t.suggested_materials}\n`;
      prompt += `   Source: ${t.source_reference}\n\n`;
    });
    prompt += `Spread this content sensibly across a full term (roughly 10-13 weeks), breaking each sub-topic into multiple weekly rows with realistic weekly pacing, methods, activities, and materials in the authentic style Ugandan teachers use.\n\n`;
  } else {
    prompt += `No curated official topic list is available for this exact class/subject/term yet — generate a plausible, curriculum-appropriate 10-13 week scheme using standard Uganda NCDC conventions for this class level and subject. Be conservative and realistic rather than inventing overly advanced content.\n\n`;
  }

  if (example) {
    prompt += `Here is a REAL example of the expected style, phrasing, and level of detail (from ${example.source_school || 'a Ugandan school'}) — match this tone and specificity, but do not copy its exact topic if it conflicts with the official content above:\n${JSON.stringify(example.example_entries)}\n\n`;
  }

  prompt += `Return the full scheme as a JSON array now.`;
  return prompt;
}

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
    const class_name = body.class_name;
    const term = body.term;
    const subject = body.subject || null;
    const education_level = body.education_level === 'secondary' ? 'secondary' : 'primary';

    if (!class_name || !term) {
      return res.status(400).json({ success: false, error: 'class_name and term are required.' });
    }

    const supabase = getSupabaseAnon();
    const { topics, example } = await loadGrounding(supabase, { education_level, class_name, subject, term });

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt({ class_name, subject, term, topics, example });

    let parsed;
    try {
      parsed = await aiGenerateJSONForVercel(userPrompt, systemPrompt, { temperature: 0.4, maxTokens: 6000 });
    } catch (aiErr) {
      console.error('Scheme-of-work AI generation error:', aiErr);
      // Only a genuine "model responded but the text wasn't valid JSON" failure gets the
      // distinguishable code — an upstream API/auth/network error should surface its real
      // message instead of being misreported as a parsing problem.
      const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
      if (msg === 'Failed to parse JSON from AI response') {
        return res.status(502).json({ success: false, error: 'AI_JSON_PARSE_FAILED' });
      }
      return res.status(502).json({ success: false, error: msg });
    }

    const rows = sanitizeSchemeRows(parsed);

    return res.status(200).json({
      success: true,
      entries: rows,
      grounded: topics.length > 0,
      metadata: { class_name, subject, term, education_level, generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error('AI Scheme of Work Generation Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate scheme of work';
    return res.status(500).json({ success: false, error: message });
  }
}

handler.config = { runtime: 'nodejs', maxDuration: 60 };

module.exports = handler;
