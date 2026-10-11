import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://npqjrtspgxhuwrljbemz.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function verify() {
  console.log('Connecting to Supabase at:', url);
  const sb = createClient(url, serviceKey);

  const { data, error } = await sb
    .from('admission_applications')
    .select('id, application_number, full_name, status')
    .limit(5);

  if (error) {
    if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
      console.log('\n❌ TABLE MISSING: Table "admission_applications" has NOT been created yet.');
      console.log('To create it, open your Supabase Dashboard SQL Editor:');
      console.log('https://supabase.com/dashboard/project/npqjrtspgxhuwrljbemz/sql');
      console.log('and run the SQL script found in:');
      console.log('supabase/migrations/20261006000000_admission_applications.sql\n');
    } else {
      console.error('Supabase query error:', error);
    }
    return false;
  }

  console.log('\n✅ TABLE EXISTS AND IS HEALTHY!');
  console.log(`Found ${data.length} records in admission_applications:`);
  console.log(data);
  return true;
}

verify();
