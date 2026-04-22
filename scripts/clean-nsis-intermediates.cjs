/**
 * electron-builder may leave NSIS intermediate archives (e.g. *-x64.nsis.7z) in release/.
 * The real installer is "${productName} Setup ${version}.exe". Safe to delete *.nsis.7z after a successful pack.
 */
const fs = require('fs');
const path = require('path');

const releaseDir = path.join(__dirname, '..', 'release');
if (!fs.existsSync(releaseDir)) process.exit(0);

for (const name of fs.readdirSync(releaseDir)) {
  if (/\.nsis\.7z$/i.test(name)) {
    try {
      fs.unlinkSync(path.join(releaseDir, name));
      console.log('[clean-nsis-intermediates] removed', name);
    } catch (e) {
      console.warn('[clean-nsis-intermediates]', name, e.message);
    }
  }
}
