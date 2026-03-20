# Supabase email HTML (manual paste)

**Changing files here does not change what users receive.** Supabase Auth reads templates only from the **Supabase Dashboard**, not from this repo or from Vercel.

### To see your updates in real emails

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** → your project → **Authentication** → **Email** (or **Email Templates**).
2. Select **Reset password** (recovery).
3. **Select all** text in the template body and **delete** it.
4. Open **`reset-password.html`** in this folder in your editor → **Select all** → **Copy**.
5. **Paste** into the Supabase body field → **Save**.
6. Trigger a **new** reset email (Forgot password again). **Old messages already in Gmail will not change.**

Until you complete steps 3–5, Supabase keeps sending the **default** body (`<h2>Reset Password</h2>`, “Button not working?”, etc.).

### Other templates

- **`password-changed.html`** → Dashboard → **Password changed** (under security notifications).

### Logo image

Templates use `{{ .SiteURL }}/logo.png` with a fallback to **`https://www.pwezacore.com/logo.png`** when `SiteURL` is empty (some **security notification** emails have had missing `SiteURL`). If your production domain is different, replace that fallback URL in the `<img>` tag in both HTML files.

### Checklist

- [ ] Pasted **entire** HTML file (from `<!DOCTYPE` through `</html>`).
- [ ] Clicked **Save** in Supabase.
- [ ] Sent a **new** test email after saving.
