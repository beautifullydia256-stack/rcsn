/**
 * AI Exam Paper Generation Endpoint
 * POST /api/ai/exam
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
    const { subject, class_name, topic, exam_type, number_of_questions, difficulty, time_limit } = body;

    if (!subject || !class_name || !topic) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subject, class name, and topic are required.',
        },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert educational content creator specializing in exam and assessment creation. 
Create well-structured, pedagogically sound exam papers with clear questions, appropriate difficulty levels, and comprehensive answer keys.`;

    const examType = exam_type || 'mixed';
    const numQuestions = number_of_questions || 10;
    const difficultyLevel = difficulty || 'medium';

    const userPrompt = `Create a complete exam paper with the following specifications:

Subject: ${subject}
Class: ${class_name}
Topic: ${topic}
Exam Type: ${examType} (multiple choice, short answer, essay, or mixed)
Number of Questions: ${numQuestions}
Difficulty Level: ${difficultyLevel}
${time_limit ? `Time Limit: ${time_limit} minutes` : ''}

Please provide:
1. Exam Title and Instructions
2. Questions (numbered clearly)
   - For multiple choice: Provide 4 options (A, B, C, D) with one correct answer
   - For short answer: Provide clear, concise questions
   - For essay: Provide thought-provoking questions requiring detailed responses
3. Answer Key (clearly marked with correct answers and brief explanations where appropriate)
4. Marking Scheme (points allocation for each question)
5. Total Marks

Format the response in a clear, structured way using markdown. Ensure questions are appropriate for the class level and topic.`;

    const examPaper = await generateText(userPrompt, systemPrompt, {
      temperature: 0.7,
      maxTokens: 4000,
    });

    return NextResponse.json({
      success: true,
      examPaper: examPaper,
      metadata: {
        subject,
        class_name,
        topic,
        exam_type: examType,
        number_of_questions: numQuestions,
        difficulty: difficultyLevel,
        time_limit: time_limit || 'Not specified',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('AI Exam Generation Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate exam paper',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

