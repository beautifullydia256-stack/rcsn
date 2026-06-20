'use strict';
// Combined lesson-log router. URL: /api/lesson-log?action=<name>

function load(path) {
  const m = require(path);
  return typeof m === 'function' ? m : (m.default || m.handler || m);
}

module.exports = async function handler(req, res) {
  const action = (req.query && req.query.action) || '';
  switch (action) {
    case 'start':    return load('./_start')(req, res);
    case 'complete': return load('./_complete')(req, res);
    case 'approve':  return load('./_approve')(req, res);
    case 'photos':   return load('./_photos')(req, res);
    default:
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
  }
};
