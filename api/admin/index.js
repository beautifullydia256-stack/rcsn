'use strict';
// Combined admin operations router. URL: /api/admin?action=<name>

const { createClient } = require('@supabase/supabase-js');
// Explicit require so Vercel's bundler (Nft) includes @supabase/ssr even though
// it is only referenced inside dynamically-loaded sub-handlers.
require('@supabase/ssr');

function load(path) {
  const m = require(path);
  return typeof m === 'function' ? m : (m.default || m.handler || m);
}

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

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const action = (req.query && req.query.action) || '';
  switch (action) {
    case 'create-user-account':   return load('./_create-user-account')(req, res);
    case 'create-student-login':  return load('./_create-student-login')(req, res);
    case 'create-teacher-login':  return load('./_create-teacher-login')(req, res);
    case 'delete-teacher':        return load('./_delete-teacher')(req, res);
    case 'change-teacher-email':  return load('./_change-teacher-email')(req, res);
    case 'ensure-parent-link':    return load('./_ensure-parent-link')(req, res);
    case 'notify-role-change':    return load('./_notify-role-change')(req, res);
    case 'sync-student-balances': return syncStudentBalances(req, res);
    default:
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
  }
};
