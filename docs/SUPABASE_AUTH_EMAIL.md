# Supabase Auth + email (PwezaCore)

This app uses **two** email channels:

1. **Supabase Auth** — sends **signup confirmation**, **password reset**, and **invite** emails when you call `signUp`, `resetPasswordForEmail`, or `inviteUserByEmail`. These emails are sent **by Supabase’s mail pipeline** (configure SMTP below so they use your domain / Resend).
2. **Resend API** (this repo) — sends **credential emails** when an admin creates a user with a password (staff, teacher, student with a real email). Templates live in `lib/emailHtml.js` and `lib/credentialInnerHtml.js`.

---

## 1. URLs (Supabase Dashboard → Authentication → URL configuration)

| Setting | Example |
|--------|---------|
| **Site URL** | `https://www.pwezacore.com` |
| **Redirect URLs** | Add: `https://www.pwezacore.com/**`, `http://localhost:5173/**` (dev), and your Vercel preview URLs if needed |

Registration and “forgot password” use `emailRedirectTo` / `redirectTo` pointing to **`/auth/callback`** so the SPA can establish a session after the user clicks the link.

---

## 2. Signup confirmation (school admin self-registration)

- **Authentication → Providers → Email** — enable email/password.
- **Authentication → Providers → Email** — turn **Confirm email** **on** if you want new admins to verify before full access (recommended for production).

Supabase sends a **confirmation link** (not a numeric “verification code” by default). For OTP-style codes you would need a custom flow or phone auth.

---

## 3. Custom SMTP so Auth emails use Resend (recommended)

**Authentication → SMTP Settings** (or **Project Settings → Auth** depending on UI version):

Use [Resend SMTP](https://resend.com/docs/send-with-supabase-smtp):

| Field | Value |
|--------|--------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (STARTTLS) |
| Username | `resend` |
| Password | Your **Resend API key** (`re_...`) |
| Sender email | A verified address on your domain, e.g. `noreply@pwezacore.com` |
| Sender name | `PwezaCore` |

After this, **password reset**, **confirm signup**, and **invite** emails are sent through Resend with your domain.

---

## 4. Password reset

The **Forgot password** page calls `supabase.auth.resetPasswordForEmail` with `redirectTo: {origin}/auth/callback`. The user receives Supabase’s reset email (via your SMTP). After opening the link, `detectSessionInUrl` on the Supabase client picks up the session; the user should **set a new password** in your app (e.g. account settings) once logged in.

Optional: add a dedicated `/auth/reset-password` page that calls `supabase.auth.updateUser({ password })` if you want a dedicated UI right after the link.

---

## 5. Invites vs password creation

- **`inviteUserByEmail`** — Supabase sends an **invite** email; the user sets their own password on the invite link. No credential email from our Resend template.
- **`createUser` + password** (admin flow) — Our API sends a **Resend** email with the **temporary password** using `RESEND_API_KEY` / `RESEND_FROM` on the server.

---

## 6. Environment variables (Vercel + local)

**Resend (credential emails):**

- `RESEND_API_KEY`
- `RESEND_FROM` — e.g. `PwezaCore <noreply@pwezacore.com>`
- Optional: `EMAIL_LOGO_URL`, `VITE_APP_URL` / `NEXT_PUBLIC_APP_URL` (see `docs/ENV_SETUP_INSTRUCTIONS.md`)

**Supabase (already in use):**

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **server only**, never expose to the client

---

## 7. Branded “Reset password” email (logo + layout)

Supabase Auth emails are edited in the **Dashboard**, not in this repo.

1. Host your logo at **`{Site URL}/logo.png`** (e.g. put `public/logo.png` in the app and deploy so `https://www.pwezacore.com/logo.png` works).
2. In Supabase: **Authentication → Email** → open the **Reset password** / **Recovery** template.
3. Replace the body with the HTML in **`docs/supabase-email-templates/reset-password.html`** (copy the whole file).

That template uses:

- **`{{ .SiteURL }}/logo.png`** — logo (needs **Site URL** set under Authentication → URL Configuration).
- **`{{ .ConfirmationURL }}`** — reset link (required; if this is wrong, the button has no URL).
- **`{{ .Email }}`** — recipient email.

If the logo doesn’t load, use a full URL in the `img` tag instead, e.g. `https://www.pwezacore.com/logo.png`.

---

## 8. Security notes

- Treat **Resend API key** and **service role key** as secrets.
- Sending a **temporary password by email** is convenient but not as strong as invite-only; encourage users to change password after first login.
- Rotate keys if they leak.
