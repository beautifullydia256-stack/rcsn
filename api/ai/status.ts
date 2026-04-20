/**
 * GET /api/ai/status — debug: confirms env sees Grok config (does not call xAI).
 */
import { getModel, isAIConfigured } from '../../src/lib/ai-service';
import { applyAiRouteCorsHeaders, handleAiRouteOptions } from '../../src/lib/vercelAiRouteCors';

export const config = { runtime: 'nodejs', maxDuration: 10 };

export default function handler(req: { method?: string }, res: any) {
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
    hasGrokKey: Boolean(process.env.GROK_API_KEY?.trim()),
  });
}
