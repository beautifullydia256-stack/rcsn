'use strict';
// Combined AI operations router. URL: /api/ai?action=<name>
// Static top-level requires so Vercel Nft bundles all sub-handlers and their
// dependencies (e.g. @supabase/supabase-js) without includeFiles guesswork.

function unwrap(m) {
  return typeof m === 'function' ? m : (m.default || m.handler || m);
}

const lessonPlanHandler         = unwrap(require('./_lesson-plan'));
const examHandler               = unwrap(require('./_exam'));
const generatePdfHandler        = unwrap(require('./_generate-pdf'));
const schemeOfWorkHandler       = unwrap(require('./_scheme-of-work'));
const schemeOfWorkEditHandler   = unwrap(require('./_scheme-of-work-edit'));
const statusHandler             = unwrap(require('./_status'));

module.exports = async function handler(req, res) {
  const action = (req.query && req.query.action) || '';
  switch (action) {
    case 'lesson-plan':           return lessonPlanHandler(req, res);
    case 'exam':                  return examHandler(req, res);
    case 'generate-pdf':          return generatePdfHandler(req, res);
    case 'scheme-of-work':        return schemeOfWorkHandler(req, res);
    case 'scheme-of-work-edit':   return schemeOfWorkEditHandler(req, res);
    case 'status':                return statusHandler(req, res);
    default:
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
  }
};
