# AI Integration Requirements Summary
## What's Needed to Make AI Features Work

---

## 🎯 **QUICK OVERVIEW**

**Current Status**: All UI components are complete and ready. AI features need backend implementation.

**What's Missing**: 12 API endpoints + 4 database tables + AI service integration

---

## 📋 **REQUIRED API ENDPOINTS**

### **1. AI Lesson Planner**
```
POST /api/ai/generate-lesson-plan
```
**Request Body**:
```json
{
  "subject": "Mathematics",
  "class_name": "S.1 West",
  "topic": "Algebra Basics",
  "duration": 40,
  "learning_objectives": ["Understand variables", "Solve simple equations"]
}
```
**Response**:
```json
{
  "title": "Introduction to Algebra",
  "objectives": ["Understand variables", "Solve simple equations"],
  "materials": ["Whiteboard", "Worksheets"],
  "activities": [
    {
      "time": "0-10min",
      "activity": "Introduction",
      "description": "Explain what algebra is"
    }
  ],
  "assessment": "Quick quiz at end",
  "homework": "Complete worksheet problems 1-10"
}
```

**Implementation Needed**:
- Connect to OpenAI GPT-4 or similar
- Create prompt template for lesson plans
- Save to database (optional)

---

### **2. AI Exam Paper Generator**
```
POST /api/ai/generate-exam
```
**Request Body**:
```json
{
  "subject": "Physics",
  "class_name": "S.2 East",
  "topic": "Mechanics",
  "difficulty": "medium",
  "question_count": 10,
  "exam_type": "midterm"
}
```
**Response**:
```json
{
  "title": "Physics Midterm - Mechanics",
  "instructions": "Answer all questions. Show your work.",
  "questions": [
    {
      "number": 1,
      "type": "multiple_choice",
      "question": "What is velocity?",
      "options": ["Speed", "Speed with direction", "Distance", "Time"],
      "correct_answer": "Speed with direction",
      "points": 5
    }
  ],
  "total_points": 100
}
```

**Implementation Needed**:
- Connect to AI service
- Generate questions based on topic and difficulty
- Support multiple question types

---

### **3. AI Student Insights**
```
GET /api/ai/student-insights?teacher_id={id}
```
**Response**:
```json
{
  "struggling_students": [
    {
      "student_id": "123",
      "name": "John Doe",
      "subject": "Mathematics",
      "current_grade": 45,
      "trend": "declining",
      "recommendation": "Student is struggling with algebra concepts. Recommend: 1) Extra tutoring sessions 2) Practice worksheets 3) Parent meeting",
      "suggested_actions": [
        "Schedule tutoring",
        "Provide extra practice",
        "Contact parents"
      ]
    }
  ],
  "improving_students": [
    {
      "student_id": "456",
      "name": "Jane Smith",
      "subject": "Physics",
      "current_grade": 85,
      "improvement_percentage": 15,
      "recommendation": "Excellent progress! Continue current study plan."
    }
  ],
  "class_performance_summary": {
    "average_grade": 72,
    "attendance_rate": 88,
    "subjects_needing_attention": ["Mathematics", "Chemistry"]
  }
}
```

**Implementation Needed**:
- Query student grades from `grades` and `exam_results` tables
- Calculate trends (compare current vs previous performance)
- Use AI to analyze patterns and generate recommendations
- Identify at-risk students

---

### **4. AI Performance Trends**
```
GET /api/ai/performance-trends?teacher_id={id}&period=week
```
**Response**:
```json
{
  "period": "week",
  "data_points": [
    {
      "date": "2024-01-15",
      "average_grade": 72,
      "attendance_rate": 85,
      "student_count": 30
    },
    {
      "date": "2024-01-16",
      "average_grade": 74,
      "attendance_rate": 88,
      "student_count": 30
    }
  ],
  "predictions": [
    {
      "date": "2024-01-17",
      "predicted_average": 75,
      "confidence": 0.85
    }
  ]
}
```

**Implementation Needed**:
- Aggregate grade data by date
- Calculate averages and attendance rates
- Use time-series analysis or AI for predictions
- Return data in format for Recharts

---

