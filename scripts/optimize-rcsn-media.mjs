import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const srcDir = path.resolve('images and video');
const outDir = path.resolve('public/images/rcsn');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const photoMap = [
  { src: 'IMG_0500.JPG', name: 'rcsn-principal-office', title: 'Office of the Principal' },
  { src: 'accademic registra.jpg', name: 'rcsn-academic-registrar', title: 'Office of the Academic Registrar' },
  { src: 'IMG-20261004-WA0025.jpg', name: 'rcsn-accounts-desk', title: 'Student Accounts & Finance Desk' },
  { src: 'IMG_0506.JPG', name: 'rcsn-faculty-leadership', title: 'Principal & Faculty Leadership' },
  { src: 'IMG_0518.JPG', name: 'rcsn-bursar-office', title: "School Bursar's Office" },
  { src: 'IMG_0521.JPG', name: 'rcsn-clinical-tutors', title: 'Clinical Instructors & Medical Tutors' },
  { src: 'IMG_0538.JPG', name: 'rcsn-librarian-desk', title: 'Library Reference Desk & Medical Collections' },
  { src: 'IMG_0542.JPG', name: 'rcsn-librarian-portrait', title: 'Head Librarian & Resource Centre' },
  { src: 'IMG_0546.JPG', name: 'rcsn-library-collaboration', title: 'Digital Research & Study Guidance' },
  { src: 'IMG_0549.JPG', name: 'rcsn-students-library', title: 'Nursing Students in Campus Library' },
  { src: 'IMG_0553.JPG', name: 'rcsn-chaplain-cohort', title: 'Student Cohort Mentorship' },
  { src: 'IMG_0555.JPG', name: 'rcsn-hall-briefing', title: 'Dining & Clinical Assembly Briefing' },
  { src: 'IMG_0559.JPG', name: 'rcsn-student-guild', title: 'RCSN Student Guild Government' },
  { src: 'IMG_0566.JPG', name: 'rcsn-campus-gardens', title: 'Campus Botanical Gardens & Information Centre' },
  { src: 'IMG_0567.JPG', name: 'rcsn-campus-signpost', title: 'Hostels & Elizabeth Lecture Hall Walkway' },
  { src: 'IMG_0577.JPG', name: 'rcsn-campus-architecture', title: 'Campus Architecture & Residential Grounds' },
  { src: 'IMG_0584.JPG', name: 'rcsn-campus-panoramic', title: 'Panoramic Campus Valley & Lake Kijanebarola' },
  { src: 'IMG_0588.JPG', name: 'rcsn-nursing-cohort-main', title: 'Nursing & Midwifery Cohort in Teal Uniforms' },
  { src: 'IMG_0589.JPG', name: 'rcsn-nursing-cohort-wide', title: 'Full Student Cohort Assembly' },
  { src: 'IMG_0591.JPG', name: 'rcsn-students-walking', title: 'Students on Campus Walkway' },
  { src: 'IMG_0614.JPG', name: 'rcsn-sports-volleyball', title: "Women's Volleyball & Athletics Team" },
  { src: 'lab.jpg', name: 'rcsn-skills-lab-practical', title: 'Clinical Skills Simulation Laboratory' },
];

console.log('--- Optimizing Official RCSN Media ---');

for (const item of photoMap) {
  const inputPath = path.join(srcDir, item.src);
  if (!fs.existsSync(inputPath)) {
    console.error(`Warning: Missing ${inputPath}`);
    continue;
  }

  const webpPath = path.join(outDir, `${item.name}.webp`);
  const jpgPath = path.join(outDir, `${item.name}.jpg`);

  // Max dimension 2000px, preserve aspect ratio, auto-rotate according to EXIF
  await sharp(inputPath)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(webpPath);

  await sharp(inputPath)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(jpgPath);

  const statsWebp = fs.statSync(webpPath);
  const statsJpg = fs.statSync(jpgPath);
  console.log(`[OK] ${item.name}: WebP=${(statsWebp.size / 1024).toFixed(1)}KB, JPG=${(statsJpg.size / 1024).toFixed(1)}KB`);
}

// Also optimize logo
const logoSrc = path.join(srcDir, 'logo.png');
if (fs.existsSync(logoSrc)) {
  const logoPngOut = path.join(outDir, 'logo.png');
  const logoWebpOut = path.join(outDir, 'logo.webp');
  const rootLogoPng = path.resolve('public/logo.png');

  await sharp(logoSrc)
    .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
    .png({ quality: 90, compressionLevel: 9 })
    .toFile(logoPngOut);

  await sharp(logoSrc)
    .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90, effort: 4 })
    .toFile(logoWebpOut);

  // Copy crisp logo to public/logo.png as well
  fs.copyFileSync(logoPngOut, rootLogoPng);
  console.log('[OK] Logo optimized and updated');
}

// Also ensure video is in public/videos/rcsn/school-advert.mp4
const videoSrc = path.join(srcDir, 'school advert video.mp4');
const videoOutDir = path.resolve('public/videos/rcsn');
if (!fs.existsSync(videoOutDir)) {
  fs.mkdirSync(videoOutDir, { recursive: true });
}
const videoOut = path.join(videoOutDir, 'school-advert.mp4');
if (fs.existsSync(videoSrc)) {
  fs.copyFileSync(videoSrc, videoOut);
  console.log('[OK] Video copied to public/videos/rcsn/school-advert.mp4');
}

console.log('--- All media optimized successfully! ---');
