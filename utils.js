'use strict';

/** Small in-memory cache with a TTL and a size cap (oldest entry evicted first). */
class TtlCache {
  constructor(max, ttlMs) { this.max = max; this.ttl = ttlMs; this.map = new Map(); }
  get(key) {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.expires < Date.now()) { this.map.delete(key); return undefined; }
    return e.value;
  }
  set(key, value) {
    if (this.map.size >= this.max) this.map.delete(this.map.keys().next().value);
    this.map.set(key, { value, expires: Date.now() + this.ttl });
  }
}

/** Per-IP sliding-window rate limiter; stale entries are swept so memory stays bounded. */
function createLimiter(max, windowMs, maxClients = 10000) {
  const hits = new Map();
  setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [ip, times] of hits) if (times[times.length - 1] < cutoff) hits.delete(ip);
  }, windowMs).unref();
  return (req, res, next) => {
    const now = Date.now();
    const recent = (hits.get(req.ip) || []).filter(t => now - t < windowMs);
    if (recent.length >= max) return res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
    recent.push(now);
    if (!hits.has(req.ip) && hits.size >= maxClients) hits.delete(hits.keys().next().value); // bound memory
    hits.set(req.ip, recent);
    next();
  };
}

module.exports = { TtlCache, createLimiter };
