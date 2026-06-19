import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
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

const ROLE_TITLES: Record<string, string> = {
  owner:        'School Owner',
  admin:        'Administrator',
  head_teacher: 'Head Teacher',
  dos:          'Director of Studies',
  secretary:    'Secretary',
};

function header(schoolName: string): string {
  const line = '─'.repeat(Math.min(schoolName.length + 4, 36));
  return `📢 *${schoolName.toUpperCase()}*\n${line}\n`;
}

function footer(senderName: string | null, senderRole: string, schoolName: string): string {
  const title = ROLE_TITLES[senderRole] || 'School Administration';
  const name  = senderName ? `*${senderName}*` : title;
  return (
    `\n\nThank you.\n` +
    `─────────────────────\n` +
    `_Sent by: ${name}_\n` +
    `_${title} — ${schoolName}_`
  );
}

function buildFinanceMessage(
  parentName: string,
  schoolName: string,
  students: { name: string; balance: number }[],
  senderName: string | null,
  senderRole: string,
): string {
  const h = header(schoolName);
  const f = footer(senderName, senderRole, schoolName);
  if (students.length === 1) {
    const s = students[0]!;
    return (
      `${h}` +
      `Dear ${parentName},\n\n` +
      `This is a friendly reminder that your child *${s.name}* has an outstanding fee balance of *${formatBalance(s.balance)}*.\n\n` +
      `Please make arrangements to clear this balance at your earliest convenience. ` +
      `You may visit the school's finance office or contact us for payment options.` +
      `${f}`
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
    `${f}`
  );
}

function buildGeneralMessage(schoolName: string, body: string, senderName: string | null, senderRole: string): string {
  return `${header(schoolName)}${body}${footer(senderName, senderRole, schoolName)}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();

    const authHeader = request.headers.get('authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: callerProfile } = await supabase
      .from('users')
      .select('school_id, role, name')
      .eq('user_id', caller.id)
      .single();

    if (
      !callerProfile?.school_id ||
      !['admin', 'owner', 'head_teacher', 'dos', 'secretary'].includes(callerProfile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const schoolId   = callerProfile.school_id as string;
    const senderName = (callerProfile.name as string | null) || null;
    const senderRole = (callerProfile.role as string) || 'admin';

    const body = (await request.json()) as {
      type?: string;
      channels?: string[];
      message?: string;
      audience?: string | string[];
    };

    const { type, channels = [], message, audience = ['parents'] } = body;

    // audience may arrive as a string (legacy) or an array (new multi-select)
    const audienceGroups: string[] = Array.isArray(audience) ? audience : [audience];
    const validGroups = ['parents', 'teachers', 'students', 'admins'];

    if (type !== 'finance' && type !== 'general') {
      return NextResponse.json({ error: 'type must be finance or general' }, { status: 400 });
    }
    if (!channels.length || !channels.every((c) => ['sms', 'whatsapp'].includes(c))) {
      return NextResponse.json({ error: 'Select at least one valid channel (sms or whatsapp)' }, { status: 400 });
    }
    if (type === 'general' && !message?.trim()) {
      return NextResponse.json({ error: 'Message is required for general announcements' }, { status: 400 });
    }
    if (type === 'general' && !audienceGroups.some((g) => validGroups.includes(g))) {
      return NextResponse.json({ error: 'Select at least one valid audience group' }, { status: 400 });
    }

    const { data: school } = await supabase
      .from('schools')
      .select('name')
      .eq('school_id', schoolId)
      .single();
    const schoolName = (school as { name?: string } | null)?.name || 'Your School';

    const entries: { phone: string; message: string }[] = [];

    if (type === 'finance') {
      const { data: balanceRows } = await supabase
        .from('student_balances')
        .select('student_id, balance')
        .eq('school_id', schoolId)
        .gt('balance', 0);

      if (!balanceRows?.length) {
        return NextResponse.json({ queued: 0, sms: 0, whatsapp: 0, message: 'No outstanding balances found.' });
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

      const activeStudentIds = new Set((studentRows || []).map((s: { student_id: string }) => s.student_id));
      const studentNameById = new Map((studentRows || []).map((s: { student_id: string; name: string }) => [s.student_id, s.name]));

      const { data: parentRows } = await supabase
        .from('parents')
        .select('name, phone, student_id')
        .eq('school_id', schoolId)
        .in('student_id', studentIds)
        .not('phone', 'is', null);

      const phoneToStudents = new Map<string, { parentName: string; students: { name: string; balance: number }[] }>();

      for (const p of (parentRows || []) as { name: string; phone: string; student_id: string }[]) {
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
        entries.push({ phone, message: buildFinanceMessage(data.parentName, schoolName, data.students, senderName, senderRole) });
      }
    } else {
      const msg = message!.trim();
      const uniquePhones = new Set<string>();

      for (const group of audienceGroups) {
        if (group === 'parents') {
          const { data: rows } = await supabase
            .from('parents')
            .select('phone')
            .eq('school_id', schoolId)
            .not('phone', 'is', null);
          for (const r of (rows || []) as { phone: string }[]) {
            const phone = normalizeUgandaPhone(r.phone);
            if (phone) uniquePhones.add(phone);
          }
        } else if (group === 'teachers') {
          const { data: rows } = await supabase
            .from('teachers')
            .select('phone')
            .eq('school_id', schoolId)
            .not('phone', 'is', null);
          for (const r of (rows || []) as { phone: string }[]) {
            const phone = normalizeUgandaPhone(r.phone);
            if (phone) uniquePhones.add(phone);
          }
        } else if (group === 'students') {
          const { data: rows } = await supabase
            .from('users')
            .select('phone')
            .eq('school_id', schoolId)
            .eq('role', 'student')
            .not('phone', 'is', null);
          for (const r of (rows || []) as { phone: string }[]) {
            const phone = normalizeUgandaPhone(r.phone);
            if (phone) uniquePhones.add(phone);
          }
        } else if (group === 'admins') {
          const { data: rows } = await supabase
            .from('users')
            .select('phone')
            .eq('school_id', schoolId)
            .in('role', ['admin', 'owner', 'head_teacher', 'dos', 'secretary'])
            .not('phone', 'is', null);
          for (const r of (rows || []) as { phone: string }[]) {
            const phone = normalizeUgandaPhone(r.phone);
            if (phone) uniquePhones.add(phone);
          }
        }
      }

      const formattedMsg = buildGeneralMessage(schoolName, msg, senderName, senderRole);
      for (const phone of uniquePhones) {
        entries.push({ phone, message: formattedMsg });
      }
    }

    if (!entries.length) {
      const audienceLabel = type === 'finance'
        ? 'parents with outstanding balances'
        : `${audienceGroups.join(', ')} with phone numbers`;
      return NextResponse.json({ queued: 0, sms: 0, whatsapp: 0, message: `No ${audienceLabel} found.` });
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
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    // --- In-app notifications for users who have app accounts ---
    // Map audience groups to roles in the users table
    const audienceRoles: string[] =
      type === 'finance'
        ? ['parent']
        : audienceGroups.flatMap((g) => {
            if (g === 'parents') return ['parent'];
            if (g === 'teachers') return ['teacher'];
            if (g === 'students') return ['student'];
            if (g === 'admins')
              return ['admin', 'owner', 'head_teacher', 'dos', 'secretary'];
            return [];
          });

    if (audienceRoles.length > 0) {
      const { data: appUsers } = await supabase
        .from('users')
        .select('user_id')
        .eq('school_id', schoolId)
        .in('role', audienceRoles);

      if (appUsers && appUsers.length > 0) {
        const inAppTitle =
          type === 'finance'
            ? `Fee Reminder — ${schoolName}`
            : schoolName;

        // For general: use the original message text (stripped of WA markdown)
        // For finance: point them to WhatsApp/SMS since each message is personalized
        const inAppBody =
          type === 'finance'
            ? 'You have an outstanding fee balance. Please check your WhatsApp or SMS for the full details.'
            : (message ?? '').trim()
                .replace(/\*([^*]+)\*/g, '$1')
                .replace(/_([^_]+)_/g, '$1');

        const inAppRows = (appUsers as { user_id: string }[]).map((u) => ({
          school_id: schoolId,
          user_id: u.user_id,
          title: inAppTitle,
          body: inAppBody,
          category,
          metadata: {
            broadcast: true,
            broadcastType: type,
            sentBy: senderName,
          },
        }));

        // Best-effort — don't fail the broadcast if in-app insert fails
        await supabase.from('user_in_app_notifications').insert(inAppRows);
      }
    }

    const smsCount = channels.includes('sms') ? entries.length : 0;
    const waCount  = channels.includes('whatsapp') ? entries.length : 0;

    return NextResponse.json({ success: true, queued: rows.length, sms: smsCount, whatsapp: waCount });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Broadcast failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
