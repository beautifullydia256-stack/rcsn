/**
 * Test endpoint to check if register_school_admin_with_referral function exists
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      res.status(500).json({ error: 'Supabase not configured' });
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check if function exists
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_name', 'register_school_admin_with_referral')
      .eq('routine_schema', 'public');

    console.log('Function check result:', { functions, funcError });

    // Check if required tables exist
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'schools', 'referral_codes', 'affiliates']);

    console.log('Tables check result:', { tables, tableError });

    // Try to call the function with dummy data to see the error
    let rpcError = null;
    try {
      const { error } = await supabase.rpc('register_school_admin_with_referral', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_email: 'test@example.com',
        p_name: 'Test User',
        p_phone: '1234567890',
        p_school_name: 'Test School',
        p_school_location: 'Test Location',
        p_school_type: 'Nursery/Primary',
        p_referral_code_id: '00000000-0000-0000-0000-000000000000',
      });
      rpcError = error;
    } catch (e) {
      rpcError = e;
    }

    console.log('RPC test result:', { rpcError });

    res.status(200).json({
      function_exists: functions && functions.length > 0,
      functions: functions,
      tables_found: tables,
      rpc_test_error: rpcError ? rpcError.message : null,
      function_error: funcError,
      table_error: tableError
    });

  } catch (e) {
    console.error('Test endpoint error:', e);
    res.status(500).json({ error: e.message });
  }
};