# Vercel AI Environment Variables

## Required for AI Features

Add these environment variables in your Vercel project settings:

### **Grok AI (Recommended - Default)**

```env
# AI Provider (set to 'grok' for Grok AI)
AI_PROVIDER=grok

# Grok API Key (Required)
GROK_API_KEY=xai-oqhA3yGBRXWUC5vnUKBiP757olzSbwFyvb01ksdT4KZddvh4WXAQILWXCV1iiZgNHrcrokH7zDA6JJfd

# Grok Model (Optional - defaults to 'grok-4-latest')
GROK_MODEL=grok-4-latest
```

### **OpenAI (Alternative)**

If you prefer to use OpenAI instead:

```env
# AI Provider (set to 'openai' for OpenAI)
AI_PROVIDER=openai

# OpenAI API Key (Required)
OPENAI_API_KEY=sk-your-openai-api-key-here

# OpenAI Model (Optional - defaults to 'gpt-4')
OPENAI_MODEL=gpt-4
```

---

## How to Add to Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Name**: `AI_PROVIDER`
   - **Value**: `grok`
   - **Environment**: Select all (Production, Preview, Development)
4. Repeat for each variable above

---

## Minimum Required Variables

**For Grok AI (Recommended):**
- ✅ `AI_PROVIDER=grok`
- ✅ `GROK_API_KEY=your-grok-api-key`

**For OpenAI:**
- ✅ `AI_PROVIDER=openai`
- ✅ `OPENAI_API_KEY=your-openai-api-key`

---

## Optional Variables

These have defaults and are optional:
- `GROK_MODEL` (defaults to `grok-4-latest`)
- `OPENAI_MODEL` (defaults to `gpt-4`)

---

## Testing

After adding the variables, test the AI connection:

1. Deploy to Vercel
2. Visit: `https://your-domain.vercel.app/api/ai/test`
3. Should return: `{ "success": true, "message": "Grok AI is working!", ... }`

---

## Notes

- **Grok AI** is recommended because it's more affordable
- Make sure your Grok account has credits
- Environment variables are case-sensitive
- After adding variables, redeploy your application

