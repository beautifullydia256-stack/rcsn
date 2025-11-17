# Grok AI Setup Guide
## Quick Setup Instructions

---

## ✅ **STEP 1: Add API Key to Environment Variables**

### **Option A: Local Development (.env.local)**

Create or update `.env.local` file in your project root:

```env
GROK_API_KEY=xai-oqhA3yGBRXWUC5vnUKBiP757olzSbwFyvb01ksdT4KZddvh4WXAQILWXCV1iiZgNHrcrokH7zDA6JJfd
AI_PROVIDER=grok
GROK_MODEL=grok-4-latest
```

### **Option B: Production (Vercel/Deployment)**

1. Go to your deployment platform (Vercel, etc.)
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:
   - `GROK_API_KEY` = `xai-oqhA3yGBRXWUC5vnUKBiP757olzSbwFyvb01ksdT4KZddvh4WXAQILWXCV1iiZgNHrcrokH7zDA6JJfd`
   - `AI_PROVIDER` = `grok`
   - `GROK_MODEL` = `grok-4-latest`

---

## ✅ **STEP 2: Test the Connection**

### **Method 1: Using the Test Endpoint**

After starting your Next.js server, visit:
```
http://localhost:3000/api/ai/test
```

You should see a response like:
```json
{
  "success": true,
  "message": "Grok AI is working!",
  "response": "Hi and hello world",
  "provider": "grok",
  "model": "grok-4-latest"
}
```

### **Method 2: Using curl**

```bash
curl http://localhost:3000/api/ai/test
```

### **Method 3: Direct API Test**

```bash
curl https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer xai-oqhA3yGBRXWUC5vnUKBiP757olzSbwFyvb01ksdT4KZddvh4WXAQILWXCV1iiZgNHrcrokH7zDA6JJfd" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a test assistant."
      },
      {
        "role": "user",
        "content": "Testing. Just say hi and hello world and nothing else."
      }
    ],
    "model": "grok-4-latest",
    "stream": false,
    "temperature": 0
  }'
```

---

## ✅ **STEP 3: Verify Installation**

Make sure you have the `openai` package installed:

```bash
npm install openai
```

If not installed, run:
```bash
npm install openai
```

---

## 🚀 **STEP 4: Start Using AI Features**

Once the test endpoint works, you can start using AI features:

### **Example: Generate Lesson Plan**

```typescript
// In your API route
import { generateText } from '@/lib/ai-service';

const prompt = `Create a lesson plan for Mathematics class S.1 West.
Topic: Algebra Basics
Duration: 40 minutes`;

const lessonPlan = await generateText(prompt, "You are an expert teacher assistant.");
```

---

## 🔒 **SECURITY NOTES**

⚠️ **IMPORTANT**: 
- **NEVER** commit your API key to Git
- Add `.env.local` to `.gitignore`
- The API key shown above is for example only - keep yours secret
- Rotate your API key if it's ever exposed

---

## 📝 **Current Configuration**

- **Provider**: Grok AI (xAI)
- **Model**: `grok-4-latest`
- **API Endpoint**: `https://api.x.ai/v1`
- **Authentication**: Bearer token
- **SDK**: OpenAI-compatible (uses `openai` npm package)

---

## 🐛 **Troubleshooting**

### **Error: "AI service is not configured"**
- Check that `GROK_API_KEY` is set in `.env.local`
- Restart your Next.js dev server after adding env variables
- Verify the key starts with `xai-`

### **Error: "Failed to connect to Grok AI"**
- Verify your API key is correct
- Check your internet connection
- Verify the API key hasn't expired
- Check Grok API status

### **Error: "Invalid AI provider"**
- Make sure `AI_PROVIDER=grok` is set
- Check for typos in environment variable names

---

## ✅ **Next Steps**

1. ✅ API key added to `.env.local`
2. ✅ Test endpoint works (`/api/ai/test`)
3. ✅ Ready to implement AI features:
   - Lesson plan generator
   - Exam paper generator
   - Student insights
   - Performance trends

---

**Status**: Ready to use! 🎉

