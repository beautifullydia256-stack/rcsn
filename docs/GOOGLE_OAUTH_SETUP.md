# Google OAuth Setup for PwezaCore

This guide explains how to set up Google OAuth authentication for school administrators in PwezaCore.

## Prerequisites

1. A Google Cloud Console project
2. Supabase project with the provided callback URL
3. Admin access to both Google Cloud Console and Supabase

## Step 1: Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `https://ibnyclqobbrnjyxbbfsg.supabase.co/auth/v1/callback`
   - Save and note down the Client ID and Client Secret

## Step 2: Supabase Configuration

1. Go to your Supabase project dashboard
2. Navigate to "Authentication" > "Providers"
3. Find "Google" and enable it
4. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. Set the redirect URL to: `https://ibnyclqobbrnjyxbbfsg.supabase.co/auth/v1/callback`
6. Save the configuration

## Step 3: Environment Variables (Optional)

If you need to customize the OAuth flow, you can add these environment variables to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Step 4: Test the Integration

1. Start your development server: `npm run dev`
2. Go to the login page: `http://localhost:3000/login`
3. Click "Continue with Google"
4. Complete the Google OAuth flow
5. Verify that you're redirected to the admin dashboard

## Features

### For School Administrators Only
- Google OAuth is restricted to users with `role = 'admin'` in the `users` table
- Non-admin users will see an error message if they try to use Google sign-in
- Regular email/password authentication remains available for all users

### Login Flow
1. User clicks "Continue with Google" on login page
2. Redirected to Google OAuth consent screen
3. After consent, redirected back to Supabase callback
4. System verifies user is an admin in the database
5. If verified, redirected to admin dashboard
6. If not verified, shown error message and signed out

### Signup Flow
1. User clicks "Continue with Google" on registration page
2. Redirected to Google OAuth consent screen
3. After consent, redirected back to Supabase callback
4. System checks if user exists in database
5. If new user, requires manual admin setup (contact support)
6. If existing user, redirected to admin dashboard

## Security Notes

- Google OAuth is only available for school administrators
- All OAuth flows are validated against the `users` table
- Non-admin users are automatically signed out if they attempt Google OAuth
- The callback URL is configured to match Supabase's OAuth endpoint

## Troubleshooting

### Common Issues

1. **"Google sign-in is only available for school administrators"**
   - User is not in the `users` table with `role = 'admin'`
   - Solution: Add user to database with admin role

2. **"Authentication failed"**
   - Check Google Cloud Console credentials
   - Verify Supabase OAuth configuration
   - Check callback URL matches exactly

3. **"No session found"**
   - OAuth flow was interrupted
   - Solution: Try the sign-in process again

### Debug Steps

1. Check browser console for errors
2. Verify Supabase logs in the dashboard
3. Check Google Cloud Console for OAuth errors
4. Ensure callback URL is correctly configured

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify all configuration steps were completed
3. Contact support with specific error messages
























