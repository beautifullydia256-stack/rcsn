'use strict';

/**
 * PwezaCore Standalone Production Server
 * Serves Vite SPA from ./dist and executes Node.js /api serverless handlers
 * Zero external dependencies (uses native Node.js http, fs, path, url)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.join(__dirname, 'dist');
const API_DIR = path.join(__dirname, 'api');

// Load environment variables from .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.wasm': 'application/wasm',
  '.pdf':  'application/pdf',
};

// Map URL rewrites (from vercel.json)
const REWRITES = [
  { match: /^\/api\/ai\/([a-z0-9-]+)$/, target: '/api/ai', action: '$1' },
  { match: /^\/api\/lesson-log\/([a-z0-9-]+)$/, target: '/api/lesson-log', action: '$1' },
  { match: /^\/api\/admin\/([a-z0-9-]+)$/, target: '/api/admin', action: '$1' },
  { match: /^\/api\/integrations\/schoolpay\/(settings|sync)$/, target: '/api/misc', action: 'schoolpay-$1' },
  { match: /^\/api\/referrals\/verify$/, target: '/api/misc', action: 'referrals-verify' },
  { match: /^\/api\/teacher\/punch$/, target: '/api/misc', action: 'teacher-punch' },
  { match: /^\/api\/owner\/([a-z0-9-]+)$/, target: '/api/misc', action: 'owner-$1' },
  { match: /^\/api\/pdf\/render-session$/, target: '/api/misc', action: 'pdf-render-session' },
  { match: /^\/api\/webhooks\/biometric-attendance$/, target: '/api/misc', action: 'biometric-attendance' },
];

function enhanceResponse(res) {
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (obj) {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(obj));
    return res;
  };
  res.send = function (data) {
    if (typeof data === 'object' && !Buffer.isBuffer(data)) {
      return res.json(data);
    }
    res.end(data);
    return res;
  };
  return res;
}

async function handleApiRequest(req, res, parsedUrl) {
  enhanceResponse(res);

  // Apply rewrites
  let pathname = parsedUrl.pathname;
  for (const r of REWRITES) {
    const match = pathname.match(r.match);
    if (match) {
      pathname = r.target;
      req.query = req.query || {};
      req.query.action = r.action.replace('$1', match[1]);
      break;
    }
  }

  // Parse body for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8');
    const contentType = req.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
      try {
        req.body = rawBody ? JSON.parse(rawBody) : {};
      } catch (e) {
        req.body = {};
      }
    } else {
      req.body = rawBody;
    }
  } else {
    req.body = {};
  }

  // Locate the API handler file
  const relativePath = pathname.replace(/^\/api\/?/, '');
  const candidatePaths = [
    path.join(API_DIR, `${relativePath}.js`),
    path.join(API_DIR, relativePath, 'index.js'),
    path.join(API_DIR, `${relativePath}.mjs`),
    path.join(API_DIR, relativePath, 'generate.js'),
  ];

  let handlerModule = null;
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      try {
        handlerModule = require(p);
        break;
      } catch (err) {
        console.error(`Error loading API module ${p}:`, err);
        return res.status(500).json({ error: 'Failed to load endpoint handler', details: err.message });
      }
    }
  }

  if (!handlerModule) {
    return res.status(404).json({ error: `API endpoint not found: ${parsedUrl.pathname}` });
  }

  const handler = typeof handlerModule === 'function' ? handlerModule : (handlerModule.default || handlerModule.handler);

  if (typeof handler !== 'function') {
    return res.status(500).json({ error: `API module does not export a valid handler function: ${parsedUrl.pathname}` });
  }

  try {
    await handler(req, res);
  } catch (err) {
    console.error(`Unhandled error in ${parsedUrl.pathname}:`, err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
}

function serveStatic(req, res, filePath) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA routing
      const indexFile = path.join(DIST_DIR, 'index.html');
      fs.readFile(indexFile, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('PwezaCore: dist/index.html not found. Run npm run build first.');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const isImmutable = filePath.includes(path.sep + 'assets' + path.sep);

    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
    };

    if (isImmutable) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    } else {
      headers['Cache-Control'] = 'public, max-age=3600';
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  req.query = parsed.query || {};

  // API Requests
  if (parsed.pathname.startsWith('/api/')) {
    return handleApiRequest(req, res, parsed);
  }

  // Static files & SPA Routing
  let safePath = path.normalize(parsed.pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';

  const fullPath = path.join(DIST_DIR, safePath);
  serveStatic(req, res, fullPath);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================================`);
  console.log(` PwezaCore Production Server listening on port ${PORT}`);
  console.log(` Serving SPA from: ${DIST_DIR}`);
  console.log(` API handlers from: ${API_DIR}`);
  console.log(`========================================================`);
});
