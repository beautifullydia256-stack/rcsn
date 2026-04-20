/**
 * Vercel serverless: POST /api/ai/exam
 */
import { generateText, isAIConfigured } from '../../src/lib/ai-service';
import { parseVercelJsonBody } from '../../src/lib/parseVercelJsonBody';

export const config = { runtime: 'nodejs', maxDuration: 60 };

export default async function handler(req: { method?: string; body?: unknown }, res: any) {
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
    const exam_type = body.exam_type as string | undefined;
    const number_of_questions = body.number_of_questions as number | undefined;
    const difficulty = body.difficulty as string | undefined;
    const time_limit = body.time_limit as string | undefined;

    if (!subject || !class_name || !topic) {
      return res.status(400).json({
        success: false,
        error: 'Subject, class name, and topic are required.',
      });
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

    return res.status(200).json({
      success: true,
      examPaper,
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
  } catch (error: unknown) {
    console.error('AI Exam Generation Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate exam paper';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}
