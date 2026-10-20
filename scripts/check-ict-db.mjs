import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://npqjrtspgxhuwrljbemz.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function verify() {
  console.log('Connecting to Supabase at:', url);
  const sb = createClient(url, serviceKey);

  const tables = [
    { name: 'ict_workstations', desc: 'Computer Lab Workstations' },
    { name: 'ict_helpdesk_tickets', desc: 'Helpdesk & Repair Tickets' },
    { name: 'ict_lab_schedules', desc: 'Lab Class Bookings & Timetable' },
    { name: 'ict_network_nodes', desc: 'Network Nodes & CCTV Surveillance' },
  ];

  let missingCount = 0;

  for (const t of tables) {
    const { data, error } = await sb.from(t.name).select('*').limit(2);
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
        console.log(`❌ TABLE MISSING: "${t.name}" (${t.desc}) has not been created yet.`);
        missingCount++;
      } else {
        console.log(`⚠️  Error querying "${t.name}":`, error.message);
      }
    } else {
      console.log(`✅ Table "${t.name}" (${t.desc}) exists with ${data.length} sample records.`);
    }
  }

  if (missingCount > 0) {
    console.log('\n--- HOW TO COMPLETE DATABASE MIGRATION ---');
    console.log('To create the tables in Supabase:');
    console.log('1. Open your Supabase Dashboard SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/npqjrtspgxhuwrljbemz/sql');
    console.log('2. Paste and run the migration script:');
    console.log('   supabase/migrations/20261020000000_ict_portal_tables.sql\n');
  } else {
    console.log('\n🎉 ALL ICT DATABASE TABLES ARE HEALTHY AND ONLINE!');
  }
}

verify();
