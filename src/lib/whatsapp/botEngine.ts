import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParentSchoolGroup, ResolvedIdentity, StaffSchoolContext } from './resolveIdentity';
import { resolveIdentity, roleCanViewBroadAttendance } from './resolveIdentity';
import {
  getLatestReportPdfForStudent,
  getParentAttendanceSummary,
  getParentFeeSummary,
  getStaffAttendanceStats,
  verifyReceiptByRef,
  type AttendanceScope,
} from './queries';
import { clearSession, loadSession, saveSession } from './sessionStore';
import { toUgandaE164FromDigits } from './normalizePhone';

export { toUgandaE164FromDigits };

export type OutboundMsg =
  | { type: 'text'; text: string }
  | { type: 'document'; url: string; fileName?: string; caption?: string };

function footer() {
  return '\n\n0 — Menu · 9 — Start over';
}

function parseIntMenu(text: string): number | null {
  const t = text.trim();
  const m = t.match(/^(\d+)/);
  if (!m) return null;
  return parseInt(m[1]!, 10);
}

function parseDdMmYyyy(text: string): string | null {
  const t = text.trim();
  const m = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d.toISOString().slice(0, 10);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function staffContextFromSession(ctx: Record<string, unknown>): StaffSchoolContext | null {
  const raw = ctx.staffSchool as StaffSchoolContext | undefined;
  return raw ?? null;
}

function parentGroupFromSession(identity: ResolvedIdentity, ctx: Record<string, unknown>): ParentSchoolGroup | null {
  const idx = Number(ctx.parentSchoolIndex ?? 0);
  return identity.parentSchools[idx] ?? null;
}

export async function processInboundMessage(
  client: SupabaseClient,
  waDigits: string,
  waE164: string,
  messageText: string
): Promise<OutboundMsg[]> {
  const text = (messageText || '').trim();
  const identity = await resolveIdentity(client, waDigits);
  if (!identity || (!identity.hasParent && !identity.hasStaff)) {
    return [
      {
        type: 'text',
        text:
          'This number is not registered with PwezaCore. Please use the phone on your school profile or contact the office.',
      },
    ];
  }

  let { step, context: ctx } = await loadSession(client, waE164);
  const n = parseIntMenu(text);

  if (n === 9 || text.toLowerCase() === 'start over') {
    await clearSession(client, waE164);
    return processInboundMessage(client, waDigits, waE164, '');
  }

  if (n === 0) {
    if (ctx.role === 'staff') {
      step = 'staff_menu';
      if (!ctx.staffSchool && identity.staffSchools.length === 1) {
        ctx.staffSchool = identity.staffSchools[0];
      }
    } else if (ctx.role === 'parent') {
      step = 'parent_menu';
      if (ctx.parentSchoolIndex == null && identity.parentSchools.length === 1) {
        ctx.parentSchoolIndex = 0;
      }
    } else {
      step = 'entry';
    }
  }

  const out: OutboundMsg[] = [];

  async function persist() {
    await saveSession(client, waE164, step, ctx);
  }

  if (n === 0 && step === 'parent_menu') {
    const g = parentGroupFromSession(identity, ctx);
    if (g) {
      out.push({
        type: 'text',
        text: parentMenuTextWithAnother(g, identity.parentSchools.length > 1),
      });
      await persist();
      return out;
    }
  }
  if (n === 0 && step === 'staff_menu') {
    const sc = staffContextFromSession(ctx);
    if (sc) {
      out.push({ type: 'text', text: staffMenuText(sc) });
      await persist();
      return out;
    }
  }

  if (step === 'entry' || step === '') {
    if (identity.hasParent && identity.hasStaff) {
      step = 'role_pick';
      out.push({
        type: 'text',
        text: `Hi! You're on file as both a parent and staff.\n\n1 — Parent (fees, reports, attendance)\n2 — Staff (attendance, receipt lookup)${footer()}`,
      });
      await persist();
      return out;
    }
    if (identity.hasParent) {
      ctx.role = 'parent';
      if (identity.parentSchools.length > 1) {
        step = 'parent_pick_school';
        const lines = identity.parentSchools.map((s, i) => `${i + 1} — ${s.school_name}`).join('\n');
        out.push({ type: 'text', text: `Select school:\n${lines}${footer()}` });
      } else {
        ctx.parentSchoolIndex = 0;
        step = 'parent_menu';
        out.push({
          type: 'text',
          text: parentMenuTextWithAnother(parentGroupFromSession(identity, ctx)!, identity.parentSchools.length > 1),
        });
      }
      await persist();
      return out;
    }
    ctx.role = 'staff';
    if (identity.staffSchools.length > 1) {
      step = 'staff_pick_school';
      const lines = identity.staffSchools.map((s, i) => `${i + 1} — ${s.school_name}`).join('\n');
      out.push({ type: 'text', text: `Select school:\n${lines}${footer()}` });
    } else {
      ctx.staffSchool = identity.staffSchools[0];
      step = 'staff_menu';
      out.push({ type: 'text', text: staffMenuText(identity.staffSchools[0]) });
    }
    await persist();
    return out;
  }

  if (step === 'role_pick' && n !== null) {
    if (n === 1) {
      ctx.role = 'parent';
      if (identity.parentSchools.length > 1) {
        step = 'parent_pick_school';
        const lines = identity.parentSchools.map((s, i) => `${i + 1} — ${s.school_name}`).join('\n');
        out.push({ type: 'text', text: `Select school:\n${lines}${footer()}` });
      } else {
        ctx.parentSchoolIndex = 0;
        step = 'parent_menu';
        out.push({
          type: 'text',
          text: parentMenuTextWithAnother(identity.parentSchools[0]!, identity.parentSchools.length > 1),
        });
      }
    } else if (n === 2) {
      ctx.role = 'staff';
      if (identity.staffSchools.length > 1) {
        step = 'staff_pick_school';
        const lines = identity.staffSchools.map((s, i) => `${i + 1} — ${s.school_name}`).join('\n');
        out.push({ type: 'text', text: `Select school:\n${lines}${footer()}` });
      } else {
        ctx.staffSchool = identity.staffSchools[0];
        step = 'staff_menu';
        out.push({ type: 'text', text: staffMenuText(identity.staffSchools[0]) });
      }
    } else {
      out.push({ type: 'text', text: `Reply 1 or 2.${footer()}` });
    }
    await persist();
    return out;
  }

  if (step === 'parent_pick_school' && n !== null) {
    const g = identity.parentSchools[n - 1];
    if (!g) {
      out.push({ type: 'text', text: `Invalid option.${footer()}` });
      await persist();
      return out;
    }
    ctx.parentSchoolIndex = n - 1;
    step = 'parent_menu';
    out.push({ type: 'text', text: parentMenuTextWithAnother(g, identity.parentSchools.length > 1) });
    await persist();
    return out;
  }

  if (step === 'parent_menu' && n !== null) {
    const g = parentGroupFromSession(identity, ctx);
    if (!g) {
      step = 'entry';
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    const schoolId = g.school_id;
    if (n === 4 && identity.parentSchools.length > 1) {
      step = 'parent_pick_school';
      const lines = identity.parentSchools.map((s, i) => `${i + 1} — ${s.school_name}`).join('\n');
      out.push({ type: 'text', text: `Select school:\n${lines}${footer()}` });
      await persist();
      return out;
    }
    if (n === 1) {
      ctx.pendingAction = 'balance';
      if (g.students.length > 1) {
        step = 'parent_pick_child';
        out.push({ type: 'text', text: childPickerText(g) });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        const msg = await getParentFeeSummary(client, schoolId, ctx.student_id as string);
        out.push({ type: 'text', text: `${msg}${footer()}` });
        step = 'parent_menu';
      }
      await persist();
      return out;
    }
    if (n === 2) {
      ctx.pendingAction = 'report';
      if (g.students.length > 1) {
        step = 'parent_pick_child';
        out.push({ type: 'text', text: childPickerText(g) });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        const r = await getLatestReportPdfForStudent(client, schoolId, ctx.student_id as string);
        if (r.url) {
          out.push({ type: 'text', text: `Sending: ${r.label}${footer()}` });
          out.push({ type: 'document', url: r.url, fileName: 'report-card.pdf', caption: r.label });
        } else {
          out.push({ type: 'text', text: `${r.label}${footer()}` });
        }
        step = 'parent_menu';
      }
      await persist();
      return out;
    }
    if (n === 3) {
      ctx.pendingAction = 'attendance';
      if (g.students.length > 1) {
        step = 'parent_pick_child';
        out.push({ type: 'text', text: childPickerText(g) });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        step = 'parent_attendance_sub';
        out.push({
          type: 'text',
          text: `Attendance — choose:\n1 — Today\n2 — This week (Mon–Sun)\n3 — Specific date (DD-MM-YYYY)${footer()}`,
        });
      }
      await persist();
      return out;
    }
    out.push({ type: 'text', text: `Use a menu option.${footer()}` });
    await persist();
    return out;
  }

  if (step === 'parent_pick_child' && n !== null) {
    const g = parentGroupFromSession(identity, ctx);
    if (!g) {
      step = 'entry';
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    const child = g.students[n - 1];
    if (!child) {
      out.push({ type: 'text', text: `Invalid option.${footer()}` });
      await persist();
      return out;
    }
    ctx.student_id = child.student_id;
    const schoolId = g.school_id;
    const action = ctx.pendingAction as string;
    if (action === 'balance') {
      const msg = await getParentFeeSummary(client, schoolId, child.student_id);
      out.push({ type: 'text', text: `${msg}${footer()}` });
      step = 'parent_menu';
    } else if (action === 'report') {
      const r = await getLatestReportPdfForStudent(client, schoolId, child.student_id);
      if (r.url) {
        out.push({ type: 'text', text: `Sending: ${r.label}${footer()}` });
        out.push({ type: 'document', url: r.url, fileName: 'report-card.pdf', caption: r.label });
      } else {
        out.push({ type: 'text', text: `${r.label}${footer()}` });
      }
      step = 'parent_menu';
    } else if (action === 'attendance') {
      step = 'parent_attendance_sub';
      out.push({
        type: 'text',
        text: `Attendance for ${child.name} — choose:\n1 — Today\n2 — This week (Mon–Sun)\n3 — Specific date (DD-MM-YYYY)${footer()}`,
      });
    }
    await persist();
    return out;
  }

  if (step === 'parent_attendance_sub' && n !== null) {
    const g = parentGroupFromSession(identity, ctx);
    const sid = ctx.student_id as string;
    if (!g || !sid) {
      step = 'parent_menu';
      await persist();
      return processInboundMessage(client, waDigits, waE164, '0');
    }
    if (n === 1) {
      const msg = await getParentAttendanceSummary(client, g.school_id, sid, 'today');
      out.push({ type: 'text', text: `${msg}${footer()}` });
      step = 'parent_menu';
    } else if (n === 2) {
      const msg = await getParentAttendanceSummary(client, g.school_id, sid, 'week');
      out.push({ type: 'text', text: `${msg}${footer()}` });
      step = 'parent_menu';
    } else if (n === 3) {
      step = 'parent_await_date';
      out.push({ type: 'text', text: 'Send date as DD-MM-YYYY' + footer() });
    } else {
      out.push({ type: 'text', text: `1, 2, or 3.${footer()}` });
    }
    await persist();
    return out;
  }

  if (step === 'parent_await_date') {
    const g = parentGroupFromSession(identity, ctx);
    const sid = ctx.student_id as string;
    const d = parseDdMmYyyy(text);
    if (!g || !sid || !d) {
      out.push({ type: 'text', text: 'Invalid date. Use DD-MM-YYYY' + footer() });
      await persist();
      return out;
    }
    const msg = await getParentAttendanceSummary(client, g.school_id, sid, 'date', d);
    out.push({ type: 'text', text: `${msg}${footer()}` });
    step = 'parent_menu';
    await persist();
    return out;
  }

  if (step === 'staff_pick_school' && n !== null) {
    const s = identity.staffSchools[n - 1];
    if (!s) {
      out.push({ type: 'text', text: `Invalid option.${footer()}` });
      await persist();
      return out;
    }
    ctx.staffSchool = s;
    step = 'staff_menu';
    out.push({ type: 'text', text: staffMenuText(s) });
    await persist();
    return out;
  }

  if (step === 'staff_menu' && n !== null) {
    const sc = staffContextFromSession(ctx);
    if (!sc) {
      step = 'entry';
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    if (n === 1) {
      const scope = attendanceScopeForStaff(sc);
      const dateIso = todayIso();
      const stats = await getStaffAttendanceStats(client, sc.school_id, dateIso, scope.kind, scope.classes);
      out.push({
        type: 'text',
        text: `${formatStats(`Today (${dateIso})`, stats)}${footer()}`,
      });
      await persist();
      return out;
    }
    if (n === 2) {
      ctx.staffDateMode = 'stats';
      step = 'staff_await_date';
      out.push({ type: 'text', text: 'Send date as DD-MM-YYYY' + footer() });
      await persist();
      return out;
    }
    if (n === 3) {
      ctx.staffDateMode = 'missed';
      step = 'staff_await_date';
      out.push({ type: 'text', text: 'Send date for absent list (DD-MM-YYYY)' + footer() });
      await persist();
      return out;
    }
    if (n === 4 && sc.canVerifyReceipts) {
      step = 'staff_await_receipt';
      out.push({ type: 'text', text: 'Send the receipt number or payment ID.' + footer() });
      await persist();
      return out;
    }
    out.push({ type: 'text', text: `Use a menu option.${footer()}` });
    await persist();
    return out;
  }

  if (step === 'staff_await_date') {
    const sc = staffContextFromSession(ctx);
    const d = parseDdMmYyyy(text);
    if (!sc || !d) {
      out.push({ type: 'text', text: 'Invalid date. Use DD-MM-YYYY' + footer() });
      await persist();
      return out;
    }
    const scope = attendanceScopeForStaff(sc);
    const stats = await getStaffAttendanceStats(client, sc.school_id, d, scope.kind, scope.classes);
    const mode = ctx.staffDateMode as string;
    if (mode === 'missed' && stats.absentNames.length > 0) {
      const names =
        stats.absentNames.length > 25
          ? stats.absentNames.slice(0, 25).join(', ') + ` … (+${stats.absentNames.length - 25} more)`
          : stats.absentNames.join(', ');
      out.push({
        type: 'text',
        text: `Absent on ${d} (${stats.absent}): ${names}${footer()}`,
      });
    } else {
      out.push({ type: 'text', text: formatStats(d, stats) + footer() });
    }
    step = 'staff_menu';
    await persist();
    return out;
  }

  if (step === 'staff_await_receipt') {
    const sc = staffContextFromSession(ctx);
    if (!sc) {
      step = 'entry';
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    const msg = await verifyReceiptByRef(client, sc.school_id, text);
    out.push({
      type: 'text',
      text: (msg || 'No receipt matching that reference for this school.') + footer(),
    });
    step = 'staff_menu';
    await persist();
    return out;
  }

  out.push({ type: 'text', text: `Reply with a number from the menu.${footer()}` });
  await persist();
  return out;
}

function parentMenuTextWithAnother(g: ParentSchoolGroup, showAnother: boolean) {
  let t =
    `${g.school_name} — Parent menu\n\n` +
    `1 — Fee balance\n` +
    `2 — Report card (latest PDF)\n` +
    `3 — Attendance\n`;
  if (showAnother) t += `4 — Another school\n`;
  t += footer();
  return t;
}

function childPickerText(g: ParentSchoolGroup) {
  const lines = g.students.map((s, i) => `${i + 1} — ${s.name} (${s.current_class || '—'})`).join('\n');
  return `Choose child:\n${lines}${footer()}`;
}

function staffMenuText(s: StaffSchoolContext) {
  let t =
    `${s.school_name} — Staff menu\n\n` +
    `1 — Attendance today\n` +
    `2 — Attendance on a date\n` +
    `3 — Who was absent (names)\n`;
  if (s.canVerifyReceipts) t += `4 — Verify receipt\n`;
  t += footer();
  return t;
}

function attendanceScopeForStaff(sc: StaffSchoolContext): { kind: AttendanceScope; classes: string[] | null } {
  const role = sc.role;
  if (role && roleCanViewBroadAttendance(role)) {
    return { kind: 'whole_school', classes: null };
  }
  if (sc.teacher_classes.length > 0) {
    return { kind: 'classes', classes: sc.teacher_classes };
  }
  return { kind: 'whole_school', classes: null };
}

function formatStats(label: string, stats: { present: number; absent: number; absentNames: string[] }) {
  return `${label}\nPresent: ${stats.present}\nAbsent: ${stats.absent}`;
}
