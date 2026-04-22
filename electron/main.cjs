/**
 * Electron main: window, GitHub Releases auto-update (electron-updater), PDF via Chromium printToPDF (no Puppeteer).
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');

let mainWindow = null;

const isDev = process.env.ELECTRON_DEV === '1';

function distIndexPath() {
  return path.join(__dirname, '..', 'dist', 'index.html');
}

/** PwezaCore branding in title bar / taskbar. Prefer Windows .ico when present (matches packaged exe icon). */
function resolveWindowIcon() {
  const winIco = path.join(__dirname, 'pack-assets', 'icon.ico');
  if (process.platform === 'win32' && fs.existsSync(winIco)) return winIco;
  const distLogo = path.join(__dirname, '..', 'dist', 'logo.png');
  const publicLogo = path.join(__dirname, '..', 'public', 'logo.png');
  if (fs.existsSync(distLogo)) return distLogo;
  if (fs.existsSync(publicLogo)) return publicLogo;
  return undefined;
}

function sendUpdate(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-event', payload);
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) {
    return;
  }
  let autoUpdater;
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch {
    console.warn('[electron] electron-updater not available; auto-update disabled.');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    sendUpdate({ type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdate({ type: 'update-available', version: info?.version });
  });

  autoUpdater.on('update-not-available', () => {
    sendUpdate({ type: 'update-not-available' });
  });

  autoUpdater.on('download-progress', (p) => {
    sendUpdate({ type: 'download-progress', percent: p.percent });
  });

  autoUpdater.on('update-downloaded', () => {
    sendUpdate({ type: 'update-downloaded' });
    setTimeout(() => {
      try {
        autoUpdater.quitAndInstall(false, true);
      } catch (e) {
        console.error('[electron] quitAndInstall', e);
      }
    }, 500);
  });

  autoUpdater.on('error', (err) => {
    sendUpdate({ type: 'error', message: String(err?.message || err) });
    sendUpdate({ type: 'offline-policy' });
  });

  let attempts = 0;
  const runCheck = () => {
    attempts += 1;
    autoUpdater.checkForUpdates().catch(() => {
      if (attempts < 6) {
        setTimeout(runCheck, Math.min(60000, 4000 * attempts));
      } else {
        sendUpdate({ type: 'offline-policy' });
      }
    });
  };

  runCheck();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 864,
    show: true,
    icon: resolveWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    const devPort = process.env.VITE_DEV_PORT || '3000';
    void mainWindow.loadURL(`http://127.0.0.1:${devPort}/`);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = distIndexPath();
    if (!fs.existsSync(indexHtml)) {
      console.error('[electron] Missing Vite build:', indexHtml, '— run npm run build:desktop first.');
    }
    void mainWindow.loadFile(indexHtml);
  }

  return mainWindow;
}

function toAppHashUrl(hashRoute, appUrl) {
  const pathPart = hashRoute.startsWith('/') ? hashRoute : `/${hashRoute}`;
  if (appUrl) {
    const base = String(appUrl).replace(/\/$/, '');
    return `${base}/#${pathPart}`;
  }
  const indexHtml = distIndexPath();
  return `${pathToFileURL(indexHtml).href}#${pathPart}`;
}

function cssPxToMm(px) {
  return (px * 25.4) / 96;
}

