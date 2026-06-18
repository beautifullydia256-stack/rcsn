import type { SupabaseClient } from '@supabase/supabase-js';
import {
  defaultMessageFormatter,
  type WhatsappFormatPayload,
} from '../ai/whatsappStructuredPayload';
import type { ParentSchoolGroup, ResolvedIdentity, StaffSchoolContext } from './resolveIdentity';
import { resolveIdentity, roleCanViewBroadAttendance } from './resolveIdentity';
import {
  formatTimetableRowsForWhatsapp,
  getAttendanceBreakdownByClasses,
  getDistinctActiveClassNames,
  getLatestReportPdfForStudent,
  getParentAttendanceSummary,
  getParentFeeBalanceMetrics,
  getRecentInAppNotificationsForUser,
  getStaffAttendanceStats,
  getStudentPaymentHistory,
  getStudentTermFeeSummary,
  getAllChildrenBalances,
  getStudentsInClass,
  getSchoolFinanceSummary,
  getTeacherTimetableRows,
  timetableDayIndexFromDate,
  timetableDayLabel,
  verifyReceiptByRef,
  getStudentsSummaryByClass,
  getClassesWithOutstandingCounts,
  getStudentsWithOutstandingInClass,
  getSchoolStaffList,
  getVisitorLogForRange,
  type AttendanceScope,
} from './queries';
import { clearSession, loadSession, saveSession } from './sessionStore';
import { toUgandaE164FromDigits } from './normalizePhone';
import { schoolCalendarTodayIso } from '../schoolCalendarDate';

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
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function todayIso() {
  return schoolCalendarTodayIso();
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
        show_all_balances: g.students.length > 1,
        show_another_school: identity.parentSchools.length > 1,
      };
    }
  }

  if (ctx.role === 'staff' || step.startsWith('staff_') || step.startsWith('sec_')) {
    const sc = staffContextFromSession(ctx);
    if (sc) {
      return {
        intent: 'staff_menu',
        school_name: sc.school_name,
        can_verify_receipts: sc.canVerifyReceipts,
        can_view_school_summary: sc.canVerifyReceipts,
        is_secretary: sc.isSecretary,
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
      show_all_balances: g.students.length > 1,
      show_another_school: identity.parentSchools.length > 1,
    };
  }
  if (identity.hasStaff && identity.staffSchools[0]) {
    const s = identity.staffSchools[0];
    return {
      intent: 'staff_menu',
      school_name: s.school_name,
      can_verify_receipts: s.canVerifyReceipts,
      can_view_school_summary: s.canVerifyReceipts,
      is_secretary: s.isSecretary,
    };
  }
  return null;
}

function clearStaffSubflowContext(ctx: Record<string, unknown>): void {
  delete ctx.staffAttendanceByClassCache;
  delete ctx.staffAttendanceDetailDate;
  delete ctx.secClassList;
  delete ctx.secBalanceClassList;
}

function clearParentSubflowContext(ctx: Record<string, unknown>): void {
  delete ctx.student_id;
  delete ctx.pendingAction;
}

/**
 * When we render staff/parent home menus, align session step and drop subflow keys so the next
 * digit (1–6) applies to the menu, not a stale attendance picker or child list.
 */
function reconcileStepWithHomeMenuPayload(
  menu: WhatsappFormatPayload | null,
  ctx: Record<string, unknown>,
  currentStep: string
): string {
  if (!menu) return currentStep;
  if (menu.intent === 'staff_menu') {
    clearStaffSubflowContext(ctx);
    return 'staff_menu';
  }
  if (menu.intent === 'parent_menu') {
    clearParentSubflowContext(ctx);
    return 'parent_menu';
  }
  return currentStep;
}

type DirectAction = 'menu' | 'fees' | 'report' | 'attendance' | 'schedule' | 'classes' | 'receipt' | 'summary';

