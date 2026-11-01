'use strict';
const SPLITS = {
  wedding: { 'Venue': .25, 'Food & catering': .30, 'Photo & video': .10, 'Decor & flowers': .10, 'Music & entertainment': .07, 'Attire & beauty': .08, 'Contingency': .10 },
  birthday: { 'Venue': .20, 'Food & cake': .35, 'Decor': .12, 'Entertainment': .15, 'Invites & favors': .08, 'Contingency': .10 },
  community: { 'Venue & permits': .22, 'Food & drink': .25, 'Sound & AV': .15, 'Promotion': .12, 'Volunteers & safety': .11, 'Decor & signage': .05, 'Contingency': .10 }
};
const TYPES = Object.keys(SPLITS);

function validate(b = {}) {
  const errors = {};
  const type = String(b.type || '').toLowerCase();
  if (!TYPES.includes(type)) errors.type = 'Choose an event type.';
  const guests = Number(b.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > 5000) errors.guests = 'Enter a guest count from 1 to 5000.';
  const budget = Number(b.budget);
  if (!Number.isFinite(budget) || budget < 1 || budget > 1e9) errors.budget = 'Enter a budget greater than 0.';
  const date = String(b.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.date = 'Pick the event date.';
  const city = String(b.city || '').trim().slice(0, 80);
  const vibe = String(b.vibe || '').trim().slice(0, 200);
  return { errors, value: { type, guests, budget, date, city, vibe } };
}

function budgetPlan(type, budget) {
  return Object.entries(SPLITS[type]).map(([category, p]) => ({ category, percent: Math.round(p * 100), amount: Math.round(budget * p) }));
}

function dateBefore(eventDate, weeks, now = Date.now()) {
  const t = Math.max(now, Date.parse(eventDate) - weeks * 6048e5);
  return new Date(t).toISOString().slice(0, 10);
}

const str = (x, n) => String(x ?? '').slice(0, n);
function clean(raw, v) {
  const arr = (a, n) => (Array.isArray(a) ? a.slice(0, n) : []);
  return {
    summary: str(raw.summary, 400),
    timeline: arr(raw.timeline, 12).map(t => ({ date: dateBefore(v.date, Math.min(Math.max(Number(t.weeksBefore) || 0, 0), 104)), task: str(t.task, 160) })).filter(t => t.task).sort((a, b) => a.date.localeCompare(b.date)),
    vendors: arr(raw.vendors, 10).map(x => ({ category: str(x.category, 60), tip: str(x.tip, 200) })).filter(x => x.category),
    ideas: arr(raw.ideas, 8).map(x => str(x, 200)).filter(Boolean)
  };
}

function fallback(v) {
  const names = Object.keys(SPLITS[v.type]).filter(c => c !== 'Contingency');
  return clean({
    summary: `A starter plan for a ${v.type} with ${v.guests} guests. Add a Gemini API key for tailored ideas.`,
    timeline: [[12, 'Set the budget and shortlist venues'], [10, 'Book venue and main vendors'], [8, 'Send save-the-dates'], [6, 'Finalize menu and entertainment'], [3, 'Confirm headcount with guests'], [1, 'Confirm timings with every vendor'], [0, 'Event day: assign a point person for each task']].map(([weeksBefore, task]) => ({ weeksBefore, task })),
    vendors: names.map(category => ({ category, tip: 'Get three quotes and ask what is included.' })),
    ideas: ['Pick one signature theme and carry it through invites, decor and food.', 'Add one interactive moment such as a photo wall or a guest toast.', 'Prepare a rain or overflow plan.']
  }, v);
}

module.exports = { validate, budgetPlan, dateBefore, clean, fallback, TYPES };
