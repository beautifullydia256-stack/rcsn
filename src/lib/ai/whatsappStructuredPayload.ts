/**
 * Structured WhatsApp replies: deterministic copy with WhatsApp formatting (*bold*),
 * spacing, and light emoji. No AI — instant responses.
 */

export type WhatsappUserRole = 'parent' | 'staff' | 'system';

export type WhatsappFormatPayload =
  | { intent: 'unregistered' }
  | { intent: 'role_pick' }
  | {
      intent: 'select_school';
      role: WhatsappUserRole;
      schools: { index: number; name: string }[];
    }
  | {
      intent: 'parent_menu';
      school_name: string;
      show_another_school: boolean;
    }
  | {
      intent: 'staff_menu';
      school_name: string;
      can_verify_receipts: boolean;
    }
  | {
      intent: 'child_picker';
      school_name: string;
      children: { index: number; name: string; class_name: string }[];
    }
  | { intent: 'attendance_submenu'; student_name: string | null }
  | {
      intent: 'fee_balance';
      role: 'parent';
      school_name: string;
      student_name: string;
      total_fees: number;
      paid: number;
      outstanding: number;
      currency: 'UGX';
    }
  | { intent: 'report_sending'; label: string }
  | { intent: 'report_unavailable'; label: string }
  | { intent: 'attendance_summary'; role: 'parent'; student_name: string; body: string }
  | {
      intent: 'staff_attendance_stats';
      role: 'staff';
      school_name: string;
      date_label: string;
      present: number;
      absent: number;
    }
  | {
      intent: 'staff_absent_list';
      role: 'staff';
      date_iso: string;
      absent_count: number;
      names_text: string;
    }
  | { intent: 'receipt_lookup'; role: 'staff'; body: string }
  | { intent: 'invalid_option' }
  | { intent: 'invalid_date' }
  | { intent: 'prompt_pick_1_or_2' }
  | { intent: 'prompt_pick_1_2_3' }
  | { intent: 'prompt_date_generic' }
  | { intent: 'prompt_date_absent' }
  | { intent: 'prompt_receipt_ref' }
  | { intent: 'use_menu_option' }
  | { intent: 'reply_menu_number' };

export type WhatsappFormatOptions = {
  /** First name preferred for "Hello {name} 👋" (parent/guardian or staff). */
  greetingName?: string | null;
};

/** Strip * so user-supplied names don't break WhatsApp bold markers. */
export function waSafe(s: string): string {
  return (s || '').replace(/\*/g, '·').trim();
}

function helloLine(opts?: WhatsappFormatOptions): string {
  const raw = (opts?.greetingName || '').trim();
  if (!raw) return `Hello 👋,\n\n`;
  const first = raw.split(/\s+/)[0] || raw;
  return `Hello ${waSafe(first)} 👋,\n\n`;
}

export function whatsappNavFooter(): string {
  return '\n\n0 — Menu · 9 — Start over';
}

function fmtUgx(n: number): string {
  return `UGX ${Math.round(n).toLocaleString('en-UG')}`;
}

function withFooter(body: string): string {
  return body + whatsappNavFooter();
}

