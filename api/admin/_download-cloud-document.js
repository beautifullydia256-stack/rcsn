'use strict';

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function') {
    res.status(statusCode);
  } else {
    res.statusCode = statusCode;
  }
  if (typeof res.json === 'function') {
    return res.json(data);
  }
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(data));
}

module.exports = async function handler(req, res) {
  try {
    const url = req.query?.url || req.body?.url;
    const filename = req.query?.filename || req.body?.filename || 'document.pdf';
    const mode = req.query?.mode || 'stream'; // 'stream' | 'json' | 'redirect'

    if (!url) {
      return sendJson(res, 400, { error: 'Missing required document url parameter' });
    }

    let directDownloadUrl = url;

    // 1. Resolve Adobe Acrobat / Adobe Scan shared links
    if (url.includes('acrobat.adobe.com') || url.includes('adobe.com')) {
      try {
        const pageRes = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        });
        const html = await pageRes.text();
        const regex = /https?:\/\/[^\s"'<>]+blobstore[^\s"'<>]+/i;
        const match = html.match(regex);
        if (match) {
          directDownloadUrl = match[0].replace(/&amp;/g, '&');
        }
      } catch (err) {
        console.warn('Failed to parse Adobe share page, falling back to original URL:', err);
      }
    }

    // 2. Return direct JSON if requested
    if (mode === 'json') {
      return sendJson(res, 200, {
        directDownloadUrl,
        filename,
      });
    }

    // 3. If redirect requested or streaming not required
    if (mode === 'redirect') {
      res.writeHead(302, { Location: directDownloadUrl });
      return res.end();
    }

    // 4. Stream file binary with forced attachment headers for offline saving
    const fileRes = await fetch(directDownloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!fileRes.ok) {
      // Fallback: 302 redirect directly to the signed URL
      res.writeHead(302, { Location: directDownloadUrl });
      return res.end();
    }

    const contentType = fileRes.headers.get('content-type') || 'application/pdf';
    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`
    );

    const arrayBuffer = await fileRes.arrayBuffer();
    res.setHeader('Content-Length', arrayBuffer.byteLength);
    return res.end(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Download cloud document error:', error);
    return sendJson(res, 500, { error: error.message || 'Failed to download document' });
  }
};
