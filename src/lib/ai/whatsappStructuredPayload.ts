/**
 * Structured payloads for WhatsApp replies. Bot logic builds these; Grok may rephrase;
 * defaultMessageFormatter is the source of truth for fallback (matches pre-AI copy).
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

export function whatsappNavFooter(): string {
  return '\n\n0 — Menu · 9 — Start over';
}

function fmtUgx(n: number): string {
  return `UGX ${Math.round(n).toLocaleString('en-UG')}`;
}

export function defaultMessageFormatter(payload: WhatsappFormatPayload): string {
  const f = whatsappNavFooter();

  switch (payload.intent) {
    case 'unregistered':
      return `This number is not registered with PwezaCore. Please use the phone on your school profile or contact the office.${f}`;

    case 'role_pick':
      return `Hi! You're on file as both a parent and staff.\n\n1 — Parent (fees, reports, attendance)\n2 — Staff (attendance, receipt lookup)${f}`;

    case 'select_school': {
      const lines = payload.schools.map((s) => `${s.index} — ${s.name}`).join('\n');
      return `Select school:\n${lines}${f}`;
    }

    case 'parent_menu': {
      let t =
        `${payload.school_name} — Parent menu\n\n` +
        `1 — Fee balance\n` +
        `2 — Report card (latest PDF)\n` +
        `3 — Attendance\n`;
      if (payload.show_another_school) t += `4 — Another school\n`;
      return t + f;
    }

    case 'staff_menu': {
      let t =
        `${payload.school_name} — Staff menu\n\n` +
        `1 — Attendance today\n` +
        `2 — Attendance on a date\n` +
        `3 — Who was absent (names)\n`;
      if (payload.can_verify_receipts) t += `4 — Verify receipt\n`;
      return t + f;
    }

    case 'child_picker': {
      const lines = payload.children
        .map((s) => `${s.index} — ${s.name} (${s.class_name || '—'})`)
        .join('\n');
      return `Choose child:\n${lines}${f}`;
    }

    case 'attendance_submenu': {
      const who = payload.student_name ? `Attendance for ${payload.student_name}` : 'Attendance';
      return `${who} — choose:\n1 — Today\n2 — This week (Mon–Sun)\n3 — Specific date (DD-MM-YYYY)${f}`;
    }

    case 'fee_balance':
      return (
        `Fees summary\n` +
        `Total fees (all terms): ${fmtUgx(payload.total_fees)}\n` +
        `Paid: ${fmtUgx(payload.paid)}\n` +
        `Outstanding: ${fmtUgx(payload.outstanding)}${f}`
      );

    case 'report_sending':
      return `Sending: ${payload.label}${f}`;

    case 'report_unavailable':
      return `${payload.label}${f}`;

    case 'attendance_summary':
      return `${payload.body}${f}`;

    case 'staff_attendance_stats':
      return `${payload.date_label}\nPresent: ${payload.present}\nAbsent: ${payload.absent}${f}`;

    case 'staff_absent_list':
      return `Absent on ${payload.date_iso} (${payload.absent_count}): ${payload.names_text}${f}`;

    case 'receipt_lookup':
      return `${payload.body}${f}`;

    case 'invalid_option':
      return `Invalid option.${f}`;

    case 'invalid_date':
      return `Invalid date. Use DD-MM-YYYY${f}`;

    case 'prompt_pick_1_or_2':
      return `Reply 1 or 2.${f}`;

    case 'prompt_pick_1_2_3':
      return `1, 2, or 3.${f}`;

    case 'prompt_date_generic':
      return `Send date as DD-MM-YYYY${f}`;

    case 'prompt_date_absent':
      return `Send date for absent list (DD-MM-YYYY)${f}`;

    case 'prompt_receipt_ref':
      return `Send the receipt number or payment ID.${f}`;

    case 'use_menu_option':
      return `Use a menu option.${f}`;

    case 'reply_menu_number':
      return `Reply with a number from the menu.${f}`;

    default: {
      const _exhaustive: never = payload;
      return _exhaustive;
    }
  }
}
