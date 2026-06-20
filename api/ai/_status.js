/**
 * GET /api/ai/status — CommonJS only.
 */
'use strict';

const {
  applyAiRouteCorsHeaders,
  handleAiRouteOptions,
  isAIConfigured,
  getModel,
} = require('../../lib/aiVercelGrok.js');

function handler(req, res) {
  applyAiRouteCorsHeaders(res);
  if (handleAiRouteOptions(req, res)) return;

  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  return res.status(200).json({
    ok: true,
    aiConfigured: isAIConfigured(),
    provider: process.env.AI_PROVIDER || 'grok',
    model: getModel(),
    hasGrokKey: Boolean(process.env.GROK_API_KEY && String(process.env.GROK_API_KEY).trim()),
  });
}

handler.config = { runtime: 'nodejs', maxDuration: 10 };

module.exports = handler;