### **5. AI Attendance Trends**
```
GET /api/ai/attendance-trends?teacher_id={id}&period=week
```
**Response**:
```json
{
  "period": "week",
  "data": [
    {
      "week": "Mon",
      "attendance": 95
    },
    {
      "week": "Tue",
      "attendance": 92
    }
  ],
  "insights": "Attendance is consistent. Monday shows highest attendance."
}
```

**Implementation Needed**:
- Query `student_attendance` table
- Group by day of week
- Calculate percentages
- Optional: AI-generated insights

---

### **6. AI Assignment Suggestions**
```
POST /api/ai/suggest-assignments
```
**Request Body**:
```json
{
  "subject": "Chemistry",
  "class_name": "S.3 North",
  "topic": "Organic Compounds",
  "difficulty": "medium"
}
```
**Response**:
```json
{
  "suggestions": [
    {
      "title": "Organic Compound Identification",
      "description": "Identify and classify 10 organic compounds",
      "type": "homework",
      "estimated_time": 60,
      "learning_objectives": [
        "Identify functional groups",
        "Classify compounds"
      ]
    }
  ]
}
```

**Implementation Needed**:
- AI generates assignment ideas
- Based on subject, topic, and difficulty
- Suggest appropriate learning objectives

---

## 🗄️ **DATABASE TABLES NEEDED**

### **1. Timetables Table**
```sql
CREATE TABLE timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(teacher_id),
  school_id UUID REFERENCES schools(school_id),
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Monday, 6=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_timetables_teacher ON timetables(teacher_id);
CREATE INDEX idx_timetables_school ON timetables(school_id);
```

**Used By**: `TimetableWidget.tsx`, `TodayOverview.tsx`

---

### **2. Assignments Table**
```sql
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES teachers(teacher_id),
  school_id UUID REFERENCES schools(school_id),
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES assignments(id),
  student_id UUID REFERENCES students(student_id),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  file_url TEXT,
  status TEXT DEFAULT 'submitted' -- 'submitted', 'graded'
);

CREATE INDEX idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
```

**Used By**: `AssignmentsCard.tsx`

---

### **3. Messages Table**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL, -- 'admin', 'parent', 'student', 'teacher'
  recipient_id UUID NOT NULL,
  recipient_type TEXT NOT NULL, -- 'teacher', 'admin', 'parent', 'student'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_recipient ON messages(recipient_id, recipient_type);
CREATE INDEX idx_messages_sender ON messages(sender_id, sender_type);
```

**Used By**: `MessagesCard.tsx`

---

### **4. Notifications Table**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL, -- 'teacher', 'admin', 'student', 'parent'
  type TEXT NOT NULL, -- 'info', 'success', 'warning', 'error'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read);
```

**Used By**: `NotificationsCard.tsx`

---

## 🔧 **SUPPORTING API ENDPOINTS**

### **7. Today's Schedule**
```
GET /api/teacher/today-schedule
```
**Response**: Array of today's classes
```json
[
  {
    "time": "08:00",
    "subject": "Mathematics",
    "class_name": "S.1 West",
    "room": "Room 101"
  }
]
```

---

### **8. Full Timetable**
```
GET /api/teacher/timetable?teacher_id={id}
```
**Response**: Complete weekly timetable

---

### **9. Get Assignments**
```
GET /api/teacher/assignments?teacher_id={id}
```
**Response**: List of assignments with status

---

### **10. Get Messages**
```
GET /api/teacher/messages?teacher_id={id}
```
**Response**: List of messages (unread first)

---

### **11. Get Notifications**
```
GET /api/teacher/notifications?teacher_id={id}
```
**Response**: List of notifications (unread first)

---

### **12. Global Search**
```
GET /api/teacher/search?q={query}
```
**Response**: Search results across all entities

---

## 🤖 **AI SERVICE SETUP**

### **Option 1: Grok AI (xAI) - RECOMMENDED**
```typescript
// Install: npm install @xai/sdk
// Note: Grok uses OpenAI-compatible API
import OpenAI from 'openai';

const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1', // Grok API endpoint
});

// Example: Generate lesson plan
async function generateLessonPlan(prompt: string) {
  const response = await grok.chat.completions.create({
    model: "grok-beta", // or "grok-2" when available
    messages: [
      {
        role: "system",
        content: "You are an expert teacher assistant. Generate detailed lesson plans."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });
  
  return response.choices[0].message.content;
}
```

