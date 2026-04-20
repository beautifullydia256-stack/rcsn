/**
 * AI Service Utility
 * Supports multiple AI providers: Grok AI (fetch → xAI), OpenAI (SDK)
 * Grok path avoids importing the `openai` package so Vercel api/* bundles stay reliable.
 */

import { grokChatCompletion } from './grokChatCompletions';

type AIProvider = 'grok' | 'openai';

/**
 * Get model name based on provider
 */
export function getModel(): string {
  const provider = (process.env.AI_PROVIDER || 'grok') as AIProvider;

  switch (provider) {
    case 'grok':
      return process.env.GROK_MODEL?.trim() || 'grok-3-mini';
    case 'openai':
      return process.env.OPENAI_MODEL?.trim() || 'gpt-4';
    default:
      return 'grok-3-mini';
  }
}

/**
 * Generate text using AI
 */
export async function generateText(
  prompt: string,
  systemPrompt?: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const provider = (process.env.AI_PROVIDER || 'grok') as AIProvider;
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? 2000;

  const messages: { role: 'system' | 'user'; content: string }[] = [
    ...(systemPrompt
      ? [
          {
            role: 'system' as const,
            content: systemPrompt,
          },
        ]
      : []),
    { role: 'user' as const, content: prompt },
  ];

  try {
    if (provider === 'grok') {
      return await grokChatCompletion(messages, { temperature, maxTokens });
    }

    if (provider === 'openai') {
      const key = process.env.OPENAI_API_KEY?.trim();
      if (!key) {
        throw new Error('OPENAI_API_KEY is not set');
      }
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({ apiKey: key });
      const model = getModel();
      const response = await client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      });
      const raw = response?.choices?.[0]?.message?.content;
      if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
        throw new Error('AI returned empty content.');
      }
      return typeof raw === 'string' ? raw : String(raw);
    }

    throw new Error(`Invalid AI provider: ${provider}. Supported: grok, openai`);
  } catch (error: unknown) {
    console.error('AI Generation Error:', error);
    const e = error as { message?: string; status?: number; error?: { message?: string } };
    const detail =
      e?.error?.message ||
      e?.message ||
      (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error));
    const status = e?.status != null ? `${e.status} ` : '';
    throw new Error(`AI generation failed: ${status}${detail}`);
  }
}

/**
 * Generate JSON response from AI
 */
export async function generateJSON(prompt: string, systemPrompt?: string): Promise<any> {
  const jsonPrompt = `${prompt}\n\nRespond with valid JSON only. No markdown, no code blocks, just pure JSON.`;
  const response = await generateText(jsonPrompt, systemPrompt);

  try {
    return JSON.parse(response);
  } catch {
    const jsonMatch =
      response.match(/```json\n([\s\S]*?)\n```/) ||
      response.match(/```\n([\s\S]*?)\n```/) ||
      [null, response];

    if (jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }

    throw new Error('Failed to parse JSON from AI response');
  }
}

/**
 * Check if AI service is configured
 */
export function isAIConfigured(): boolean {
  const provider = (process.env.AI_PROVIDER || 'grok') as AIProvider;

  switch (provider) {
    case 'grok':
      return Boolean(process.env.GROK_API_KEY?.trim());
    case 'openai':
      return Boolean(process.env.OPENAI_API_KEY?.trim());
    default:
      return false;
  }
}
