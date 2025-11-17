/**
 * AI Insights Generation Endpoint
 * POST /api/ai/insights
 * Generates AI-powered insights about student performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateJSON, isAIConfigured } from '@/src/lib/ai-service';

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
    const { students, class_name, subject, performance_data, attendance_data } = body;

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Student data is required.',
        },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert educational analyst specializing in student performance analysis and personalized learning recommendations. 
Analyze student data and provide actionable insights, identifying struggling students, improving students, and generating specific recommendations for each student.`;

    const userPrompt = `Analyze the following student performance data and provide insights:

Class: ${class_name || 'Not specified'}
Subject: ${subject || 'All subjects'}
Number of Students: ${students.length}

Student Data:
${JSON.stringify(students, null, 2)}

${performance_data ? `Performance Trends: ${JSON.stringify(performance_data)}` : ''}
${attendance_data ? `Attendance Data: ${JSON.stringify(attendance_data)}` : ''}

Please analyze this data and provide a JSON response with the following structure:
{
  "strugglingStudents": [
    {
      "name": "Student Name",
      "status": "struggling",
      "subject": "Subject Name",
      "reason": "Brief reason why they're struggling",
      "recommendation": "Specific actionable recommendation"
    }
  ],
  "improvingStudents": [
    {
      "name": "Student Name",
      "status": "improving",
      "subject": "Subject Name",
      "reason": "Brief reason for improvement",
      "recommendation": "Encouragement and next steps"
    }
  ],
  "classInsights": {
    "averagePerformance": "Overall class performance summary",
    "trends": "Performance trends observed",
    "recommendations": "General recommendations for the class"
  }
}

Focus on:
- Students with declining performance or low scores
- Students showing improvement
- Patterns and trends in the data
- Specific, actionable recommendations for each student
- Class-level insights and suggestions`;

    const insights = await generateJSON(userPrompt, systemPrompt);

    return NextResponse.json({
      success: true,
      insights: insights,
      metadata: {
        class_name: class_name || 'Not specified',
        subject: subject || 'All subjects',
        total_students: students.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('AI Insights Generation Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate insights',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