**Grok API Benefits**:
- ✅ More affordable than GPT-4
- ✅ Real-time knowledge (connected to X/Twitter)
- ✅ OpenAI-compatible API (easy migration)
- ✅ Good for educational content
- ✅ Fast response times

### **Option 2: OpenAI**
```typescript
// Install: npm install openai
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Example: Generate lesson plan
async function generateLessonPlan(prompt: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are an expert teacher assistant. Generate detailed lesson plans."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
  });
  
  return response.choices[0].message.content;
}
```

### **Option 3: Anthropic Claude**
```typescript
// Install: npm install @anthropic-ai/sdk
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateLessonPlan(prompt: string) {
  const message = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });
  
  return message.content[0].text;
}
```

### **Environment Variables Needed**
```env
# Grok AI (Recommended)
GROK_API_KEY=xai-...

# Or OpenAI
OPENAI_API_KEY=sk-...

# Or Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# AI Provider Selection
AI_PROVIDER=grok # or "openai" or "anthropic"

# Optional: Rate limiting
AI_RATE_LIMIT_PER_HOUR=100
```

---

## 📝 **PROMPT TEMPLATES**

### **Lesson Plan Prompt**
```
You are an expert teacher creating a lesson plan for {subject} class {class_name}.

Topic: {topic}
Duration: {duration} minutes
Learning Objectives: {objectives}

Create a detailed lesson plan including:
1. Title
2. Learning objectives
3. Required materials
4. Step-by-step activities with time allocations
5. Assessment method
6. Homework assignment

Format the response as JSON.
```

### **Exam Generation Prompt**
```
You are an expert teacher creating a {exam_type} exam for {subject} class {class_name}.

Topic: {topic}
Difficulty: {difficulty}
Number of questions: {question_count}

Create exam questions including:
- Multiple choice questions
- Short answer questions
- Essay questions (if applicable)

For each question, provide:
- Question text
- Options (for multiple choice)
- Correct answer
- Points allocation

Format the response as JSON.
```

### **Student Insights Prompt**
```
Analyze the following student performance data and provide insights:

Student: {name}
Subject: {subject}
Current Grade: {current_grade}
Previous Grades: {previous_grades}
Attendance: {attendance_rate}%

Provide:
1. Performance trend (declining/stable/improving)
2. Personalized recommendation
3. Suggested intervention actions

Format as JSON.
```

---

## 🚀 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Database Setup**
- [ ] Create `timetables` table
- [ ] Create `assignments` table
- [ ] Create `assignment_submissions` table
- [ ] Create `messages` table
- [ ] Create `notifications` table
- [ ] Add indexes for performance
- [ ] Set up Row Level Security (RLS) policies

### **Phase 2: Basic APIs**
- [ ] Create `/api/teacher/today-schedule`
- [ ] Create `/api/teacher/timetable`
- [ ] Create `/api/teacher/assignments`
- [ ] Create `/api/teacher/messages`
- [ ] Create `/api/teacher/notifications`
- [ ] Create `/api/teacher/search`

### **Phase 3: AI Service Setup**
- [ ] Choose AI provider (OpenAI/Anthropic)
- [ ] Set up API keys
- [ ] Install SDK
- [ ] Create AI service utility file
- [ ] Set up error handling
- [ ] Add rate limiting

### **Phase 4: AI Endpoints**
- [ ] Create `/api/ai/generate-lesson-plan`
- [ ] Create `/api/ai/generate-exam`
- [ ] Create `/api/ai/student-insights`
- [ ] Create `/api/ai/performance-trends`
- [ ] Create `/api/ai/attendance-trends`
- [ ] Create `/api/ai/suggest-assignments`

### **Phase 5: Integration**
- [ ] Update `AIInsights.tsx` to use real APIs
- [ ] Update `TimetableWidget.tsx` to use real APIs
- [ ] Update `AssignmentsCard.tsx` to use real APIs
- [ ] Update `MessagesCard.tsx` to use real APIs
- [ ] Update `NotificationsCard.tsx` to use real APIs
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test all features

---

## 💰 **COST ESTIMATION**

### **Grok AI Pricing (Recommended)**
- **More affordable than GPT-4**
- Pricing typically 30-50% cheaper than OpenAI
- Real-time knowledge access (connected to X/Twitter)
- Estimated cost per lesson plan: ~$0.05-0.10
- Estimated cost per exam: ~$0.08-0.15
- Estimated cost per insights analysis: ~$0.03-0.05

