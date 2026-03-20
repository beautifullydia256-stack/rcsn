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

The **Forgot password** page calls `supabase.auth.resetPasswordForEmail` with  
`redirectTo: {origin}/auth/callback?flow=recovery`.

- After the user clicks the **Reset password** button in the email, the app exchanges the PKCE `code` on `/auth/callback` and sends them to **`/auth/update-password`** to choose a new password (not straight to the generic dashboard).
- The success screen also links to **`/auth/recovery-code`**, where they can enter the **verification code** from the email (`verifyOtp` with `type: 'recovery'`) if your Supabase template includes `{{ .Token }}`. If the email has no numeric code (link-only), they should use the button in the email.

**Redirect URLs:** Allow your callback with query, e.g. `https://www.pwezacore.com/auth/callback**` (wildcard) or explicitly include `https://www.pwezacore.com/auth/callback?flow=recovery` if your project uses strict matching.

Branded HTML for the reset email lives in **`docs/supabase-email-templates/reset-password.html`** (paste into **Authentication → Email → Reset password**).

---

## 5. Invites vs password creation

- **`inviteUserByEmail`** — Supabase sends an **invite** email; the user sets their own password on the invite link. No credential email from our Resend template.
- **`createUser` + password** (admin flow) — Our API sends a **Resend** email with a **one-time password** using `RESEND_API_KEY` / `RESEND_FROM` on the server. Content is built in **`lib/credentialInnerHtml.js`** (wrapped by **`lib/emailHtml.js`** with logo + card + footer). Copy is **role-specific** (teacher, student, head teacher, librarian, accountant, parent, admin, owner, or generic staff). Subjects look like **`Your PwezaCore teacher login`** — short and neutral for deliverability. Passwords must be **8–72 characters** (see `lib/passwordPolicy.js`); auto-generated one-time passwords are **8 characters**.

### Student logins without a provided password

If the generated password would be shorter than 8 characters (e.g. short admission number), the server uses a random **8-character** one-time password instead.

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

Supabase Auth emails are edited in the **Dashboard**, not in this repo. To get the **full branded email** (PwezaCore look, button, optional code block):

1. Host your logo at **`{Site URL}/logo.png`** (e.g. put `public/logo.png` in the app and deploy so `https://www.pwezacore.com/logo.png` works).
2. In Supabase: **Authentication → Email** → open the **Reset password** / **Recovery** template.
3. Set the **subject** to something neutral and clear, e.g. **`Reset your PwezaCore password`** (avoid ALL CAPS or spammy phrases).
4. **Replace the entire default body** with the contents of **`docs/supabase-email-templates/reset-password.html`** (open the file in your editor, select all, copy, paste into Supabase — the file is only HTML, safe to paste whole).

What that template includes (Google/Apple-style card: centered white card, hierarchy, pill CTA):

- **Branding:** logo, “Security” label, account chip, grey footer strip with **Help | Privacy** links.
- **Verification code** first when **`{{ .Token }}`** is present (link to **`/auth/recovery-code`**), then a pill **Reset password** button (**`{{ .ConfirmationURL }}`**). If there is no token, only the button is shown.
- No plain-URL “copy this link” box (keeps the layout simple).

Template variables:

- **`{{ .SiteURL }}/logo.png`** — logo (needs **Site URL** under Authentication → URL Configuration).
- **`{{ .ConfirmationURL }}`** — reset link (required; if this is wrong, the button has no URL).
- **`{{ .Email }}`** — recipient email.
- **`{{ .Token }}`** — optional; wrapped in **`{{ if .Token }}`** so empty tokens don’t show a blank section.

It also includes a **hidden preheader** (inbox preview), **plain URL fallback**, and **transactional** footer copy (helps legitimacy).

If the logo doesn’t load, use a full URL in the `img` tag instead, e.g. `https://www.pwezacore.com/logo.png`.

### Deliverability (spam folder)

HTML alone does not guarantee inbox placement. Also:

- Complete **SPF** / **DKIM** / **DMARC** for your domain in **Resend** + DNS (see Resend domain setup).
- Use **SMTP** in Supabase with the same verified domain as sender.
- New domains may take time to build reputation; ask users to mark “Not spam” when appropriate.

**Gmail “?” or warning on the sender:** Usually means the domain isn’t fully authenticated (SPF/DKIM/DMARC) or the address is unfamiliar. Fix DNS for your sending domain in Resend first.

---

## 7b. “Password changed” security email (matches the same look)

Supabase sends this **after** a successful password change. It is a separate template from reset.

1. Dashboard → **Authentication → Email** (or **Email Templates**) → **Password changed** under **Security notifications** (ensure that notification is **enabled** for the project).
2. Subject example: **`Your PwezaCore password was changed`**
3. Paste the full HTML from **`docs/supabase-email-templates/password-changed.html`**.

Uses **`{{ .Email }}`** and **`{{ .SiteURL }}`**. The headline includes a first-line name when **`{{ .Data }}`** has any of:

- **`{{ .Data.name }}`**
- **`{{ .Data.full_name }}`**
- **`{{ .Data.admin_name }}`** (school admins often have this from registration)
- **`{{ .Data.display_name }}`** (some OAuth profiles)

Those keys come from **`auth.users.raw_user_meta_data`**. If none are set, the headline is **“Your password was changed”** without a name. To show names for every user type, ensure your signup / admin “create user” flows set **`user_metadata.name`** (or `full_name` / `admin_name`) in Supabase.

---

## 8. Security notes

- Treat **Resend API key** and **service role key** as secrets.
- Sending a **temporary password by email** is convenient but not as strong as invite-only; encourage users to change password after first login.
- Rotate keys if they leak.
