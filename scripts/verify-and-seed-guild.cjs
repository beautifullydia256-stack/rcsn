const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const DEFAULT_PORTFOLIOS = [
  {
    title: 'Guild President',
    description: 'Executive Head of the Guild Government, chief student liaison to University Administration and Senate.',
    permissions: { is_executive: true, manage_grievances: true, manage_finances: true, broadcast: true, view_welfare: true },
    is_default: true,
  },
  {
    title: 'Guild Vice President',
    description: 'Deputizes the President and oversees welfare, campus committees, and student affairs.',
    permissions: { is_executive: true, manage_grievances: true, view_welfare: true, broadcast: true },
    is_default: true,
  },
  {
    title: 'Minister of Finance',
    description: 'Manages guild treasury, fee allocations, requisitions, and two-way reconciliation with university finance.',
    permissions: { is_executive: true, manage_finances: true, approve_requisitions: true },
    is_default: true,
  },
  {
    title: 'Minister of Health & Welfare',
    description: 'Oversees clinic/sickbay trends, cafeteria sanitation, hostel facilities, and student welfare.',
    permissions: { is_executive: true, view_welfare: true, log_welfare_incident: true, manage_grievances: true },
    is_default: true,
  },
  {
    title: 'General Secretary',
    description: 'Responsible for official cabinet documentation, cabinet minutes, resolutions, and announcements.',
    permissions: { is_executive: true, broadcast: true, view_grievances: true },
    is_default: true,
  },
  {
    title: 'Minister of Academics & Library',
    description: 'Represents student academic concerns, timetable conflicts, and learning resources.',
    permissions: { is_executive: true, manage_grievances: true },
    is_default: true,
  },
  {
    title: 'Minister of Sports, Games & Culture',
    description: 'Coordinates inter-faculty sports, tournaments, and social/cultural campus events.',
    permissions: { is_executive: true, manage_events: true },
    is_default: true,
  },
  {
    title: 'Minister of Security & Environment',
    description: 'Monitors campus lighting, hostel gate curfews, sanitation drives, and campus security.',
    permissions: { is_executive: true, view_welfare: true, log_welfare_incident: true },
    is_default: true,
  }
];

async function seed() {
  const client = new Client({ connectionString: process.env.SOURCE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('guild_portfolios', 'guild_tenures', 'guild_transactions', 'student_grievances', 'guild_announcements', 'guild_welfare_reports', 'elections', 'election_candidates', 'election_voter_logs')
    ORDER BY table_name;
  `);
  console.log('Verified tables in DB:', tablesRes.rows.map(r => r.table_name));

  const schoolsRes = await client.query('SELECT school_id FROM schools;');
  console.log(`Found ${schoolsRes.rows.length} schools.`);

  for (const school of schoolsRes.rows) {
    console.log(`Checking default portfolios for school: ${school.school_id}`);
    for (const p of DEFAULT_PORTFOLIOS) {
      const existing = await client.query(
        'SELECT id FROM guild_portfolios WHERE school_id = $1 AND title = $2',
        [school.school_id, p.title]
      );
      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO guild_portfolios (school_id, title, description, permissions, is_default)
           VALUES ($1, $2, $3, $4, $5)`,
          [school.school_id, p.title, p.description, JSON.stringify(p.permissions), p.is_default]
        );
        console.log(`  + Created portfolio: ${p.title}`);
      }
    }
  }

  console.log('Seed completed successfully.');
  await client.end();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