/** Hidden window using the same Chromium as the app — no separate Chrome / Puppeteer cache. */
function createPdfBrowserWindow() {
  return new BrowserWindow({
    show: false,
    width: 1400,
    height: 2000,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
}

function loadUrlWithTimeout(win, url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`Load timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const fail = (_e, _code, desc, _validated, isMainFrame) => {
      if (isMainFrame) {
        clearTimeout(t);
        reject(new Error(desc || 'did-fail-load'));
      }
    };

    win.webContents.once('did-fail-load', fail);
    win.webContents.once('did-finish-load', () => {
      clearTimeout(t);
      win.webContents.removeListener('did-fail-load', fail);
      resolve();
    });

    void win.loadURL(url).catch((err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

/** Same dimensions as former Puppeteer `pdfOptionsOlevelStandardSinglePage` (page size in inches for Electron). */
async function printToPdfOlevelDynamic(win) {
  const wc = win.webContents;
  let dbgAttached = false;
  try {
    if (!wc.debugger.isAttached()) {
      wc.debugger.attach('1.3');
      dbgAttached = true;
    }
    await wc.debugger.sendCommand('Emulation.setEmulatedMedia', { media: 'print' });
    await new Promise((r) => setTimeout(r, 100));
  } catch {
    /* measure/print still work without print emulation; layout may match screen */
  }

  let pdfBuf;
  try {
    const dims = await wc.executeJavaScript(`(() => {
      const body = document.body;
      const html = document.documentElement;
      const width = Math.max(body.scrollWidth, html.scrollWidth, body.offsetWidth, 1);
      const height = Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, 1);
      return { width, height };
    })()`);
    const widthMm = Math.min(Math.max(Math.ceil(cssPxToMm(dims.width)), 210), 220);
    const heightMm = Math.ceil(cssPxToMm(dims.height)) + 16;
    const widthIn = widthMm / 25.4;
    const heightIn = heightMm / 25.4;
    pdfBuf = await wc.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: { width: widthIn, height: heightIn },
      margins: { marginType: 'none' },
      preferCSSPageSize: false,
    });
  } finally {
    try {
      if (wc.debugger.isAttached()) {
        await wc.debugger.sendCommand('Emulation.setEmulatedMedia', { media: '' });
      }
    } catch {
      /* ignore */
    }
    if (dbgAttached && wc.debugger.isAttached()) {
      try {
        wc.debugger.detach();
      } catch {
        /* ignore */
      }
    }
  }
  return pdfBuf;
}

async function waitForPdfReadyAttribute(webContents, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await webContents.executeJavaScript(
      `document.documentElement.getAttribute('data-pdf-ready') === '1'`
    );
    if (ready) return;
    await new Promise((r) => setTimeout(r, 200));
  }
}

ipcMain.handle('pdf:html-content', async (_evt, payload) => {
  const { htmlContent, useOlevelStandardDynamic } = payload || {};

  if (!htmlContent || typeof htmlContent !== 'string') {
    return { ok: false, error: 'Missing htmlContent' };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pweza-pdf-html-'));
  const tmpPath = path.join(tmpDir, 'document.html');

  let win;
  try {
    fs.writeFileSync(tmpPath, htmlContent, 'utf8');
    const fileUrl = pathToFileURL(tmpPath).href;

    win = createPdfBrowserWindow();
    await loadUrlWithTimeout(win, fileUrl, 120000);
    await new Promise((r) => setTimeout(r, useOlevelStandardDynamic ? 500 : 250));

    const useDynamic = Boolean(useOlevelStandardDynamic);
    const pdfBuf = useDynamic
      ? await printToPdfOlevelDynamic(win)
      : await win.webContents.printToPDF({
          printBackground: true,
          landscape: false,
          pageSize: 'A4',
          margins: { marginType: 'none' },
          preferCSSPageSize: true,
        });

    return { ok: true, pdfBase64: Buffer.from(pdfBuf).toString('base64') };
  } catch (err) {
    const message = err && typeof err.message === 'string' ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    try {
      if (win && !win.isDestroyed()) win.close();
    } catch {
      /* ignore */
    }
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

ipcMain.handle('pdf:print-hash-route', async (_evt, payload) => {
  const { hashRoute, storageKey, storageJson, appUrl } = payload || {};

  if (!hashRoute || typeof hashRoute !== 'string') {
    return { ok: false, error: 'Missing hashRoute' };
  }

  let win;
  try {
    win = createPdfBrowserWindow();

    if (storageKey && storageJson) {
      await loadUrlWithTimeout(win, 'about:blank', 30000);
      await win.webContents.executeJavaScript(
        `try { localStorage.setItem(${JSON.stringify(storageKey)}, ${JSON.stringify(storageJson)}); } catch (e) {}`
      );
    }

    const url = toAppHashUrl(hashRoute, isDev && appUrl ? appUrl : undefined);
    await loadUrlWithTimeout(win, url, 180000);
    await waitForPdfReadyAttribute(win.webContents, 180000).catch(() => {});

    const pdfBuf = await win.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      pageSize: 'A4',
      margins: { marginType: 'none' },
      preferCSSPageSize: true,
    });

    return { ok: true, pdfBase64: Buffer.from(pdfBuf).toString('base64') };
  } catch (err) {
    const message = err && typeof err.message === 'string' ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    try {
      if (win && !win.isDestroyed()) win.close();
    } catch {
      /* ignore */
    }
  }
});

ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) {
    return { ok: false, reason: 'dev' };
  }
  try {
    const { autoUpdater } = require('electron-updater');
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
});

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
