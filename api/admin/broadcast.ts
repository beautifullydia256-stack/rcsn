import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

type Req = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
};
type Res = {
  status: (n: number) => Res;
  json: (x: unknown) => void;
};

function getHeader(req: Req, name: string): string | undefined {
  const v = req.headers?.[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

function normalizeUgandaPhone(raw: string): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('256') && d.length >= 12) return `+${d}`;
  if (d.startsWith('0') && d.length === 10) return `+256${d.slice(1)}`;
  if (d.length === 9) return `+256${d}`;
  return null;
}

function formatBalance(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString()}`;
}

function header(schoolName: string): string {
  return `📢 *${schoolName}*\n${'─'.repeat(Math.min(schoolName.length + 4, 32))}\n`;
}

function footer(): string {
  return `\nThank you.\n_This message was sent by the school administration._`;
}

function buildFinanceMessage(
  parentName: string,
  schoolName: string,
  students: { name: string; balance: number }[]
): string {
  const h = header(schoolName);
  if (students.length === 1) {
    const s = students[0]!;
    return (
      `${h}` +
      `Dear ${parentName},\n\n` +
      `This is a friendly reminder that your child *${s.name}* has an outstanding fee balance of *${formatBalance(s.balance)}*.\n\n` +
      `Please make arrangements to clear this balance at your earliest convenience. ` +
      `You may visit the school's finance office or contact us for payment options.` +
      `${footer()}`
    );
  }
  const lines = students.map((s) => `  • ${s.name}: *${formatBalance(s.balance)}*`).join('\n');
  return (
    `${h}` +
    `Dear ${parentName},\n\n` +
    `This is a friendly reminder about outstanding fee balances for your children:\n\n` +
    `${lines}\n\n` +
    `Please make arrangements to clear these balances at your earliest convenience. ` +
    `Visit the school's finance office or contact us for payment options.` +
    `${footer()}`
  );
}

