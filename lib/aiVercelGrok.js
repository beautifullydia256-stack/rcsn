/**
 * Shared Grok + CORS helpers for Vercel api/ai/*.js (CommonJS only — no ESM import).
 */
'use strict';

function applyAiRouteCorsHeaders(res) {
  const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function handleAiRouteOptions(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

function parseVercelJsonBody(req) {
  const raw = req.body;
  if (raw == null) return {};
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw;
  const s = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
  if (!s.trim()) return {};
  try {
    const v = JSON.parse(s);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

function isAIConfigured() {
  const p = String(process.env.AI_PROVIDER || 'grok')
    .toLowerCase()
    .trim();
  if (p === 'openai') return Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
  return Boolean(process.env.GROK_API_KEY && String(process.env.GROK_API_KEY).trim());
}

function getModel() {
  const p = String(process.env.AI_PROVIDER || 'grok')
    .toLowerCase()
    .trim();
  if (p === 'openai') return (process.env.OPENAI_MODEL || 'gpt-4').trim();
  return (process.env.GROK_MODEL || 'grok-3-mini').trim();
}

/**
 * xAI chat/completions via fetch (no openai package).
 */
async function grokGenerateText(prompt, systemPrompt, options) {
  const key = String(process.env.GROK_API_KEY || '').trim();
  if (!key) throw new Error('GROK_API_KEY is not set');
  const base = String(process.env.GROK_API_BASE_URL || 'https://api.x.ai/v1')
    .replace(/\/$/, '')
    .trim();
  const model = getModel();
  const temperature = options && options.temperature != null ? options.temperature : 0.7;
  const maxTokens = options && options.maxTokens != null ? options.maxTokens : 2000;

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (json && json.error && json.error.message) || res.statusText || JSON.stringify(json);
    throw new Error(String(res.status) + ' ' + msg);
  }
  const raw =
    json &&
    json.choices &&
    json.choices[0] &&
    json.choices[0].message &&
    json.choices[0].message.content;
  if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
    throw new Error('AI returned empty content. Try another GROK_MODEL.');
  }
  return typeof raw === 'string' ? raw : String(raw);
}

/**
 * Entry for lesson/exam: Grok only on this path (OpenAI use Next or set grok).
 */
async function aiGenerateTextForVercel(prompt, systemPrompt, options) {
  const p = String(process.env.AI_PROVIDER || 'grok')
    .toLowerCase()
    .trim();
  if (p === 'grok') {
    return grokGenerateText(prompt, systemPrompt, options);
  }
  if (p === 'openai') {
    throw new Error(
      'OpenAI on this deployment: use AI_PROVIDER=grok with GROK_API_KEY, or run Next API locally. ' +
        'Vercel CJS route supports Grok via fetch only.'
    );
  }
  throw new Error('Invalid AI_PROVIDER. Use grok or openai.');
}

module.exports = {
  applyAiRouteCorsHeaders,
  handleAiRouteOptions,
  parseVercelJsonBody,
  isAIConfigured,
  getModel,
  aiGenerateTextForVercel,
};
