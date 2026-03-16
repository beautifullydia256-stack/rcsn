// Africa's Talking SMS Delivery Reports callback.
// This endpoint is called by Africa's Talking with application/x-www-form-urlencoded
// when the telco updates the delivery status for a message.
//
// For now we:
// - Parse the payload safely
// - Log the key fields to stdout (visible in Vercel logs)
// - Always respond 200 so Africa's Talking treats the callback as received
//
// Later, we can extend this to update Supabase notification_logs or add a
// dedicated sms_delivery_reports table.

function parseFormBody(req, callback) {
  let body = '';
  req.setEncoding('utf8');
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    try {
      const params = new URLSearchParams(body || '');
      const obj = {};
      for (const [k, v] of params.entries()) {
        obj[k] = v;
      }
      callback(null, obj);
    } catch (err) {
      callback(err);
    }
  });
}

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }));
    return;
  }

  parseFormBody(req, (err, data) => {
    if (err) {
      console.error('AT delivery report parse error', err);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Invalid form body' }));
      return;
    }

    // Expected fields from Africa's Talking:
    // id, status, phoneNumber, networkCode, failureReason (optional), retryCount (optional)
    const {
      id,
      status,
      phoneNumber,
      networkCode,
      failureReason,
      retryCount,
    } = data;

    console.log('AT delivery report', {
      id,
      status,
      phoneNumber,
      networkCode,
      failureReason,
      retryCount,
    });

    // In future we can link id -> notification_logs entry and update status.

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
  });
};

