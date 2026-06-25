'use strict';
// Combined admin operations router. URL: /api/admin?action=<name>
// Static top-level requires so Vercel Nft bundles all sub-handlers and their
// dependencies (including @supabase/ssr) without includeFiles guesswork.

const { createClient } = require('@supabase/supabase-js');
const createUserAccountHandler  = require('./_create-user-account');
const createStudentLoginHandler = require('./_create-student-login');
const createTeacherLoginHandler = require('./_create-teacher-login');
const deleteTeacherHandler      = require('./_delete-teacher');
const changeTeacherEmailHandler = require('./_change-teacher-email');
const ensureParentLinkHandler   = require('./_ensure-parent-link');
const notifyRoleChangeHandler   = require('./_notify-role-change');

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function syncStudentBalances(req, res) {
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'Method not allowed' })); }
  try {
    const supabase = getSupabase();
    const body = req.body || {};
    const schoolId = body.schoolId;
    const studentIds = body.studentIds;
    if (!schoolId) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'School ID is required' })); }

    if (Array.isArray(studentIds) && studentIds.length > 0) {
      let successCount = 0, errorCount = 0;
      for (const studentId of studentIds) {
        try {
          const { data: student, error: sErr } = await supabase
            .from('students').select('student_id, current_class, boarding_type')
            .eq('school_id', schoolId).eq('student_id', studentId).single();
          if (sErr || !student) { errorCount++; continue; }
          const { data: termData } = await supabase.rpc('resolve_current_school_term_id', {
            p_school_id: schoolId, p_date: new Date().toISOString().split('T')[0]
          });
          if (!termData) { errorCount++; continue; }
          const { data: feeStructure } = await supabase.from('school_fee_structure')
            .select('tuition_amount, boarding_tuition_amount')
            .eq('school_id', schoolId).eq('class_name', student.current_class).single();
          if (!feeStructure) { errorCount++; continue; }
          const feeAmount = student.boarding_type === 'Boarding'
            ? feeStructure.boarding_tuition_amount : feeStructure.tuition_amount;
          if (!feeAmount || feeAmount <= 0) { errorCount++; continue; }
          const { data: existing } = await supabase.from('student_invoices').select('invoice_id')
            .eq('school_id', schoolId).eq('student_id', studentId).eq('term_id', termData)
            .eq('is_supplementary', false).neq('status', 'cancelled').single();
          if (existing) {
            await supabase.from('student_invoices').update({ total_amount: feeAmount, updated_at: new Date().toISOString() })
              .eq('invoice_id', existing.invoice_id);
          } else {
            const { data: invoiceNumber } = await supabase.rpc('get_next_invoice_number', { p_school_id: schoolId });
            await supabase.from('student_invoices').insert({
              school_id: schoolId, student_id: studentId, term_id: termData,
              invoice_number: invoiceNumber || `INV-${Date.now()}`,
              total_amount: feeAmount, amount_paid: 0, balance: feeAmount,
              status: 'issued', is_supplementary: false,
              created_at: new Date().toISOString(), updated_at: new Date().toISOString()
            });
          }
          successCount++;
        } catch (e) { console.error(`Error syncing student ${studentId}:`, e); errorCount++; }
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({
        success: true,
        message: `Synced ${successCount} students${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        successCount, errorCount
      }));
    }

    const { data, error } = await supabase.rpc('sync_all_student_balances', { p_school_id: schoolId });
    if (error) { res.statusCode = 500; return res.end(JSON.stringify({ error: error.message })); }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true, message: 'Successfully synced student balances', data }));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Server error' }));
  }
}

async function getNextReceiptNumber(req, res) {
  if (req.method !== 'POST') { res.statusCode = 405; return res.end(JSON.stringify({ error: 'Method not allowed' })); }
  try {
    const { schoolId, termId } = req.body || {};
    if (!schoolId || !termId) { res.statusCode = 400; return res.end(JSON.stringify({ error: 'schoolId and termId required' })); }
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('get_next_receipt_number', { p_school_id: schoolId, p_term_id: termId });
    if (error) { res.statusCode = 500; return res.end(JSON.stringify({ error: error.message })); }
    res.statusCode = 200;
    return res.end(JSON.stringify({ receipt_number: data }));
  } catch (e) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Server error' }));
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const action = (req.query && req.query.action) || '';
  switch (action) {
    case 'create-user-account':       return createUserAccountHandler(req, res);
    case 'create-student-login':      return createStudentLoginHandler(req, res);
    case 'create-teacher-login':      return createTeacherLoginHandler(req, res);
    case 'delete-teacher':            return deleteTeacherHandler(req, res);
    case 'change-teacher-email':      return changeTeacherEmailHandler(req, res);
    case 'ensure-parent-link':        return ensureParentLinkHandler(req, res);
    case 'notify-role-change':        return notifyRoleChangeHandler(req, res);
    case 'sync-student-balances':     return syncStudentBalances(req, res);
    case 'get-next-receipt-number':   return getNextReceiptNumber(req, res);
    default:
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
  }
};
