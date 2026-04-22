/**
 * electron-builder afterPack: set PwezaCore.exe icon using node `rcedit`.
 * When `signAndEditExecutable` is true, app-builder's rcedit downloads winCodeSign.7z;
 * extracting it on Windows can fail without symlink privilege (Developer Mode / Admin).
 * This hook runs after ASAR integrity is applied and before NSIS; only sets the icon.
 */
const fs = require('fs');
const path = require('path');
const rcedit = require('rcedit');

module.exports = async (context) => {
  if (context.electronPlatformName !== 'win32') return;
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const icon = path.join(context.packager.projectDir, 'electron', 'pack-assets', 'icon.ico');
  if (!fs.existsSync(exe)) {
    console.warn('[afterPackWinIcon] Missing exe:', exe);
    return;
  }
  if (!fs.existsSync(icon)) {
    console.warn('[afterPackWinIcon] Missing icon (run build-windows-icon):', icon);
    return;
  }
  console.log('[afterPackWinIcon] Embedding icon in', path.basename(exe));
  await rcedit(exe, { icon });
};
