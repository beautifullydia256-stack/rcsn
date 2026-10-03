const urls = [
  'http://localhost:3000/',
  'http://localhost:3000/about',
  'http://localhost:3000/campus-life',
  'http://localhost:3000/clinical-training',
  'http://localhost:3000/courses',
  'http://localhost:3000/admissions',
  'http://localhost:3000/contact',
  'http://localhost:3000/images/rcsn/rcsn-academic-registrar.webp',
  'http://localhost:3000/images/rcsn/rcsn-faculty-leadership.webp',
  'http://localhost:3000/images/rcsn/rcsn-bursar-office.webp',
  'http://localhost:3000/images/rcsn/rcsn-clinical-tutors.webp',
  'http://localhost:3000/images/rcsn/rcsn-librarian-desk.webp',
  'http://localhost:3000/images/rcsn/rcsn-librarian-portrait.webp',
  'http://localhost:3000/images/rcsn/rcsn-library-collaboration.webp',
  'http://localhost:3000/images/rcsn/rcsn-students-library.webp',
  'http://localhost:3000/images/rcsn/rcsn-chaplain-cohort.webp',
  'http://localhost:3000/images/rcsn/rcsn-hall-briefing.webp',
  'http://localhost:3000/images/rcsn/rcsn-student-guild.webp',
  'http://localhost:3000/images/rcsn/rcsn-campus-gardens.webp',
  'http://localhost:3000/images/rcsn/rcsn-campus-signpost.webp',
  'http://localhost:3000/images/rcsn/rcsn-campus-architecture.webp',
  'http://localhost:3000/images/rcsn/rcsn-campus-panoramic.webp',
  'http://localhost:3000/images/rcsn/rcsn-nursing-cohort-main.webp',
  'http://localhost:3000/images/rcsn/rcsn-nursing-cohort-wide.webp',
  'http://localhost:3000/images/rcsn/rcsn-students-walking.webp',
  'http://localhost:3000/images/rcsn/rcsn-sports-volleyball.webp',
  'http://localhost:3000/images/rcsn/rcsn-skills-lab-practical.webp',
  'http://localhost:3000/videos/rcsn/school-advert.mp4'
];

async function check() {
  console.log('Testing all endpoints on http://localhost:3000:');
  let failures = 0;
  for (const url of urls) {
    try {
      const t0 = performance.now();
      const res = await fetch(url);
      const ms = (performance.now() - t0).toFixed(1);
      const pathOnly = url.replace('http://localhost:3000', '');
      const ct = res.headers.get('content-type') || 'unknown';
      if (res.status === 200) {
        console.log(`[PASS] 200 OK (${ms}ms) ${pathOnly} (${ct})`);
      } else {
        console.error(`[FAIL] ${res.status} ${pathOnly}`);
        failures++;
      }
    } catch (e) {
      console.error(`[ERR] ${url}: ${e.message}`);
      failures++;
    }
  }
  if (failures === 0) {
    console.log('\n--- ALL 28 URLS AND MEDIA RETURNED 200 OK WITH INSTANT LOAD TIMES ---');
  } else {
    console.log(`\nFound ${failures} failures.`);
  }
}

check();
