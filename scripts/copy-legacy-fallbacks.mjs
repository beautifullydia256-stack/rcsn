import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('public/images/rcsn');
const map = {
  'campus.webp': 'rcsn-campus-panoramic.webp',
  'campus.jpg': 'rcsn-campus-panoramic.jpg',
  'compound.webp': 'rcsn-campus-gardens.webp',
  'compound.jpg': 'rcsn-campus-gardens.jpg',
  'girls-hostel.webp': 'rcsn-campus-signpost.webp',
  'girls-hostel.jpg': 'rcsn-campus-signpost.jpg',
  'hostels.webp': 'rcsn-campus-signpost.webp',
  'hostels.jpg': 'rcsn-campus-signpost.jpg',
  'lab-students.webp': 'rcsn-skills-lab-practical.webp',
  'lab-students.jpg': 'rcsn-skills-lab-practical.jpg',
  'lab.webp': 'rcsn-skills-lab-practical.webp',
  'lab.jpg': 'rcsn-skills-lab-practical.jpg',
  'lecture-hall.webp': 'rcsn-hall-briefing.webp',
  'lecture-hall.jpg': 'rcsn-hall-briefing.jpg',
  'school-main.webp': 'rcsn-nursing-cohort-main.webp',
  'school-main.jpg': 'rcsn-nursing-cohort-main.jpg',
};

for (const [k, v] of Object.entries(map)) {
  fs.copyFileSync(path.join(dir, v), path.join(dir, k));
}
console.log('Legacy placeholders replaced with real high-res photos!');
