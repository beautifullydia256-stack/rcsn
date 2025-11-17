# Email Confirmation Testing Guide

## How to Test Email Confirmation

### 1. Check Supabase Email Settings
Go to your Supabase dashboard:
1. Navigate to **Authentication** → **Settings**
2. Check **Email** tab
3. Verify **Enable email confirmations** is turned ON
4. Check **Site URL** is set to your domain (e.g., `http://localhost:3000` for development)

### 2. Test Registration Flow
1. Go to `/register` page
2. Fill out the registration form
3. Submit the form
4. You should see the "Check Your Email" screen
5. Check your email inbox for confirmation email

### 3. Check Email Templates
In Supabase dashboard:
1. Go to **Authentication** → **Email Templates**
2. Check **Confirm signup** template
3. Verify the template has the confirmation link

### 4. Test Email Confirmation
1. Click the confirmation link in your email
2. You should be redirected to `/auth/callback`
3. Then redirected to `/dashboard/admin`

## Troubleshooting

### If No Email is Sent:
1. Check Supabase email settings
2. Verify SMTP configuration in Supabase
3. Check spam folder
4. For development, emails might be disabled

### If Email Confirmation Doesn't Work:
1. Check the callback URL in email template
2. Verify `/auth/callback` page exists
3. Check browser console for errors

### For Development:
- Supabase might not send emails in development mode
- Check Supabase logs for email sending status
- Consider using Supabase's built-in email testing

## Expected Behavior

### Registration:
1. User fills form → Submit
2. Shows "Check Your Email" screen
3. Email sent to user's inbox
4. User clicks link → Account activated

### Login:
1. User tries to login before confirmation
2. Shows "Please check your email and click the confirmation link"
3. User can resend confirmation email
4. After confirmation, login works normally
