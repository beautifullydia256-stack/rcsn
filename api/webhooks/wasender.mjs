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
function whatsappNavFooter() {
  return "\n\n0 \u2014 Menu \xB7 9 \u2014 Start over";
}
function fmtUgx(n) {
  return `UGX ${Math.round(n).toLocaleString("en-UG")}`;
}
function defaultMessageFormatter(payload) {
  const f = whatsappNavFooter();
  switch (payload.intent) {
    case "unregistered":
      return `This number is not registered with PwezaCore. Please use the phone on your school profile or contact the office.${f}`;
    case "role_pick":
      return `Hi! You're on file as both a parent and staff.

1 \u2014 Parent (fees, reports, attendance)
2 \u2014 Staff (attendance, receipt lookup)${f}`;
    case "select_school": {
      const lines = payload.schools.map((s) => `${s.index} \u2014 ${s.name}`).join("\n");
      return `Select school:
${lines}${f}`;
    }
    case "parent_menu": {
      let t = `${payload.school_name} \u2014 Parent menu

1 \u2014 Fee balance
2 \u2014 Report card (latest PDF)
3 \u2014 Attendance
`;
      if (payload.show_another_school) t += `4 \u2014 Another school
`;
      return t + f;
    }
    case "staff_menu": {
      let t = `${payload.school_name} \u2014 Staff menu

1 \u2014 Attendance today
2 \u2014 Attendance on a date
3 \u2014 Who was absent (names)
`;
      if (payload.can_verify_receipts) t += `4 \u2014 Verify receipt
`;
      return t + f;
    }
    case "child_picker": {
      const lines = payload.children.map((s) => `${s.index} \u2014 ${s.name} (${s.class_name || "\u2014"})`).join("\n");
      return `Choose child:
${lines}${f}`;
    }
    case "attendance_submenu": {
      const who = payload.student_name ? `Attendance for ${payload.student_name}` : "Attendance";
      return `${who} \u2014 choose:
1 \u2014 Today
2 \u2014 This week (Mon\u2013Sun)
3 \u2014 Specific date (DD-MM-YYYY)${f}`;
    }
    case "fee_balance":
      return `Fees summary
Total fees (all terms): ${fmtUgx(payload.total_fees)}
Paid: ${fmtUgx(payload.paid)}
Outstanding: ${fmtUgx(payload.outstanding)}${f}`;
    case "report_sending":
      return `Sending: ${payload.label}${f}`;
    case "report_unavailable":
      return `${payload.label}${f}`;
    case "attendance_summary":
      return `${payload.body}${f}`;
    case "staff_attendance_stats":
      return `${payload.date_label}
Present: ${payload.present}
Absent: ${payload.absent}${f}`;
    case "staff_absent_list":
      return `Absent on ${payload.date_iso} (${payload.absent_count}): ${payload.names_text}${f}`;
    case "receipt_lookup":
      return `${payload.body}${f}`;
    case "invalid_option":
      return `Invalid option.${f}`;
    case "invalid_date":
      return `Invalid date. Use DD-MM-YYYY${f}`;
    case "prompt_pick_1_or_2":
      return `Reply 1 or 2.${f}`;
    case "prompt_pick_1_2_3":
      return `1, 2, or 3.${f}`;
    case "prompt_date_generic":
      return `Send date as DD-MM-YYYY${f}`;
    case "prompt_date_absent":
      return `Send date for absent list (DD-MM-YYYY)${f}`;
    case "prompt_receipt_ref":
      return `Send the receipt number or payment ID.${f}`;
    case "use_menu_option":
      return `Use a menu option.${f}`;
    case "reply_menu_number":
      return `Reply with a number from the menu.${f}`;
    default: {
      const _exhaustive = payload;
      return _exhaustive;
    }
  }
}