function directActionFromKeyword(text: string): DirectAction | null {
  const t = text.toLowerCase().trim();
  if (!t || t.length > 64) return null;
  if (/^(hi|hello|hey)\b/.test(t) || /^good\s+(morning|afternoon|evening)\b/i.test(t)) return 'menu';
  if (t === 'menu' || t === 'home' || t === 'main menu' || t === 'mainmenu' || t === 'help' || t === 'start') return 'menu';
  if (/\b(fees?|balance|payment|pay)\b/.test(t)) return 'fees';
  if (/\b(report|results?)\b/.test(t)) return 'report';
  if (/\b(attend|attendance|present|absent)\b/.test(t)) return 'attendance';
  if (/\b(schedule|timetable)\b/.test(t)) return 'schedule';
  if (/\bclass(es)?\b/.test(t)) return 'classes';
  if (/\b(receipt|verify)\b/.test(t)) return 'receipt';
  if (/\b(summary|finance|revenue|overview)\b/.test(t)) return 'summary';
  return null;
}

function wantsSoftMenuReset(text: string): boolean {
  return directActionFromKeyword(text) === 'menu';
}

const MAX_ATTENDANCE_CLASSES_WHATSAPP = 15;

async function classNamesForMyClassesList(
  client: SupabaseClient,
  sc: StaffSchoolContext
): Promise<string[]> {
  if (sc.teacher_classes.length > 0) {
    return [...sc.teacher_classes].sort((a, b) => a.localeCompare(b));
  }
  if (sc.role && roleCanViewBroadAttendance(sc.role)) {
    const all = await getDistinctActiveClassNames(client, sc.school_id);
    return all.slice(0, 25);
  }
  return [];
}

