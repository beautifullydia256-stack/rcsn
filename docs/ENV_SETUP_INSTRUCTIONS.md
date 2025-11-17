# Environment Variables Setup Instructions

## 📋 **Complete .env.local File**

Copy and paste this entire content into your `.env.local` file:

```env
# ============================================
# PwezaCore School Management System
# Environment Variables Configuration
# ============================================

# ----------------------------
# Public (browser-safe)
# ----------------------------

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ibnyclqobbrnjyxbbfsg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzA4NTksImV4cCI6MjA3MzYwNjg1OX0.JR5mcF3o8zDsl65KUgeAsPDDAf8qVhla_wm6gTadeVw

# Cloudflare Turnstile (public site key)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAB4ERbu0E4JALixi

# ----------------------------
# Server-only (DO NOT expose client-side)
# ----------------------------

# Supabase Service Role Key (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAzMDg1OSwiZXhwIjoyMDczNjA2ODU5fQ.6JmH9gygbdQV2hbdju19hu0_aPmZ-9vqbXSDvOpdTSc

# App JWT secret used by our middleware/auth (keep private)
JWT_SECRET=f8e4a1c2d9b7f3a5e6c8d1b2a3f7e9d8c0b1a2f3d4e5c6b7f8a9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6f7d8e9c0b1

# ----------------------------
# AI Configuration (Grok AI)
# ----------------------------

# Grok AI API Key (xAI)
GROK_API_KEY=xai-oqhA3yGBRXWUC5vnUKBiP757olzSbwFyvb01ksdT4KZddvh4WXAQILWXCV1iiZgNHrcrokH7zDA6JJfd

# AI Provider Selection (grok, openai, or anthropic)
AI_PROVIDER=grok

# Grok Model Selection
GROK_MODEL=grok-4-latest

# Optional: AI Rate Limiting
# AI_RATE_LIMIT_PER_HOUR=100

# ----------------------------
# Alternative AI Providers (Optional)
# ----------------------------

# Uncomment if you want to use OpenAI instead of Grok
# OPENAI_API_KEY=sk-your-openai-key-here
# AI_PROVIDER=openai
# OPENAI_MODEL=gpt-4

# Uncomment if you want to use Anthropic Claude instead
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
# AI_PROVIDER=anthropic
# ANTHROPIC_MODEL=claude-3-opus-20240229

# ----------------------------
# Application Configuration
# ----------------------------

# Node Environment
NODE_ENV=development

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ----------------------------
# Optional: Email Configuration (if using Nodemailer)
# ----------------------------

# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# SMTP_FROM=noreply@pwezacore.com

# ----------------------------
# Optional: Analytics & Monitoring
# ----------------------------

# VERCEL_ANALYTICS_ID=your-analytics-id
# SENTRY_DSN=your-sentry-dsn

# ============================================
# IMPORTANT SECURITY NOTES:
# ============================================
# 1. NEVER commit this file to Git (.env.local is in .gitignore)
# 2. Keep all API keys secret and secure
# 3. Rotate keys if they are ever exposed
# 4. Use different keys for development and production
# 5. Server-only keys (SUPABASE_SERVICE_ROLE_KEY, JWT_SECRET, GROK_API_KEY) 
#    should NEVER be exposed to the browser
# ============================================
```

## 🚀 **Quick Setup Steps**

1. **Create `.env.local` file** in your project root (if it doesn't exist)

2. **Copy the entire content above** and paste it into `.env.local`

3. **Save the file**

4. **Restart your Next.js dev server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

5. **Test Grok AI connection**:
   ```bash
   # Visit in browser:
   http://localhost:3000/api/ai/test
   
   # Or use curl:
   curl http://localhost:3000/api/ai/test
   ```

## ✅ **What's Included**

- ✅ All your existing Supabase configuration
- ✅ Cloudflare Turnstile key
- ✅ JWT secret
- ✅ **NEW: Grok AI configuration** (ready to use)
- ✅ Optional configurations for future use

## 🔒 **Security Reminder**

- `.env.local` is already in `.gitignore` ✅
- Never commit this file to Git
- Keep all API keys secure
- Use different keys for production

## 🎯 **Next Steps**

Once your `.env.local` is set up:

1. ✅ Test the AI connection: `/api/ai/test`
2. ✅ Start implementing AI features
3. ✅ All AI endpoints will automatically use Grok AI

---

**Status**: Ready to use! 🎉

