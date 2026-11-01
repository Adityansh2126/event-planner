const test = require('node:test');
const assert = require('node:assert');
const { generate } = require('../gemini');

const v = { type: 'birthday', guests: 20, budget: 5000, date: '2027-03-01', city: 'Delhi', vibe: '' };
const ok = { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: 's', timeline: [{ weeksBefore: 2, task: 't' }], vendors: [{ category: 'c', tip: 't' }], ideas: ['i'] }) }] } }] }) };
const fail = status => ({ ok: false, status });
const env = { GEMINI_API_KEY: 'k', GEMINI_MODEL: 'main-model', GEMINI_FALLBACK_MODEL: 'backup-model' };

test('returns null without an API key', async () => {
  assert.strictEqual(await generate(v, { env: {} }), null);
});

test('retries once on a 503 and succeeds', async () => {
  const urls = [];
  const fetchFn = async url => { urls.push(url); return urls.length === 1 ? fail(503) : ok; };
  const out = await generate(v, { env, fetchFn, retryDelayMs: 0 });
  assert.strictEqual(out.summary, 's');
  assert.strictEqual(urls.length, 2);
});

test('switches to the fallback model on a 404', async () => {
  const urls = [];
  const fetchFn = async url => { urls.push(url); return url.includes('backup-model') ? ok : fail(404); };
  await generate(v, { env, fetchFn, retryDelayMs: 0 });
  assert.match(urls[0], /main-model/);
  assert.match(urls[1], /backup-model/);
});

test('throws after every attempt fails', async () => {
  await assert.rejects(generate(v, { env, fetchFn: async () => fail(503), retryDelayMs: 0 }), /Gemini 503/);
});
