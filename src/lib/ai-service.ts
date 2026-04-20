/**
 * AI Service Utility
 * Supports multiple AI providers: Grok AI, OpenAI
 * Default: Grok AI (more affordable)
 * 
 * Note: Anthropic support can be added later if needed
 */

import OpenAI from 'openai';

type AIProvider = 'grok' | 'openai';

interface AIClient {
  chat?: {
    completions: {
      create: (params: any) => Promise<any>;
    };
  };
  messages?: {
    create: (params: any) => Promise<any>;
  };
}

/**
 * Get AI client based on configured provider
 */
export function getAIClient(): AIClient {
  const provider = (process.env.AI_PROVIDER || 'grok') as AIProvider;

  switch (provider) {
    case 'grok': {
      const key = process.env.GROK_API_KEY?.trim();
      if (!key) {
        throw new Error('GROK_API_KEY is not set');
      }
      const base =
        process.env.GROK_API_BASE_URL?.replace(/\/$/, '').trim() || 'https://api.x.ai/v1';
      return new OpenAI({
        apiKey: key,
        baseURL: base,
      });
    }

    case 'openai': {
      const key = process.env.OPENAI_API_KEY?.trim();
      if (!key) {
        throw new Error('OPENAI_API_KEY is not set');
      }
      return new OpenAI({
        apiKey: key,
      });
    }

    default:
      throw new Error(`Invalid AI provider: ${provider}. Supported: grok, openai`);
  }
}

/**
 * Get model name based on provider
 */
export function getModel(): string {
  const provider = (process.env.AI_PROVIDER || 'grok') as AIProvider;

  switch (provider) {
    case 'grok':
      // grok-4-latest is not always a valid xAI slug; grok-3-mini is widely available.
      return process.env.GROK_MODEL?.trim() || 'grok-3-mini';
    case 'openai':
      return process.env.OPENAI_MODEL || 'gpt-4';
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
  const client = getAIClient();
  const model = getModel();

  try {
    // Both OpenAI and Grok use the same API structure
    const response = await (client as any).chat.completions.create({
      model: model,
      messages: [
        ...(systemPrompt
          ? [
              {
                role: 'system',
                content: systemPrompt,
              },
            ]
          : []),
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: options?.temperature || 0.7,
      max_tokens: options?.maxTokens || 2000,
    });
    const raw = response?.choices?.[0]?.message?.content;
    if (raw == null || (typeof raw === 'string' && raw.trim() === '')) {
      throw new Error('AI returned empty content. Try another GROK_MODEL or shorten the prompt.');
    }
    return typeof raw === 'string' ? raw : String(raw);
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
export async function generateJSON(
  prompt: string,
  systemPrompt?: string
): Promise<any> {
  const jsonPrompt = `${prompt}\n\nRespond with valid JSON only. No markdown, no code blocks, just pure JSON.`;
  const response = await generateText(jsonPrompt, systemPrompt);
  
  try {
    // Try to parse JSON directly
    return JSON.parse(response);
  } catch {
    // If wrapped in markdown, extract JSON
    const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
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