async function classNamesForAttendanceByClass(
  client: SupabaseClient,
  sc: StaffSchoolContext
): Promise<string[]> {
  if (sc.teacher_classes.length > 0) {
    return [...sc.teacher_classes].sort((a, b) => a.localeCompare(b)).slice(0, MAX_ATTENDANCE_CLASSES_WHATSAPP);
  }
  if (sc.role && roleCanViewBroadAttendance(sc.role)) {
    const all = await getDistinctActiveClassNames(client, sc.school_id);
    return all.slice(0, MAX_ATTENDANCE_CLASSES_WHATSAPP);
  }
  return [];
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
    return [];
  }

  let { step, context: ctx } = await loadSession(client, waE164);
  const n = parseIntMenu(text);

  /** One action: clear stuck state and reopen the main entry flow (role / school / menu). */
  if (n === 0 || n === 9 || text.toLowerCase() === 'start over') {
    await clearSession(client, waE164);
    return processInboundMessage(client, waDigits, waE164, '');
  }

  // Only respond at entry when the message matches a known keyword.
  const entryAction = (step === '' || step === 'entry') ? directActionFromKeyword(text) : null;
  if ((step === '' || step === 'entry') && !entryAction) {
    return [];
  }

  const greet = resolveGreetingName(identity, ctx);
  const out: OutboundMsg[] = [];
  function fmt(p: WhatsappFormatPayload) {
    out.push({ type: 'text', text: defaultMessageFormatter(p, { greetingName: greet }) });
  }

  async function persist() {
    await saveSession(client, waE164, step, ctx);
  }

  // Mid-conversation: keyword "menu"/"hi"/"hello" resets to home menu.
  if (wantsSoftMenuReset(text) && step !== '' && step !== 'entry') {
    const canStaff = ctx.role === 'staff' && staffContextFromSession(ctx);
    const canParent = ctx.role === 'parent' && parentGroupFromSession(identity, ctx);
    if (canStaff || canParent) {
      if (canStaff) {
        clearStaffSubflowContext(ctx);
        step = 'staff_menu';
        const sc = staffContextFromSession(ctx)!;
        fmt({
          intent: 'staff_menu',
          school_name: sc.school_name,
          can_verify_receipts: sc.canVerifyReceipts,
          can_view_school_summary: sc.canVerifyReceipts,
          is_secretary: sc.isSecretary,
        });
      } else {
        clearParentSubflowContext(ctx);
        step = 'parent_menu';
        const g = parentGroupFromSession(identity, ctx)!;
        fmt({
          intent: 'parent_menu',
          school_name: g.school_name,
          show_all_balances: g.students.length > 1,
          show_another_school: identity.parentSchools.length > 1,
        });
      }
      await persist();
      return out;
    }
  }

  if (step === 'entry' || step === '') {
    // Keyword-based role auto-routing for users who are both parent and staff.
    const parentKeywords: DirectAction[] = ['fees', 'report', 'attendance'];
    const staffKeywords: DirectAction[] = ['schedule', 'classes', 'receipt', 'summary'];
    let forcedRole: 'parent' | 'staff' | null = null;
    if (identity.hasParent && identity.hasStaff && entryAction && entryAction !== 'menu') {
      if (parentKeywords.includes(entryAction)) forcedRole = 'parent';
      else if (staffKeywords.includes(entryAction)) forcedRole = 'staff';
    }

    if (identity.hasParent && identity.hasStaff && !forcedRole) {
      step = 'role_pick';
      fmt({ intent: 'role_pick' });
      await persist();
      return out;
    }

    const useParent = forcedRole === 'parent' || (!forcedRole && identity.hasParent);
    if (useParent) {
      ctx.role = 'parent';
      if (identity.parentSchools.length > 1) {
        step = 'parent_pick_school';
        fmt(selectSchoolPayload(identity.parentSchools));
      } else {
        ctx.parentSchoolIndex = 0;
        step = 'parent_menu';
        const g = parentGroupFromSession(identity, ctx)!;
        fmt({
          intent: 'parent_menu',
          school_name: g.school_name,
          show_all_balances: g.students.length > 1,
          show_another_school: false,
        });
      }
      await persist();
      return out;
    }

    ctx.role = 'staff';
    if (identity.staffSchools.length > 1) {
      step = 'staff_pick_school';
      fmt(selectSchoolPayload(identity.staffSchools));
    } else {
      ctx.staffSchool = identity.staffSchools[0];
      step = 'staff_menu';
      const sc = identity.staffSchools[0]!;
      fmt({
        intent: 'staff_menu',
        school_name: sc.school_name,
        can_verify_receipts: sc.canVerifyReceipts,
        can_view_school_summary: sc.canVerifyReceipts,
        is_secretary: sc.isSecretary,
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
        fmt(selectSchoolPayload(identity.parentSchools));
      } else {
        ctx.parentSchoolIndex = 0;
        step = 'parent_menu';
        const g0 = identity.parentSchools[0]!;
        fmt({
          intent: 'parent_menu',
          school_name: g0.school_name,
          show_all_balances: g0.students.length > 1,
          show_another_school: false,
        });
      }
    } else if (n === 2) {
      ctx.role = 'staff';
      if (identity.staffSchools.length > 1) {
        step = 'staff_pick_school';
        fmt(selectSchoolPayload(identity.staffSchools));
      } else {
        ctx.staffSchool = identity.staffSchools[0];
        step = 'staff_menu';
        const sc0 = identity.staffSchools[0]!;
        fmt({
          intent: 'staff_menu',
          school_name: sc0.school_name,
          can_verify_receipts: sc0.canVerifyReceipts,
          can_view_school_summary: sc0.canVerifyReceipts,
          is_secretary: sc0.isSecretary,
        });
      }
    } else {
      fmt({ intent: 'prompt_pick_1_or_2' });
    }
    await persist();
    return out;
  }

  if (step === 'parent_pick_school' && n !== null) {
    const g = identity.parentSchools[n - 1];
    if (!g) {
      fmt({ intent: 'invalid_option' });
      await persist();
      return out;
    }
    ctx.parentSchoolIndex = n - 1;
    step = 'parent_menu';
    fmt({
      intent: 'parent_menu',
      school_name: g.school_name,
      show_all_balances: g.students.length > 1,
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
    const showAllBalances = g.students.length > 1;
    const showAnotherSchool = identity.parentSchools.length > 1;
    // option 4 = all-balances (if showAllBalances), else another-school (if showAnotherSchool)
    // option 5 = another-school (only when both are true)
    const allBalancesOpt = showAllBalances ? 4 : 0;
    const anotherSchoolOpt = showAnotherSchool ? (showAllBalances ? 5 : 4) : 0;

    if (n === allBalancesOpt && allBalancesOpt > 0) {
      const balances = await getAllChildrenBalances(client, schoolId, g.students);
      fmt({
        intent: 'all_children_balances',
        school_name: g.school_name,
        children: balances,
      });
      step = 'parent_menu';
      await persist();
      return out;
    }
    if (n === anotherSchoolOpt && anotherSchoolOpt > 0) {
      step = 'parent_pick_school';
      fmt(selectSchoolPayload(identity.parentSchools));
      await persist();
      return out;
    }
    if (n === 1) {
      ctx.pendingAction = 'balance';
      if (g.students.length > 1) {
        step = 'parent_pick_child';
        fmt({
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
        fmt({
          intent: 'fee_balance',
          role: 'parent',
          school_name: g.school_name,
          student_name: st.name,
          total_fees: metrics.total_fees,
          paid: metrics.paid,
          outstanding: metrics.outstanding,
          currency: 'UGX',
        });
        fmt({ intent: 'parent_fee_submenu', student_name: st.name });
        step = 'parent_fee_submenu';
      }
      await persist();
      return out;
    }
    if (n === 2) {
      ctx.pendingAction = 'report';
      if (g.students.length > 1) {
        step = 'parent_pick_child';
        fmt({
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
          fmt({ intent: 'report_sending', label: r.label });
          out.push({ type: 'document', url: r.url, fileName: 'report-card.pdf', caption: r.label });
        } else {
          fmt({ intent: 'report_unavailable', label: r.label });
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
        fmt({
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
        fmt({ intent: 'attendance_submenu', student_name: null });
      }
      await persist();
      return out;
    }
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
      fmt({
        intent: 'fee_balance',
        role: 'parent',
        school_name: g.school_name,
        student_name: child.name,
        total_fees: metrics.total_fees,
        paid: metrics.paid,
        outstanding: metrics.outstanding,
        currency: 'UGX',
      });
      fmt({ intent: 'parent_fee_submenu', student_name: child.name });
      step = 'parent_fee_submenu';
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

  if (step === 'parent_fee_submenu' && n !== null) {
    const g = parentGroupFromSession(identity, ctx);
    const sid = ctx.student_id as string | undefined;
    if (!g || !sid) {
      step = 'parent_menu';
      await persist();
      return processInboundMessage(client, waDigits, waE164, '');
    }
    const stName = g.students.find((s) => s.student_id === sid)?.name || 'Student';
    if (n === 1) {
      const rows = await getStudentPaymentHistory(client, g.school_id, sid);
      fmt({ intent: 'payment_history', student_name: stName, rows });
      step = 'parent_menu';
    } else if (n === 2) {
      const rows = await getStudentTermFeeSummary(client, g.school_id, sid);
      fmt({ intent: 'term_fee_breakdown', student_name: stName, rows });
      step = 'parent_menu';
    } else {
      step = 'parent_menu';
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
      return processInboundMessage(client, waDigits, waE164, '');
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
    fmt({
      intent: 'staff_menu',
      school_name: s.school_name,
      can_verify_receipts: s.canVerifyReceipts,
      can_view_school_summary: s.canVerifyReceipts,
      is_secretary: s.isSecretary,
    });
    await persist();
    return out;
  }

  if (step === 'staff_attendance_followup' && n !== null) {
    const sc = staffContextFromSession(ctx);
    if (!sc) {
      step = 'entry';
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    if (n !== 1) {
      return out;
    }
    const dateIso = (ctx.staffAttendanceDetailDate as string) || todayIso();
    const classNames = await classNamesForAttendanceByClass(client, sc);
    if (classNames.length === 0) {
      fmt({
        intent: 'staff_feature_unavailable',
        title: 'Attendance by class',
        message: 'No classes are linked to your profile for a class breakdown. Ask your admin to assign your classes.',
      });
      clearStaffSubflowContext(ctx);
      step = 'staff_menu';
      await persist();
      return out;
    }
    const breakdown = await getAttendanceBreakdownByClasses(client, sc.school_id, dateIso, classNames);
    ctx.staffAttendanceByClassCache = breakdown.map((b) => ({
      class_name: b.class_name,
      present: b.present,
      absent: b.absent,
    }));
    ctx.staffAttendanceDetailDate = dateIso;
    fmt({
      intent: 'staff_attendance_by_class_list',
      date_label: dateIso,
      rows: breakdown.map((b) => ({
        class_name: b.class_name,
        present: b.present,
        absent: b.absent,
      })),
    });
    step = 'staff_attendance_pick_class_absent';
    await persist();
    return out;
  }

  if (step === 'staff_attendance_pick_class_absent' && n !== null) {
    const sc = staffContextFromSession(ctx);
    if (!sc) {
      step = 'entry';
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    const cache = ctx.staffAttendanceByClassCache as
      | { class_name: string; present: number; absent: number }[]
      | undefined;
    const dateIso = (ctx.staffAttendanceDetailDate as string) || todayIso();
    if (!cache?.length) {
      step = 'staff_menu';
      await persist();
      return out;
    }
    const picked = cache[n - 1];
    if (!picked) {
      return out;
    }
    const stats = await getStaffAttendanceStats(client, sc.school_id, dateIso, 'classes', [picked.class_name]);
    const namesText =
      stats.absent === 0
        ? '— No absent learners recorded —'
        : stats.absentNames.length > 0
          ? stats.absentNames.map((nm) => `· ${nm}`).join('\n')
          : `(${stats.absent} absent — names not listed here)`;
    fmt({
      intent: 'staff_class_absent_detail',
      class_name: picked.class_name,
      date_label: dateIso,
      absent_count: stats.absent,
      names_text: namesText,
    });
    fmt({
      intent: 'staff_attendance_by_class_list',
      date_label: dateIso,
      rows: cache.map((b) => ({
        class_name: b.class_name,
        present: b.present,
        absent: b.absent,
      })),
    });
    step = 'staff_attendance_pick_class_absent';
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
    // Secretary menu: 1=Attendance, 2=Notifications (remapped from normal numbering)
    if (sc.isSecretary) {
      if (n === 1) {
        const dateIso = todayIso();
        const stats = await getStaffAttendanceStats(client, sc.school_id, dateIso, 'whole_school', null);
        ctx.staffAttendanceDetailDate = dateIso;
        fmt({ intent: 'staff_attendance_today_intro', date_label: dateIso, present: stats.present, absent: stats.absent });
        step = 'staff_attendance_followup';
        await persist();
        return out;
      }
      if (n === 2) {
        const summary = await getStudentsSummaryByClass(client, sc.school_id);
        ctx.secClassList = summary.byClass;
        fmt({ intent: 'sec_students_class_list', total: summary.total, byClass: summary.byClass });
        step = 'sec_students_class_pick';
        await persist();
        return out;
      }
      if (n === 3) {
        const rows = await getClassesWithOutstandingCounts(client, sc.school_id);
        ctx.secBalanceClassList = rows;
        fmt({ intent: 'sec_outstanding_class_list', rows });
        step = 'sec_balances_class_pick';
        await persist();
        return out;
      }
      if (n === 4) {
        const rows = await getSchoolStaffList(client, sc.school_id);
        fmt({ intent: 'sec_staff_list', school_name: sc.school_name, rows });
        await persist();
        return out;
      }
      if (n === 5) {
        fmt({ intent: 'sec_visitor_range_pick' });
        step = 'sec_visitor_range_pick';
        await persist();
        return out;
      }
      if (n === 6) {
        if (!sc.user_id) {
          fmt({ intent: 'staff_feature_unavailable', title: 'Notifications', message: 'No staff login linked. Open PwezaCore on the web to view alerts.' });
        } else {
          const rows = await getRecentInAppNotificationsForUser(client, sc.school_id, sc.user_id, 8);
          const lines = rows.map((r) => {
            const dt = r.created_at ? r.created_at.slice(0, 10) : '—';
            return `*${dt}* · ${r.title || 'Notice'}\n${(r.body || '').trim() || '—'}`;
          });
          fmt({ intent: 'staff_notifications_inbox', lines });
        }
        await persist();
        return out;
      }
      return out;
    }
    if (n === 1) {
      const classNames = await classNamesForMyClassesList(client, sc);
      if (classNames.length > 0) {
        ctx.staffMyClassesCache = classNames;
        step = 'staff_my_classes_pick';
      }
      fmt({ intent: 'staff_my_classes', class_names: classNames });
      await persist();
      return out;
    }
    if (n === 2) {
      if (!sc.teacher_id) {
        fmt({
          intent: 'staff_feature_unavailable',
          title: "Today's schedule",
          message: 'Your account is not linked to a teacher profile. Open PwezaCore on the web for school-wide tools.',
        });
      } else {
        const rows = await getTeacherTimetableRows(client, sc.school_id, sc.teacher_id);
        const dayIx = timetableDayIndexFromDate(new Date());
        const todayRows = rows.filter((r) => r.day_of_week === dayIx);
        const lines = todayRows.map((r) => {
          const t = `${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)}`;
          return `· ${t} · *${r.class_name}* · ${r.subject}${r.room ? ` · ${r.room}` : ''}`;
        });
        fmt({ intent: 'staff_schedule_today', lines, day_label: timetableDayLabel(timetableDayIndexFromDate(new Date())) });
      }
      await persist();
      return out;
    }
    if (n === 3) {
      if (!sc.teacher_id) {
        fmt({
          intent: 'staff_feature_unavailable',
          title: 'My timetable',
          message: 'Your account is not linked to a teacher profile. Open PwezaCore on the web to view schedules.',
        });
      } else {
        const rows = await getTeacherTimetableRows(client, sc.school_id, sc.teacher_id);
        fmt({ intent: 'staff_timetable_week', body: formatTimetableRowsForWhatsapp(rows) });
      }
      await persist();
      return out;
    }
    if (n === 4) {
      const dateIso = todayIso();
      const scope = attendanceScopeForStaff(sc);
      const stats = await getStaffAttendanceStats(client, sc.school_id, dateIso, scope.kind, scope.classes);
      ctx.staffAttendanceDetailDate = dateIso;
      fmt({ intent: 'staff_attendance_today_intro', date_label: dateIso, present: stats.present, absent: stats.absent });
      step = 'staff_attendance_followup';
      await persist();
      return out;
    }
    if (n === 5) {
      if (!sc.user_id) {
        fmt({
          intent: 'staff_feature_unavailable',
          title: 'Notifications',
          message: 'No staff login is linked for inbox notifications. Open PwezaCore in the browser to view alerts.',
        });
      } else {
        const rows = await getRecentInAppNotificationsForUser(client, sc.school_id, sc.user_id, 8);
        const lines = rows.map((r) => {
          const dt = r.created_at ? r.created_at.slice(0, 10) : '—';
          return `*${dt}* · ${r.title || 'Notice'}\n${(r.body || '').trim() || '—'}`;
        });
        fmt({ intent: 'staff_notifications_inbox', lines });
      }
      await persist();
      return out;
    }
    if (n === 6 && sc.canVerifyReceipts) {
      const summary = await getSchoolFinanceSummary(client, sc.school_id);
      fmt({
        intent: 'staff_school_summary',
        school_name: sc.school_name,
        date_label: todayIso(),
        ...summary,
      });
      await persist();
      return out;
    }
    if (n === 7 && sc.canVerifyReceipts) {
      step = 'staff_await_receipt';
      fmt({ intent: 'prompt_receipt_ref' });
      await persist();
      return out;
    }
    return out;
  }

  if (step === 'staff_my_classes_pick' && n !== null) {
    const sc = staffContextFromSession(ctx);
    const classNames = (ctx.staffMyClassesCache as string[] | undefined) ?? [];
    if (!sc || classNames.length === 0) {
      step = 'staff_menu';
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    const picked = classNames[n - 1];
    if (!picked) {
      fmt({ intent: 'invalid_option' });
      await persist();
      return out;
    }
    const students = await getStudentsInClass(client, sc.school_id, picked);
    fmt({
      intent: 'staff_class_students',
      class_name: picked,
      students: students.map((s, i) => ({ index: i + 1, name: s.name })),
    });
    step = 'staff_menu';
    delete ctx.staffMyClassesCache;
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

  // ── Secretary sub-flow handlers ──────────────────────────────────────────────

  if (step === 'sec_students_class_pick' && n !== null) {
    const sc = staffContextFromSession(ctx);
    if (!sc) { step = 'entry'; await persist(); return processInboundMessage(client, waDigits, waE164, text); }
    const classList = (ctx.secClassList as { class_name: string; count: number }[] | undefined) ?? [];
    const picked = classList[n - 1];
    if (!picked) { fmt({ intent: 'invalid_option' }); await persist(); return out; }
    const students = await getStudentsInClass(client, sc.school_id, picked.class_name);
    fmt({ intent: 'sec_students_in_class', class_name: picked.class_name, students: students.map((s, i) => ({ index: i + 1, name: s.name })) });
    step = 'staff_menu';
    delete ctx.secClassList;
    await persist();
    return out;
  }

  if (step === 'sec_balances_class_pick' && n !== null) {
    const sc = staffContextFromSession(ctx);
    if (!sc) { step = 'entry'; await persist(); return processInboundMessage(client, waDigits, waE164, text); }
    const classList = (ctx.secBalanceClassList as { class_name: string; count: number }[] | undefined) ?? [];
    const picked = classList[n - 1];
    if (!picked) { fmt({ intent: 'invalid_option' }); await persist(); return out; }
    const rows = await getStudentsWithOutstandingInClass(client, sc.school_id, picked.class_name);
    fmt({ intent: 'sec_outstanding_in_class', class_name: picked.class_name, rows });
    step = 'staff_menu';
    delete ctx.secBalanceClassList;
    await persist();
    return out;
  }

  if (step === 'sec_visitor_range_pick' && n !== null) {
    const sc = staffContextFromSession(ctx);
    if (!sc) { step = 'entry'; await persist(); return processInboundMessage(client, waDigits, waE164, text); }
    const todayStr = todayIso();
    let startIso = todayStr;
    let label = 'Today';
    if (n === 2) {
      // Monday of current week (Uganda time = UTC+3)
      const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const dow = d.getUTCDay(); // 0=Sun
      const monday = new Date(d.getTime() - (dow === 0 ? 6 : dow - 1) * 86400000);
      startIso = monday.toISOString().slice(0, 10);
      label = 'This week';
    } else if (n === 3) {
      startIso = todayStr.slice(0, 7) + '-01';
      label = 'This month';
    }
    const rows = await getVisitorLogForRange(client, sc.school_id, startIso, todayStr);
    fmt({ intent: 'sec_visitor_log', label, rows });
    step = 'staff_menu';
    await persist();
    return out;
  }

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
