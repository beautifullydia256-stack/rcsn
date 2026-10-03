'use strict';
// Combined lesson-log router. URL: /api/lesson-log?action=<name>
// Static top-level requires so Vercel Nft bundles all sub-handlers and their
// dependencies without needing includeFiles guesswork.

const startHandler    = require('./_start');
const completeHandler = require('./_complete');
const approveHandler  = require('./_approve');
const photosHandler   = require('./_photos');

module.exports = async function handler(req, res) {
  const action = (req.query && req.query.action) || '';
  switch (action) {
    case 'start':    return startHandler(req, res);
    case 'complete': return completeHandler(req, res);
    case 'approve':  return approveHandler(req, res);
    case 'photos':   return photosHandler(req, res);
    default:
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
  }
};
