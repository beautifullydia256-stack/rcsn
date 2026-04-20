/**
 * Build a multi-resolution Windows .ico from public/logo.png so electron-builder
 * can embed it in PwezaCore.exe (desktop shortcut uses the exe icon, not only NSIS art).
 * Windows expects several embedded sizes; a single PNG often yields a generic shortcut icon.
 */
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const ICO_SIZES = [256, 128, 64, 48, 40, 32, 24, 16];

async function main() {
  const root = path.join(__dirname, '..');
  const src = path.join(root, 'public', 'logo.png');
  const outDir = path.join(root, 'electron', 'pack-assets');
  const out = path.join(outDir, 'icon.ico');

  if (!fs.existsSync(src)) {
    console.error('[build-windows-icon] Missing public/logo.png — add the app logo before packing for Windows.');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });

  let buf;
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    const sharp = require('sharp');
    const input = fs.readFileSync(src);
    const buffers = await Promise.all(
      ICO_SIZES.map((size) => sharp(input).resize(size, size).png().toBuffer()),
    );
    buf = await pngToIco(buffers);
  } catch (e) {
    console.warn(
      '[build-windows-icon] sharp unavailable or failed; falling back to single-size ICO:',
      e && e.message ? e.message : e,
    );
    const input = fs.readFileSync(src);
    buf = await pngToIco(input);
  }

  fs.writeFileSync(out, buf);
  console.log('[build-windows-icon] Wrote', path.relative(root, out));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