// src/lib/ai/grokClient.ts
var SYSTEM_PROMPT = `You are a professional school assistant for PwezaCore.

Your role is to convert structured school data into clear, polite, and professional WhatsApp messages.

Rules:
- Do NOT change or invent any data.
- Do NOT add assumptions.
- Only use the data provided in the JSON payload.
- Keep responses short, clear, and friendly.
- Use simple English for parents.
- Optionally include polite emojis (not excessive; at most one or two per message).
- Preserve all numbers, dates, currency amounts, names, and menu option numbers exactly as given.
- For menu-style intents, keep numbered options readable and in order.
- Do NOT add navigation lines such as "0 \u2014 Menu" or "9 \u2014 Start over" (they are appended separately).
- Do NOT say you are an AI, Grok, or xAI, and do not add your own "enhanced by AI" disclaimers (the app adds one line for transparency).

Output only the final message body text, with no surrounding quotes or markdown code fences.`;
var GROK_TIMEOUT_MS = 2800;
function grokAttributionSuffix() {
  const v = process.env.GROK_REPLY_ATTRIBUTION?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "no" || v === "off") return "";
  return "\n\n\u2728 Wording enhanced with Grok AI (xAI). Numbers and facts come only from your school\u2019s data in PwezaCore.";
}
function isNonEmptyString(s) {
  return typeof s === "string" && s.trim().length > 0;
}
async function formatWhatsappReply(payload) {
  const fallback = defaultMessageFormatter(payload);
  const apiKey = process.env.GROK_API_KEY?.trim();
  const baseRaw = (process.env.GROK_API_BASE_URL || "https://api.x.ai/v1").replace(/\/$/, "");
  if (!apiKey) return fallback;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROK_TIMEOUT_MS);
  try {
    const model = process.env.GROK_MODEL?.trim() || "grok-3-mini";
    const res = await fetch(`${baseRaw}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Convert this JSON payload into the WhatsApp message body.

${JSON.stringify(payload)}`
          }
        ]
      }),
      signal: controller.signal
    });
    if (!res.ok) return fallback;
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content;
    const text = typeof raw === "string" ? raw.trim() : "";
    if (!isNonEmptyString(text) || text.length > 4500) return fallback;
    return `${text}${grokAttributionSuffix()}${whatsappNavFooter()}`;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timer);
  }
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
  return role === "admin" || role === "accountant" || role === "owner" || role === "head_teacher";
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
      const { data: tFull } = await client.from("teachers").select("classes").eq("teacher_id", t.teacher_id).maybeSingle();
      const cl = tFull?.classes;
      teacher_classes = Array.isArray(cl) ? cl : [];
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
      canViewSchoolAttendance: canAttend
    });
  }
  staffSchools.sort((a, b) => a.school_name.localeCompare(b.school_name));
  return {
    last9,
    hasParent: parentSchools.length > 0,
    hasStaff: staffSchools.length > 0,
    parentSchools,
    staffSchools
  };
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
  if (typeof row.present === "boolean") return row.present;
  const s = String(row.status || "").toLowerCase();
  if (s === "absent") return false;
  return s === "present" || s === "late" || s === "excused";
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
function startOfWeekMonday(d) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const x = new Date(d);
  x.setDate(d.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfWeekSunday(d) {
  const start = startOfWeekMonday(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}
async function getParentAttendanceSummary(client, schoolId, studentId, kind, dateIso) {
  const today = /* @__PURE__ */ new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  let start = iso(today);
  let end = start;
  if (kind === "week") {
    start = iso(startOfWeekMonday(today));
    end = iso(endOfWeekSunday(today));
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
async function getStaffAttendanceStats(client, schoolId, dateIso, scope, classNames) {
  let studentIds = null;
  if (scope === "classes" && classNames && classNames.length > 0) {
    const { data: studs } = await client.from("students").select("student_id, name, current_class").eq("school_id", schoolId).eq("status", "active").in("current_class", classNames);
    studentIds = (studs || []).map((s) => s.student_id);
    if (studentIds.length === 0) return { present: 0, absent: 0, absentNames: [] };
  }
  let q = client.from("student_attendance").select("student_id, present, status").eq("school_id", schoolId).eq("attendance_date", dateIso);
  if (studentIds) q = q.in("student_id", studentIds);
  const { data: rows } = await q;
  const list = rows || [];
  let present = 0;
  let absent = 0;
  const absentIds = [];
  for (const r of list) {
    if (studentAttendanceRowIsPresent(r)) {
      present++;
    } else {
      absent++;
      absentIds.push(r.student_id);
    }
  }
  let absentNames = [];
  if (absentIds.length > 0 && absentIds.length <= 40) {
    const { data: names } = await client.from("students").select("student_id, name").eq("school_id", schoolId).in("student_id", absentIds);
    absentNames = (names || []).map((x) => x.name).filter(Boolean);
  }
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
async function pushFormatted(out, payload) {
  out.push({ type: "text", text: await formatWhatsappReply(payload) });
}
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
  return d.toISOString().slice(0, 10);
}
function todayIso() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
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
async function processInboundMessage(client, waDigits, waE164, messageText) {
  const text = (messageText || "").trim();
  const identity = await resolveIdentity(client, waDigits);
  if (!identity || !identity.hasParent && !identity.hasStaff) {
    return [{ type: "text", text: await formatWhatsappReply({ intent: "unregistered" }) }];
  }
  let { step, context: ctx } = await loadSession(client, waE164);
  const n = parseIntMenu(text);
  if (n === 9 || text.toLowerCase() === "start over") {
    await clearSession(client, waE164);
    return processInboundMessage(client, waDigits, waE164, "");
  }
  if (n === 0) {
    if (ctx.role === "staff") {
      step = "staff_menu";
      if (!ctx.staffSchool && identity.staffSchools.length === 1) {
        ctx.staffSchool = identity.staffSchools[0];
      }
    } else if (ctx.role === "parent") {
      step = "parent_menu";
      if (ctx.parentSchoolIndex == null && identity.parentSchools.length === 1) {
        ctx.parentSchoolIndex = 0;
      }
    } else {
      step = "entry";
    }
  }
  const out = [];
  async function persist() {
    await saveSession(client, waE164, step, ctx);
  }
  if (n === 0 && step === "parent_menu") {
    const g = parentGroupFromSession(identity, ctx);
    if (g) {
      await pushFormatted(out, {
        intent: "parent_menu",
        school_name: g.school_name,
        show_another_school: identity.parentSchools.length > 1
      });
      await persist();
      return out;
    }
  }
  if (n === 0 && step === "staff_menu") {
    const sc = staffContextFromSession(ctx);
    if (sc) {
      await pushFormatted(out, {
        intent: "staff_menu",
        school_name: sc.school_name,
        can_verify_receipts: sc.canVerifyReceipts
      });
      await persist();
      return out;
    }
  }
  if (step === "entry" || step === "") {
    if (identity.hasParent && identity.hasStaff) {
      step = "role_pick";
      await pushFormatted(out, { intent: "role_pick" });
      await persist();
      return out;
    }
    if (identity.hasParent) {
      ctx.role = "parent";
      if (identity.parentSchools.length > 1) {
        step = "parent_pick_school";
        await pushFormatted(out, selectSchoolPayload(identity.parentSchools));
      } else {
        ctx.parentSchoolIndex = 0;
        step = "parent_menu";
        const g = parentGroupFromSession(identity, ctx);
        await pushFormatted(out, {
          intent: "parent_menu",
          school_name: g.school_name,
          show_another_school: identity.parentSchools.length > 1
        });
      }
      await persist();
      return out;
    }
    ctx.role = "staff";
    if (identity.staffSchools.length > 1) {
      step = "staff_pick_school";
      await pushFormatted(out, selectSchoolPayload(identity.staffSchools));
    } else {
      ctx.staffSchool = identity.staffSchools[0];
      step = "staff_menu";
      await pushFormatted(out, {
        intent: "staff_menu",
        school_name: identity.staffSchools[0].school_name,
        can_verify_receipts: identity.staffSchools[0].canVerifyReceipts
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
        await pushFormatted(out, selectSchoolPayload(identity.parentSchools));
      } else {
        ctx.parentSchoolIndex = 0;
        step = "parent_menu";
        await pushFormatted(out, {
          intent: "parent_menu",
          school_name: identity.parentSchools[0].school_name,
          show_another_school: identity.parentSchools.length > 1
        });
      }
    } else if (n === 2) {
      ctx.role = "staff";
      if (identity.staffSchools.length > 1) {
        step = "staff_pick_school";
        await pushFormatted(out, selectSchoolPayload(identity.staffSchools));
      } else {
        ctx.staffSchool = identity.staffSchools[0];
        step = "staff_menu";
        await pushFormatted(out, {
          intent: "staff_menu",
          school_name: identity.staffSchools[0].school_name,
          can_verify_receipts: identity.staffSchools[0].canVerifyReceipts
        });
      }
    } else {
      await pushFormatted(out, { intent: "prompt_pick_1_or_2" });
    }
    await persist();
    return out;
  }
  if (step === "parent_pick_school" && n !== null) {
    const g = identity.parentSchools[n - 1];
    if (!g) {
      await pushFormatted(out, { intent: "invalid_option" });
      await persist();
      return out;
    }
    ctx.parentSchoolIndex = n - 1;
    step = "parent_menu";
    await pushFormatted(out, {
      intent: "parent_menu",
      school_name: g.school_name,
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
    if (n === 4 && identity.parentSchools.length > 1) {
      step = "parent_pick_school";
      await pushFormatted(out, selectSchoolPayload(identity.parentSchools));
      await persist();
      return out;
    }
    if (n === 1) {
      ctx.pendingAction = "balance";
      if (g.students.length > 1) {
        step = "parent_pick_child";
        await pushFormatted(out, {
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
        await pushFormatted(out, {
          intent: "fee_balance",
          role: "parent",
          school_name: g.school_name,
          student_name: st.name,
          total_fees: metrics.total_fees,
          paid: metrics.paid,
          outstanding: metrics.outstanding,
          currency: "UGX"
        });
        step = "parent_menu";
      }
      await persist();
      return out;
    }
    if (n === 2) {
      ctx.pendingAction = "report";
      if (g.students.length > 1) {
        step = "parent_pick_child";
        await pushFormatted(out, {
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
          await pushFormatted(out, { intent: "report_sending", label: r.label });
          out.push({ type: "document", url: r.url, fileName: "report-card.pdf", caption: r.label });
        } else {
          await pushFormatted(out, { intent: "report_unavailable", label: r.label });
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
        await pushFormatted(out, {
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
        await pushFormatted(out, { intent: "attendance_submenu", student_name: null });
      }
      await persist();
      return out;
    }
    await pushFormatted(out, { intent: "use_menu_option" });
    await persist();
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
      await pushFormatted(out, { intent: "invalid_option" });
      await persist();
      return out;
    }
    ctx.student_id = child.student_id;
    const schoolId = g.school_id;
    const action = ctx.pendingAction;
    if (action === "balance") {
      const metrics = await getParentFeeBalanceMetrics(client, schoolId, child.student_id);
      await pushFormatted(out, {
        intent: "fee_balance",
        role: "parent",
        school_name: g.school_name,
        student_name: child.name,
        total_fees: metrics.total_fees,
        paid: metrics.paid,
        outstanding: metrics.outstanding,
        currency: "UGX"
      });
      step = "parent_menu";
    } else if (action === "report") {
      const r = await getLatestReportPdfForStudent(client, schoolId, child.student_id);
      if (r.url) {
        await pushFormatted(out, { intent: "report_sending", label: r.label });
        out.push({ type: "document", url: r.url, fileName: "report-card.pdf", caption: r.label });
      } else {
        await pushFormatted(out, { intent: "report_unavailable", label: r.label });
      }
      step = "parent_menu";
    } else if (action === "attendance") {
      step = "parent_attendance_sub";
      await pushFormatted(out, { intent: "attendance_submenu", student_name: child.name });
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
      return processInboundMessage(client, waDigits, waE164, "0");
    }
    const stName = g.students.find((s) => s.student_id === sid)?.name || "Student";
    if (n === 1) {
      const msg = await getParentAttendanceSummary(client, g.school_id, sid, "today");
      await pushFormatted(out, {
        intent: "attendance_summary",
        role: "parent",
        student_name: stName,
        body: msg
      });
      step = "parent_menu";
    } else if (n === 2) {
      const msg = await getParentAttendanceSummary(client, g.school_id, sid, "week");
      await pushFormatted(out, {
        intent: "attendance_summary",
        role: "parent",
        student_name: stName,
        body: msg
      });
      step = "parent_menu";
    } else if (n === 3) {
      step = "parent_await_date";
      await pushFormatted(out, { intent: "prompt_date_generic" });
    } else {
      await pushFormatted(out, { intent: "prompt_pick_1_2_3" });
    }
    await persist();
    return out;
  }
  if (step === "parent_await_date") {
    const g = parentGroupFromSession(identity, ctx);
    const sid = ctx.student_id;
    const d = parseDdMmYyyy(text);
    if (!g || !sid || !d) {
      await pushFormatted(out, { intent: "invalid_date" });
      await persist();
      return out;
    }
    const stName = g.students.find((s) => s.student_id === sid)?.name || "Student";
    const msg = await getParentAttendanceSummary(client, g.school_id, sid, "date", d);
    await pushFormatted(out, {
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
      await pushFormatted(out, { intent: "invalid_option" });
      await persist();
      return out;
    }
    ctx.staffSchool = s;
    step = "staff_menu";
    await pushFormatted(out, {
      intent: "staff_menu",
      school_name: s.school_name,
      can_verify_receipts: s.canVerifyReceipts
    });
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
    if (n === 1) {
      const scope = attendanceScopeForStaff(sc);
      const dateIso = todayIso();
      const stats = await getStaffAttendanceStats(client, sc.school_id, dateIso, scope.kind, scope.classes);
      await pushFormatted(out, {
        intent: "staff_attendance_stats",
        role: "staff",
        school_name: sc.school_name,
        date_label: `Today (${dateIso})`,
        present: stats.present,
        absent: stats.absent
      });
      await persist();
      return out;
    }
    if (n === 2) {
      ctx.staffDateMode = "stats";
      step = "staff_await_date";
      await pushFormatted(out, { intent: "prompt_date_generic" });
      await persist();
      return out;
    }
    if (n === 3) {
      ctx.staffDateMode = "missed";
      step = "staff_await_date";
      await pushFormatted(out, { intent: "prompt_date_absent" });
      await persist();
      return out;
    }
    if (n === 4 && sc.canVerifyReceipts) {
      step = "staff_await_receipt";
      await pushFormatted(out, { intent: "prompt_receipt_ref" });
      await persist();
      return out;
    }
    await pushFormatted(out, { intent: "use_menu_option" });
    await persist();
    return out;
  }
  if (step === "staff_await_date") {
    const sc = staffContextFromSession(ctx);
    const d = parseDdMmYyyy(text);
    if (!sc || !d) {
      await pushFormatted(out, { intent: "invalid_date" });
      await persist();
      return out;
    }
    const scope = attendanceScopeForStaff(sc);
    const stats = await getStaffAttendanceStats(client, sc.school_id, d, scope.kind, scope.classes);
    const mode = ctx.staffDateMode;
    if (mode === "missed" && stats.absentNames.length > 0) {
      const names = stats.absentNames.length > 25 ? stats.absentNames.slice(0, 25).join(", ") + ` \u2026 (+${stats.absentNames.length - 25} more)` : stats.absentNames.join(", ");
      await pushFormatted(out, {
        intent: "staff_absent_list",
        role: "staff",
        date_iso: d,
        absent_count: stats.absent,
        names_text: names
      });
    } else {
      await pushFormatted(out, {
        intent: "staff_attendance_stats",
        role: "staff",
        school_name: sc.school_name,
        date_label: d,
        present: stats.present,
        absent: stats.absent
      });
    }
    step = "staff_menu";
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
    await pushFormatted(out, {
      intent: "receipt_lookup",
      role: "staff",
      body: msg || "No receipt matching that reference for this school."
    });
    step = "staff_menu";
    await persist();
    return out;
  }
  await pushFormatted(out, { intent: "reply_menu_number" });
  await persist();
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
