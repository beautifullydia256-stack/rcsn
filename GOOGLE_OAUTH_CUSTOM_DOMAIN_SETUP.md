# Google OAuth Custom Domain Integration Setup

This guide will help you integrate Google Sign-In with your custom domain (pwezacore.com) so users see your site name in the Google consent screen instead of the default Supabase domain.

## 🎯 Overview

The custom OAuth integration provides:
- ✅ Your domain (pwezacore.com) in Google consent screen
- ✅ Full control over OAuth flow
- ✅ Secure token handling
- ✅ Integration with Supabase Auth
- ✅ Support for both login and signup flows

## 📋 Prerequisites

1. A Google Cloud Console project
2. Your domain (pwezacore.com) with HTTPS enabled
3. Supabase project with service role key
4. Next.js application deployed

## 🔧 Step 1: Google Cloud Console Setup

### 1.1 Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth 2.0 Client IDs**
5. Choose **Web application**
6. Configure the following:

**Authorized JavaScript origins:**
```
https://pwezacore.com
```

**Authorized redirect URIs:**
```
https://pwezacore.com/auth/google/callback
```

7. Click **Create** and save the **Client ID** and **Client Secret**

### 1.2 Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Choose **External** user type (unless you have a Google Workspace)
3. Fill in the required information:

**App Information:**
- App name: `PwezaCore`
- User support email: `your-email@domain.com`
- App logo: Upload your school management system logo

**App domain:**
- Application home page: `https://pwezacore.com`
- Application privacy policy: `https://pwezacore.com/privacy`
- Application terms of service: `https://pwezacore.com/terms`

**Authorized domains:**
```
pwezacore.com
```

**Developer contact information:**
- Email addresses: `your-email@domain.com`

4. Add scopes:
   - `../auth/userinfo.email`
   - `../auth/userinfo.profile`
   - `openid`

5. Add test users (during development):
   - Add your email addresses for testing

## 🔧 Step 2: Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://pwezacore.com

# Google OAuth Configuration (Server-side)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://pwezacore.com/auth/google/callback

# Google OAuth Configuration (Client-side)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://pwezacore.com/auth/google/callback
```

## 🔧 Step 3: Database Setup

Run the corrected SQL script in your Supabase SQL Editor:

```sql
-- Run the fix_registration_schema_corrected.sql script
-- This ensures your database supports the OAuth flow
```

## 🔧 Step 4: Deploy and Test

### 4.1 Deploy Your Application

1. Deploy your Next.js application to your domain (pwezacore.com)
2. Ensure HTTPS is enabled
3. Verify all environment variables are set in production

### 4.2 Test the OAuth Flow

**For Login:**
1. Go to `https://pwezacore.com/login`
2. Click "Continue with Google"
3. You should see "PwezaCore" in the consent screen
4. Complete the OAuth flow
5. Should redirect to admin dashboard

**For Signup:**
1. Go to `https://pwezacore.com/register`
2. Click "Continue with Google"
3. You should see "PwezaCore" in the consent screen
4. Complete the OAuth flow
5. Should redirect to school setup page

## 🔧 Step 5: Production Checklist

### 5.1 Google Cloud Console

- [ ] OAuth consent screen is verified (if required)
- [ ] Production app status is approved
- [ ] All redirect URIs are correct
- [ ] Scopes are properly configured

### 5.2 Application

- [ ] Environment variables are set in production
- [ ] HTTPS is enabled
- [ ] Database schema is updated
- [ ] OAuth callback endpoint is working

### 5.3 Testing

- [ ] Login flow works correctly
- [ ] Signup flow works correctly
- [ ] Error handling works properly
- [ ] User data is properly stored

## 🚨 Troubleshooting

### Common Issues

**1. "redirect_uri_mismatch" error**
- Verify the redirect URI in Google Cloud Console matches exactly
- Ensure no trailing slashes or http vs https mismatch

**2. "invalid_client" error**
- Check that GOOGLE_CLIENT_ID is correct
- Verify the client secret is properly set

**3. "access_denied" error**
- Check OAuth consent screen configuration
- Ensure test users are added (during development)
- Verify app is not in restricted mode

**4. Database errors during OAuth**
- Run the database schema fix script
- Check RLS policies are properly configured
- Verify service role key has correct permissions

### Debug Steps

1. Check browser console for errors
2. Check server logs for OAuth callback errors
3. Verify environment variables in production
4. Test OAuth flow in incognito mode
5. Check Supabase logs for auth errors

## 📁 Files Created/Modified

- ✅ `app/api/auth/google/callback/route.ts` - OAuth callback endpoint
- ✅ `src/lib/googleOAuth.ts` - OAuth helper functions
- ✅ `app/login/page.tsx` - Updated to use custom OAuth
- ✅ `app/register/page.tsx` - Updated to use custom OAuth
- ✅ `app/auth/setup-school/page.tsx` - School setup form

## 🔐 Security Notes

1. **Never expose client secret** in frontend code
2. **Use HTTPS** for all OAuth flows
3. **Validate state parameter** to prevent CSRF attacks
4. **Secure your service role key** - never commit to version control
5. **Implement rate limiting** on OAuth endpoints
6. **Monitor OAuth usage** for suspicious activity

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all configuration steps were completed
3. Check Google Cloud Console for OAuth errors
4. Review Supabase logs for database errors
5. Contact support with specific error messages

---

## 🎉 Success!

Once configured, users will see "PwezaCore" in the Google consent screen and have a seamless OAuth experience with your custom domain!
