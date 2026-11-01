const test = require('node:test');
const assert = require('node:assert');
const { validate, budgetPlan, dateBefore, clean } = require('../planner');

test('rejects bad input', () => {
  const { errors } = validate({ type: 'x', guests: 0, budget: -5, date: 'nope' });
  assert.deepStrictEqual(Object.keys(errors).sort(), ['budget', 'date', 'guests', 'type']);
});
test('budget splits sum to the total', () => {
  for (const t of ['wedding', 'birthday', 'community']) {
    const sum = budgetPlan(t, 100000).reduce((s, x) => s + x.amount, 0);
    assert.strictEqual(sum, 100000);
  }
});
test('timeline dates never fall in the past', () => {
  assert.strictEqual(dateBefore('2020-01-01', 5, Date.parse('2026-11-01')), '2026-11-01');
});
test('clean tolerates garbage model output', () => {
  const out = clean({ timeline: 'x', vendors: null, ideas: [1, ''] }, { date: '2027-01-01' });
  assert.deepStrictEqual(out.timeline, []);
  assert.deepStrictEqual(out.ideas, ['1']);
});
