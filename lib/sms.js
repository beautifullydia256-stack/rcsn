'use strict';

// EgoSMS (Pahappa Comms platform) — Uganda bulk SMS. Shared by every CommonJS serverless
// function that sends SMS, so the provider logic lives in exactly one place (the previous
// Africa's Talking integration silently diverged into two different implementations across
// api/notifications/send.js and src/lib/africastalking.ts — one had a real bug, the other
// didn't — which was a likely cause of inconsistent delivery).
//
// API shape verified directly from the EgoSMS SDK's own source, not the (broken/paywalled)
// docs pages: https://github.com/Pahappa-LTD/comms-sdk/blob/main/js/src/v1/CommsSDK.ts

const https = require('https');

const EGOSMS_URL = 'https://comms.egosms.co/api/v1/json/';

function httpsRequest(url, opts, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port ? Number(u.port) : undefined,
        path: `${u.pathname}${u.search}`,
        method: opts.method,
        headers: { ...opts.headers, 'Content-Length': Buffer.byteLength(body).toString() },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 0, text: data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function sanitizeHeaderValue(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\r\n|\r|\n/g, '').trim();
}

function normalizePhone(to) {
  let digits = String(to || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 9 && !digits.startsWith('254') && !digits.startsWith('256')) {
    digits = '256' + digits;
  }
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function isUgandaNumber(normalized) {
  return /^\+256\d{9}$/.test(normalized);
}

/** Every outgoing SMS must lead with the company name — applied here so no caller can forget it. */
function buildBrandedMessage(message, schoolName) {
  const body = schoolName ? `${schoolName}\n${message}` : message;
  return `PwezaCore:\n\n${body}`;
}

/**
 * @param {string} to
 * @param {string} message
 * @param {{ priority?: '0'|'1'|'2'|'3'|'4', schoolName?: string }} [opts]
 */
async function sendEgoSms(to, message, opts) {
  opts = opts || {};
  const username = sanitizeHeaderValue(process.env.EGOSMS_USERNAME);
  const apiKey = sanitizeHeaderValue(process.env.EGOSMS_API_KEY);
  const senderId = sanitizeHeaderValue(process.env.EGOSMS_SENDER_ID) || 'EgoSMS';
  const priority = opts.priority || '1';

  if (!username || !apiKey) {
    return { success: false, error: 'SMS provider not configured. Set EGOSMS_USERNAME and EGOSMS_API_KEY.' };
  }

  const normalized = normalizePhone(to);
  if (!isUgandaNumber(normalized)) {
    return { success: false, error: 'Only Uganda (+256) numbers are allowed.' };
  }

  const payload = JSON.stringify({
    method: 'SendSms',
    userdata: { username, password: apiKey },
    msgdata: [
      {
        number: normalized,
        message: buildBrandedMessage(message, opts.schoolName),
        senderid: senderId,
        priority,
      },
    ],
  });

  try {
    const r = await httpsRequest(EGOSMS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, payload);
    let data = {};
    try {
      data = JSON.parse(r.text || '{}');
    } catch {
      data = {};
    }
    const ok = (r.status === 200 || r.status === 201) && data.Status === 'OK';
    return ok ? { success: true } : { success: false, error: data.Message || `HTTP ${r.status}` };
  } catch (err) {
    console.error('EgoSMS send error', err);
    return { success: false, error: String(err) };
  }
}

module.exports = { sendEgoSms, normalizePhone, isUgandaNumber };
