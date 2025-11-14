// simple in-memory cache for rate-limit protection / TTL
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 30, checkperiod: 60 }); // 30s default TTL
module.exports = cache;
