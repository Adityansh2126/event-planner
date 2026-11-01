'use strict';
const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
$('date').min = new Date().toISOString().slice(0, 10);

function el(tag, text, cls) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function section(title) { const s = el('div'); s.append(el('h2', title)); return s; }

function render(d) {
  const root = $('plan'); root.replaceChildren();
  if (d.summary) root.append(el('p', d.summary));
  if (d.source === 'template') root.append(el('p', 'Showing a starter plan. AI suggestions are unavailable right now.', 'note'));

  const b = section('Budget');
  d.budget.forEach(x => {
    const row = el('div', null, 'bar'), track = el('div', null, 'track'), fill = el('div', null, 'fill');
    fill.style.width = x.percent + '%';
    track.setAttribute('role', 'img'); track.setAttribute('aria-label', `${x.percent}% of budget`);
    track.append(fill);
    row.append(el('span', x.category), track, el('span', fmt(x.amount), 'amt'));
    b.append(row);
  });
  const t = section('Timeline'), ol = el('ol', null, 'tl');
  d.timeline.forEach(x => { const li = el('li'); li.append(el('time', x.date), el('span', x.task)); ol.append(li); });
  t.append(ol);

  const v = section('Vendor checklist'), ul = el('ul', null, 'chk');
  const prog = el('p', `0 of ${d.vendors.length} vendors booked`, 'note');
  prog.setAttribute('aria-live', 'polite');
  const update = () => { prog.textContent = `${ul.querySelectorAll('input:checked').length} of ${d.vendors.length} vendors booked`; };
  d.vendors.forEach((x, i) => {
    const li = el('li'), lab = el('label'), cb = document.createElement('input');
    cb.type = 'checkbox'; cb.id = 'v' + i; cb.addEventListener('change', update); lab.htmlFor = cb.id;
    lab.append(cb, el('span', x.category)); li.append(lab, el('small', x.tip)); ul.append(li);
  });
  v.append(prog, ul);

  const i = section('Ideas for you'), il = el('ul', null, 'plain');
  d.ideas.forEach(x => il.append(el('li', x))); i.append(il);

  const p = el('button', 'Print or save as PDF'); p.id = 'print'; p.type = 'button'; p.onclick = () => window.print();
  root.append(b, t, v, i, p);
  root.focus();
}

$('f').addEventListener('submit', async e => {
  e.preventDefault();
  const err = $('err'), go = $('go'); err.textContent = '';
  const body = Object.fromEntries(new FormData(e.target));
  go.disabled = true; go.textContent = 'Planning…';
  try {
    const r = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.errors ? Object.values(d.errors).join(' ') : d.error || 'Something went wrong.');
    render(d);
  } catch (x) { err.textContent = x.message; }
  finally { go.disabled = false; go.textContent = 'Create my plan'; }
});