export function defaultMessageFormatter(
  payload: WhatsappFormatPayload,
  options?: WhatsappFormatOptions
): string {
  switch (payload.intent) {
    case 'unregistered':
      return withFooter(
        `*📵 Not registered*\n\n` +
          `${helloLine(options)}` +
          `This number is not linked to PwezaCore. Please use the phone number on your school profile, or contact the school office.\n\n` +
          `Thank you 🙏`
      );

    case 'role_pick':
      return withFooter(
        `*👋 Choose a role*\n\n` +
          `${helloLine(options)}` +
          `You're on file as both *parent* and *staff*. Reply with a number:\n\n` +
          `1 — Parent (fees, reports, attendance)\n` +
          `2 — Staff (attendance, receipt lookup)`
      );

    case 'select_school': {
      const lines = payload.schools
        .map((s) => `${s.index} — ${waSafe(s.name)}`)
        .join('\n');
      return withFooter(
        `*🏫 Select school*\n\n` +
          `${helloLine(options)}` +
          `Reply with a number:\n\n` +
          lines
      );
    }

    case 'parent_menu': {
      const school = waSafe(payload.school_name);
      let opts =
        `1 — Fee balance\n` +
        `2 — Report card (latest PDF)\n` +
        `3 — Attendance`;
      if (payload.show_another_school) opts += `\n4 — Another school`;
      return withFooter(
        `*📚 Parent menu*\n\n` +
          `${helloLine(options)}` +
          `*${school}*\n\n` +
          `Choose an option:\n\n` +
          opts
      );
    }

    case 'staff_menu': {
      const school = waSafe(payload.school_name);
      let opts =
        `1 — Attendance today\n` +
        `2 — Attendance on a date\n` +
        `3 — Who was absent (names)`;
      if (payload.can_verify_receipts) opts += `\n4 — Verify receipt`;
      return withFooter(
        `*👔 Staff menu*\n\n` +
          `${helloLine(options)}` +
          `*${school}*\n\n` +
          `Choose an option:\n\n` +
          opts
      );
    }

    case 'child_picker': {
      const school = waSafe(payload.school_name);
      const lines = payload.children
        .map(
          (s) =>
            `${s.index} — ${waSafe(s.name)} (${waSafe(s.class_name || '—')})`
        )
        .join('\n');
      return withFooter(
        `*👶 Choose a student*\n\n` +
          `${helloLine(options)}` +
          `School: *${school}*\n\n` +
          `Reply with a number:\n\n` +
          lines
      );
    }

    case 'attendance_submenu': {
      const who = payload.student_name
        ? `Attendance for *${waSafe(payload.student_name)}*`
        : '*Attendance*';
      return withFooter(
        `*📅 Attendance*\n\n` +
          `${helloLine(options)}` +
          `${who}\n\n` +
          `Choose a period:\n\n` +
          `1 — Today\n` +
          `2 — This week (Mon–Sun)\n` +
          `3 — Specific date (DD-MM-YYYY)`
      );
    }

    case 'fee_balance': {
      const student = waSafe(payload.student_name);
      const school = waSafe(payload.school_name);
      return withFooter(
        `*💰 Fee balance*\n\n` +
          `${helloLine(options)}` +
          `Your child *${student}* is at *${school}*.\n\n` +
          `*Total (all terms):* *${fmtUgx(payload.total_fees)}*\n` +
          `*Paid:* *${fmtUgx(payload.paid)}*\n` +
          `*Outstanding:* *${fmtUgx(payload.outstanding)}*\n\n` +
          `Please ensure timely payment where possible.\n\n` +
          `Thank you 🙏`
      );
    }

    case 'report_sending':
      return withFooter(
        `*📄 Report card*\n\n` +
          `${helloLine(options)}` +
          `Sending your file:\n\n` +
          `*${waSafe(payload.label)}*\n\n` +
          `Thank you 🙏`
      );

    case 'report_unavailable':
      return withFooter(
        `*📄 Report card*\n\n` +
          `${helloLine(options)}` +
          `${waSafe(payload.label)}\n\n` +
          `Contact the school if you need help 🙏`
      );

    case 'attendance_summary':
      return withFooter(
        `*📊 Attendance summary*\n\n` +
          `${helloLine(options)}` +
          `${waSafe(payload.body)}\n\n` +
          `Thank you 🙏`
      );

    case 'staff_attendance_stats': {
      const school = waSafe(payload.school_name);
      return withFooter(
        `*📊 Attendance*\n\n` +
          `${helloLine(options)}` +
          `*${school}*\n` +
          `*Date:* ${waSafe(payload.date_label)}\n\n` +
          `*Present:* *${payload.present}*\n` +
          `*Absent:* *${payload.absent}*\n\n` +
          `Thank you 🙏`
      );
    }

    case 'staff_absent_list':
      return withFooter(
        `*📋 Absent learners*\n\n` +
          `${helloLine(options)}` +
          `*Date:* *${waSafe(payload.date_iso)}*\n` +
          `*Count:* *${payload.absent_count}*\n\n` +
          `${waSafe(payload.names_text)}\n\n` +
          `Thank you 🙏`
      );

    case 'receipt_lookup':
      return withFooter(
        `*🧾 Receipt*\n\n` +
          `${helloLine(options)}` +
          `${waSafe(payload.body)}\n\n` +
          `Thank you 🙏`
      );

    case 'invalid_option':
      return withFooter(
        `*⚠️ Invalid option*\n\n` +
          `${helloLine(options)}` +
          `Please choose a number from the menu.\n\n` +
          `Thank you 🙏`
      );

    case 'invalid_date':
      return withFooter(
        `*📅 Invalid date*\n\n` +
          `${helloLine(options)}` +
          `Use *DD-MM-YYYY* (example: 15-04-2026).\n\n` +
          `Thank you 🙏`
      );

    case 'prompt_pick_1_or_2':
      return withFooter(
        `*👋 Quick reply*\n\n` +
          `${helloLine(options)}` +
          `Reply *1* or *2*.`
      );

    case 'prompt_pick_1_2_3':
      return withFooter(
        `*👋 Quick reply*\n\n` +
          `${helloLine(options)}` +
          `Reply *1*, *2*, or *3*.`
      );

    case 'prompt_date_generic':
      return withFooter(
        `*📅 Attendance date*\n\n` +
          `${helloLine(options)}` +
          `Send the date as *DD-MM-YYYY*.`
      );

    case 'prompt_date_absent':
      return withFooter(
        `*📅 Absent list*\n\n` +
          `${helloLine(options)}` +
          `Send the date for the absent list (*DD-MM-YYYY*).`
      );

    case 'prompt_receipt_ref':
      return withFooter(
        `*🧾 Verify receipt*\n\n` +
          `${helloLine(options)}` +
          `Send the *receipt number* or *payment ID*.`
      );

    case 'use_menu_option':
      return withFooter(
        `*👋 Menu*\n\n` +
          `${helloLine(options)}` +
          `Please pick an option from the list above.`
      );

    case 'reply_menu_number':
      return withFooter(
        `*👋 Menu*\n\n` +
          `${helloLine(options)}` +
          `Reply with a number from the menu.`
      );

    default: {
      const _exhaustive: never = payload;
      return _exhaustive;
    }
  }
}
