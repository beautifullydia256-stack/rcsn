/**
 * Test endpoint for Grok AI
 * Use this to verify your API key is working
 * GET /api/ai/test
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText, isAIConfigured } from '@/src/lib/ai-service';

export async function GET(request: NextRequest) {
  try {
    // Check if AI is configured
    if (!isAIConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is not configured. Please set GROK_API_KEY in environment variables.',
        },
        { status: 500 }
      );
    }

    // Test the AI service
    const testPrompt = 'Testing. Just say hi and hello world and nothing else.';
    const systemPrompt = 'You are a test assistant.';

    const response = await generateText(testPrompt, systemPrompt, {
      temperature: 0,
      maxTokens: 100,
    });

    return NextResponse.json({
      success: true,
      message: 'Grok AI is working!',
      response: response,
      provider: process.env.AI_PROVIDER || 'grok',
      model: process.env.GROK_MODEL || 'grok-4-latest',
    });
  } catch (error: any) {
    console.error('Grok AI Test Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to connect to Grok AI',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

