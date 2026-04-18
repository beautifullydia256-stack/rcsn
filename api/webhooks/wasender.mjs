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
async function getParentFeeSummary(client, schoolId, studentId) {
  const agg = await loadStudentBalanceAggAllTerms(client, schoolId, studentId);
  const bal = Math.max(0, Number(agg.balance || 0));
  const paid = Math.max(0, Number(agg.total_paid || 0));
  const fees = Math.max(0, Number(agg.total_fees || 0));
  const fmt = (n) => `UGX ${Math.round(n).toLocaleString("en-UG")}`;
  return `Fees summary
Total fees (all terms): ${fmt(fees)}
Paid: ${fmt(paid)}
Outstanding: ${fmt(bal)}`;
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
function footer() {
  return "\n\n0 \u2014 Menu \xB7 9 \u2014 Start over";
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
async function processInboundMessage(client, waDigits, waE164, messageText) {
  const text = (messageText || "").trim();
  const identity = await resolveIdentity(client, waDigits);
  if (!identity || !identity.hasParent && !identity.hasStaff) {
    return [
      {
        type: "text",
        text: "This number is not registered with PwezaCore. Please use the phone on your school profile or contact the office."
      }
    ];
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
      out.push({
        type: "text",
        text: parentMenuTextWithAnother(g, identity.parentSchools.length > 1)
      });
      await persist();
      return out;
    }
  }
  if (n === 0 && step === "staff_menu") {
    const sc = staffContextFromSession(ctx);
    if (sc) {
      out.push({ type: "text", text: staffMenuText(sc) });
      await persist();
      return out;
    }
  }
  if (step === "entry" || step === "") {
    if (identity.hasParent && identity.hasStaff) {
      step = "role_pick";
      out.push({
        type: "text",
        text: `Hi! You're on file as both a parent and staff.

1 \u2014 Parent (fees, reports, attendance)
2 \u2014 Staff (attendance, receipt lookup)${footer()}`
      });
      await persist();
      return out;
    }
    if (identity.hasParent) {
      ctx.role = "parent";
      if (identity.parentSchools.length > 1) {
        step = "parent_pick_school";
        const lines = identity.parentSchools.map((s, i) => `${i + 1} \u2014 ${s.school_name}`).join("\n");
        out.push({ type: "text", text: `Select school:
${lines}${footer()}` });
      } else {
        ctx.parentSchoolIndex = 0;
        step = "parent_menu";
        out.push({
          type: "text",
          text: parentMenuTextWithAnother(parentGroupFromSession(identity, ctx), identity.parentSchools.length > 1)
        });
      }
      await persist();
      return out;
    }
    ctx.role = "staff";
    if (identity.staffSchools.length > 1) {
      step = "staff_pick_school";
      const lines = identity.staffSchools.map((s, i) => `${i + 1} \u2014 ${s.school_name}`).join("\n");
      out.push({ type: "text", text: `Select school:
${lines}${footer()}` });
    } else {
      ctx.staffSchool = identity.staffSchools[0];
      step = "staff_menu";
      out.push({ type: "text", text: staffMenuText(identity.staffSchools[0]) });
    }
    await persist();
    return out;
  }
  if (step === "role_pick" && n !== null) {
    if (n === 1) {
      ctx.role = "parent";
      if (identity.parentSchools.length > 1) {
        step = "parent_pick_school";
        const lines = identity.parentSchools.map((s, i) => `${i + 1} \u2014 ${s.school_name}`).join("\n");
        out.push({ type: "text", text: `Select school:
${lines}${footer()}` });
      } else {
        ctx.parentSchoolIndex = 0;
        step = "parent_menu";
        out.push({
          type: "text",
          text: parentMenuTextWithAnother(identity.parentSchools[0], identity.parentSchools.length > 1)
        });
      }
    } else if (n === 2) {
      ctx.role = "staff";
      if (identity.staffSchools.length > 1) {
        step = "staff_pick_school";
        const lines = identity.staffSchools.map((s, i) => `${i + 1} \u2014 ${s.school_name}`).join("\n");
        out.push({ type: "text", text: `Select school:
${lines}${footer()}` });
      } else {
        ctx.staffSchool = identity.staffSchools[0];
        step = "staff_menu";
        out.push({ type: "text", text: staffMenuText(identity.staffSchools[0]) });
      }
    } else {
      out.push({ type: "text", text: `Reply 1 or 2.${footer()}` });
    }
    await persist();
    return out;
  }
  if (step === "parent_pick_school" && n !== null) {
    const g = identity.parentSchools[n - 1];
    if (!g) {
      out.push({ type: "text", text: `Invalid option.${footer()}` });
      await persist();
      return out;
    }
    ctx.parentSchoolIndex = n - 1;
    step = "parent_menu";
    out.push({ type: "text", text: parentMenuTextWithAnother(g, identity.parentSchools.length > 1) });
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
      const lines = identity.parentSchools.map((s, i) => `${i + 1} \u2014 ${s.school_name}`).join("\n");
      out.push({ type: "text", text: `Select school:
${lines}${footer()}` });
      await persist();
      return out;
    }
    if (n === 1) {
      ctx.pendingAction = "balance";
      if (g.students.length > 1) {
        step = "parent_pick_child";
        out.push({ type: "text", text: childPickerText(g) });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        const msg = await getParentFeeSummary(client, schoolId, ctx.student_id);
        out.push({ type: "text", text: `${msg}${footer()}` });
        step = "parent_menu";
      }
      await persist();
      return out;
    }
    if (n === 2) {
      ctx.pendingAction = "report";
      if (g.students.length > 1) {
        step = "parent_pick_child";
        out.push({ type: "text", text: childPickerText(g) });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        const r = await getLatestReportPdfForStudent(client, schoolId, ctx.student_id);
        if (r.url) {
          out.push({ type: "text", text: `Sending: ${r.label}${footer()}` });
          out.push({ type: "document", url: r.url, fileName: "report-card.pdf", caption: r.label });
        } else {
          out.push({ type: "text", text: `${r.label}${footer()}` });
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
        out.push({ type: "text", text: childPickerText(g) });
      } else {
        ctx.student_id = g.students[0]?.student_id;
        step = "parent_attendance_sub";
        out.push({
          type: "text",
          text: `Attendance \u2014 choose:
1 \u2014 Today
2 \u2014 This week (Mon\u2013Sun)
3 \u2014 Specific date (DD-MM-YYYY)${footer()}`
        });
      }
      await persist();
      return out;
    }
    out.push({ type: "text", text: `Use a menu option.${footer()}` });
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
      out.push({ type: "text", text: `Invalid option.${footer()}` });
      await persist();
      return out;
    }
    ctx.student_id = child.student_id;
    const schoolId = g.school_id;
    const action = ctx.pendingAction;
    if (action === "balance") {
      const msg = await getParentFeeSummary(client, schoolId, child.student_id);
      out.push({ type: "text", text: `${msg}${footer()}` });
      step = "parent_menu";
    } else if (action === "report") {
      const r = await getLatestReportPdfForStudent(client, schoolId, child.student_id);
      if (r.url) {
        out.push({ type: "text", text: `Sending: ${r.label}${footer()}` });
        out.push({ type: "document", url: r.url, fileName: "report-card.pdf", caption: r.label });
      } else {
        out.push({ type: "text", text: `${r.label}${footer()}` });
      }
      step = "parent_menu";
    } else if (action === "attendance") {
      step = "parent_attendance_sub";
      out.push({
        type: "text",
        text: `Attendance for ${child.name} \u2014 choose:
1 \u2014 Today
2 \u2014 This week (Mon\u2013Sun)
3 \u2014 Specific date (DD-MM-YYYY)${footer()}`
      });
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
    if (n === 1) {
      const msg = await getParentAttendanceSummary(client, g.school_id, sid, "today");
      out.push({ type: "text", text: `${msg}${footer()}` });
      step = "parent_menu";
    } else if (n === 2) {
      const msg = await getParentAttendanceSummary(client, g.school_id, sid, "week");
      out.push({ type: "text", text: `${msg}${footer()}` });
      step = "parent_menu";
    } else if (n === 3) {
      step = "parent_await_date";
      out.push({ type: "text", text: "Send date as DD-MM-YYYY" + footer() });
    } else {
      out.push({ type: "text", text: `1, 2, or 3.${footer()}` });
    }
    await persist();
    return out;
  }
  if (step === "parent_await_date") {
    const g = parentGroupFromSession(identity, ctx);
    const sid = ctx.student_id;
    const d = parseDdMmYyyy(text);
    if (!g || !sid || !d) {
      out.push({ type: "text", text: "Invalid date. Use DD-MM-YYYY" + footer() });
      await persist();
      return out;
    }
    const msg = await getParentAttendanceSummary(client, g.school_id, sid, "date", d);
    out.push({ type: "text", text: `${msg}${footer()}` });
    step = "parent_menu";
    await persist();
    return out;
  }
  if (step === "staff_pick_school" && n !== null) {
    const s = identity.staffSchools[n - 1];
    if (!s) {
      out.push({ type: "text", text: `Invalid option.${footer()}` });
      await persist();
      return out;
    }
    ctx.staffSchool = s;
    step = "staff_menu";
    out.push({ type: "text", text: staffMenuText(s) });
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
      out.push({
        type: "text",
        text: `${formatStats(`Today (${dateIso})`, stats)}${footer()}`
      });
      await persist();
      return out;
    }
    if (n === 2) {
      ctx.staffDateMode = "stats";
      step = "staff_await_date";
      out.push({ type: "text", text: "Send date as DD-MM-YYYY" + footer() });
      await persist();
      return out;
    }
    if (n === 3) {
      ctx.staffDateMode = "missed";
      step = "staff_await_date";
      out.push({ type: "text", text: "Send date for absent list (DD-MM-YYYY)" + footer() });
      await persist();
      return out;
    }
    if (n === 4 && sc.canVerifyReceipts) {
      step = "staff_await_receipt";
      out.push({ type: "text", text: "Send the receipt number or payment ID." + footer() });
      await persist();
      return out;
    }
    out.push({ type: "text", text: `Use a menu option.${footer()}` });
    await persist();
    return out;
  }
  if (step === "staff_await_date") {
    const sc = staffContextFromSession(ctx);
    const d = parseDdMmYyyy(text);
    if (!sc || !d) {
      out.push({ type: "text", text: "Invalid date. Use DD-MM-YYYY" + footer() });
      await persist();
      return out;
    }
    const scope = attendanceScopeForStaff(sc);
    const stats = await getStaffAttendanceStats(client, sc.school_id, d, scope.kind, scope.classes);
    const mode = ctx.staffDateMode;
    if (mode === "missed" && stats.absentNames.length > 0) {
      const names = stats.absentNames.length > 25 ? stats.absentNames.slice(0, 25).join(", ") + ` \u2026 (+${stats.absentNames.length - 25} more)` : stats.absentNames.join(", ");
      out.push({
        type: "text",
        text: `Absent on ${d} (${stats.absent}): ${names}${footer()}`
      });
    } else {
      out.push({ type: "text", text: formatStats(d, stats) + footer() });
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
    out.push({
      type: "text",
      text: (msg || "No receipt matching that reference for this school.") + footer()
    });
    step = "staff_menu";
    await persist();
    return out;
  }
  out.push({ type: "text", text: `Reply with a number from the menu.${footer()}` });
  await persist();
  return out;
}
function parentMenuTextWithAnother(g, showAnother) {
  let t = `${g.school_name} \u2014 Parent menu

1 \u2014 Fee balance
2 \u2014 Report card (latest PDF)
3 \u2014 Attendance
`;
  if (showAnother) t += `4 \u2014 Another school
`;
  t += footer();
  return t;
}
function childPickerText(g) {
  const lines = g.students.map((s, i) => `${i + 1} \u2014 ${s.name} (${s.current_class || "\u2014"})`).join("\n");
  return `Choose child:
${lines}${footer()}`;
}
function staffMenuText(s) {
  let t = `${s.school_name} \u2014 Staff menu

1 \u2014 Attendance today
2 \u2014 Attendance on a date
3 \u2014 Who was absent (names)
`;
  if (s.canVerifyReceipts) t += `4 \u2014 Verify receipt
`;
  t += footer();
  return t;
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
function formatStats(label, stats) {
  return `${label}
Present: ${stats.present}
Absent: ${stats.absent}`;
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
