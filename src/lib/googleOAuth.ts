// Google OAuth helper functions for custom domain integration

const GOOGLE_CLIENT_ID = import.meta.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const GOOGLE_REDIRECT_URI = import.meta.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ?? import.meta.env.VITE_GOOGLE_REDIRECT_URI ?? 'https://pwezacore.com/auth/google/callback';

// Generate Google OAuth URL for login
export function generateGoogleLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: 'login' // Distinguish between login and signup
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Generate Google OAuth URL for signup
export function generateGoogleSignupUrl(): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent', // Force consent screen for signup
    state: 'signup' // Distinguish between login and signup
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Handle Google OAuth redirect
export function redirectToGoogleOAuth(mode: 'login' | 'signup' = 'login'): void {
  const url = mode === 'signup' ? generateGoogleSignupUrl() : generateGoogleLoginUrl();
  window.location.href = url;
}
