'use strict';
const express = require('express');
const compression = require('compression');
const path = require('path');
const { validate, budgetPlan, fallback } = require('./planner');
const { generate: defaultGenerate } = require('./gemini');
const { TtlCache, createLimiter } = require('./utils');

function securityHeaders(req, res, next) {
  res.set({
    'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  });
  next();
}

function createApp({ generate = defaultGenerate, limiter = createLimiter(15, 60000), cache = new TtlCache(100, 10 * 60000) } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // behind Render's proxy, so rate limits use the real client IP
  app.use(compression());
  app.use(securityHeaders);
  app.use(express.json({ limit: '10kb' }));
  app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

  app.post('/api/plan', limiter, async (req, res) => {
    const { errors, value } = validate(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ errors });

    const cacheKey = JSON.stringify(value);
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    let plan = null;
    try { plan = await generate(value); } catch (e) { console.error(e.message); }
    const source = plan && plan.timeline.length ? 'gemini' : 'template';
    if (source === 'template') plan = fallback(value);

    const body = { source, budget: budgetPlan(value.type, value.budget), ...plan };
    if (source === 'gemini') cache.set(cacheKey, body);
    res.json(body);
  });

  // Malformed JSON and oversized bodies get a JSON error instead of an HTML page.
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: 'Invalid request.' }));
  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 8080;
  createApp().listen(port, () => console.log(`Event planner on :${port}`));
}
module.exports = { createApp };
