import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const dir = path.resolve('images and video');
const files = fs.readdirSync(dir);

console.log(`Found ${files.length} files in ${dir}:`);

for (const file of files) {
  const filePath = path.join(dir, file);
  const stats = fs.statSync(filePath);
  if (file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.png') || file.toLowerCase().endsWith('.jpeg')) {
    try {
      const metadata = await sharp(filePath).metadata();
      console.log(JSON.stringify({
        file,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        orientation: metadata.orientation || 1,
        isPortrait: metadata.height > metadata.width,
      }));
    } catch (e) {
      console.log(JSON.stringify({ file, error: e.message }));
    }
  } else {
    console.log(JSON.stringify({
      file,
      sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      type: 'other'
    }));
  }
}
