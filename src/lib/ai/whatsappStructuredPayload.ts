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
      show_all_balances: boolean;
      show_another_school: boolean;
    }
  | {
      intent: 'staff_menu';
      school_name: string;
      can_verify_receipts: boolean;
      can_view_school_summary: boolean;
    }
  | { intent: 'staff_my_classes'; class_names: string[] }
  | { intent: 'staff_schedule_today'; lines: string[]; day_label: string }
  | { intent: 'staff_timetable_week'; body: string }
  | {
      intent: 'staff_attendance_today_intro';
      date_label: string;
      present: number;
      absent: number;
    }
  | {
      intent: 'staff_attendance_by_class_list';
      date_label: string;
      rows: { class_name: string; present: number; absent: number }[];
    }
  | {
      intent: 'staff_class_absent_detail';
      class_name: string;
      date_label: string;
      absent_count: number;
      names_text: string;
    }
  | { intent: 'staff_notifications_inbox'; lines: string[] }
  | { intent: 'staff_feature_unavailable'; title: string; message: string }
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
  | { intent: 'parent_fee_submenu'; student_name: string }
  | {
      intent: 'payment_history';
      student_name: string;
      rows: { amount: number; date: string | null; method: string | null; reference: string | null }[];
    }
  | {
      intent: 'term_fee_breakdown';
      student_name: string;
      rows: { term: number; year: number; total_fees: number; paid: number; outstanding: number }[];
    }
  | {
      intent: 'all_children_balances';
      school_name: string;
      children: { name: string; current_class: string; total_fees: number; paid: number; outstanding: number }[];
    }
  | {
      intent: 'staff_class_students';
      class_name: string;
      students: { index: number; name: string }[];
    }
  | {
      intent: 'staff_school_summary';
      school_name: string;
      date_label: string;
      enrolled: number;
      total_fees: number;
      total_paid: number;
      outstanding: number;
      zero_payers: number;
      today_collected: number;
    }
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
  /** First name for "Hello {name} 👋" — only used on parent_menu / staff_menu. */
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
  return '\n\n0 — Main menu';
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
  const menuHello =
    payload.intent === 'staff_menu' || payload.intent === 'parent_menu' ? helloLine(options) : '';

  switch (payload.intent) {
    case 'unregistered':
      return withFooter(
        `*📵 Not registered*\n\n` +
          `${menuHello}` +
          `This number is not linked to PwezaCore. Please use the phone number on your school profile, or contact the school office.\n\n` +
          `Thank you 🙏`
      );

    case 'role_pick':
      return withFooter(
        `*👋 Choose a role*\n\n` +
          `${menuHello}` +
          `You're on file as both *parent* and *staff*. Reply with a number:\n\n` +
          `1 — Parent (fees, reports, attendance)\n` +
          `2 — Staff (classes, timetable, attendance)`
      );

    case 'select_school': {
      const lines = payload.schools
        .map((s) => `${s.index} — ${waSafe(s.name)}`)
        .join('\n');
      return withFooter(
        `*🏫 Select school*\n\n` +
          `${menuHello}` +
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
      let next = 4;
      if (payload.show_all_balances) { opts += `\n${next} — All children balances`; next++; }
      if (payload.show_another_school) opts += `\n${next} — Another school`;
      return withFooter(
        `*📚 Parent menu*\n\n` +
          `${menuHello}` +
          `*${school}*\n\n` +
          `Choose an option:\n\n` +
          opts
      );
    }

    case 'staff_menu': {
      const school = waSafe(payload.school_name);
      let opts =
        `1 — My classes\n` +
        `2 — Today's schedule\n` +
        `3 — My timetable\n` +
        `4 — Attendance today\n` +
        `5 — Notifications`;
      if (payload.can_view_school_summary) opts += `\n6 — School summary`;
      if (payload.can_verify_receipts) opts += `\n${payload.can_view_school_summary ? 7 : 6} — Verify receipt`;
      return withFooter(
        `*👔 Staff menu*\n\n` +
          `${menuHello}` +
          `*${school}*\n\n` +
          `Choose an option:\n\n` +
          opts
      );
    }

    case 'staff_my_classes': {
      if (payload.class_names.length === 0) {
        return withFooter(
          `*📚 My classes*\n\n` +
            `${menuHello}` +
            `No classes are linked to your teacher profile yet.\n\n` +
            `Ask your admin to assign classes in PwezaCore.`
        );
      }
      const lines = payload.class_names.map((c, i) => `${i + 1} — *${waSafe(c)}*`).join('\n');
      return withFooter(
        `*📚 My classes*\n\n` +
          `${menuHello}` +
          `${lines}\n\n` +
          `Reply with a *class number* to see the student list.`
      );
    }

    case 'staff_schedule_today': {
      if (payload.lines.length === 0) {
        return withFooter(
          `*🗓️ Today's schedule*\n\n` +
            `${menuHello}` +
            `*${waSafe(payload.day_label)}*\n\n` +
            `No lessons on your timetable for today.`
        );
      }
      return withFooter(
        `*🗓️ Today's schedule*\n\n` +
          `${menuHello}` +
          `*${waSafe(payload.day_label)}*\n\n` +
          payload.lines.join('\n')
      );
    }

    case 'staff_timetable_week':
      return withFooter(
        `*📅 My timetable*\n\n` + `${menuHello}` + `${payload.body}`
      );

    case 'staff_attendance_today_intro':
      return withFooter(
        `*📊 Attendance today*\n\n` +
          `${menuHello}` +
          `*Date:* ${waSafe(payload.date_label)}\n\n` +
          `*Present:* *${payload.present}*\n` +
          `*Absent:* *${payload.absent}*\n\n` +
          `Reply *1* for *attendance by class* (your classes only).\n\n` +
          `Thank you 🙏`
      );

    case 'staff_attendance_by_class_list': {
      const lines = payload.rows.map(
        (r, i) =>
          `${i + 1} — *${waSafe(r.class_name)}* · *${r.present}* present · *${r.absent}* absent`
      );
      return withFooter(
        `*📊 By class*\n\n` +
          `${menuHello}` +
          `*Date:* ${waSafe(payload.date_label)}\n\n` +
          `Reply with a *class number* to list absent students.\n\n` +
          lines.join('\n')
      );
    }

    case 'staff_class_absent_detail':
      return withFooter(
        `*📋 Absent students*\n\n` +
          `${menuHello}` +
          `*Class:* *${waSafe(payload.class_name)}*\n` +
          `*Date:* ${waSafe(payload.date_label)}\n` +
          `*Absent:* *${payload.absent_count}*\n\n` +
          `${waSafe(payload.names_text)}\n\n` +
          `Pick another class number from the list above, or use the main menu.`
      );

    case 'staff_notifications_inbox': {
      if (payload.lines.length === 0) {
        return withFooter(
          `*🔔 Notifications*\n\n` +
            `${menuHello}` +
            `No notifications in your inbox yet.`
        );
      }
      return withFooter(
        `*🔔 Notifications*\n\n` + `${menuHello}` + payload.lines.join('\n\n—\n\n')
      );
    }

    case 'staff_feature_unavailable':
      return withFooter(
        `*${waSafe(payload.title)}*\n\n` + `${menuHello}` + `${payload.message}`
      );

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
          `${menuHello}` +
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
          `${menuHello}` +
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
          `${menuHello}` +
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
          `${menuHello}` +
          `Sending your file:\n\n` +
          `*${waSafe(payload.label)}*\n\n` +
          `Thank you 🙏`
      );

    case 'report_unavailable':
      return withFooter(
        `*📄 Report card*\n\n` +
          `${menuHello}` +
          `${waSafe(payload.label)}\n\n` +
          `Contact the school if you need help 🙏`
      );

    case 'attendance_summary':
      return withFooter(
        `*📊 Attendance summary*\n\n` +
          `${menuHello}` +
          `${waSafe(payload.body)}\n\n` +
          `Thank you 🙏`
      );

    case 'staff_attendance_stats': {
      const school = waSafe(payload.school_name);
      return withFooter(
        `*📊 Attendance*\n\n` +
          `${menuHello}` +
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
          `${menuHello}` +
          `*Date:* *${waSafe(payload.date_iso)}*\n` +
          `*Count:* *${payload.absent_count}*\n\n` +
          `${waSafe(payload.names_text)}\n\n` +
          `Thank you 🙏`
      );

    case 'receipt_lookup':
      return withFooter(
        `*🧾 Receipt*\n\n` +
          `${menuHello}` +
          `${waSafe(payload.body)}\n\n` +
          `Thank you 🙏`
      );

    case 'parent_fee_submenu':
      return withFooter(
        `*💰 Fee balance*\n\n` +
          `${menuHello}` +
          `What else would you like to know about *${waSafe(payload.student_name)}*?\n\n` +
          `1 — Payment history (last 10 payments)\n` +
          `2 — Term-by-term breakdown`
      );

    case 'payment_history': {
      const student = waSafe(payload.student_name);
      if (payload.rows.length === 0) {
        return withFooter(
          `*💳 Payment history — ${student}*\n\n` +
            `${menuHello}` +
            `No payment records found yet.\n\n` +
            `Thank you 🙏`
        );
      }
      const lines = payload.rows.map((r, i) => {
        const amt = fmtUgx(r.amount);
        const dt = r.date ?? '—';
        const mth = (r.method ?? '—').replace(/_/g, ' ');
        const ref = r.reference ? ` · Ref: ${waSafe(r.reference)}` : '';
        return `${i + 1}. *${dt}* · ${amt} · ${mth}${ref}`;
      });
      return withFooter(
        `*💳 Payment history — ${student}*\n\n` +
          `${menuHello}` +
          `${lines.join('\n')}\n\n` +
          `Thank you 🙏`
      );
    }

    case 'term_fee_breakdown': {
      const student = waSafe(payload.student_name);
      if (payload.rows.length === 0) {
        return withFooter(
          `*📊 Term breakdown — ${student}*\n\n` +
            `${menuHello}` +
            `No term fee records found yet.\n\n` +
            `Thank you 🙏`
        );
      }
      const lines = payload.rows.map((r) =>
        `*Term ${r.term} · ${r.year}*\n` +
        `  Fees: ${fmtUgx(r.total_fees)} | Paid: ${fmtUgx(r.paid)} | Balance: *${fmtUgx(r.outstanding)}*`
      );
      return withFooter(
        `*📊 Term breakdown — ${student}*\n\n` +
          `${menuHello}` +
          `${lines.join('\n\n')}\n\n` +
          `Thank you 🙏`
      );
    }

    case 'all_children_balances': {
      const school = waSafe(payload.school_name);
      const totalOutstanding = payload.children.reduce((s, c) => s + c.outstanding, 0);
      const lines = payload.children.map((c, i) =>
        `*${i + 1}. ${waSafe(c.name)}* (${waSafe(c.current_class || '—')})\n` +
        `   Fees: ${fmtUgx(c.total_fees)} | Paid: ${fmtUgx(c.paid)} | *Owed: ${fmtUgx(c.outstanding)}*`
      );
      return withFooter(
        `*💰 All children — ${school}*\n\n` +
          `${menuHello}` +
          `${lines.join('\n\n')}\n\n` +
          `*Total outstanding: ${fmtUgx(totalOutstanding)}*\n\n` +
          `Thank you 🙏`
      );
    }

    case 'staff_class_students': {
      const cls = waSafe(payload.class_name);
      if (payload.students.length === 0) {
        return withFooter(
          `*📋 ${cls} — Students*\n\n` +
            `${menuHello}` +
            `No active students found in this class.`
        );
      }
      const lines = payload.students.map((s) => `${s.index}. ${waSafe(s.name)}`).join('\n');
      return withFooter(
        `*📋 ${cls} — Students*\n\n` +
          `${menuHello}` +
          `${lines}\n\n` +
          `*Total: ${payload.students.length}*`
      );
    }

    case 'staff_school_summary': {
      const school = waSafe(payload.school_name);
      return withFooter(
        `*🏦 School summary — ${school}*\n\n` +
          `${menuHello}` +
          `*Date:* ${waSafe(payload.date_label)}\n` +
          `*Enrolled students:* ${payload.enrolled}\n\n` +
          `*Fees (all terms):*\n` +
          `  Billed: ${fmtUgx(payload.total_fees)}\n` +
          `  Collected: ${fmtUgx(payload.total_paid)}\n` +
          `  Outstanding: *${fmtUgx(payload.outstanding)}*\n` +
          `  Zero-payers: *${payload.zero_payers}*\n\n` +
          `*Today's collections:* *${fmtUgx(payload.today_collected)}*\n\n` +
          `Thank you 🙏`
      );
    }

    case 'invalid_option':
      return withFooter(
        `*⚠️ Invalid option*\n\n` +
          `${menuHello}` +
          `Please choose a number from the menu.\n\n` +
          `Thank you 🙏`
      );

    case 'invalid_date':
      return withFooter(
        `*📅 Invalid date*\n\n` +
          `${menuHello}` +
          `Use *DD-MM-YYYY* (example: 15-04-2026).\n\n` +
          `Thank you 🙏`
      );

    case 'prompt_pick_1_or_2':
      return withFooter(
        `*👋 Quick reply*\n\n` +
          `${menuHello}` +
          `Reply *1* or *2*.`
      );

    case 'prompt_pick_1_2_3':
      return withFooter(
        `*👋 Quick reply*\n\n` +
          `${menuHello}` +
          `Reply *1*, *2*, or *3*.`
      );

    case 'prompt_date_generic':
      return withFooter(
        `*📅 Attendance date*\n\n` +
          `${menuHello}` +
          `Send the date as *DD-MM-YYYY*.`
      );

    case 'prompt_date_absent':
      return withFooter(
        `*📅 Absent list*\n\n` +
          `${menuHello}` +
          `Send the date for the absent list (*DD-MM-YYYY*).`
      );

    case 'prompt_receipt_ref':
      return withFooter(
        `*🧾 Verify receipt*\n\n` +
          `${menuHello}` +
          `Send the *receipt number* or *payment ID*.`
      );

    case 'use_menu_option':
      return withFooter(
        `*👋 Menu*\n\n` +
          `${menuHello}` +
          `Please pick an option from the list above.`
      );

    case 'reply_menu_number':
      return withFooter(
        `*👋 Menu*\n\n` +
          `${menuHello}` +
          `Reply with a number from the menu.`
      );

    default: {
      const _exhaustive: never = payload;
      return _exhaustive;
    }
  }
}
