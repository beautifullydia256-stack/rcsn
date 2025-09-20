import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create Supabase admin client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'https://pwezacore.com/auth/google/callback';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/login?error=oauth_error`
      );
    }

    if (!code) {
      console.error('No authorization code received');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/login?error=no_code`
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/login?error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, id_token } = tokens;

    if (!id_token) {
      console.error('No ID token received');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/login?error=no_id_token`
      );
    }

    // Verify and decode the ID token
    const userInfoResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
    );

    if (!userInfoResponse.ok) {
      console.error('Failed to fetch user info');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/login?error=user_info_failed`
      );
    }

    const googleUser = await userInfoResponse.json();
    const { id: googleId, email, name, picture } = googleUser;

    if (!email) {
      console.error('No email from Google user');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/login?error=no_email`
      );
    }

    // Check if this is a signup or login flow based on state parameter
    const isSignup = state === 'signup';

    try {
      // Check if user exists in Supabase Auth
      const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing users:', listError);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/login?error=user_lookup_failed`
        );
      }

      const existingUser = existingUsers.users.find(user => user.email === email);

      if (existingUser) {
        // User exists - handle login
        if (isSignup) {
          // User is trying to signup but account exists - redirect to login
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/login?message=account_exists`
          );
        }

        // Generate a session token for the existing user
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/dashboard/admin`
          }
        });

        if (sessionError || !sessionData) {
          console.error('Error generating session:', sessionError);
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/login?error=session_generation_failed`
          );
        }

        // Redirect to the magic link
        return NextResponse.redirect(sessionData.properties.action_link);

      } else {
        // User doesn't exist - handle signup
        if (!isSignup) {
          // User is trying to login but no account exists
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/register?message=no_account`
          );
        }

        // Create new user in Supabase Auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            full_name: name,
            avatar_url: picture,
            provider: 'google',
            google_id: googleId
          },
          app_metadata: {
            provider: 'google',
            providers: ['google']
          }
        });

        if (createError || !newUser.user) {
          console.error('Error creating user:', createError);
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/register?error=user_creation_failed`
          );
        }

        // Generate session for new user
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/auth/setup-school`
          }
        });

        if (sessionError || !sessionData) {
          console.error('Error generating session for new user:', sessionError);
          return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/register?error=session_generation_failed`
          );
        }

        // Redirect to the magic link
        return NextResponse.redirect(sessionData.properties.action_link);
      }

    } catch (error) {
      console.error('Unexpected error in OAuth callback:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/login?error=unexpected_error`
      );
    }

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://pwezacore.com'}/login?error=callback_error`
    );
  }
}