### **OpenAI Pricing (GPT-4)**
- Input: $30 per 1M tokens
- Output: $60 per 1M tokens
- Estimated cost per lesson plan: ~$0.10-0.20
- Estimated cost per exam: ~$0.15-0.30
- Estimated cost per insights analysis: ~$0.05-0.10

### **Monthly Estimate** (100 teachers, 10 AI requests/day)

**With Grok AI**:
- Lesson plans: $150-300/month
- Exams: $240-450/month
- Insights: $90-150/month
- **Total: ~$480-900/month** ✅ **More affordable**

**With OpenAI GPT-4**:
- Lesson plans: $300-600/month
- Exams: $450-900/month
- Insights: $150-300/month
- **Total: ~$900-1,800/month**

### **Cost Optimization**
- ✅ **Use Grok AI** (30-50% cheaper than GPT-4)
- Use GPT-3.5-turbo for simpler tasks (10x cheaper than GPT-4)
- Cache common requests
- Implement rate limiting
- Batch requests when possible
- Use smaller models for simple tasks

---

## ⚡ **QUICK START GUIDE**

### **Step 1: Set Up Database**
```sql
-- Run all CREATE TABLE statements above
-- Add RLS policies
-- Create indexes
```

### **Step 2: Install AI SDK**
```bash
# For Grok AI (uses OpenAI-compatible SDK)
npm install openai

# Or for OpenAI
npm install openai

# Or for Anthropic
npm install @anthropic-ai/sdk
```

### **Step 3: Create Environment Variables**
```env
# Grok AI (Recommended - More affordable)
GROK_API_KEY=xai-...

# Or OpenAI
OPENAI_API_KEY=sk-...

# Or Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Select which provider to use
AI_PROVIDER=grok
```

### **Step 4: Create AI Service Utility**
```typescript
// lib/ai-service.ts
import OpenAI from 'openai';

const getAIClient = () => {
  const provider = process.env.AI_PROVIDER || 'grok';
  
  if (provider === 'grok') {
    return new OpenAI({
      apiKey: process.env.GROK_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });
  } else if (provider === 'openai') {
    return new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  
  throw new Error('Invalid AI provider');
};

const getModel = () => {
  const provider = process.env.AI_PROVIDER || 'grok';
  return provider === 'grok' ? 'grok-beta' : 'gpt-4';
};

export { getAIClient, getModel };
```

### **Step 5: Create First AI Endpoint**
```typescript
// app/api/ai/generate-lesson-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAIClient, getModel } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const aiClient = getAIClient();
    const model = getModel();
    
    const prompt = `Create a detailed lesson plan for ${body.subject} class ${body.class_name}.

Topic: ${body.topic}
Duration: ${body.duration} minutes
Learning Objectives: ${body.learning_objectives?.join(', ') || 'Standard curriculum objectives'}

Generate a comprehensive lesson plan in JSON format with:
- title
- objectives (array)
- materials (array)
- activities (array of {time, activity, description})
- assessment (string)
- homework (string)

Format as valid JSON only.`;
    
    const response = await aiClient.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: "You are an expert teacher assistant. Generate detailed, practical lesson plans in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    
    const content = response.choices[0].message.content;
    const lessonPlan = JSON.parse(content);
    
    return NextResponse.json({
      success: true,
      lesson_plan: lessonPlan
    });
  } catch (error: any) {
    console.error('AI Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

### **Step 5: Test**
- Call the API from frontend
- Verify response format
- Update component to use real data

---

## 📊 **SUMMARY**

**What You Need**:
1. ✅ 12 API endpoints (6 AI + 6 supporting)
2. ✅ 4 database tables
3. ✅ AI service integration (OpenAI/Anthropic)
4. ✅ Prompt templates
5. ✅ Error handling & rate limiting

**Estimated Time**: 2-3 weeks for full implementation

**Priority Order**:
1. Database tables (1 day)
2. Supporting APIs (2-3 days)
3. AI service setup (1 day)
4. AI endpoints (3-5 days)
5. Integration & testing (2-3 days)

---

**Status**: UI is 100% ready. Backend implementation needed to activate AI features.

