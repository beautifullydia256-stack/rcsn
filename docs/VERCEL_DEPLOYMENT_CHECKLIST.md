# Vercel Deployment Checklist
## Complete Guide for Deploying PwezaCore to Vercel

---

## ✅ **PRE-DEPLOYMENT CHECKLIST**

### **1. Code Ready**
- [x] All new components created
- [x] AI service utility created
- [x] Test endpoint working
- [x] No build errors
- [x] All files in correct locations

### **2. Git Status**
- [ ] All changes committed
- [ ] No sensitive files in Git (`.env.local` is in `.gitignore`)
- [ ] Ready to push

### **3. Database Migrations**
- [ ] Run SQL migration in Supabase (see below)

---

## 🗄️ **SUPABASE MIGRATIONS**

### **Required SQL Migration**

Run this SQL in your Supabase SQL Editor:

**File**: `supabase/migrations/20250125_create_teacher_dashboard_tables.sql`

This creates:
- ✅ `timetables` table
- ✅ `assignments` table
- ✅ `assignment_submissions` table
- ✅ `messages` table
- ✅ `notifications` table

**Steps**:
1. Go to Supabase Dashboard → SQL Editor
2. Copy the entire content from `supabase/migrations/20250125_create_teacher_dashboard_tables.sql`
3. Paste and run
4. Verify tables are created

---

## 🔐 **VERCEL ENVIRONMENT VARIABLES**

### **Required Variables**

Go to **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add these variables:

#### **Public Variables (Browser-safe)**
```
NEXT_PUBLIC_SUPABASE_URL=https://ibnyclqobbrnjyxbbfsg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzA4NTksImV4cCI6MjA3MzYwNjg1OX0.JR5mcF3o8zDsl65KUgeAsPDDAf8qVhla_wm6gTadeVw
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAB4ERbu0E4JALixi
```

#### **Server-only Variables (Secret)**
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAzMDg1OSwiZXhwIjoyMDczNjA2ODU5fQ.6JmH9gygbdQV2hbdju19hu0_aPmZ-9vqbXSDvOpdTSc
JWT_SECRET=f8e4a1c2d9b7f3a5e6c8d1b2a3f7e9d8c0b1a2f3d4e5c6b7f8a9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6f7d8e9c0b1
```

#### **AI Configuration (Grok)**
```
GROK_API_KEY=xai-oqhA3yGBRXWUC5vnUKBiP757olzSbwFyvb01ksdT4KZddvh4WXAQILWXCV1iiZgNHrcrokH7zDA6JJfd
AI_PROVIDER=grok
GROK_MODEL=grok-4-latest
```

### **Environment Variable Setup Steps**

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Click **Settings** → **Environment Variables**

2. **Add Each Variable**
   - Click **Add New**
   - Enter variable name
   - Enter variable value
   - Select environments: **Production**, **Preview**, **Development**
   - Click **Save**

3. **Verify**
   - All variables should show in the list
   - Make sure they're set for all environments

---

## 📦 **GIT PUSH STEPS**

### **1. Check Git Status**
```bash
git status
```

### **2. Add All Files**
```bash
git add .
```

### **3. Commit Changes**
```bash
git commit -m "feat: Add modern AI-powered Teacher Dashboard with Grok AI integration

- Complete redesign of teacher dashboard with sidebar navigation
- 13 new reusable components (Sidebar, Navbar, QuickActions, etc.)
- AI-powered features (lesson planner, exam generator, insights)
- Grok AI integration for cost-effective AI features
- New database tables: timetables, assignments, messages, notifications
- Responsive design with dark mode support
- Framer Motion animations
- Ready for production deployment"
```

### **4. Push to Git**
```bash
git push origin main
# or
git push origin master
```

### **5. Vercel Auto-Deploy**
- Vercel will automatically detect the push
- Start building and deploying
- Monitor in Vercel Dashboard

---

## 🚀 **POST-DEPLOYMENT VERIFICATION**

### **1. Check Build Logs**
- Go to Vercel Dashboard → **Deployments**
- Click on the latest deployment
- Check build logs for errors

### **2. Test Live Site**
- Visit your deployed URL
- Test teacher dashboard login
- Verify all components load

### **3. Test AI Features**
- Visit: `https://your-domain.vercel.app/api/ai/test`
- Should return success response (if Grok credits are added)

### **4. Verify Environment Variables**
- Check that all env vars are loaded
- Test API endpoints that use env vars

---

## 📋 **FILES TO VERIFY BEFORE PUSH**

### **✅ Should be in Git**
- [x] `app/dashboard/teacher/page.tsx`
- [x] `app/dashboard/teacher/components/*.tsx` (all 13 components)
- [x] `app/api/ai/test/route.ts`
- [x] `src/lib/ai-service.ts`
- [x] `supabase/migrations/20250125_create_teacher_dashboard_tables.sql`
- [x] All documentation files

### **❌ Should NOT be in Git** (already in `.gitignore`)
- [ ] `.env.local`
- [ ] `.env`
- [ ] `node_modules/`
- [ ] `.next/`

---

## 🔍 **QUICK VERIFICATION COMMANDS**

```bash
# Check what will be committed
git status

# Check if .env.local is ignored
git check-ignore .env.local
# Should output: .env.local

# Verify no sensitive data in tracked files
git grep "xai-oqhA3yGBRXWUC5vnUKBiP757olzSbwFyvb01ksdT4KZddvh4WXAQILWXCV1iiZgNHrcrokH7zDA6JJfd"
# Should return nothing (no matches)
```

---

## ⚠️ **IMPORTANT NOTES**

1. **Never commit API keys** - They're in `.env.local` which is gitignored ✅
2. **Set env vars in Vercel** - Don't rely on `.env.local` in production
3. **Run SQL migration first** - Before deploying, run the migration in Supabase
4. **Test locally first** - Make sure everything works before pushing
5. **Monitor deployment** - Watch Vercel logs for any errors

---

## 🎯 **READY TO DEPLOY?**

### **Before Pushing:**
1. ✅ Run SQL migration in Supabase
2. ✅ Test locally (`npm run dev`)
3. ✅ Verify `.env.local` is gitignored
4. ✅ Check `git status` - no sensitive files

### **After Pushing:**
1. ✅ Set environment variables in Vercel
2. ✅ Monitor deployment logs
3. ✅ Test live site
4. ✅ Verify AI features work

---

## 📞 **TROUBLESHOOTING**

### **Build Fails**
- Check Vercel build logs
- Verify all dependencies in `package.json`
- Check for TypeScript errors

### **Environment Variables Not Working**
- Verify they're set in Vercel Dashboard
- Check they're set for correct environment (Production/Preview)
- Redeploy after adding new variables

### **Database Errors**
- Verify SQL migration ran successfully
- Check RLS policies are correct
- Verify Supabase connection strings

---

**Status**: Ready for deployment! 🚀

