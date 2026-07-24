'use strict';
// Combined AI operations router. URL: /api/ai?action=<name>

function load(path) {
  const m = require(path);
  return typeof m === 'function' ? m : (m.default || m.handler || m);
}

module.exports = async function handler(req, res) {
  const action = (req.query && req.query.action) || '';
  switch (action) {
    case 'lesson-plan':           return load('./_lesson-plan')(req, res);
    case 'exam':                  return load('./_exam')(req, res);
    case 'generate-pdf':          return load('./_generate-pdf')(req, res);
    case 'scheme-of-work':        return load('./_scheme-of-work')(req, res);
    case 'scheme-of-work-edit':   return load('./_scheme-of-work-edit')(req, res);
    case 'status':                return load('./_status')(req, res);
    default:
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
  }
};
