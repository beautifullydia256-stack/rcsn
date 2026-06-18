'use strict';

/**
 * One-shot endpoint: sends a role-tailored WhatsApp intro message to every
 * staff member / parent at a given school.
 * Protected by INTRO_BLAST_SECRET env var (pass as ?secret=xxx or body.secret).
 *
 * POST /api/admin/send-bot-intro
 * Body: { schoolId: string, secret: string }
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function normalizeUgandaPhone(raw) {
  if (!raw) return null;
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('256') && d.length >= 12) return `+${d}`;
  if (d.startsWith('0') && d.length === 10) return `+256${d.slice(1)}`;
  if (d.length === 9) return `+256${d}`;
  return null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendWa(token, base, to, text) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ to, text });
    const url = new URL(`${base}/api/send-message`);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300 && j.success !== false, raw: j });
          } catch {
            resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, raw: data });
          }
        });
      }
    );
    req.on('error', (e) => resolve({ ok: false, error: String(e) }));
    req.write(body);
    req.end();
  });
}

function buildMessage(name, schoolName, role) {
  const greeting = `Hello *${name}*! 👋`;
  const intro = `\n\n🎉 The *PwezaCore WhatsApp AI* for *${schoolName}* is now live and ready!\n\n`;
  const footer = `\nSimply send *Hi* or *Menu* to this number at any time to get started. The AI is available 24/7 🤖\n\n_Powered by PwezaCore_`;

  if (role === 'admin' || role === 'head_teacher') {
    return (
      greeting + intro +
      `As *${role === 'admin' ? 'Administrator' : 'Head Teacher'}*, you can:\n` +
      `1️⃣ View class & student lists\n` +
      `2️⃣ Check today's school schedule\n` +
      `3️⃣ View school-wide attendance\n` +
      `4️⃣ Get school finance summary\n` +
      `5️⃣ Verify payment receipts\n` +
      `6️⃣ Read notifications` +
      footer
    );
  }
  if (role === 'secretary') {
    return (
      greeting + intro +
      `As *Secretary*, you can:\n` +
      `1️⃣ View school-wide attendance today\n` +
      `2️⃣ Read notifications` +
      footer
    );
  }
  if (role === 'accountant') {
    return (
      greeting + intro +
      `As *Accountant*, you can:\n` +
      `1️⃣ Verify payment receipts\n` +
      `2️⃣ View school finance summary\n` +
      `3️⃣ Read notifications` +
      footer
    );
  }
  // Default: teacher / other staff
  return (
    greeting + intro +
    `As a *Teacher*, you can:\n` +
    `1️⃣ View my classes & student lists\n` +
    `2️⃣ See today's teaching schedule\n` +
    `3️⃣ View my full timetable\n` +
    `4️⃣ Record & check attendance\n` +
    `5️⃣ Read notifications` +
    footer
  );
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = req.body?.secret || req.query?.secret;
  const envSecret = process.env.INTRO_BLAST_SECRET;
  if (!envSecret || secret !== envSecret) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { schoolId } = req.body ?? {};
  if (!schoolId) return res.status(400).json({ error: 'schoolId required' });

  const waToken = process.env.WASENDER_BEARER_TOKEN;
  const waBase = (process.env.WASENDER_API_BASE || 'https://www.wasenderapi.com').replace(/\/$/, '');
  if (!waToken) return res.status(500).json({ error: 'WASENDER_BEARER_TOKEN not configured' });

  try {
    const supabase = getSupabase();

    const [{ data: school }, { data: users }, { data: teachers }] = await Promise.all([
      supabase.from('schools').select('name').eq('school_id', schoolId).single(),
      supabase.from('users').select('name, phone, role').eq('school_id', schoolId).not('phone', 'is', null),
      supabase.from('teachers').select('name, phone, email').eq('school_id', schoolId).not('phone', 'is', null),
    ]);

    const schoolName = school?.name || 'Your School';

    // Build map: normalized phone → { name, role }
    const contactMap = new Map();

    // Users first (they have explicit roles)
    for (const u of users || []) {
      const phone = normalizeUgandaPhone(u.phone);
      if (!phone) continue;
      contactMap.set(phone, { name: u.name || 'Staff', role: u.role || 'teacher' });
    }

    // Teachers fill in any gaps (default role = teacher)
    for (const t of teachers || []) {
      const phone = normalizeUgandaPhone(t.phone);
      if (!phone || contactMap.has(phone)) continue;
      contactMap.set(phone, { name: t.name || 'Teacher', role: 'teacher' });
    }

    const results = [];
    let sent = 0;
    let failed = 0;

    for (const [phone, { name, role }] of contactMap) {
      const text = buildMessage(name, schoolName, role);
      const result = await sendWa(waToken, waBase, phone, text);
      results.push({ phone, name, role, ok: result.ok });
      if (result.ok) sent++;
      else { failed++; console.warn('[intro-blast] failed', phone, result); }
      // Rate-limit: 1 message per second to avoid WaSender throttling
      await sleep(1100);
    }

    return res.status(200).json({ success: true, sent, failed, total: contactMap.size, results });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
};
