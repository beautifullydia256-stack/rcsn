'use strict';

const handler = require('./_resend-inbound');

module.exports = function (req, res) {
  return handler(req, res);
};
