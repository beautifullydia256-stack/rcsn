// src/lib/whatsapp/wasenderClient.ts
function createWasenderProvider() {
  const base = (process.env.WASENDER_API_BASE || "https://www.wasenderapi.com").replace(/\/$/, "");
  const token = process.env.WASENDER_BEARER_TOKEN || "";
  async function post(body) {
    if (!token) {
      return { ok: false, error: "WASENDER_BEARER_TOKEN is not set" };
    }
    try {
      const res = await fetch(`${base}/api/send-message`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: json?.message || json?.error || res.statusText || String(res.status) };
      }
      if (json && json.success === false) {
        return { ok: false, error: json?.message || json?.error || "Wasender rejected request" };
      }
      return { ok: true, raw: json };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return {
    async sendText(params) {
      return post({ to: params.toE164, text: params.text });
    },
    async sendDocument(params) {
      return post({
        to: params.toE164,
        text: params.caption || " ",
        documentUrl: params.documentUrl,
        fileName: params.fileName
      });
    }
  };
}

// src/lib/ai/whatsappStructuredPayload.ts
function waSafe(s) {
  return (s || "").replace(/\*/g, "\xB7").trim();
}
function helloLine(opts) {
  const raw = (opts?.greetingName || "").trim();
  if (!raw) return `Hello \u{1F44B},

`;
  const first = raw.split(/\s+/)[0] || raw;
  return `Hello ${waSafe(first)} \u{1F44B},

`;
}
function whatsappNavFooter() {
  return "\n\n0 \u2014 Main menu";
}
function fmtUgx(n) {
  return `UGX ${Math.round(n).toLocaleString("en-UG")}`;
}
function withFooter(body) {
  return body + whatsappNavFooter();
}
function defaultMessageFormatter(payload, options) {
  const menuHello = payload.intent === "staff_menu" || payload.intent === "parent_menu" ? helloLine(options) : "";
  switch (payload.intent) {
    case "unregistered":
      return withFooter(
        `*\u{1F4F5} Not registered*

${menuHello}This number is not linked to PwezaCore. Please use the phone number on your school profile, or contact the school office.

Thank you \u{1F64F}`
      );
    case "role_pick":
      return withFooter(
        `*\u{1F44B} Choose a role*

${menuHello}You're on file as both *parent* and *staff*. Reply with a number:

1 \u2014 Parent (fees, reports, attendance)
2 \u2014 Staff (classes, timetable, attendance)`
      );
    case "select_school": {
      const lines = payload.schools.map((s) => `${s.index} \u2014 ${waSafe(s.name)}`).join("\n");
      return withFooter(
        `*\u{1F3EB} Select school*

${menuHello}Reply with a number:

` + lines
      );
    }
    case "parent_menu": {
      const school = waSafe(payload.school_name);
      let opts = `1 \u2014 Fee balance
2 \u2014 Report card (latest PDF)
3 \u2014 Attendance`;
      let next = 4;
      if (payload.show_all_balances) {
        opts += `
${next} \u2014 All children balances`;
        next++;
      }
      if (payload.show_another_school) opts += `
${next} \u2014 Another school`;
      return withFooter(
        `*\u{1F4DA} Parent menu*

${menuHello}*${school}*

Choose an option:

` + opts
      );
    }
    case "staff_menu": {
      const school = waSafe(payload.school_name);
      if (payload.is_secretary) {
        return withFooter(
          `*\u{1F5C2}\uFE0F Secretary menu*

${menuHello}*${school}*

Choose an option:

1 \u2014 Attendance today
2 \u2014 Notifications`
        );
      }
      let opts = `1 \u2014 My classes
2 \u2014 Today's schedule
3 \u2014 My timetable
4 \u2014 Attendance today
5 \u2014 Notifications`;
      if (payload.can_view_school_summary) opts += `
6 \u2014 School summary`;
      if (payload.can_verify_receipts) opts += `
${payload.can_view_school_summary ? 7 : 6} \u2014 Verify receipt`;
      return withFooter(
        `*\u{1F454} Staff menu*

${menuHello}*${school}*

Choose an option:

` + opts
      );
    }
    case "staff_my_classes": {
      if (payload.class_names.length === 0) {
        return withFooter(
          `*\u{1F4DA} My classes*

${menuHello}No classes are linked to your teacher profile yet.

Ask your admin to assign classes in PwezaCore.`
        );
      }
      const lines = payload.class_names.map((c, i) => `${i + 1} \u2014 *${waSafe(c)}*`).join("\n");
      return withFooter(
        `*\u{1F4DA} My classes*

${menuHello}${lines}

Reply with a *class number* to see the student list.`
      );
    }
    case "staff_schedule_today": {
      if (payload.lines.length === 0) {
        return withFooter(
          `*\u{1F5D3}\uFE0F Today's schedule*

${menuHello}*${waSafe(payload.day_label)}*

No lessons on your timetable for today.`
        );
      }
      return withFooter(
        `*\u{1F5D3}\uFE0F Today's schedule*

${menuHello}*${waSafe(payload.day_label)}*

` + payload.lines.join("\n")
      );
    }
    case "staff_timetable_week":
      return withFooter(
        `*\u{1F4C5} My timetable*

${menuHello}${payload.body}`
      );
    case "staff_attendance_today_intro":
      return withFooter(
        `*\u{1F4CA} Attendance today*

${menuHello}*Date:* ${waSafe(payload.date_label)}

*Present:* *${payload.present}*
*Absent:* *${payload.absent}*

Reply *1* for *attendance by class* (your classes only).

Thank you \u{1F64F}`
      );
    case "staff_attendance_by_class_list": {
      const lines = payload.rows.map(
        (r, i) => `${i + 1} \u2014 *${waSafe(r.class_name)}* \xB7 *${r.present}* present \xB7 *${r.absent}* absent`
      );
      return withFooter(
        `*\u{1F4CA} By class*

${menuHello}*Date:* ${waSafe(payload.date_label)}

Reply with a *class number* to list absent students.

` + lines.join("\n")
      );
    }
    case "staff_class_absent_detail":
      return withFooter(
        `*\u{1F4CB} Absent students*

${menuHello}*Class:* *${waSafe(payload.class_name)}*
*Date:* ${waSafe(payload.date_label)}
*Absent:* *${payload.absent_count}*

${waSafe(payload.names_text)}

Pick another class number from the list above, or use the main menu.`
      );
    case "staff_notifications_inbox": {
      if (payload.lines.length === 0) {
        return withFooter(
          `*\u{1F514} Notifications*

${menuHello}No notifications in your inbox yet.`
        );
      }
      return withFooter(
        `*\u{1F514} Notifications*

${menuHello}` + payload.lines.join("\n\n\u2014\n\n")
      );
    }
    case "staff_feature_unavailable":
      return withFooter(
        `*${waSafe(payload.title)}*

${menuHello}${payload.message}`
      );
    case "child_picker": {
      const school = waSafe(payload.school_name);
      const lines = payload.children.map(
        (s) => `${s.index} \u2014 ${waSafe(s.name)} (${waSafe(s.class_name || "\u2014")})`
      ).join("\n");
      return withFooter(
        `*\u{1F476} Choose a student*

${menuHello}School: *${school}*

Reply with a number:

` + lines
      );
    }
    case "attendance_submenu": {
      const who = payload.student_name ? `Attendance for *${waSafe(payload.student_name)}*` : "*Attendance*";
      return withFooter(
        `*\u{1F4C5} Attendance*

${menuHello}${who}

Choose a period:

1 \u2014 Today
2 \u2014 This week (Mon\u2013Sun)
3 \u2014 Specific date (DD-MM-YYYY)`
      );
    }
    case "fee_balance": {
      const student = waSafe(payload.student_name);
      const school = waSafe(payload.school_name);
      return withFooter(
        `*\u{1F4B0} Fee balance*

${menuHello}Your child *${student}* is at *${school}*.

*Total (all terms):* *${fmtUgx(payload.total_fees)}*
*Paid:* *${fmtUgx(payload.paid)}*
*Outstanding:* *${fmtUgx(payload.outstanding)}*

Please ensure timely payment where possible.

Thank you \u{1F64F}`
      );
    }
    case "report_sending":
      return withFooter(
        `*\u{1F4C4} Report card*

${menuHello}Sending your file:

*${waSafe(payload.label)}*

Thank you \u{1F64F}`
      );
    case "report_unavailable":
      return withFooter(
        `*\u{1F4C4} Report card*

${menuHello}${waSafe(payload.label)}

Contact the school if you need help \u{1F64F}`
      );
    case "attendance_summary":
      return withFooter(
        `*\u{1F4CA} Attendance summary*

${menuHello}${waSafe(payload.body)}

Thank you \u{1F64F}`
      );
    case "staff_attendance_stats": {
      const school = waSafe(payload.school_name);
      return withFooter(
        `*\u{1F4CA} Attendance*

${menuHello}*${school}*
*Date:* ${waSafe(payload.date_label)}

*Present:* *${payload.present}*
*Absent:* *${payload.absent}*

Thank you \u{1F64F}`
      );
    }
    case "staff_absent_list":
      return withFooter(
        `*\u{1F4CB} Absent learners*

${menuHello}*Date:* *${waSafe(payload.date_iso)}*
*Count:* *${payload.absent_count}*

${waSafe(payload.names_text)}

Thank you \u{1F64F}`
      );
    case "receipt_lookup":
      return withFooter(
        `*\u{1F9FE} Receipt*

${menuHello}${waSafe(payload.body)}

Thank you \u{1F64F}`
      );
    case "parent_fee_submenu":
      return withFooter(
        `*\u{1F4B0} Fee balance*

${menuHello}What else would you like to know about *${waSafe(payload.student_name)}*?

1 \u2014 Payment history (last 10 payments)
2 \u2014 Term-by-term breakdown`
      );
    case "payment_history": {
      const student = waSafe(payload.student_name);
      if (payload.rows.length === 0) {
        return withFooter(
          `*\u{1F4B3} Payment history \u2014 ${student}*

${menuHello}No payment records found yet.

Thank you \u{1F64F}`
        );
      }
      const lines = payload.rows.map((r, i) => {
        const amt = fmtUgx(r.amount);
        const dt = r.date ?? "\u2014";
        const mth = (r.method ?? "\u2014").replace(/_/g, " ");
        const ref = r.reference ? ` \xB7 Ref: ${waSafe(r.reference)}` : "";
        return `${i + 1}. *${dt}* \xB7 ${amt} \xB7 ${mth}${ref}`;
      });
      return withFooter(
        `*\u{1F4B3} Payment history \u2014 ${student}*

${menuHello}${lines.join("\n")}

Thank you \u{1F64F}`
      );
    }
    case "term_fee_breakdown": {
      const student = waSafe(payload.student_name);
      if (payload.rows.length === 0) {
        return withFooter(
          `*\u{1F4CA} Term breakdown \u2014 ${student}*

${menuHello}No term fee records found yet.

Thank you \u{1F64F}`
        );
      }
      const lines = payload.rows.map(
        (r) => `*Term ${r.term} \xB7 ${r.year}*
  Fees: ${fmtUgx(r.total_fees)} | Paid: ${fmtUgx(r.paid)} | Balance: *${fmtUgx(r.outstanding)}*`
      );
      return withFooter(
        `*\u{1F4CA} Term breakdown \u2014 ${student}*

${menuHello}${lines.join("\n\n")}

Thank you \u{1F64F}`
      );
    }
    case "all_children_balances": {
      const school = waSafe(payload.school_name);
      const totalOutstanding = payload.children.reduce((s, c) => s + c.outstanding, 0);
      const lines = payload.children.map(
        (c, i) => `*${i + 1}. ${waSafe(c.name)}* (${waSafe(c.current_class || "\u2014")})
   Fees: ${fmtUgx(c.total_fees)} | Paid: ${fmtUgx(c.paid)} | *Owed: ${fmtUgx(c.outstanding)}*`
      );
      return withFooter(
        `*\u{1F4B0} All children \u2014 ${school}*

${menuHello}${lines.join("\n\n")}

*Total outstanding: ${fmtUgx(totalOutstanding)}*

Thank you \u{1F64F}`
      );
    }
    case "staff_class_students": {
      const cls = waSafe(payload.class_name);
      if (payload.students.length === 0) {
        return withFooter(
          `*\u{1F4CB} ${cls} \u2014 Students*

${menuHello}No active students found in this class.`
        );
      }
      const lines = payload.students.map((s) => `${s.index}. ${waSafe(s.name)}`).join("\n");
      return withFooter(
        `*\u{1F4CB} ${cls} \u2014 Students*

${menuHello}${lines}

*Total: ${payload.students.length}*`
      );
    }
    case "staff_school_summary": {
      const school = waSafe(payload.school_name);
      return withFooter(
        `*\u{1F3E6} School summary \u2014 ${school}*

${menuHello}*Date:* ${waSafe(payload.date_label)}
*Enrolled students:* ${payload.enrolled}

*Fees (all terms):*
  Billed: ${fmtUgx(payload.total_fees)}
  Collected: ${fmtUgx(payload.total_paid)}
  Outstanding: *${fmtUgx(payload.outstanding)}*
  Zero-payers: *${payload.zero_payers}*

*Today's collections:* *${fmtUgx(payload.today_collected)}*

Thank you \u{1F64F}`
      );
    }
    case "invalid_option":
      return withFooter(
        `*\u26A0\uFE0F Invalid option*

${menuHello}Please choose a number from the menu.

Thank you \u{1F64F}`
      );
    case "invalid_date":
      return withFooter(
        `*\u{1F4C5} Invalid date*

${menuHello}Use *DD-MM-YYYY* (example: 15-04-2026).

Thank you \u{1F64F}`
      );
    case "prompt_pick_1_or_2":
      return withFooter(
        `*\u{1F44B} Quick reply*

${menuHello}Reply *1* or *2*.`
      );
    case "prompt_pick_1_2_3":
      return withFooter(
        `*\u{1F44B} Quick reply*

${menuHello}Reply *1*, *2*, or *3*.`
      );
    case "prompt_date_generic":
      return withFooter(
        `*\u{1F4C5} Attendance date*

${menuHello}Send the date as *DD-MM-YYYY*.`
      );
    case "prompt_date_absent":
      return withFooter(
        `*\u{1F4C5} Absent list*

${menuHello}Send the date for the absent list (*DD-MM-YYYY*).`
      );
    case "prompt_receipt_ref":
      return withFooter(
        `*\u{1F9FE} Verify receipt*

${menuHello}Send the *receipt number* or *payment ID*.`
      );
    case "use_menu_option":
      return withFooter(
        `*\u{1F44B} Menu*

${menuHello}Please pick an option from the list above.`
      );
    case "reply_menu_number":
      return withFooter(
        `*\u{1F44B} Menu*

${menuHello}Reply with a number from the menu.`
      );
    default: {
      const _exhaustive = payload;
      return _exhaustive;
    }
  }
}

// src/lib/schoolCalendarDate.ts
var SCHOOL_CALENDAR_TIMEZONE = "Africa/Kampala";
function calendarDateIsoInTimeZone(date, timeZone = SCHOOL_CALENDAR_TIMEZONE) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = dtf.formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) {
    throw new Error("calendarDateIsoInTimeZone: incomplete date parts");
  }
  return `${y}-${m}-${d}`;
}
function schoolCalendarTodayIso(date = /* @__PURE__ */ new Date()) {
  return calendarDateIsoInTimeZone(date);
}
function schoolCalendarWeekRangeIso(date = /* @__PURE__ */ new Date()) {
  const today = schoolCalendarTodayIso(date);
  const [y0, m0, d0] = today.split("-").map(Number);
  const t = Date.UTC(y0, m0 - 1, d0);
  const dow = new Date(t).getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  const monT = t + delta * 864e5;
  const mon = new Date(monT);
  const monday = `${mon.getUTCFullYear()}-${String(mon.getUTCMonth() + 1).padStart(2, "0")}-${String(mon.getUTCDate()).padStart(2, "0")}`;
  const sunday = addCalendarDaysToIsoYmd(monday, 6);
  return { monday, sunday };
}
function addCalendarDaysToIsoYmd(isoYmd, deltaDays) {
  const [y0, m0, d0] = isoYmd.split("-").map(Number);
  const t = Date.UTC(y0, m0 - 1, d0 + deltaDays);
  const y = new Date(t).getUTCFullYear();
  const m = String(new Date(t).getUTCMonth() + 1).padStart(2, "0");
  const d = String(new Date(t).getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// src/lib/adminFinanceTerm.ts
async function loadStudentBalanceAggAllTerms(client, schoolId, studentId) {
  const { data: rows, error } = await client.from("student_balances").select("total_fees, total_paid, balance").eq("school_id", schoolId).eq("student_id", studentId);
  if (error) {
    if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
      console.warn("[adminFinanceTerm] loadStudentBalanceAggAllTerms:", error.message);
    }
    return { total_fees: 0, total_paid: 0, balance: 0 };
  }
  const agg = { total_fees: 0, total_paid: 0, balance: 0 };
  for (const r of rows || []) {
    agg.total_fees += Number(r.total_fees ?? 0);
    agg.total_paid += Number(r.total_paid ?? 0);
    agg.balance += Math.max(0, Number(r.balance ?? 0));
  }
  return agg;
}

// src/lib/studentAttendanceRow.ts
function studentAttendanceRowIsPresent(row) {
  const s = String(row.status || "").toLowerCase();
  if (s === "absent") return false;
  if (s === "present" || s === "late" || s === "excused") return true;
  if (typeof row.present === "boolean") return row.present;
  return false;
}

// src/lib/timetableDay.ts
var WEEKDAYS_MON_FIRST = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];
function timetableDayNameToIndex(day) {
  const d = String(day || "").trim();
  const i = WEEKDAYS_MON_FIRST.indexOf(d);
  return i === -1 ? null : i;
}
function formatTimetableTime(t) {
  if (t == null || t === "") return "\u2014";
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

// src/lib/whatsapp/queries.ts
async function getParentFeeBalanceMetrics(client, schoolId, studentId) {
  const agg = await loadStudentBalanceAggAllTerms(client, schoolId, studentId);
  return {
    total_fees: Math.max(0, Number(agg.total_fees || 0)),
    paid: Math.max(0, Number(agg.total_paid || 0)),
    outstanding: Math.max(0, Number(agg.balance || 0))
  };
}
async function getLatestReportPdfForStudent(client, schoolId, studentId) {
  const { data: reps } = await client.from("generated_reports").select("id, pdf_url, generated_at, snapshot_id").eq("student_id", studentId).order("generated_at", { ascending: false }).limit(1);
  const row = (reps || [])[0];
  if (!row?.pdf_url) return { url: null, label: "No published report card found yet." };
  const { data: snap } = await client.from("report_snapshots").select("term, year, exam_set_id").eq("id", row.snapshot_id).maybeSingle();
  const sn = snap;
  const label = sn ? `Term ${sn.term ?? "\u2014"} \xB7 ${sn.year ?? "\u2014"}` : "Report";
  return { url: row.pdf_url, label };
}
async function getParentAttendanceSummary(client, schoolId, studentId, kind, dateIso) {
  let start = schoolCalendarTodayIso();
  let end = start;
  if (kind === "week") {
    const w = schoolCalendarWeekRangeIso();
    start = w.monday;
    end = w.sunday;
  } else if (kind === "date" && dateIso) {
    start = dateIso;
    end = dateIso;
  }
  const { data: rows } = await client.from("student_attendance").select("attendance_date, present, status").eq("school_id", schoolId).eq("student_id", studentId).gte("attendance_date", start).lte("attendance_date", end).order("attendance_date", { ascending: true });
  const list = rows || [];
  if (list.length === 0) return `No attendance records for ${start === end ? start : `${start} \u2013 ${end}`}.`;
  const lines = list.map((r) => {
    const st = studentAttendanceRowIsPresent(r) ? "Present" : "Absent";
    return `${r.attendance_date}: ${st}`;
  });
  return lines.join("\n");
}
function timetableDayIndexFromDate(d) {
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
}
var TIMETABLE_DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
function timetableDayLabel(dayIndex) {
  return TIMETABLE_DAY_LABELS[dayIndex] ?? `Day ${dayIndex}`;
}
async function getTeacherTimetableRows(client, schoolId, teacherId) {
  if (!teacherId) return [];
  const { data, error } = await client.from("timetable_periods").select("class_name, subject, day_of_week, start_time, end_time").eq("school_id", schoolId).eq("teacher_id", teacherId);
  if (error) throw new Error(error.message);
  const raw = data || [];
  const mapped = [];
  for (const r of raw) {
    const dayIx = timetableDayNameToIndex(r.day_of_week);
    if (dayIx === null) continue;
    mapped.push({
      class_name: r.class_name,
      subject: r.subject,
      day_of_week: dayIx,
      start_time: formatTimetableTime(r.start_time),
      end_time: formatTimetableTime(r.end_time),
      room: null
    });
  }
  mapped.sort(
    (a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time)
  );
  return mapped;
}
async function getDistinctClassNamesFromTimetableForTeacher(client, schoolId, teacherId) {
  const { data, error } = await client.from("timetable_periods").select("class_name").eq("school_id", schoolId).eq("teacher_id", teacherId);
  if (error) throw new Error(error.message);
  const set = /* @__PURE__ */ new Set();
  for (const r of data || []) {
    const c = (r.class_name || "").trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
async function getMergedTeacherClassNames(client, schoolId, teacherId) {
  const set = /* @__PURE__ */ new Set();
  const { data: tFull, error: tErr } = await client.from("teachers").select("classes").eq("teacher_id", teacherId).maybeSingle();
  if (tErr) throw new Error(tErr.message);
  const profileClasses = tFull?.classes;
  if (Array.isArray(profileClasses)) {
    for (const c of profileClasses) {
      const x = (String(c) || "").trim();
      if (x) set.add(x);
    }
  }
  for (const c of await getDistinctClassNamesFromTimetableForTeacher(client, schoolId, teacherId)) {
    set.add(c);
  }
  const { data: ctRows, error: ctErr } = await client.from("class_teachers").select("class_name").eq("school_id", schoolId).eq("teacher_id", teacherId);
  if (ctErr) throw new Error(ctErr.message);
  for (const r of ctRows || []) {
    const c = (r.class_name || "").trim();
    if (c) set.add(c);
  }
  const { data: tcsRows, error: tcsErr } = await client.from("teacher_class_subjects").select("class_name").eq("school_id", schoolId).eq("teacher_id", teacherId);
  if (tcsErr) throw new Error(tcsErr.message);
  for (const r of tcsRows || []) {
    const c = (r.class_name || "").trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
async function getDistinctActiveClassNames(client, schoolId) {
  const { data, error } = await client.from("students").select("current_class").eq("school_id", schoolId).eq("status", "active");
  if (error) throw new Error(error.message);
  const set = /* @__PURE__ */ new Set();
  for (const r of data || []) {
    const c = (r.current_class || "").trim();
    if (c) set.add(c);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
async function getAttendanceBreakdownByClasses(client, schoolId, dateIso, classNames) {
  const out = [];
  for (const cn of classNames) {
    const stats = await getStaffAttendanceStats(client, schoolId, dateIso, "classes", [cn]);
    out.push({
      class_name: cn,
      present: stats.present,
      absent: stats.absent,
      absentNames: stats.absentNames
    });
  }
  return out;
}
async function getRecentInAppNotificationsForUser(client, schoolId, userId, limit = 8) {
  const { data, error } = await client.from("user_in_app_notifications").select("title, body, created_at").eq("school_id", schoolId).eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}
function fmtTimeHm(t) {
  if (!t || typeof t !== "string") return "\u2014";
  return t.length >= 5 ? t.slice(0, 5) : t;
}
function formatTimetableRowsForWhatsapp(rows, maxChars = 3600) {
  if (rows.length === 0) return "No timetable entries yet. Your admin can add your schedule in school settings.";
  const byDay = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const d = r.day_of_week;
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(r);
  }
  let s = "";
  for (let d = 0; d <= 6; d++) {
    const list = byDay.get(d);
    if (!list?.length) continue;
    s += `*${timetableDayLabel(d)}*
`;
    for (const r of list) {
      s += `\xB7 ${fmtTimeHm(r.start_time)}\u2013${fmtTimeHm(r.end_time)} \xB7 ${r.class_name} \xB7 ${r.subject}` + (r.room ? ` \xB7 ${r.room}` : "") + "\n";
    }
    s += "\n";
  }
  const out = s.trim();
  if (out.length <= maxChars) return out;
  return `${out.slice(0, maxChars - 40)}
\u2026 (open PwezaCore for the full timetable)`;
}
async function getStaffAttendanceStats(client, schoolId, dateIso, scope, classNames) {
  const classScoped = scope === "classes" && classNames && classNames.length > 0;
  const studsQuery = client.from("students").select("student_id, name").eq("school_id", schoolId).eq("status", "active");
  const { data: studs } = classScoped ? await studsQuery.in("current_class", classNames) : await studsQuery;
  const roster = studs || [];
  if (roster.length === 0) return { present: 0, absent: 0, absentNames: [] };
  const studentIds = roster.map((s) => s.student_id);
  const { data: rows } = await client.from("student_attendance").select("student_id, present, status").eq("school_id", schoolId).eq("attendance_date", dateIso).in("student_id", studentIds);
  const byStudent = /* @__PURE__ */ new Map();
  for (const r of rows || []) {
    const sid = r.student_id;
    if (sid) byStudent.set(sid, r);
  }
  let present = 0;
  const absentNamesAll = [];
  for (const s of roster) {
    const row = byStudent.get(s.student_id);
    const isPresent = row ? studentAttendanceRowIsPresent(row) : false;
    if (isPresent) present++;
    else {
      const n = String(s.name || "").trim();
      if (n) absentNamesAll.push(n);
    }
  }
  absentNamesAll.sort((a, b) => a.localeCompare(b));
  const MAX_ABSENT_NAMES = 40;
  const absentNames = absentNamesAll.length <= MAX_ABSENT_NAMES ? absentNamesAll : absentNamesAll.slice(0, MAX_ABSENT_NAMES);
  const absent = roster.length - present;
  return { present, absent, absentNames };
}
async function verifyReceiptByRef(client, schoolId, ref) {
  const trimmed = ref.trim();
  if (!trimmed) return null;
  const { data: byPayment } = await client.from("student_payments").select(
    "payment_id, student_id, amount_paid, receipt_number, payment_date, payment_method, reversed_at"
  ).eq("school_id", schoolId).eq("payment_id", trimmed).maybeSingle();
  if (byPayment) {
    const p = byPayment;
    const { data: st2 } = await client.from("students").select("name, current_class").eq("student_id", p.student_id).maybeSingle();
    const name2 = st2?.name || "\u2014";
    const rev2 = p.reversed_at ? " (REVERSED)" : "";
    return `Receipt / payment
Ref: ${p.receipt_number || p.payment_id}
Amount: UGX ${Math.round(Number(p.amount_paid || 0)).toLocaleString("en-UG")}
Date: ${p.payment_date || "\u2014"}
Method: ${(p.payment_method || "\u2014").replace(/_/g, " ")}
Student: ${name2}${rev2}`;
  }
  const { data: byReceipt } = await client.from("student_payments").select(
    "payment_id, student_id, amount_paid, receipt_number, payment_date, payment_method, reversed_at"
  ).eq("school_id", schoolId).ilike("receipt_number", trimmed).limit(5);
  const rows = byReceipt || [];
  const exact = rows.find((r) => (r.receipt_number || "").toLowerCase() === trimmed.toLowerCase()) || rows[0];
  if (!exact) return null;
  const { data: st } = await client.from("students").select("name, current_class").eq("student_id", exact.student_id).maybeSingle();
  const name = st?.name || "\u2014";
  const rev = exact.reversed_at ? " (REVERSED)" : "";
  return `Receipt / payment
Ref: ${exact.receipt_number || exact.payment_id}
Amount: UGX ${Math.round(Number(exact.amount_paid || 0)).toLocaleString("en-UG")}
Date: ${exact.payment_date || "\u2014"}
Method: ${(exact.payment_method || "\u2014").replace(/_/g, " ")}
Student: ${name}${rev}`;
}
async function getStudentPaymentHistory(client, schoolId, studentId, limit = 10) {
  const { data } = await client.from("student_payments").select("amount_paid, payment_date, payment_method, receipt_number").eq("school_id", schoolId).eq("student_id", studentId).is("reversed_at", null).order("payment_date", { ascending: false }).limit(limit);
  return (data || []).map((r) => {
    const row = r;
    return {
      amount: Math.max(0, Number(row.amount_paid ?? 0)),
      date: row.payment_date ?? null,
      method: row.payment_method ?? null,
      reference: row.receipt_number ?? null
    };
  });
}
async function getStudentTermFeeSummary(client, schoolId, studentId) {
  const { data: balRows } = await client.from("student_balances").select("term_id, total_fees, total_paid, balance").eq("school_id", schoolId).eq("student_id", studentId);
  if (!balRows?.length) return [];
  const termIds = [
    ...new Set(
      balRows.map((r) => r.term_id).filter((id) => !!id)
    )
  ];
  if (!termIds.length) return [];
  const { data: termRows } = await client.from("school_terms").select("id, term, year").in("id", termIds);
  const termMap = /* @__PURE__ */ new Map();
  for (const t of termRows || []) {
    const tr = t;
    if (tr.id) termMap.set(tr.id, { term: Number(tr.term ?? 0), year: Number(tr.year ?? 0) });
  }
  const grouped = /* @__PURE__ */ new Map();
  for (const r of balRows) {
    const row = r;
    const tid = row.term_id;
    if (!tid) continue;
    const tm = termMap.get(tid);
    if (!tm) continue;
    const cur = grouped.get(tid) ?? { ...tm, total_fees: 0, paid: 0, outstanding: 0 };
    cur.total_fees += Number(row.total_fees ?? 0);
    cur.paid += Number(row.total_paid ?? 0);
    cur.outstanding += Math.max(0, Number(row.balance ?? 0));
    grouped.set(tid, cur);
  }
  return [...grouped.values()].sort((a, b) => a.year - b.year || a.term - b.term);
}
async function getAllChildrenBalances(client, schoolId, students) {
  return Promise.all(
    students.map(async (s) => {
      const m = await getParentFeeBalanceMetrics(client, schoolId, s.student_id);
      return { ...s, ...m };
    })
  );
}
async function getStudentsInClass(client, schoolId, className) {
  const { data } = await client.from("students").select("student_id, name").eq("school_id", schoolId).eq("current_class", className).eq("status", "active").order("name", { ascending: true });
  return data || [];
}
async function getSchoolFinanceSummary(client, schoolId) {
  const todayIso2 = schoolCalendarTodayIso();
  const [studRes, balRes, todayRes] = await Promise.all([
    client.from("students").select("student_id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "active"),
    client.from("student_balances").select("student_id, total_fees, total_paid, balance").eq("school_id", schoolId),
    client.from("student_payments").select("amount_paid").eq("school_id", schoolId).eq("payment_date", todayIso2).is("reversed_at", null)
  ]);
  const enrolled = studRes.count ?? 0;
  const byStudent = /* @__PURE__ */ new Map();
  for (const r of balRes.data || []) {
    const row = r;
    if (!row.student_id) continue;
    const cur = byStudent.get(row.student_id) ?? { total_fees: 0, total_paid: 0, outstanding: 0 };
    cur.total_fees += Number(row.total_fees ?? 0);
    cur.total_paid += Number(row.total_paid ?? 0);
    cur.outstanding += Math.max(0, Number(row.balance ?? 0));
    byStudent.set(row.student_id, cur);
  }
  let total_fees = 0, total_paid = 0, outstanding = 0, zero_payers = 0;
  for (const v of byStudent.values()) {
    total_fees += v.total_fees;
    total_paid += v.total_paid;
    outstanding += v.outstanding;
    if (v.total_paid === 0 && v.total_fees > 0) zero_payers++;
  }
  const today_collected = (todayRes.data || []).reduce(
    (sum, r) => sum + Number(r.amount_paid ?? 0),
    0
  );
  return { enrolled, total_fees, total_paid, outstanding, zero_payers, today_collected };
}

// src/lib/whatsapp/normalizePhone.ts
function digitsOnly(s) {
  if (!s) return "";
  return s.replace(/\D/g, "");
}
function phoneLast9(s) {
  const d = digitsOnly(s);
  if (d.length < 9) return null;
  return d.slice(-9);
}
function toUgandaE164FromDigits(digits) {
  const d = digitsOnly(digits);
  if (d.startsWith("256") && d.length >= 12) return `+${d}`;
  if (d.length >= 9) return `+256${d.slice(-9)}`;
  return d.startsWith("+") ? d : `+${d}`;
}

// src/lib/whatsapp/resolveIdentity.ts
function firstDistinctName(names) {
  const seen = /* @__PURE__ */ new Set();
  for (const n of names) {
    const t = (n || "").trim();
    if (t) seen.add(t);
  }
  if (seen.size === 0) return null;
  return [...seen].sort((a, b) => a.localeCompare(b))[0] ?? null;
}
async function fetchSchoolNames(client, ids) {
  if (ids.length === 0) return /* @__PURE__ */ new Map();
  const { data } = await client.from("schools").select("school_id, name").in("school_id", ids);
  const m = /* @__PURE__ */ new Map();
  for (const r of data || []) {
    const row = r;
    m.set(row.school_id, row.name || "School");
  }
  return m;
}
function roleCanVerifyReceipts(role) {
  return role === "admin" || role === "accountant" || role === "owner" || role === "head_teacher";
}
function roleCanViewBroadAttendance(role) {
  return role === "admin" || role === "accountant" || role === "owner" || role === "head_teacher" || role === "secretary";
}
async function resolveIdentity(client, rawPhoneDigits) {
  const last9 = phoneLast9(rawPhoneDigits);
  if (!last9) return null;
  const { data: parentRows, error: pErr } = await client.rpc("find_parents_by_phone_last9", {
    p_last9: last9
  });
  if (pErr) throw new Error(pErr.message);
  const { data: teacherRows, error: tErr } = await client.rpc("find_teachers_by_phone_last9", {
    p_last9: last9
  });
  if (tErr) throw new Error(tErr.message);
  const { data: userRows, error: uErr } = await client.rpc("find_staff_users_by_phone_last9", {
    p_last9: last9
  });
  if (uErr) throw new Error(uErr.message);
  const parents = parentRows || [];
  const teachers = teacherRows || [];
  const users = userRows || [];
  const schoolIdSet = /* @__PURE__ */ new Set();
  parents.forEach((p) => schoolIdSet.add(p.school_id));
  teachers.forEach((t) => schoolIdSet.add(t.school_id));
  users.forEach((u) => {
    if (u.school_id) schoolIdSet.add(u.school_id);
  });
  const schoolNames = await fetchSchoolNames(client, [...schoolIdSet]);
  const grouped = /* @__PURE__ */ new Map();
  for (const p of parents) {
    const key = `${p.school_id}::${p.parent_id}`;
    if (!grouped.has(key)) {
      grouped.set(key, { parent_id: p.parent_id, student_ids: /* @__PURE__ */ new Set() });
    }
    grouped.get(key).student_ids.add(p.student_id);
  }
  const parentSchools = [];
  for (const [key, g] of grouped) {
    const schoolId = key.split("::")[0];
    const studentIds = [...g.student_ids];
    const { data: studs } = await client.from("students").select("student_id, name, current_class").eq("school_id", schoolId).in("student_id", studentIds);
    const list = studs || [];
    parentSchools.push({
      school_id: schoolId,
      school_name: schoolNames.get(schoolId) || "School",
      parent_id: g.parent_id,
      students: list.sort((a, b) => a.name.localeCompare(b.name))
    });
  }
  const staffSchoolIds = /* @__PURE__ */ new Set();
  teachers.forEach((t) => staffSchoolIds.add(t.school_id));
  users.forEach((u) => {
    if (u.school_id) staffSchoolIds.add(u.school_id);
  });
  const staffSchools = [];
  for (const schoolId of staffSchoolIds) {
    const t = teachers.find((x) => x.school_id === schoolId) || null;
    const u = users.find((x) => x.school_id === schoolId) || null;
    let teacher_classes = [];
    if (t) {
      teacher_classes = await getMergedTeacherClassNames(client, schoolId, t.teacher_id);
    }
    const role = u?.role ?? null;
    const canVerify = roleCanVerifyReceipts(role);
    const broad = role ? roleCanViewBroadAttendance(role) : false;
    const canAttend = broad || role === "teacher" || role === "librarian" || !!t;
    staffSchools.push({
      school_id: schoolId,
      school_name: schoolNames.get(schoolId) || "School",
      teacher_id: t?.teacher_id ?? null,
      user_id: u?.user_id ?? null,
      role,
      teacher_classes,
      canVerifyReceipts: canVerify,
      canViewSchoolAttendance: canAttend,
      isSecretary: role === "secretary"
    });
  }
  staffSchools.sort((a, b) => a.school_name.localeCompare(b.school_name));
  const greetingNameParent = firstDistinctName(parents.map((p) => p.name));
  const greetingNameStaff = firstDistinctName([
    ...teachers.map((t) => t.name),
    ...users.map((u) => u.name)
  ]);
  return {
    last9,
    hasParent: parentSchools.length > 0,
    hasStaff: staffSchools.length > 0,
    greetingNameParent,
    greetingNameStaff,
    parentSchools,
    staffSchools
  };
}

// src/lib/whatsapp/sessionStore.ts
async function loadSession(client, waE164) {
  const { data, error } = await client.from("whatsapp_bot_sessions").select("step, context").eq("wa_e164", waE164).maybeSingle();
  if (error) throw new Error(error.message);
  const row = data;
  return {
    step: row?.step ?? "entry",
    context: row?.context ?? {}
  };
}
async function saveSession(client, waE164, step, context) {
  const { error } = await client.from("whatsapp_bot_sessions").upsert(
    {
      wa_e164: waE164,
      step,
      context,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    { onConflict: "wa_e164" }
  );
  if (error) throw new Error(error.message);
}
async function clearSession(client, waE164) {
  const { error } = await client.from("whatsapp_bot_sessions").delete().eq("wa_e164", waE164);
  if (error) throw new Error(error.message);
}

// src/lib/whatsapp/botEngine.ts
function parseIntMenu(text) {
  const t = text.trim();
  const m = t.match(/^(\d+)/);
  if (!m) return null;
  return parseInt(m[1], 10);
}
function parseDdMmYyyy(text) {
  const t = text.trim();
  const m = t.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}
function todayIso() {
  return schoolCalendarTodayIso();
}
function staffContextFromSession(ctx) {
  const raw = ctx.staffSchool;
  return raw ?? null;
}
function parentGroupFromSession(identity, ctx) {
  const idx = Number(ctx.parentSchoolIndex ?? 0);
  return identity.parentSchools[idx] ?? null;
}
function selectSchoolPayload(schools) {
  return {
    intent: "select_school",
    role: "system",
    schools: schools.map((s, i) => ({ index: i + 1, name: s.school_name }))
  };
}
function resolveGreetingName(identity, ctx) {
  const role = ctx.role;
  if (role === "staff") return identity.greetingNameStaff ?? identity.greetingNameParent;
  if (role === "parent") return identity.greetingNameParent ?? identity.greetingNameStaff;
  return identity.greetingNameParent ?? identity.greetingNameStaff ?? null;
}
function clearStaffSubflowContext(ctx) {
  delete ctx.staffAttendanceByClassCache;
  delete ctx.staffAttendanceDetailDate;
}
function clearParentSubflowContext(ctx) {
  delete ctx.student_id;
  delete ctx.pendingAction;
}
function directActionFromKeyword(text) {
  const t = text.toLowerCase().trim();
  if (!t || t.length > 64) return null;
  if (/^(hi|hello|hey)\b/.test(t) || /^good\s+(morning|afternoon|evening)\b/i.test(t)) return "menu";
  if (t === "menu" || t === "home" || t === "main menu" || t === "mainmenu" || t === "help" || t === "start") return "menu";
  if (/\b(fees?|balance|payment|pay)\b/.test(t)) return "fees";
  if (/\b(report|results?)\b/.test(t)) return "report";
  if (/\b(attend|attendance|present|absent)\b/.test(t)) return "attendance";
  if (/\b(schedule|timetable)\b/.test(t)) return "schedule";
  if (/\bclass(es)?\b/.test(t)) return "classes";
  if (/\b(receipt|verify)\b/.test(t)) return "receipt";
  if (/\b(summary|finance|revenue|overview)\b/.test(t)) return "summary";
  return null;
}
function wantsSoftMenuReset(text) {
  return directActionFromKeyword(text) === "menu";
}
var MAX_ATTENDANCE_CLASSES_WHATSAPP = 15;
async function classNamesForMyClassesList(client, sc) {
  if (sc.teacher_classes.length > 0) {
    return [...sc.teacher_classes].sort((a, b) => a.localeCompare(b));
  }
  if (sc.role && roleCanViewBroadAttendance(sc.role)) {
    const all = await getDistinctActiveClassNames(client, sc.school_id);
    return all.slice(0, 25);
  }
  return [];
}
async function classNamesForAttendanceByClass(client, sc) {
  if (sc.teacher_classes.length > 0) {
    return [...sc.teacher_classes].sort((a, b) => a.localeCompare(b)).slice(0, MAX_ATTENDANCE_CLASSES_WHATSAPP);
  }
  if (sc.role && roleCanViewBroadAttendance(sc.role)) {
    const all = await getDistinctActiveClassNames(client, sc.school_id);
    return all.slice(0, MAX_ATTENDANCE_CLASSES_WHATSAPP);
  }
  return [];
}
async function processInboundMessage(client, waDigits, waE164, messageText) {
  const text = (messageText || "").trim();
  const identity = await resolveIdentity(client, waDigits);
  if (!identity || !identity.hasParent && !identity.hasStaff) {
    return [];
  }
  let { step, context: ctx } = await loadSession(client, waE164);
  const n = parseIntMenu(text);
  if (n === 0 || n === 9 || text.toLowerCase() === "start over") {
    await clearSession(client, waE164);
    return processInboundMessage(client, waDigits, waE164, "");
  }
  const entryAction = step === "" || step === "entry" ? directActionFromKeyword(text) : null;
  if ((step === "" || step === "entry") && !entryAction) {
    return [];
  }
  const greet = resolveGreetingName(identity, ctx);
  const out = [];
  function fmt(p) {
    out.push({ type: "text", text: defaultMessageFormatter(p, { greetingName: greet }) });
  }
  async function persist() {
    await saveSession(client, waE164, step, ctx);
  }
  if (wantsSoftMenuReset(text) && step !== "" && step !== "entry") {
    const canStaff = ctx.role === "staff" && staffContextFromSession(ctx);
    const canParent = ctx.role === "parent" && parentGroupFromSession(identity, ctx);
    if (canStaff || canParent) {
      if (canStaff) {
        clearStaffSubflowContext(ctx);
        step = "staff_menu";
        const sc = staffContextFromSession(ctx);
        fmt({
          intent: "staff_menu",
          school_name: sc.school_name,
          can_verify_receipts: sc.canVerifyReceipts,
          can_view_school_summary: sc.canVerifyReceipts,
          is_secretary: sc.isSecretary
        });
      } else {
        clearParentSubflowContext(ctx);
        step = "parent_menu";
        const g = parentGroupFromSession(identity, ctx);
        fmt({
          intent: "parent_menu",
          school_name: g.school_name,
          show_all_balances: g.students.length > 1,
          show_another_school: identity.parentSchools.length > 1
        });
      }
      await persist();
      return out;
    }
  }
  if (step === "entry" || step === "") {
    const parentKeywords = ["fees", "report", "attendance"];
    const staffKeywords = ["schedule", "classes", "receipt", "summary"];
    let forcedRole = null;
    if (identity.hasParent && identity.hasStaff && entryAction && entryAction !== "menu") {
      if (parentKeywords.includes(entryAction)) forcedRole = "parent";
      else if (staffKeywords.includes(entryAction)) forcedRole = "staff";
    }
    if (identity.hasParent && identity.hasStaff && !forcedRole) {
      step = "role_pick";
      fmt({ intent: "role_pick" });
      await persist();
      return out;
    }
    const useParent = forcedRole === "parent" || !forcedRole && identity.hasParent;
    if (useParent) {
      ctx.role = "parent";
      if (identity.parentSchools.length > 1) {
        step = "parent_pick_school";
        fmt(selectSchoolPayload(identity.parentSchools));
      } else {
        ctx.parentSchoolIndex = 0;
        step = "parent_menu";
        const g = parentGroupFromSession(identity, ctx);
        fmt({
          intent: "parent_menu",
          school_name: g.school_name,
          show_all_balances: g.students.length > 1,
          show_another_school: false
        });
      }
      await persist();
      return out;
    }
    ctx.role = "staff";
    if (identity.staffSchools.length > 1) {
      step = "staff_pick_school";
      fmt(selectSchoolPayload(identity.staffSchools));
    } else {
      ctx.staffSchool = identity.staffSchools[0];
      step = "staff_menu";
      const sc = identity.staffSchools[0];
      fmt({
        intent: "staff_menu",
        school_name: sc.school_name,
        can_verify_receipts: sc.canVerifyReceipts,
        can_view_school_summary: sc.canVerifyReceipts,
        is_secretary: sc.isSecretary
      });
    }
    await persist();
    return out;
  }
  if (step === "role_pick" && n !== null) {
    if (n === 1) {
      ctx.role = "parent";
      if (identity.parentSchools.length > 1) {
        step = "parent_pick_school";
        fmt(selectSchoolPayload(identity.parentSchools));
      } else {
        ctx.parentSchoolIndex = 0;
        step = "parent_menu";
        const g0 = identity.parentSchools[0];
        fmt({
          intent: "parent_menu",
          school_name: g0.school_name,
          show_all_balances: g0.students.length > 1,
          show_another_school: false
        });
      }
    } else if (n === 2) {
      ctx.role = "staff";
      if (identity.staffSchools.length > 1) {
        step = "staff_pick_school";
        fmt(selectSchoolPayload(identity.staffSchools));
      } else {
        ctx.staffSchool = identity.staffSchools[0];
        step = "staff_menu";
        const sc0 = identity.staffSchools[0];
        fmt({
          intent: "staff_menu",
          school_name: sc0.school_name,
          can_verify_receipts: sc0.canVerifyReceipts,
          can_view_school_summary: sc0.canVerifyReceipts,
          is_secretary: sc0.isSecretary
        });
      }
    } else {
      fmt({ intent: "prompt_pick_1_or_2" });
    }
    await persist();
    return out;
  }
  if (step === "parent_pick_school" && n !== null) {
    const g = identity.parentSchools[n - 1];
    if (!g) {
      fmt({ intent: "invalid_option" });
      await persist();
      return out;
    }
    ctx.parentSchoolIndex = n - 1;
    step = "parent_menu";
    fmt({
      intent: "parent_menu",
      school_name: g.school_name,
      show_all_balances: g.students.length > 1,
      show_another_school: identity.parentSchools.length > 1
    });
    await persist();
    return out;
  }
  if (step === "parent_menu" && n !== null) {
    const g = parentGroupFromSession(identity, ctx);
    if (!g) {
      step = "entry";
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    const schoolId = g.school_id;
    const showAllBalances = g.students.length > 1;
    const showAnotherSchool = identity.parentSchools.length > 1;
    const allBalancesOpt = showAllBalances ? 4 : 0;
    const anotherSchoolOpt = showAnotherSchool ? showAllBalances ? 5 : 4 : 0;
    if (n === allBalancesOpt && allBalancesOpt > 0) {
      const balances = await getAllChildrenBalances(client, schoolId, g.students);
      fmt({
        intent: "all_children_balances",
        school_name: g.school_name,
        children: balances
      });
      step = "parent_menu";
      await persist();
      return out;
    }
    if (n === anotherSchoolOpt && anotherSchoolOpt > 0) {
      step = "parent_pick_school";
      fmt(selectSchoolPayload(identity.parentSchools));
      await persist();
      return out;
    }
    if (n === 1) {
      ctx.pendingAction = "balance";
      if (g.students.length > 1) {
        step = "parent_pick_child";
        fmt({
          intent: "child_picker",
          school_name: g.school_name,
          children: g.students.map((s, i) => ({
            index: i + 1,
            name: s.name,
            class_name: s.current_class || "\u2014"
          }))
        });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        const st = g.students[0];
        const metrics = await getParentFeeBalanceMetrics(client, schoolId, ctx.student_id);
        fmt({
          intent: "fee_balance",
          role: "parent",
          school_name: g.school_name,
          student_name: st.name,
          total_fees: metrics.total_fees,
          paid: metrics.paid,
          outstanding: metrics.outstanding,
          currency: "UGX"
        });
        fmt({ intent: "parent_fee_submenu", student_name: st.name });
        step = "parent_fee_submenu";
      }
      await persist();
      return out;
    }
    if (n === 2) {
      ctx.pendingAction = "report";
      if (g.students.length > 1) {
        step = "parent_pick_child";
        fmt({
          intent: "child_picker",
          school_name: g.school_name,
          children: g.students.map((s, i) => ({
            index: i + 1,
            name: s.name,
            class_name: s.current_class || "\u2014"
          }))
        });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        const r = await getLatestReportPdfForStudent(client, schoolId, ctx.student_id);
        if (r.url) {
          fmt({ intent: "report_sending", label: r.label });
          out.push({ type: "document", url: r.url, fileName: "report-card.pdf", caption: r.label });
        } else {
          fmt({ intent: "report_unavailable", label: r.label });
        }
        step = "parent_menu";
      }
      await persist();
      return out;
    }
    if (n === 3) {
      ctx.pendingAction = "attendance";
      if (g.students.length > 1) {
        step = "parent_pick_child";
        fmt({
          intent: "child_picker",
          school_name: g.school_name,
          children: g.students.map((s, i) => ({
            index: i + 1,
            name: s.name,
            class_name: s.current_class || "\u2014"
          }))
        });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        step = "parent_attendance_sub";
        fmt({ intent: "attendance_submenu", student_name: null });
      }
      await persist();
      return out;
    }
    return out;
  }
  if (step === "parent_pick_child" && n !== null) {
    const g = parentGroupFromSession(identity, ctx);
    if (!g) {
      step = "entry";
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    const child = g.students[n - 1];
    if (!child) {
      fmt({ intent: "invalid_option" });
      await persist();
      return out;
    }
    ctx.student_id = child.student_id;
    const schoolId = g.school_id;
    const action = ctx.pendingAction;
    if (action === "balance") {
      const metrics = await getParentFeeBalanceMetrics(client, schoolId, child.student_id);
      fmt({
        intent: "fee_balance",
        role: "parent",
        school_name: g.school_name,
        student_name: child.name,
        total_fees: metrics.total_fees,
        paid: metrics.paid,
        outstanding: metrics.outstanding,
        currency: "UGX"
      });
      fmt({ intent: "parent_fee_submenu", student_name: child.name });
      step = "parent_fee_submenu";
    } else if (action === "report") {
      const r = await getLatestReportPdfForStudent(client, schoolId, child.student_id);
      if (r.url) {
        fmt({ intent: "report_sending", label: r.label });
        out.push({ type: "document", url: r.url, fileName: "report-card.pdf", caption: r.label });
      } else {
        fmt({ intent: "report_unavailable", label: r.label });
      }
      step = "parent_menu";
    } else if (action === "attendance") {
      step = "parent_attendance_sub";
      fmt({ intent: "attendance_submenu", student_name: child.name });
    }
    await persist();
    return out;
  }
  if (step === "parent_fee_submenu" && n !== null) {
    const g = parentGroupFromSession(identity, ctx);
    const sid = ctx.student_id;
    if (!g || !sid) {
      step = "parent_menu";
      await persist();
      return processInboundMessage(client, waDigits, waE164, "");
    }
    const stName = g.students.find((s) => s.student_id === sid)?.name || "Student";
    if (n === 1) {
      const rows = await getStudentPaymentHistory(client, g.school_id, sid);
      fmt({ intent: "payment_history", student_name: stName, rows });
      step = "parent_menu";
    } else if (n === 2) {
      const rows = await getStudentTermFeeSummary(client, g.school_id, sid);
      fmt({ intent: "term_fee_breakdown", student_name: stName, rows });
      step = "parent_menu";
    } else {
      step = "parent_menu";
    }
    await persist();
    return out;
  }
  if (step === "parent_attendance_sub" && n !== null) {
    const g = parentGroupFromSession(identity, ctx);
    const sid = ctx.student_id;
    if (!g || !sid) {
      step = "parent_menu";
      await persist();
      return processInboundMessage(client, waDigits, waE164, "");
    }
    const stName = g.students.find((s) => s.student_id === sid)?.name || "Student";
    if (n === 1) {
      const msg = await getParentAttendanceSummary(client, g.school_id, sid, "today");
      fmt({
        intent: "attendance_summary",
        role: "parent",
        student_name: stName,
        body: msg
      });
      step = "parent_menu";
    } else if (n === 2) {
      const msg = await getParentAttendanceSummary(client, g.school_id, sid, "week");
      fmt({
        intent: "attendance_summary",
        role: "parent",
        student_name: stName,
        body: msg
      });
      step = "parent_menu";
    } else if (n === 3) {
      step = "parent_await_date";
      fmt({ intent: "prompt_date_generic" });
    }
    await persist();
    return out;
  }
  if (step === "parent_await_date") {
    const g = parentGroupFromSession(identity, ctx);
    const sid = ctx.student_id;
    const d = parseDdMmYyyy(text);
    if (!g || !sid || !d) {
      fmt({ intent: "invalid_date" });
      await persist();
      return out;
    }
    const stName = g.students.find((s) => s.student_id === sid)?.name || "Student";
    const msg = await getParentAttendanceSummary(client, g.school_id, sid, "date", d);
    fmt({
      intent: "attendance_summary",
      role: "parent",
      student_name: stName,
      body: msg
    });
    step = "parent_menu";
    await persist();
    return out;
  }
  if (step === "staff_pick_school" && n !== null) {
    const s = identity.staffSchools[n - 1];
    if (!s) {
      fmt({ intent: "invalid_option" });
      await persist();
      return out;
    }
    ctx.staffSchool = s;
    step = "staff_menu";
    fmt({
      intent: "staff_menu",
      school_name: s.school_name,
      can_verify_receipts: s.canVerifyReceipts,
      can_view_school_summary: s.canVerifyReceipts,
      is_secretary: s.isSecretary
    });
    await persist();
    return out;
  }
  if (step === "staff_attendance_followup" && n !== null) {
    const sc = staffContextFromSession(ctx);
    if (!sc) {
      step = "entry";
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    if (n !== 1) {
      return out;
    }
    const dateIso = ctx.staffAttendanceDetailDate || todayIso();
    const classNames = await classNamesForAttendanceByClass(client, sc);
    if (classNames.length === 0) {
      fmt({
        intent: "staff_feature_unavailable",
        title: "Attendance by class",
        message: "No classes are linked to your profile for a class breakdown. Ask your admin to assign your classes."
      });
      clearStaffSubflowContext(ctx);
      step = "staff_menu";
      await persist();
      return out;
    }
    const breakdown = await getAttendanceBreakdownByClasses(client, sc.school_id, dateIso, classNames);
    ctx.staffAttendanceByClassCache = breakdown.map((b) => ({
      class_name: b.class_name,
      present: b.present,
      absent: b.absent
    }));
    ctx.staffAttendanceDetailDate = dateIso;
    fmt({
      intent: "staff_attendance_by_class_list",
      date_label: dateIso,
      rows: breakdown.map((b) => ({
        class_name: b.class_name,
        present: b.present,
        absent: b.absent
      }))
    });
    step = "staff_attendance_pick_class_absent";
    await persist();
    return out;
  }
  if (step === "staff_attendance_pick_class_absent" && n !== null) {
    const sc = staffContextFromSession(ctx);
    if (!sc) {
      step = "entry";
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    const cache = ctx.staffAttendanceByClassCache;
    const dateIso = ctx.staffAttendanceDetailDate || todayIso();
    if (!cache?.length) {
      step = "staff_menu";
      await persist();
      return out;
    }
    const picked = cache[n - 1];
    if (!picked) {
      return out;
    }
    const stats = await getStaffAttendanceStats(client, sc.school_id, dateIso, "classes", [picked.class_name]);
    const namesText = stats.absent === 0 ? "\u2014 No absent learners recorded \u2014" : stats.absentNames.length > 0 ? stats.absentNames.map((nm) => `\xB7 ${nm}`).join("\n") : `(${stats.absent} absent \u2014 names not listed here)`;
    fmt({
      intent: "staff_class_absent_detail",
      class_name: picked.class_name,
      date_label: dateIso,
      absent_count: stats.absent,
      names_text: namesText
    });
    fmt({
      intent: "staff_attendance_by_class_list",
      date_label: dateIso,
      rows: cache.map((b) => ({
        class_name: b.class_name,
        present: b.present,
        absent: b.absent
      }))
    });
    step = "staff_attendance_pick_class_absent";
    await persist();
    return out;
  }
  if (step === "staff_menu" && n !== null) {
    const sc = staffContextFromSession(ctx);
    if (!sc) {
      step = "entry";
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    if (sc.isSecretary) {
      if (n === 1) {
        const dateIso = todayIso();
        const stats = await getStaffAttendanceStats(client, sc.school_id, dateIso, "whole_school", null);
        ctx.staffAttendanceDetailDate = dateIso;
        fmt({ intent: "staff_attendance_today_intro", date_label: dateIso, present: stats.present, absent: stats.absent });
        step = "staff_attendance_followup";
        await persist();
        return out;
      }
      if (n === 2) {
        if (!sc.user_id) {
          fmt({ intent: "staff_feature_unavailable", title: "Notifications", message: "No staff login linked. Open PwezaCore on the web to view alerts." });
        } else {
          const rows = await getRecentInAppNotificationsForUser(client, sc.school_id, sc.user_id, 8);
          const lines = rows.map((r) => {
            const dt = r.created_at ? r.created_at.slice(0, 10) : "\u2014";
            return `*${dt}* \xB7 ${r.title || "Notice"}
${(r.body || "").trim() || "\u2014"}`;
          });
          fmt({ intent: "staff_notifications_inbox", lines });
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
        step = "staff_my_classes_pick";
      }
      fmt({ intent: "staff_my_classes", class_names: classNames });
      await persist();
      return out;
    }
    if (n === 2) {
      if (!sc.teacher_id) {
        fmt({
          intent: "staff_feature_unavailable",
          title: "Today's schedule",
          message: "Your account is not linked to a teacher profile. Open PwezaCore on the web for school-wide tools."
        });
      } else {
        const rows = await getTeacherTimetableRows(client, sc.school_id, sc.teacher_id);
        const dayIx = timetableDayIndexFromDate(/* @__PURE__ */ new Date());
        const todayRows = rows.filter((r) => r.day_of_week === dayIx);
        const lines = todayRows.map((r) => {
          const t = `${r.start_time.slice(0, 5)}\u2013${r.end_time.slice(0, 5)}`;
          return `\xB7 ${t} \xB7 *${r.class_name}* \xB7 ${r.subject}${r.room ? ` \xB7 ${r.room}` : ""}`;
        });
        fmt({ intent: "staff_schedule_today", lines, day_label: timetableDayLabel(timetableDayIndexFromDate(/* @__PURE__ */ new Date())) });
      }
      await persist();
      return out;
    }
    if (n === 3) {
      if (!sc.teacher_id) {
        fmt({
          intent: "staff_feature_unavailable",
          title: "My timetable",
          message: "Your account is not linked to a teacher profile. Open PwezaCore on the web to view schedules."
        });
      } else {
        const rows = await getTeacherTimetableRows(client, sc.school_id, sc.teacher_id);
        fmt({ intent: "staff_timetable_week", body: formatTimetableRowsForWhatsapp(rows) });
      }
      await persist();
      return out;
    }
    if (n === 4) {
      const dateIso = todayIso();
      const scope = attendanceScopeForStaff(sc);
      const stats = await getStaffAttendanceStats(client, sc.school_id, dateIso, scope.kind, scope.classes);
      ctx.staffAttendanceDetailDate = dateIso;
      fmt({ intent: "staff_attendance_today_intro", date_label: dateIso, present: stats.present, absent: stats.absent });
      step = "staff_attendance_followup";
      await persist();
      return out;
    }
    if (n === 5) {
      if (!sc.user_id) {
        fmt({
          intent: "staff_feature_unavailable",
          title: "Notifications",
          message: "No staff login is linked for inbox notifications. Open PwezaCore in the browser to view alerts."
        });
      } else {
        const rows = await getRecentInAppNotificationsForUser(client, sc.school_id, sc.user_id, 8);
        const lines = rows.map((r) => {
          const dt = r.created_at ? r.created_at.slice(0, 10) : "\u2014";
          return `*${dt}* \xB7 ${r.title || "Notice"}
${(r.body || "").trim() || "\u2014"}`;
        });
        fmt({ intent: "staff_notifications_inbox", lines });
      }
      await persist();
      return out;
    }
    if (n === 6 && sc.canVerifyReceipts) {
      const summary = await getSchoolFinanceSummary(client, sc.school_id);
      fmt({
        intent: "staff_school_summary",
        school_name: sc.school_name,
        date_label: todayIso(),
        ...summary
      });
      await persist();
      return out;
    }
    if (n === 7 && sc.canVerifyReceipts) {
      step = "staff_await_receipt";
      fmt({ intent: "prompt_receipt_ref" });
      await persist();
      return out;
    }
    return out;
  }
  if (step === "staff_my_classes_pick" && n !== null) {
    const sc = staffContextFromSession(ctx);
    const classNames = ctx.staffMyClassesCache ?? [];
    if (!sc || classNames.length === 0) {
      step = "staff_menu";
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    const picked = classNames[n - 1];
    if (!picked) {
      fmt({ intent: "invalid_option" });
      await persist();
      return out;
    }
    const students = await getStudentsInClass(client, sc.school_id, picked);
    fmt({
      intent: "staff_class_students",
      class_name: picked,
      students: students.map((s, i) => ({ index: i + 1, name: s.name }))
    });
    step = "staff_menu";
    delete ctx.staffMyClassesCache;
    await persist();
    return out;
  }
  if (step === "staff_await_receipt") {
    const sc = staffContextFromSession(ctx);
    if (!sc) {
      step = "entry";
      await persist();
      return processInboundMessage(client, waDigits, waE164, text);
    }
    const msg = await verifyReceiptByRef(client, sc.school_id, text);
    fmt({
      intent: "receipt_lookup",
      role: "staff",
      body: msg || "No receipt matching that reference for this school."
    });
    step = "staff_menu";
    await persist();
    return out;
  }
  return out;
}
function attendanceScopeForStaff(sc) {
  const role = sc.role;
  if (role && roleCanViewBroadAttendance(role)) {
    return { kind: "whole_school", classes: null };
  }
  if (sc.teacher_classes.length > 0) {
    return { kind: "classes", classes: sc.teacher_classes };
  }
  return { kind: "whole_school", classes: null };
}

// src/lib/whatsapp/parseInboundPayload.ts
function extractInboundPayload(body) {
  const b = body;
  const ev = String(b.event || "");
  if (!ev.includes("message") && !ev.includes("upsert")) {
    return null;
  }
  const data = b.data;
  if (!data) return null;
  let rawMsg = data.messages;
  if (Array.isArray(rawMsg)) rawMsg = rawMsg[0];
  if (!rawMsg || typeof rawMsg !== "object") return null;
  const msg = rawMsg;
  const key = msg.key;
  if (!key) return null;
  if (key.fromMe === true || key.fromMe === "true") return null;
  const remoteJid = String(key.remoteJid || "");
  if (remoteJid.includes("@g.us")) return null;
  const bodyText = String(
    msg.messageBody ?? msg.message?.conversation ?? ""
  ).trim();
  if (!bodyText) return null;
  const cleaned = String(key.cleanedSenderPn || key.senderPn || remoteJid || "").replace(/@s\.whatsapp\.net/gi, "");
  const d = digitsOnly(cleaned);
  if (d.length < 9) return null;
  return { fromDigits: d, text: bodyText };
}

// src/lib/whatsapp/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";
var cached = null;
function getSupabaseAdmin() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for WhatsApp webhook");
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return cached;
}

// src/lib/whatsapp/wasenderVercelHandler.ts
var config = { runtime: "nodejs", maxDuration: 60 };
function headerValue(req, name) {
  const h = req.headers;
  if (!h) return void 0;
  const v = h[name.toLowerCase()] ?? h[name];
  if (Array.isArray(v)) return v[0];
  return v;
}
function parseJsonBody(req) {
  const raw = req.body;
  if (raw == null) return void 0;
  if (typeof raw === "object" && !Buffer.isBuffer(raw)) return raw;
  const s = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
  return JSON.parse(s);
}
async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const secret = process.env.WASENDER_WEBHOOK_SECRET;
  if (secret) {
    const sig = headerValue(req, "x-webhook-signature");
    if (sig !== secret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }
  let body;
  try {
    body = parseJsonBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }
  const inbound = extractInboundPayload(body);
  if (!inbound) {
    return res.status(200).json({ ok: true, ignored: true });
  }
  const { fromDigits, text } = inbound;
  const waE164 = toUgandaE164FromDigits(fromDigits);
  try {
    const admin = getSupabaseAdmin();
    const msgs = await processInboundMessage(admin, fromDigits, waE164, text);
    const wa = createWasenderProvider();
    for (const m of msgs) {
      if (m.type === "text") {
        const r = await wa.sendText({ toE164: waE164, text: m.text });
        if (!r.ok) console.warn("[wasender] sendText failed", r.error);
      } else {
        const r = await wa.sendDocument({
          toE164: waE164,
          documentUrl: m.url,
          fileName: m.fileName,
          caption: m.caption
        });
        if (!r.ok) console.warn("[wasender] sendDocument failed", r.error);
      }
    }
  } catch (e) {
    console.error("[wasender webhook]", e);
  }
  return res.status(200).json({ ok: true });
}
export {
  config,
  handler as default
};
