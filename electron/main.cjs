/**
 * Electron main process: window + optional embedded PDF API + Puppeteer A4 PDF from in-app routes.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork } = require('child_process');
const { pathToFileURL } = require('url');

let pdfApiChild = null;

const isDev = process.env.ELECTRON_DEV === '1';

function startEmbeddedPdfApi() {
  if (process.env.START_PDF_API === '0') return;
  const apiJs = path.join(__dirname, '..', 'api-server', 'dist', 'index.js');
  if (!fs.existsSync(apiJs)) {
    console.warn(
      '[electron] PDF API not found at',
      apiJs,
      '— build api-server or set VITE_PDF_API_URL to a running server for heritage/staged PDF routes.'
    );
    return;
  }
  const port = process.env.PDF_API_PORT || '3001';
  pdfApiChild = fork(apiJs, [], {
    cwd: path.join(__dirname, '..', 'api-server'),
    env: { ...process.env, PORT: port },
    silent: false,
  });
  console.info('[electron] Started embedded PDF API on port', port);
}

function distIndexPath() {
  return path.join(__dirname, '..', 'dist', 'index.html');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 864,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (isDev) {
    const devPort = process.env.VITE_DEV_PORT || '3000';
    void win.loadURL(`http://127.0.0.1:${devPort}/`);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexHtml = distIndexPath();
    if (!fs.existsSync(indexHtml)) {
      console.error('[electron] Missing Vite build:', indexHtml, '— run npm run build:desktop first.');
    }
    void win.loadFile(indexHtml);
  }

  return win;
}

/**
 * @param {string} hashRoute e.g. `/print/heritage-pdf?sessionId=...&token=...`
 */
function toAppHashUrl(hashRoute, appUrl) {
  const pathPart = hashRoute.startsWith('/') ? hashRoute : `/${hashRoute}`;
  if (appUrl) {
    const base = String(appUrl).replace(/\/$/, '');
    return `${base}/#${pathPart}`;
  }
  const indexHtml = distIndexPath();
  return `${pathToFileURL(indexHtml).href}#${pathPart}`;
}

ipcMain.handle('pdf:print-hash-route', async (_evt, payload) => {
  const puppeteer = require('puppeteer');
  const { hashRoute, storageKey, storageJson, appUrl } = payload || {};

  if (!hashRoute || typeof hashRoute !== 'string') {
    return { ok: false, error: 'Missing hashRoute' };
  }

  const launchOpts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };

  let browser;
  try {
    browser = await puppeteer.launch(launchOpts);
    const page = await browser.newPage();

    if (storageKey && storageJson) {
      await page.evaluateOnNewDocument(
        (sk, sj) => {
          try {
            sessionStorage.setItem(sk, sj);
          } catch {
            /* ignore */
          }
        },
        storageKey,
        storageJson
      );
    }

    const url = toAppHashUrl(hashRoute, isDev && appUrl ? appUrl : undefined);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 180000 });

    await page
      .waitForFunction(
        () => document.documentElement.getAttribute('data-pdf-ready') === '1',
        { timeout: 180000 }
      )
      .catch(() => {
        /* still attempt PDF; page may not set the flag for all routes */
      });

    const pdfBuf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return { ok: true, pdfBase64: Buffer.from(pdfBuf).toString('base64') };
  } catch (err) {
    const message = err && typeof err.message === 'string' ? err.message : String(err);
    return { ok: false, error: message };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

app.whenReady().then(() => {
  startEmbeddedPdfApi();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (pdfApiChild) {
    pdfApiChild.kill();
    pdfApiChild = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
