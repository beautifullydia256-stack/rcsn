import type { SupabaseClient } from '@supabase/supabase-js';
import {
  defaultMessageFormatter,
  type WhatsappFormatPayload,
} from '../ai/whatsappStructuredPayload';
import type { ParentSchoolGroup, ResolvedIdentity, StaffSchoolContext } from './resolveIdentity';
import { resolveIdentity, roleCanViewBroadAttendance } from './resolveIdentity';
import {
  getLatestReportPdfForStudent,
  getParentAttendanceSummary,
  getParentFeeBalanceMetrics,
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

function selectSchoolPayload(schools: { school_name: string }[]): WhatsappFormatPayload {
  return {
    intent: 'select_school',
    role: 'system',
    schools: schools.map((s, i) => ({ index: i + 1, name: s.school_name })),
  };
}

function resolveGreetingName(identity: ResolvedIdentity, ctx: Record<string, unknown>): string | null {
  const role = ctx.role as string | undefined;
  if (role === 'staff') return identity.greetingNameStaff ?? identity.greetingNameParent;
  if (role === 'parent') return identity.greetingNameParent ?? identity.greetingNameStaff;
  return identity.greetingNameParent ?? identity.greetingNameStaff ?? null;
}

/** Full menu / picker for this session — used instead of generic "reply with a number". */
function mainMenuPayloadForState(
  identity: ResolvedIdentity,
  ctx: Record<string, unknown>,
  step: string
): WhatsappFormatPayload | null {
  if (step === 'role_pick') return { intent: 'role_pick' };

  if (step === 'parent_pick_school') {
    return selectSchoolPayload(identity.parentSchools);
  }
  if (step === 'staff_pick_school') {
    return selectSchoolPayload(identity.staffSchools);
  }

  if (step === 'parent_pick_child') {
    const g = parentGroupFromSession(identity, ctx);
    if (g?.students?.length) {
      return {
        intent: 'child_picker',
        school_name: g.school_name,
        children: g.students.map((s, i) => ({
          index: i + 1,
          name: s.name,
          class_name: s.current_class || '—',
        })),
      };
    }
  }

  if (ctx.role === 'parent' || step.startsWith('parent_')) {
    const g = parentGroupFromSession(identity, ctx);
    if (g) {
      return {
        intent: 'parent_menu',
        school_name: g.school_name,
        show_another_school: identity.parentSchools.length > 1,
      };
    }
  }

  if (ctx.role === 'staff' || step.startsWith('staff_')) {
    const sc = staffContextFromSession(ctx);
    if (sc) {
      return {
        intent: 'staff_menu',
        school_name: sc.school_name,
        can_verify_receipts: sc.canVerifyReceipts,
      };
    }
  }

  if (identity.hasParent && identity.hasStaff) {
    return { intent: 'role_pick' };
  }
  if (identity.hasParent && identity.parentSchools[0]) {
    const g = identity.parentSchools[0];
    return {
      intent: 'parent_menu',
      school_name: g.school_name,
      show_another_school: identity.parentSchools.length > 1,
    };
  }
  if (identity.hasStaff && identity.staffSchools[0]) {
    const s = identity.staffSchools[0];
    return {
      intent: 'staff_menu',
      school_name: s.school_name,
      can_verify_receipts: s.canVerifyReceipts,
    };
  }
  return null;
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
    return [{ type: 'text', text: defaultMessageFormatter({ intent: 'unregistered' }) }];
  }

  let { step, context: ctx } = await loadSession(client, waE164);
  const n = parseIntMenu(text);

  if (n === 9 || text.toLowerCase() === 'start over') {
    await clearSession(client, waE164);
    return processInboundMessage(client, waDigits, waE164, '0');
  }

  const greet = resolveGreetingName(identity, ctx);
  const out: OutboundMsg[] = [];
  function fmt(p: WhatsappFormatPayload) {
    out.push({ type: 'text', text: defaultMessageFormatter(p, { greetingName: greet }) });
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

  async function persist() {
    await saveSession(client, waE164, step, ctx);
  }

  if (n === 0 && step === 'parent_menu') {
    const g = parentGroupFromSession(identity, ctx);
    if (g) {
      fmt({
        intent: 'parent_menu',
        school_name: g.school_name,
        show_another_school: identity.parentSchools.length > 1,
      });
      await persist();
      return out;
    }
  }
  if (n === 0 && step === 'staff_menu') {
    const sc = staffContextFromSession(ctx);
    if (sc) {
      fmt({
        intent: 'staff_menu',
        school_name: sc.school_name,
        can_verify_receipts: sc.canVerifyReceipts,
      });
      await persist();
      return out;
    }
  }

  if (step === 'entry' || step === '') {
    if (identity.hasParent && identity.hasStaff) {
      step = 'role_pick';
      fmt( { intent: 'role_pick' });
      await persist();
      return out;
    }
    if (identity.hasParent) {
      ctx.role = 'parent';
      if (identity.parentSchools.length > 1) {
        step = 'parent_pick_school';
        fmt( selectSchoolPayload(identity.parentSchools));
      } else {
        ctx.parentSchoolIndex = 0;
        step = 'parent_menu';
        const g = parentGroupFromSession(identity, ctx)!;
        fmt( {
          intent: 'parent_menu',
          school_name: g.school_name,
          show_another_school: identity.parentSchools.length > 1,
        });
      }
      await persist();
      return out;
    }
    ctx.role = 'staff';
    if (identity.staffSchools.length > 1) {
      step = 'staff_pick_school';
      fmt( selectSchoolPayload(identity.staffSchools));
    } else {
      ctx.staffSchool = identity.staffSchools[0];
      step = 'staff_menu';
      fmt( {
        intent: 'staff_menu',
        school_name: identity.staffSchools[0].school_name,
        can_verify_receipts: identity.staffSchools[0].canVerifyReceipts,
      });
    }
    await persist();
    return out;
  }

  if (step === 'role_pick' && n !== null) {
    if (n === 1) {
      ctx.role = 'parent';
      if (identity.parentSchools.length > 1) {
        step = 'parent_pick_school';
        fmt( selectSchoolPayload(identity.parentSchools));
      } else {
        ctx.parentSchoolIndex = 0;
        step = 'parent_menu';
        fmt( {
          intent: 'parent_menu',
          school_name: identity.parentSchools[0]!.school_name,
          show_another_school: identity.parentSchools.length > 1,
        });
      }
    } else if (n === 2) {
      ctx.role = 'staff';
      if (identity.staffSchools.length > 1) {
        step = 'staff_pick_school';
        fmt( selectSchoolPayload(identity.staffSchools));
      } else {
        ctx.staffSchool = identity.staffSchools[0];
        step = 'staff_menu';
        fmt( {
          intent: 'staff_menu',
          school_name: identity.staffSchools[0]!.school_name,
          can_verify_receipts: identity.staffSchools[0]!.canVerifyReceipts,
        });
      }
    } else {
      fmt( { intent: 'prompt_pick_1_or_2' });
    }
    await persist();
    return out;
  }

  if (step === 'parent_pick_school' && n !== null) {
    const g = identity.parentSchools[n - 1];
    if (!g) {
      fmt( { intent: 'invalid_option' });
      await persist();
      return out;
    }
    ctx.parentSchoolIndex = n - 1;
    step = 'parent_menu';
    fmt( {
      intent: 'parent_menu',
      school_name: g.school_name,
      show_another_school: identity.parentSchools.length > 1,
    });
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
      fmt( selectSchoolPayload(identity.parentSchools));
      await persist();
      return out;
    }
    if (n === 1) {
      ctx.pendingAction = 'balance';
      if (g.students.length > 1) {
        step = 'parent_pick_child';
        fmt( {
          intent: 'child_picker',
          school_name: g.school_name,
          children: g.students.map((s, i) => ({
            index: i + 1,
            name: s.name,
            class_name: s.current_class || '—',
          })),
        });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        const st = g.students[0]!;
        const metrics = await getParentFeeBalanceMetrics(client, schoolId, ctx.student_id as string);
        fmt( {
          intent: 'fee_balance',
          role: 'parent',
          school_name: g.school_name,
          student_name: st.name,
          total_fees: metrics.total_fees,
          paid: metrics.paid,
          outstanding: metrics.outstanding,
          currency: 'UGX',
        });
        step = 'parent_menu';
      }
      await persist();
      return out;
    }
    if (n === 2) {
      ctx.pendingAction = 'report';
      if (g.students.length > 1) {
        step = 'parent_pick_child';
        fmt( {
          intent: 'child_picker',
          school_name: g.school_name,
          children: g.students.map((s, i) => ({
            index: i + 1,
            name: s.name,
            class_name: s.current_class || '—',
          })),
        });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        const r = await getLatestReportPdfForStudent(client, schoolId, ctx.student_id as string);
        if (r.url) {
          fmt( { intent: 'report_sending', label: r.label });
          out.push({ type: 'document', url: r.url, fileName: 'report-card.pdf', caption: r.label });
        } else {
          fmt( { intent: 'report_unavailable', label: r.label });
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
        fmt( {
          intent: 'child_picker',
          school_name: g.school_name,
          children: g.students.map((s, i) => ({
            index: i + 1,
            name: s.name,
            class_name: s.current_class || '—',
          })),
        });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        step = 'parent_attendance_sub';
        fmt( { intent: 'attendance_submenu', student_name: null });
      }
      await persist();
      return out;
    }
    {
      const menu = mainMenuPayloadForState(identity, ctx, step);
      if (menu) fmt(menu);
      else fmt({ intent: 'reply_menu_number' });
    }
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
      fmt( { intent: 'invalid_option' });
      await persist();
      return out;
    }
    ctx.student_id = child.student_id;
    const schoolId = g.school_id;
    const action = ctx.pendingAction as string;
    if (action === 'balance') {
      const metrics = await getParentFeeBalanceMetrics(client, schoolId, child.student_id);
      fmt( {
        intent: 'fee_balance',
        role: 'parent',
        school_name: g.school_name,
        student_name: child.name,
        total_fees: metrics.total_fees,
        paid: metrics.paid,
        outstanding: metrics.outstanding,
        currency: 'UGX',
      });
      step = 'parent_menu';
    } else if (action === 'report') {
      const r = await getLatestReportPdfForStudent(client, schoolId, child.student_id);
      if (r.url) {
        fmt( { intent: 'report_sending', label: r.label });
        out.push({ type: 'document', url: r.url, fileName: 'report-card.pdf', caption: r.label });
      } else {
        fmt( { intent: 'report_unavailable', label: r.label });
      }
      step = 'parent_menu';
    } else if (action === 'attendance') {
      step = 'parent_attendance_sub';
      fmt( { intent: 'attendance_submenu', student_name: child.name });
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
    const stName = g.students.find((s) => s.student_id === sid)?.name || 'Student';
    if (n === 1) {
      const msg = await getParentAttendanceSummary(client, g.school_id, sid, 'today');
      fmt( {
        intent: 'attendance_summary',
        role: 'parent',
        student_name: stName,
        body: msg,
      });
      step = 'parent_menu';
    } else if (n === 2) {
      const msg = await getParentAttendanceSummary(client, g.school_id, sid, 'week');
      fmt( {
        intent: 'attendance_summary',
        role: 'parent',
        student_name: stName,
        body: msg,
      });
      step = 'parent_menu';
    } else if (n === 3) {
      step = 'parent_await_date';
      fmt( { intent: 'prompt_date_generic' });
    } else {
      fmt( { intent: 'prompt_pick_1_2_3' });
    }
    await persist();
    return out;
  }

  if (step === 'parent_await_date') {
    const g = parentGroupFromSession(identity, ctx);
    const sid = ctx.student_id as string;
    const d = parseDdMmYyyy(text);
    if (!g || !sid || !d) {
      fmt( { intent: 'invalid_date' });
      await persist();
      return out;
    }
    const stName = g.students.find((s) => s.student_id === sid)?.name || 'Student';
    const msg = await getParentAttendanceSummary(client, g.school_id, sid, 'date', d);
    fmt( {
      intent: 'attendance_summary',
      role: 'parent',
      student_name: stName,
      body: msg,
    });
    step = 'parent_menu';
    await persist();
    return out;
  }

  if (step === 'staff_pick_school' && n !== null) {
    const s = identity.staffSchools[n - 1];
    if (!s) {
      fmt( { intent: 'invalid_option' });
      await persist();
      return out;
    }
    ctx.staffSchool = s;
    step = 'staff_menu';
    fmt( {
      intent: 'staff_menu',
      school_name: s.school_name,
      can_verify_receipts: s.canVerifyReceipts,
    });
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
      fmt( {
        intent: 'staff_attendance_stats',
        role: 'staff',
        school_name: sc.school_name,
        date_label: `Today (${dateIso})`,
        present: stats.present,
        absent: stats.absent,
      });
      await persist();
      return out;
    }
    if (n === 2) {
      ctx.staffDateMode = 'stats';
      step = 'staff_await_date';
      fmt( { intent: 'prompt_date_generic' });
      await persist();
      return out;
    }
    if (n === 3) {
      ctx.staffDateMode = 'missed';
      step = 'staff_await_date';
      fmt( { intent: 'prompt_date_absent' });
      await persist();
      return out;
    }
    if (n === 4 && sc.canVerifyReceipts) {
      step = 'staff_await_receipt';
      fmt( { intent: 'prompt_receipt_ref' });
      await persist();
      return out;
    }
    {
      const menu = mainMenuPayloadForState(identity, ctx, step);
      if (menu) fmt(menu);
      else fmt({ intent: 'reply_menu_number' });
    }
    await persist();
    return out;
  }

  if (step === 'staff_await_date') {
    const sc = staffContextFromSession(ctx);
    const d = parseDdMmYyyy(text);
    if (!sc || !d) {
      fmt( { intent: 'invalid_date' });
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
      fmt( {
        intent: 'staff_absent_list',
        role: 'staff',
        date_iso: d,
        absent_count: stats.absent,
        names_text: names,
      });
    } else {
      fmt( {
        intent: 'staff_attendance_stats',
        role: 'staff',
        school_name: sc.school_name,
        date_label: d,
        present: stats.present,
        absent: stats.absent,
      });
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
    fmt( {
      intent: 'receipt_lookup',
      role: 'staff',
      body: msg || 'No receipt matching that reference for this school.',
    });
    step = 'staff_menu';
    await persist();
    return out;
  }

  {
    const menu = mainMenuPayloadForState(identity, ctx, step);
    if (menu) fmt(menu);
    else fmt({ intent: 'reply_menu_number' });
  }
  await persist();
  return out;
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
