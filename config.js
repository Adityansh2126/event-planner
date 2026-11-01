'use strict';
const int = (value, fallback) => (value !== undefined && value !== '' && Number.isInteger(Number(value)) ? Number(value) : fallback);

module.exports = {
  port: int(process.env.PORT, 8080),
  trustProxy: int(process.env.TRUST_PROXY, 1), // hops of reverse proxy in front of the app (1 on Render)
  rateLimit: { max: 15, windowMs: 60000, maxClients: 10000 },
  cache: { max: 100, ttlMs: 10 * 60000 },
  limits: { maxGuests: 5000, maxBudget: 1e9, maxCity: 80, maxVibe: 200, maxHorizonDays: 1100 }
};
