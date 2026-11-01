const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../server');
const { validate } = require('../planner');
const { TtlCache, createLimiter } = require('../utils');

const day = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
const ok = { type: 'birthday', guests: 10, budget: 1000, date: day(30) };

async function withServer(fn) {
  const server = createApp({ generate: async () => null }).listen(0);
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections?.(); server.close(); }
}

test('dates in the past or too far ahead are rejected', () => {
  assert.ok(validate({ ...ok, date: day(-30) }).errors.date);
  assert.ok(validate({ ...ok, date: day(2000) }).errors.date);
  assert.deepStrictEqual(validate(ok).errors, {});
});

test('non-object bodies are rejected without throwing', () => {
  for (const body of [null, [], 'text', 5]) assert.ok(validate(body).errors.type);
});

test('control characters are stripped and text is length-capped', () => {
  const { value } = validate({ ...ok, city: 'Pu\u0000ne\n', vibe: 'x'.repeat(500) });
  assert.strictEqual(value.city, 'Pu ne');
  assert.strictEqual(value.vibe.length, 200);
});

test('health check, unknown API routes and extra security headers', () => withServer(async base => {
  assert.deepStrictEqual(await (await fetch(`${base}/healthz`)).json(), { status: 'ok' });
  const missing = await fetch(`${base}/api/nope`);
  assert.strictEqual(missing.status, 404);
  assert.strictEqual(missing.headers.get('cache-control'), 'no-store');
  assert.match(missing.headers.get('strict-transport-security'), /max-age/);
  assert.ok(missing.headers.get('permissions-policy'));
}));

test('TtlCache expires entries and evicts the oldest at capacity', async () => {
  const c = new TtlCache(2, 5);
  c.set('a', 1); c.set('b', 2); c.set('c', 3);
  assert.strictEqual(c.get('a'), undefined);
  assert.strictEqual(c.get('c'), 3);
  await new Promise(r => setTimeout(r, 15));
  assert.strictEqual(c.get('c'), undefined);
});

test('rate limiter blocks per IP and bounds tracked clients', () => {
  const limit = createLimiter(1, 60000, 2);
  const run = ip => { let code = 200; limit({ ip }, { status: c => ({ json: () => { code = c; } }) }, () => {}); return code; };
  assert.strictEqual(run('1.1.1.1'), 200);
  assert.strictEqual(run('1.1.1.1'), 429);
  run('2.2.2.2'); run('3.3.3.3');
  assert.strictEqual(run('1.1.1.1'), 200); // oldest client was evicted
});
