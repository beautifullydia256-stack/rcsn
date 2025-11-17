/**
 * AI Lesson Plan Generation Endpoint
 * POST /api/ai/lesson-plan
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateText, isAIConfigured } from '@/src/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    if (!isAIConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'AI service is not configured. Please set GROK_API_KEY in environment variables.',
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { subject, class_name, topic, duration, objectives, previous_knowledge } = body;

    if (!subject || !class_name || !topic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subject, class name, and topic are required.',
        },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert educational content creator specializing in lesson plan development. 
Create comprehensive, structured lesson plans that are engaging, pedagogically sound, and aligned with modern teaching methodologies.`;

    const userPrompt = `Create a detailed lesson plan with the following specifications:

Subject: ${subject}
Class: ${class_name}
Topic: ${topic}
${duration ? `Duration: ${duration} minutes` : 'Duration: Standard lesson period'}
${objectives ? `Learning Objectives: ${objectives}` : ''}
${previous_knowledge ? `Prerequisite Knowledge: ${previous_knowledge}` : ''}

Please provide a structured lesson plan that includes:
1. Lesson Title and Overview
2. Learning Objectives (3-5 specific, measurable objectives)
3. Materials and Resources Needed
4. Introduction/Warm-up Activity (5-10 minutes)
5. Main Content/Instruction (with clear explanations and examples)
6. Student Activities/Practice (hands-on or interactive tasks)
7. Assessment/Evaluation Methods
8. Closure/Summary (how to wrap up the lesson)
9. Homework/Extension Activities (optional)
10. Differentiation Strategies (for different learning levels)

Format the response in a clear, structured way that teachers can easily follow. Use markdown formatting for better readability.`;

    const lessonPlan = await generateText(userPrompt, systemPrompt, {
      temperature: 0.7,
      maxTokens: 3000,
    });

    return NextResponse.json({
      success: true,
      lessonPlan: lessonPlan,
      metadata: {
        subject,
        class_name,
        topic,
        duration: duration || 'Standard',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('AI Lesson Plan Generation Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate lesson plan',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

