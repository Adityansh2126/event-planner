const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../server');
const { createLimiter } = require('../utils');

const future = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const input = { type: 'wedding', guests: 50, budget: 100000, date: future(120), city: 'Pune', vibe: 'garden' };
const aiPlan = { summary: 'ok', timeline: [{ date: '2027-05-01', task: 'Book venue' }], vendors: [{ category: 'Venue', tip: 'Get quotes' }], ideas: ['Lanterns'] };

async function withServer(opts, fn) {
  const server = createApp(opts).listen(0);
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections?.(); server.close(); }
}
const post = (base, body, raw) => fetch(`${base}/api/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: raw ?? JSON.stringify(body) });

test('serves the page with security headers', () => withServer({}, async base => {
  const res = await fetch(base);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
  assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
}));

test('rejects invalid input with field errors', () => withServer({}, async base => {
  const res = await post(base, { type: 'nope' });
  assert.strictEqual(res.status, 400);
  assert.ok((await res.json()).errors.type);
}));

test('malformed JSON returns a JSON 400', () => withServer({}, async base => {
  const res = await post(base, null, '{bad json');
  assert.strictEqual(res.status, 400);
  assert.ok((await res.json()).error);
}));

test('returns AI content with an exact budget split', () => withServer({ generate: async () => aiPlan }, async base => {
  const data = await (await post(base, input)).json();
  assert.strictEqual(data.source, 'gemini');
  assert.strictEqual(data.budget.reduce((s, x) => s + x.amount, 0), 100000);
}));

test('falls back to the template when the AI fails', () => withServer({ generate: async () => { throw new Error('boom'); } }, async base => {
  const data = await (await post(base, input)).json();
  assert.strictEqual(data.source, 'template');
  assert.ok(data.timeline.length > 0);
}));

test('identical requests are served from cache', async () => {
  let calls = 0;
  await withServer({ generate: async () => { calls++; return aiPlan; } }, async base => {
    await post(base, input); await post(base, input);
  });
  assert.strictEqual(calls, 1);
});

test('rate limiting returns 429', () => withServer({ limiter: createLimiter(2, 60000), generate: async () => aiPlan }, async base => {
  assert.strictEqual((await post(base, input)).status, 200);
  assert.strictEqual((await post(base, { ...input, guests: 51 })).status, 200);
  assert.strictEqual((await post(base, { ...input, guests: 52 })).status, 429);
}));