function buildGeneralMessage(schoolName: string, body: string): string {
  return `${header(schoolName)}${body}${footer()}`;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();
    const authHeader = getHeader(req, 'authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) return res.status(401).json({ error: 'Unauthorized' });

    const { data: callerProfile } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', caller.id)
      .single();

    if (!callerProfile?.school_id || !['admin', 'owner', 'head_teacher', 'secretary'].includes(callerProfile.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const schoolId = callerProfile.school_id as string;

    const body = (req.body ?? {}) as {
      type?: 'finance' | 'general';
      channels?: string[];
      message?: string;
      audience?: 'parents' | 'teachers' | 'students';
    };

    const { type, channels = [], message, audience = 'parents' } = body;
    if (type !== 'finance' && type !== 'general') {
      return res.status(400).json({ error: 'type must be finance or general' });
    }
    if (!channels.length || !channels.every((c) => ['sms', 'whatsapp'].includes(c))) {
      return res.status(400).json({ error: 'Select at least one valid channel (sms or whatsapp)' });
    }
    if (type === 'general' && !message?.trim()) {
      return res.status(400).json({ error: 'Message is required for general announcements' });
    }

    const { data: school } = await supabase
      .from('schools')
      .select('school_name')
      .eq('school_id', schoolId)
      .single();
    const schoolName = school?.school_name || 'Your School';

    const entries: { phone: string; message: string }[] = [];

    if (type === 'finance') {
      const { data: balanceRows } = await supabase
        .from('student_balances')
        .select('student_id, balance')
        .eq('school_id', schoolId)
        .gt('balance', 0);

      if (!balanceRows?.length) {
        return res.status(200).json({ queued: 0, sms: 0, whatsapp: 0, message: 'No outstanding balances found.' });
      }

      const balanceByStudent = new Map<string, number>();
      for (const row of balanceRows) {
        const prev = balanceByStudent.get(row.student_id) ?? 0;
        balanceByStudent.set(row.student_id, prev + Number(row.balance));
      }

      const studentIds = [...balanceByStudent.keys()];

      const { data: studentRows } = await supabase
        .from('students')
        .select('student_id, name, status')
        .in('student_id', studentIds)
        .eq('status', 'active');

      const activeStudentIds = new Set((studentRows || []).map((s) => s.student_id));
      const studentNameById = new Map((studentRows || []).map((s) => [s.student_id, s.name as string]));

      const { data: parentRows } = await supabase
        .from('parents')
        .select('name, phone, student_id')
        .eq('school_id', schoolId)
        .in('student_id', studentIds)
        .not('phone', 'is', null);

      const phoneToStudents = new Map<string, { parentName: string; students: { name: string; balance: number }[] }>();

      for (const p of parentRows || []) {
        if (!p.phone || !activeStudentIds.has(p.student_id)) continue;
        const phone = normalizeUgandaPhone(p.phone);
        if (!phone) continue;
        const balance = balanceByStudent.get(p.student_id) ?? 0;
        if (balance <= 0) continue;
        const studentName = studentNameById.get(p.student_id) || 'your child';
        if (!phoneToStudents.has(phone)) {
          phoneToStudents.set(phone, { parentName: p.name || 'Parent', students: [] });
        }
        phoneToStudents.get(phone)!.students.push({ name: studentName, balance });
      }

      for (const [phone, data] of phoneToStudents) {
        entries.push({ phone, message: buildFinanceMessage(data.parentName, schoolName, data.students) });
      }
    } else {
      const msg = message!.trim();
      const uniquePhones = new Set<string>();

      if (audience === 'parents') {
        const { data: rows } = await supabase
          .from('parents')
          .select('phone')
          .eq('school_id', schoolId)
          .not('phone', 'is', null);
        for (const r of rows || []) {
          const phone = normalizeUgandaPhone(r.phone);
          if (phone) uniquePhones.add(phone);
        }
      } else if (audience === 'teachers') {
        const { data: rows } = await supabase
          .from('teachers')
          .select('phone')
          .eq('school_id', schoolId)
          .not('phone', 'is', null);
        for (const r of rows || []) {
          const phone = normalizeUgandaPhone(r.phone);
          if (phone) uniquePhones.add(phone);
        }
      } else if (audience === 'students') {
        const { data: rows } = await supabase
          .from('users')
          .select('phone')
          .eq('school_id', schoolId)
          .eq('role', 'student')
          .not('phone', 'is', null);
        for (const r of rows || []) {
          const phone = normalizeUgandaPhone(r.phone);
          if (phone) uniquePhones.add(phone);
        }
      }

      const formattedMsg = buildGeneralMessage(schoolName, msg);
      for (const phone of uniquePhones) {
        entries.push({ phone, message: formattedMsg });
      }
    }

    if (!entries.length) {
      const audienceLabel = type === 'finance' ? 'parents with outstanding balances' : `${audience} with phone numbers`;
      return res.status(200).json({ queued: 0, sms: 0, whatsapp: 0, message: `No ${audienceLabel} found.` });
    }

    const category = type === 'finance' ? 'financial' : 'announcement';
    const rows: object[] = [];

    for (const entry of entries) {
      for (const channel of channels) {
        rows.push({
          school_id: schoolId,
          notification_type: channel,
          recipient: entry.phone,
          message: entry.message,
          category,
          status: 'pending',
        });
      }
    }

    const { error: insertErr } = await supabase.from('notification_logs').insert(rows);
    if (insertErr) return res.status(400).json({ error: insertErr.message });

    const smsCount = channels.includes('sms') ? entries.length : 0;
    const waCount = channels.includes('whatsapp') ? entries.length : 0;

    return res.status(200).json({ success: true, queued: rows.length, sms: smsCount, whatsapp: waCount });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Broadcast failed';
    return res.status(500).json({ error: msg });
  }
}
