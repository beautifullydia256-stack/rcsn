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
    case 'grok':
      if (!process.env.GROK_API_KEY) {
        throw new Error('GROK_API_KEY is not set');
      }
      return new OpenAI({
        apiKey: process.env.GROK_API_KEY,
        baseURL: 'https://api.x.ai/v1', // Grok API endpoint
      });

    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not set');
      }
      return new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

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
      return process.env.GROK_MODEL || 'grok-4-latest'; // Latest Grok model
    case 'openai':
      return process.env.OPENAI_MODEL || 'gpt-4';
    default:
      return 'grok-4-latest';
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
    return response.choices[0].message.content;
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    throw new Error(`AI generation failed: ${error.message}`);
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
      return !!process.env.GROK_API_KEY;
    case 'openai':
      return !!process.env.OPENAI_API_KEY;
    default:
      return false;
  }
}

