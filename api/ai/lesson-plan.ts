/**
 * Vercel serverless: POST /api/ai/lesson-plan
 * (Vite deployment does not ship Next.js app/api routes; this handler is required on production.)
 */
import { generateText, isAIConfigured } from '../../src/lib/ai-service';
import { parseVercelJsonBody } from '../../src/lib/parseVercelJsonBody';
import { applyAiRouteCorsHeaders, handleAiRouteOptions } from '../../src/lib/vercelAiRouteCors';

export const config = { runtime: 'nodejs', maxDuration: 60 };

export default async function handler(req: { method?: string; body?: unknown }, res: any) {
  applyAiRouteCorsHeaders(res);
  if (handleAiRouteOptions(req, res)) return;

  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    if (!isAIConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'AI service is not configured. Please set GROK_API_KEY in environment variables.',
      });
    }

    const body = parseVercelJsonBody(req);
    const subject = body.subject as string | undefined;
    const class_name = body.class_name as string | undefined;
    const topic = body.topic as string | undefined;
    const duration = body.duration as string | undefined;
    const objectives = body.objectives as string | undefined;
    const previous_knowledge = body.previous_knowledge as string | undefined;

    if (!subject || !class_name || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Subject, class name, and topic are required.',
      });
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

    return res.status(200).json({
      success: true,
      lessonPlan,
      metadata: {
        subject,
        class_name,
        topic,
        duration: duration || 'Standard',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error('AI Lesson Plan Generation Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate lesson plan';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}
