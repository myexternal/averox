import { T } from './i18n.js';
import { MAP } from './mapdata.js';

const CFG = window.AVEROX || {};
const R = Object.assign({ startDay: 6, startOther: 8.5, kmSmall: 1.25, kmLarge: 2.11, perMin: 1.15 }, CFG.rates);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

let lang = 'fi';
const t = (k) => (T[lang] && T[lang][k]) ?? T.en[k] ?? k;
const locale = () => (lang === 'fi' ? 'fi-FI' : 'en-IE');
const money = (v, d = 2) => new Intl.NumberFormat(locale(), { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const num = (v, d = 2) => new Intl.NumberFormat(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const km1 = (v) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(v);

/* ── Fare model ─────────────────────────── */
export function isDayRate(date) {
  const d = date.getDay(), h = date.getHours();
  return d >= 1 && d <= 5 && h >= 7 && h < 18;
}
function fare({ km, min, day = true, large = false }) {
  const start = day ? R.startDay : R.startOther;
  const time = min * R.perMin;
  const dist = km * (large ? R.kmLarge : R.kmSmall);
  const r2 = (v) => Math.round(v * 100) / 100;
  return { start, time: r2(time), dist: r2(dist), total: r2(start + time + dist) };
}
const routeById = Object.fromEntries([...MAP.routes, ...MAP.local].map((r) => [r.id, r]));
const NAMES = { Lentoasema: 'Lentoasema', 'Helsinki Airport': 'hkiAir' };
const placeName = (id) => (NAMES[id] ? t(NAMES[id]) : id);
const longName = (id) => (id === 'Lentoasema' ? t('rAirT') : id === 'Helsinki Airport' ? t('hkiAirT') : placeName(id));
const hm = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`);
/* Sliders run on a square curve so short city trips stay precise and the far end still reaches Lapland. */
const KM_MAX = 800, MIN_MAX = 660, POS = 1000;
const posTo = (v, max) => 1 + (max - 1) * Math.pow(v / POS, 2);
const toPos = (x, max) => Math.round(POS * Math.sqrt(Math.max(0, x - 1) / (max - 1)));
const roundKm = (k) => (k < 100 ? Math.round(k * 2) / 2 : Math.round(k));

/* ── Language ───────────────────────────── */
function fill(str) {
  const air = routeById.Lentoasema;
  return str.replace('{km}', km1(air.km)).replace('{other}', money(R.startOther));
}
function applyLang(next, save = true) {
  lang = next === 'fi' ? 'fi' : 'en';
  document.documentElement.lang = lang;
  if (save) { try { localStorage.setItem('averox-lang-v2', lang); } catch (e) {} }
  $$('[data-i18n]').forEach((el) => { el.textContent = fill(t(el.dataset.i18n)); });
  $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $$('[data-money]').forEach((el) => { el.textContent = money(R[el.dataset.money]); });
  $$('[data-money-calc]').forEach((el) => {
    const v = el.dataset.moneyCalc.split('+').reduce((sum, part) => {
      const [a, b] = part.split('*');
      return sum + (b ? Number(a) * R[b] : R[a]);
    }, 0);
    el.textContent = money(v);
  });
  const L = $('.lang');
  L.dataset.on = lang;
  $$('button', L).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.title = lang === 'fi' ? 'Averox · Taksi Tampereelta koko Suomeen' : 'Averox · Taxi from Tampere to all of Finland';
  $('#fareFig').classList.toggle('cur-first', lang === 'en');
  $('#airFare').textContent = money(Math.round(fare({ km: routeById.Lentoasema.km, min: routeById.Lentoasema.min }).total), 0);
  meter.render(true);
  booking.refresh();
  area.render();
  fleetCopy();
}
$$('.lang button').forEach((b) => b.addEventListener('click', () => applyLang(b.dataset.lang)));

/* ── Segmented controls (radio groups) ──── */
function initSeg(group, onChange) {
  const btns = $$('[role="radio"]', group);
  const set = (btn, focus) => {
    btns.forEach((b) => { const on = b === btn; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
    group.dataset.value = btn.dataset.value;
    if (focus) btn.focus();
    onChange && onChange(btn.dataset.value);
  };
  btns.forEach((b) => {
    b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
    b.addEventListener('click', () => set(b));
    b.addEventListener('keydown', (e) => {
      const i = btns.indexOf(b);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); set(btns[(i + 1) % btns.length], true); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); set(btns[(i - 1 + btns.length) % btns.length], true); }
    });
  });
  group.dataset.value = (btns.find((b) => b.getAttribute('aria-checked') === 'true') || btns[0]).dataset.value;
  return { set: (v) => { const b = btns.find((x) => x.dataset.value === v); if (b) set(b); }, get: () => group.dataset.value };
}

/* ── Booking form ───────────────────────── */
const booking = (() => {
  const form = $('#bookForm');
  const f = (n) => form.elements[n];
  const panes = $$('.pane', form);
  const stepsLi = $$('.steps li');
  const laterBox = $('#whenLater');
  let step = 1;

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  function defaultsLater() {
    const d = new Date(Date.now() + 45 * 60000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    f('date').value = ymd(d); f('date').min = ymd(new Date());
    f('time').value = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  defaultsLater();

  const when = initSeg($('[data-name="when"]', form), (v) => { laterBox.hidden = v !== 'later'; clearBad(f('date')); refresh(); });
  const pax = initSeg($('[data-name="pax"]', form), () => refresh());

  function pickedDate() {
    if (when.get() === 'now') return new Date();
    const [y, m, d] = (f('date').value || '').split('-').map(Number);
    const [hh, mm] = (f('time').value || '').split(':').map(Number);
    if (!y || hh === undefined || Number.isNaN(hh)) return null;
    return new Date(y, m - 1, d, hh, mm || 0);
  }
  /* ── Address suggestions + live estimate ──
     Addresses: with CFG.geoProxy, Digitransit autocomplete (Finnish national address data + OSM) through Averox's own
     Cloudflare Worker, which holds the key (never in the browser), suggested as you type.
     Without a key, OpenStreetMap Nominatim, asked only after typing pauses, one request at a time at least 1.1 s apart, cached
     (its usage policy does not allow per-keystroke autocomplete). Route: OSRM driving distance and time, no traffic. */
  const est = { state: 'idle', km: 0, min: 0, from: null, to: null, total: null };
  const AC = { pickup: null, destination: null };            // resolved place per field: { lat, lon, main, sub, q }
  const FST = { pickup: 'idle', destination: 'idle' };       // field state: idle | busy | found | miss
  const PROXY = (CFG.geoProxy || '').trim().replace(/\/+$/, '');
  let digiOn = Boolean(PROXY);
  const geoCache = new Map(), routeCache = new Map();
  let geoQueue = Promise.resolve(), lastGeo = 0, estSeq = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const label = (p) => [p.main, p.sub].filter(Boolean).join(', ');

  function fromNominatim(j) {
    const a = j.address || {};
    const town = a.city || a.town || a.village || a.municipality || a.hamlet || '';
    const street = a.road ? `${a.road}${a.house_number ? ' ' + a.house_number : ''}` : '';
    const area = a.suburb || a.neighbourhood || a.quarter || '';
    const place = [a.postcode, town].filter(Boolean).join(' ');
    // A named place (shop, hotel, airport) shows its name first and its street below; an address shows the street first.
    const named = j.name && j.name !== a.road && j.name !== town;
    const main = named ? j.name : (street || j.name || j.display_name.split(',')[0]);
    const sub = [named ? street : '', area && area !== main ? area : '', place].filter(Boolean).join(', ');
    return { lat: +j.lat, lon: +j.lon, main, sub };
  }
  const uniq = (l) => l.filter((p, i) => l.findIndex((q) => q.main === p.main && q.sub === p.sub) === i);
  function fromDigitransit(ft) {
    const p = ft.properties || {};
    const [lon, lat] = ft.geometry.coordinates;
    const main = p.name || (p.label || '').split(',')[0];
    let sub = p.label && p.label.startsWith(main) ? p.label.slice(main.length).replace(/^,\s*/, '') : (p.locality || p.localadmin || '');
    if (p.postalcode && !sub.includes(String(p.postalcode))) sub = `${p.postalcode} ${sub}`.trim();
    return { lat, lon, main, sub };
  }
  async function askNominatim(query) {
    const wait = 1100 - (Date.now() - lastGeo); if (wait > 0) await sleep(wait);
    lastGeo = Date.now();
    const u = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=fi&viewbox=22.8,62.4,25.0,60.9&accept-language=fi&q=' + encodeURIComponent(query);
    const r = await fetch(u, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('geo ' + r.status);
    return uniq((await r.json()).map(fromNominatim));
  }
  async function askDigitransit(query) {
    const r = await fetch(`${PROXY}/?lang=fi&text=${encodeURIComponent(query)}`);
    if (!r.ok) throw new Error('geo ' + r.status);
    return uniq(((await r.json()).features || []).map(fromDigitransit)).slice(0, 6);
  }
  // A list of matches for what was typed (cached, so suggestions and the estimate share requests).
  // full=true is the final lookup for the price: if Digitransit has nothing (it misses some names, e.g. "Tampereen
  // lentoasema"), OpenStreetMap gets one try. Suggestions-as-you-type never use OpenStreetMap while the Worker works,
  // because its rules don't allow per-keystroke requests.
  const cached = (key, make) => {
    if (!geoCache.has(key)) { const p = make(); geoCache.set(key, p); p.catch(() => geoCache.delete(key)); }
    return geoCache.get(key);
  };
  const osm = (q) => cached('osm:' + q.toLowerCase(), () => (geoQueue = geoQueue.catch(() => {}).then(async () => {
    const l = await askNominatim(q);
    return l.length || /\d|tampere/i.test(q) ? l : askNominatim(q + ', Tampere');
  })));
  function lookup(q, full = false) {
    if (!digiOn) return osm(q);
    // If the Worker fails (blocked, limit reached, down), fall back to OpenStreetMap for the rest of the visit.
    const digi = cached('digi:' + q.toLowerCase(), () => askDigitransit(q)).catch(() => { digiOn = false; return osm(q); });
    return full ? digi.then((l) => (l.length || !digiOn ? l : osm(q))) : digi;
  }

  // Field status line under each address: searching / the address found / not found.
  const PIN = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 15s5-4.6 5-8.6A5 5 0 0 0 3 6.4C3 10.4 8 15 8 15Z" fill="currentColor"/><circle cx="8" cy="6.4" r="1.9" fill="#0b0c0e"/></svg>';
  function setField(n, state) {
    FST[n] = state;
    const fl = fieldOf(f(n)), hit = $('.hit', fl);
    ['busy', 'found', 'miss'].forEach((s) => fl.classList.toggle('is-' + s, state === s));
    hit.hidden = state === 'idle';
    if (state === 'busy') hit.innerHTML = `<i class="spin" aria-hidden="true"></i><span>${t('acBusy')}</span>`;
    else if (state === 'miss') hit.innerHTML = `<b>!</b><span>${t('acMiss')}</span>`;
    else if (state === 'found') { hit.innerHTML = PIN + '<span></span>'; $('span', hit).textContent = label(AC[n]); }
    hit.title = state === 'found' ? label(AC[n]) : '';
  }
  async function resolve(n) {
    const q = f(n).value.trim();
    if (AC[n] && AC[n].q === q) { setField(n, 'found'); return AC[n]; }
    setField(n, 'busy');
    let list;
    try { list = await lookup(q, true); } catch (e) { if (f(n).value.trim() === q) setField(n, 'idle'); throw e; }
    if (f(n).value.trim() !== q) return null;      // typed on meanwhile; a newer estimate will follow
    AC[n] = list[0] ? { ...list[0], q } : null;
    setField(n, AC[n] ? 'found' : 'miss');
    return AC[n];
  }

  // Suggestion list (ARIA combobox): arrows + Enter, Esc closes, tap or click picks.
  const acState = { pickup: { items: [], active: -1, seq: 0, timer: 0 }, destination: { items: [], active: -1, seq: 0, timer: 0 } };
  function listOf(n) { return $('#' + f(n).getAttribute('aria-controls')); }
  function closeList(n) {
    const ul = listOf(n); ul.hidden = true; ul.innerHTML = '';
    acState[n].items = []; acState[n].active = -1;
    f(n).setAttribute('aria-expanded', 'false'); f(n).removeAttribute('aria-activedescendant');
    fieldOf(f(n)).classList.remove('ac-open');
  }
  // After a tap, the phone still sends mouse events to whatever is under the finger. The list stays in place,
  // invisible, for a moment so those land on it and not on the button underneath (e.g. "Myöhemmin").
  function ghostClose(n) {
    const ul = listOf(n), s = acState[n];
    s.items = []; s.active = -1;
    ul.classList.add('is-ghost');
    f(n).setAttribute('aria-expanded', 'false'); f(n).removeAttribute('aria-activedescendant');
    fieldOf(f(n)).classList.remove('ac-open');
    clearTimeout(s.ghostT);
    s.ghostT = setTimeout(() => { ul.classList.remove('is-ghost'); if (!s.items.length) closeList(n); }, 450);
  }
  function renderList(n, mode) {
    const ul = listOf(n), s = acState[n];
    clearTimeout(s.ghostT); ul.classList.remove('is-ghost');
    ul.innerHTML = '';
    if (mode === 'busy' && !s.items.length) {
      ul.innerHTML = `<li class="ac-note" role="presentation"><i class="spin" aria-hidden="true"></i>${t('acBusy')}</li>`;
    } else if (mode === 'none') {
      ul.innerHTML = `<li class="ac-note" role="presentation">${t(digiOn ? 'acNone' : 'acNoneSlow')}</li>`;
    } else {
      s.items.forEach((p, i) => {
        const li = document.createElement('li');
        li.className = 'ac-opt'; li.id = `${ul.id}-${i}`; li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', String(i === s.active));
        li.innerHTML = PIN + '<span><b></b><small></small></span>';
        $('b', li).textContent = p.main; $('small', li).textContent = p.sub;
        // Desktop: mousedown would move focus away and close the list, so it is cancelled and the click picks.
        // Phones (iOS Safari): the input can lose focus before any click arrives, so a tap picks on finger-up,
        // unless the finger moved (scrolling the list).
        let start = null;
        li.addEventListener('mousedown', (e) => e.preventDefault());
        li.addEventListener('pointerdown', (e) => { start = { x: e.clientX, y: e.clientY }; if (e.pointerType === 'mouse') e.preventDefault(); });
        li.addEventListener('pointerup', (e) => {
          if (e.pointerType === 'mouse' || !start) return;
          const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10; start = null;
          if (!moved) { e.preventDefault(); pick(n, i, true); }
        });
        li.addEventListener('pointercancel', () => { start = null; });
        li.addEventListener('click', () => pick(n, i));
        ul.append(li);
      });
      if (mode === 'busy') ul.insertAdjacentHTML('beforeend', '<li class="ac-note ac-more" role="presentation"><i class="spin" aria-hidden="true"></i></li>');
    }
    ul.insertAdjacentHTML('beforeend', `<li class="ac-attr" role="presentation">${digiOn ? 'Digitransit · ' : ''}© OpenStreetMap</li>`);
    ul.hidden = false;
    f(n).setAttribute('aria-expanded', 'true');
    fieldOf(f(n)).classList.add('ac-open');
    if (s.active >= 0) f(n).setAttribute('aria-activedescendant', `${ul.id}-${s.active}`); else f(n).removeAttribute('aria-activedescendant');
  }
  async function suggest(n) {
    const q = f(n).value.trim(), s = acState[n], seq = ++s.seq;
    if (q.length < 3 || document.activeElement !== f(n)) return closeList(n);
    renderList(n, 'busy');
    try {
      const items = await lookup(q);
      if (seq !== s.seq || document.activeElement !== f(n)) return;
      s.items = items; s.active = -1;
      renderList(n, items.length ? 'list' : 'none');
    } catch (e) { if (seq === s.seq) closeList(n); }
  }
  function pick(n, i, touch = false) {
    const p = acState[n].items[i]; if (!p) return;
    clearTimeout(acState[n].closeT);
    const town = (p.sub || '').split(',').pop().replace(/\d{5}\s*/, '').trim();
    const val = town && !p.main.includes(town) ? `${p.main}, ${town}` : p.main;
    const inp = f(n), s = acState[n];
    AC[n] = { ...p, q: val.trim(), picked: true };
    if (touch) ghostClose(n); else closeList(n);
    // Phone keyboards (iOS especially) hold the half-typed word "in composition" and write it back over the field when
    // it loses focus, so the picked address vanished and only "Tum" stayed. So: let the keyboard commit first (blur),
    // then set the address, and for a moment put it back if the keyboard overwrites it.
    s.lock = { val, typed: inp.value, until: Date.now() + 1200 };
    inp.blur();
    inp.value = val;
    const reassert = () => { if (s.lock && Date.now() < s.lock.until && inp.value !== val) inp.value = val; };
    [0, 50, 150, 400, 900].forEach((ms) => setTimeout(reassert, ms));
    clearBad(inp); setField(n, 'found');
    setTimeout(() => {
      reassert();
      if (n === 'pickup' && !f('destination').value.trim()) f('destination').focus();
    }, 60);
    estimateSoon(0);
  }

  async function route(a, b) {
    const key = `${a.lon},${a.lat};${b.lon},${b.lat}`;
    if (!routeCache.has(key)) {
      // ';' is sent as %3B because some proxies reject a raw ';' in the path. OSRM accepts both.
      routeCache.set(key, fetch(`https://router.project-osrm.org/route/v1/driving/${key.replace(';', '%3B')}?overview=false`).then((r) => r.json()).then((j) => {
        if (!j.routes || !j.routes[0]) throw new Error('no route');
        return { km: Math.round(j.routes[0].distance / 100) / 10, min: Math.max(1, Math.round(j.routes[0].duration / 60)) };
      }));
      routeCache.get(key).catch(() => routeCache.delete(key));
    }
    return routeCache.get(key);
  }
  async function estimate() {
    const a = f('pickup').value.trim(), b = f('destination').value.trim();
    const seq = ++estSeq;
    if (a.length < 3 || b.length < 3) {
      est.state = 'idle'; est.total = null;
      if (a.length >= 3 && !(AC.pickup && AC.pickup.q === a)) resolve('pickup').catch(() => {});
      if (b.length >= 3 && !(AC.destination && AC.destination.q === b)) resolve('destination').catch(() => {});
      return refresh();
    }
    est.state = 'busy'; refresh();
    try {
      const [ga, gb] = await Promise.all([resolve('pickup'), resolve('destination')]);
      if (seq !== estSeq) return;
      if (!ga || !gb) { est.state = 'fail'; est.total = null; return refresh(); }
      const r = await route(ga, gb);
      if (seq !== estSeq) return;
      Object.assign(est, { state: 'ok', km: r.km, min: r.min, from: label(ga), to: label(gb) });
    } catch (err) {
      // Network or service trouble (not a bad address): say so, and let the customer book anyway.
      if (seq !== estSeq) return;
      est.state = 'err'; est.total = null;
    }
    refresh();
  }
  let estTimer = 0;
  const estimateSoon = (ms) => { clearTimeout(estTimer); estTimer = setTimeout(estimate, ms); };
  ['pickup', 'destination'].forEach((n) => {
    const inp = f(n), s = acState[n];
    listOf(n).addEventListener('mousedown', (e) => e.preventDefault());   // taps on the list never steal focus
    inp.addEventListener('input', (e) => {
      // The keyboard writing the old half-typed word back right after a pick: undo it, and don't treat it as typing.
      if (s.lock && Date.now() < s.lock.until && inp.value !== s.lock.val
          && (inp.value === s.lock.typed || !['insertText', 'deleteContentBackward'].includes(e.inputType))) {
        inp.value = s.lock.val; return;
      }
      s.lock = null;
      estSeq++; est.state = 'idle'; est.total = null; setField(n, 'idle'); refresh();
      clearTimeout(s.timer);
      if (inp.value.trim().length < 3) { s.seq++; closeList(n); } else s.timer = setTimeout(() => suggest(n), digiOn ? 220 : 800);
      estimateSoon(digiOn ? 900 : 1200);
    });
    inp.addEventListener('change', () => estimateSoon(0));
    // Reopen the list on focus unless the customer already picked this exact address from it.
    inp.addEventListener('focus', () => { if (inp.value.trim().length >= 3 && !(AC[n] && AC[n].picked && AC[n].q === inp.value.trim())) suggest(n); });
    // Closing waits a moment so a tap on a suggestion still lands when the phone blurs the field first.
    inp.addEventListener('blur', () => { s.seq++; clearTimeout(s.timer); clearTimeout(s.closeT); s.closeT = setTimeout(() => { if (document.activeElement !== inp) closeList(n); }, 400); });
    inp.addEventListener('keydown', (e) => {
      const open = !listOf(n).hidden && s.items.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!open) return;
        e.preventDefault();
        const k = s.items.length;
        s.active = e.key === 'ArrowDown' ? (s.active + 1) % k : (s.active <= 0 ? k - 1 : s.active - 1);
        renderList(n, 'list');
      } else if (e.key === 'Enter' && open) {
        e.preventDefault(); pick(n, Math.max(0, s.active));
      } else if (e.key === 'Escape' && !listOf(n).hidden) {
        e.preventDefault(); s.seq++; closeList(n);
      }
    });
  });

  function refresh() {
    const d = pickedDate() || new Date();
    const day = isDayRate(d);
    const goods = pax.get() === 'goods';
    $('#bookFee').textContent = money(day ? R.startDay : R.startOther);
    $('.book-fee .fee-l').textContent = t(when.get() === 'now' ? 'feeNow' : 'feeThen');
    const box = $('#bookEst');
    ['idle', 'busy', 'ok', 'fail', 'err'].forEach((s) => box.classList.toggle('is-' + s, est.state === s));
    const tot = $('#bookTotal');
    if (est.state === 'ok') {
      est.total = fare({ km: est.km, min: est.min, day }).total * (goods ? (CFG.goodsFactor || 1) : 1);
      const txt = '≈ ' + money(est.total);
      if (tot.textContent !== txt) { tot.textContent = txt; tot.classList.remove('pop'); void tot.offsetWidth; tot.classList.add('pop'); }
      $('#beInfo').textContent = `${km1(est.km)} km · ${hm(est.min)}${goods ? ' · ' + t('estGoods') : ''}`;
    } else {
      // busy: the CSS shows three pulsing dots in place of the price
      tot.textContent = est.state === 'busy' ? '' : '–';
      $('#beInfo').textContent = t({ busy: 'estBusy', fail: 'estFail', err: 'estErr' }[est.state] || 'estHint');
    }
    tot.setAttribute('aria-busy', String(est.state === 'busy'));
    ['pickup', 'destination'].forEach((n) => setField(n, FST[n]));   // re-renders the status lines in the current language
    if (step === 2) summary();
  }
  f('date').addEventListener('input', refresh);
  f('time').addEventListener('input', refresh);

  function summary() {
    const d = pickedDate();
    const whenTxt = when.get() === 'now' ? t('sumNow')
      : d.toLocaleString(locale(), { weekday: 'short', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
    const p = pax.get() === 'goods' ? t('sumGoods') : `${pax.get().replace('-', '–')} ${t('sumPax')}`;
    const el = $('#tripSum');
    el.textContent = '';
    const b1 = document.createElement('b'); b1.textContent = f('pickup').value.trim();
    const b2 = document.createElement('b'); b2.textContent = f('destination').value.trim();
    const sep = document.createElement('span'); sep.className = 'sum-sep'; sep.textContent = ' · '; // replaces the line break on the wide desktop strip
    el.append(b1, ' → ', b2, document.createElement('br'), sep, `${whenTxt} · ${p}`);
    if (est.state === 'ok') { const e = document.createElement('b'); e.className = 'sum-est'; e.textContent = ` · ${t('estLabel')} ≈ ${money(est.total)}`; el.append(e); }
  }

  $('#swapBtn').addEventListener('click', (e) => {
    const a = f('pickup').value; f('pickup').value = f('destination').value; f('destination').value = a;
    e.currentTarget.classList.toggle('spun');
    [AC.pickup, AC.destination] = [AC.destination, AC.pickup];
    [FST.pickup, FST.destination] = [FST.destination, FST.pickup];
    setField('pickup', FST.pickup); setField('destination', FST.destination);
    estimateSoon(0);
  });

  const fieldOf = (input) => input.closest('.field');
  function bad(input, key) {
    const fl = fieldOf(input); fl.classList.add('is-bad');
    if (key) $('.err', fl).textContent = t(key);
    input.setAttribute('aria-invalid', 'true');
  }
  function clearBad(input) { const fl = fieldOf(input); fl.classList.remove('is-bad'); input.removeAttribute('aria-invalid'); }
  $$('input, textarea', form).forEach((i) => i.addEventListener('input', () => clearBad(i)));

  function validate1() {
    let firstBad = null;
    ['pickup', 'destination'].forEach((n) => { if (!f(n).value.trim()) { bad(f(n), 'errReq'); firstBad ??= f(n); } });
    if (when.get() === 'later') {
      const d = pickedDate();
      if (!d || d.getTime() < Date.now() - 60000) { bad(f('date'), 'errPast'); firstBad ??= f('date'); }
    }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }
  function validate2() {
    let firstBad = null;
    if (!f('name').value.trim()) { bad(f('name'), 'errReq'); firstBad ??= f('name'); }
    const ph = f('phone').value.replace(/[\s\-().]/g, '');
    if (!ph) { bad(f('phone'), 'errReq'); firstBad ??= f('phone'); }
    else if (!/^\+?\d{6,15}$/.test(ph)) { bad(f('phone'), 'errPhone'); firstBad ??= f('phone'); }
    const em = f('email').value.trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { bad(f('email'), 'errEmail'); firstBad ??= f('email'); }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function go(n) {
    step = n;
    panes.forEach((p) => {
      const s = Number(p.dataset.step);
      p.classList.toggle('from-left', s < n);
      p.classList.toggle('from-right', s > n);
      const on = s === n;
      p.classList.toggle('is-on', on);
      if (on) p.removeAttribute('inert'); else p.setAttribute('inert', '');
    });
    stepsLi.forEach((li, i) => li.classList.toggle('is-on', i + 1 === Math.min(n, 2) || (n === 3)));
    if (n === 2) summary();
  }

  $('#toStep2').addEventListener('click', () => {
    if (!validate1()) return;
    go(2);
    setTimeout(() => f('name').focus({ preventScroll: true }), 60);
  });
  $('#backStep1').addEventListener('click', () => { go(1); $('#toStep2').focus({ preventScroll: true }); });
  // Enter in step 1 should advance, not submit.
  $$('[data-step="1"] input', form).forEach((i) => i.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.defaultPrevented) { e.preventDefault(); $('#toStep2').click(); }   // Enter that picked a suggestion is already handled
  }));

  const notes = f('notes');
  const grow = () => { notes.style.height = 'auto'; notes.style.height = Math.min(notes.scrollHeight + 2, 132) + 'px'; };
  notes.addEventListener('input', grow);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (step !== 2) return;
    if (!validate2()) return;
    $('#sendErr').hidden = true;
    const btn = $('#sendBtn');
    btn.classList.add('is-busy'); $('span', btn).textContent = t('sending');
    const d = pickedDate();
    // The owner reads these emails in Finnish, so the field names and subject are Finnish whatever language the customer used.
    const data = {
      pickup: f('pickup').value.trim(),
      destination: f('destination').value.trim(),
      when: when.get() === 'now' ? 'Mahdollisimman pian' : d.toLocaleString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      passengers: pax.get() === 'goods' ? 'Tavarakuljetus' : pax.get().replace('-', '–'),
      starting_fee: $('#bookFee').textContent,
      name: f('name').value.trim(),
      phone: f('phone').value.trim(),
      email: f('email').value.trim(),
      notes: f('notes').value.trim(),
      language: lang.toUpperCase()
    };
    const subject = `Taksitilaus: ${data.pickup} → ${data.destination} (${data.when})`;
    const fiData = {
      'Mistä': data.pickup, 'Minne': data.destination, 'Milloin': data.when, 'Matkustajat': data.passengers,
      'Aloitusmaksu': data.starting_fee,
      'Hinta-arvio': est.state === 'ok' ? `≈ ${new Intl.NumberFormat('fi-FI', { style: 'currency', currency: 'EUR' }).format(est.total)} (${String(est.km).replace('.', ',')} km, ${est.min} min, ilman ruuhkaa)` : '–',
      'Mistä (kartalla)': est.state === 'ok' ? est.from : '–', 'Minne (kartalla)': est.state === 'ok' ? est.to : '–',
      'Nimi': data.name, 'Puhelin': data.phone, 'Sähköposti': data.email || '–',
      'Lisätiedot': data.notes || '–', 'Asiakkaan kieli': data.language
    };
    let result = 'demo';
    try {
      if (form.elements.botcheck.checked) result = 'ok'; // bot: pretend success, send nothing
      else if (CFG.web3formsKey) {
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_key: CFG.web3formsKey, subject, from_name: 'Averox-verkkosivu', ...fiData, replyto: data.email || undefined, botcheck: false })
        });
        const j = await res.json().catch(() => ({}));
        result = res.ok && j.success !== false ? 'ok' : 'err';
      } else if (CFG.formspreeEndpoint) {
        const res = await fetch(CFG.formspreeEndpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ _subject: subject, ...fiData, _replyto: data.email || undefined })
        });
        result = res.ok ? 'ok' : 'err';
      } else if (CFG.bookingEmail) {
        // FormSubmit: no account or key. The very first booking makes FormSubmit email an "Activate Form" link to this address;
        // bookings are delivered once someone clicks it. Until then FormSubmit answers success:false, so the customer sees the error and can call instead.
        const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(CFG.bookingEmail), {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ _subject: subject, _template: 'table', _captcha: 'false', _replyto: data.email || undefined, ...fiData })
        });
        const j = await res.json().catch(() => ({}));
        result = res.ok && String(j.success) === 'true' ? 'ok' : 'err';
      } else {
        await new Promise((r) => setTimeout(r, 650));
      }
    } catch (err) { result = 'err'; }
    btn.classList.remove('is-busy'); $('span', btn).textContent = t('send');
    if (result === 'err') {
      // Never a dead end: stay on step 2 (nothing typed is lost) and offer the same booking as a ready-made email.
      const to = CFG.bookingEmail || CFG.email;
      const fb = $('#mailFallback');
      fb.hidden = !to;
      if (to) fb.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(Object.entries(fiData).map(([k, v]) => `${k}: ${v}`).join('\n'))}`;
      $('.consent', form).insertAdjacentElement('afterend', $('#sendErr'));
      $('#sendErr').hidden = false;
      return;
    }
    $('#sendErr').hidden = true;
    $('#demoNote').hidden = result !== 'demo';
    go(3);
    $('#again').focus({ preventScroll: true });
  });

  $('#again').addEventListener('click', () => {
    form.reset(); defaultsLater(); estSeq++; est.state = 'idle'; est.total = null; AC.pickup = AC.destination = null; setField('pickup', 'idle'); setField('destination', 'idle'); when.set('now'); pax.set('1-4'); notes.style.height = '';
    $$('.field', form).forEach((fl) => fl.classList.remove('is-bad'));
    go(1); f('pickup').focus({ preventScroll: true });
  });

  return {
    refresh,
    prefill({ destination, large }) {
      if (destination) f('destination').value = destination;
      if (large !== undefined) pax.set(large ? '5-8' : '1-4');
      if (step === 3) go(1);
    }
  };
})();

/* ── Fare meter ─────────────────────────── */
const meter = (() => {
  const kmIn = $('#kmIn'), minIn = $('#minIn');
  const out = $('#fareOut');
  const chipsEl = $('#routeChips');
  const s = { km: 10, min: 15, day: true, large: false, route: null };
  let shown = 35.75, raf = 0;
  const CHIPS = ['Lentoasema', 'Helsinki Airport', 'Hervanta', 'Nokia', 'Ylöjärvi', 'Kangasala', 'Lempäälä', 'Hämeenlinna'];

  chipsEl.innerHTML = '';
  CHIPS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.route = id; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => setRoute(id));
    chipsEl.append(b);
  });

  const whenSeg = initSeg($('[data-name="mwhen"]'), (v) => { s.day = v === 'day'; render(); });
  // Sedan only for now: no 5–8 choice on the site. s.large stays false; the rate stays in config for later.
  const mpax = $('[data-name="mpax"]');
  const paxSeg = mpax ? initSeg(mpax, (v) => { s.large = v === 'large'; render(); }) : { set() {}, get: () => 'small' };

  function fillRange(el) { el.style.setProperty('--p', `${(el.value / POS) * 100}%`); }
  kmIn.addEventListener('input', () => { s.km = roundKm(posTo(Number(kmIn.value), KM_MAX)); s.route = null; render(true); }); // 1:1 while dragging
  minIn.addEventListener('input', () => { s.min = Math.round(posTo(Number(minIn.value), MIN_MAX)); s.route = null; render(true); });
  kmIn.value = toPos(s.km, KM_MAX); minIn.value = toPos(s.min, MIN_MAX);

  function setRoute(id) {
    const r = routeById[id]; if (!r) return;
    s.route = id; s.km = r.km; s.min = Math.max(1, r.min);
    kmIn.value = toPos(r.km, KM_MAX); minIn.value = toPos(s.min, MIN_MAX);
    render();
  }

  function tweenTo(v, instant) {
    cancelAnimationFrame(raf);
    if (instant || reduced.matches) { shown = v; out.textContent = num(v); return; }
    const from = shown, t0 = performance.now(), dur = 380;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4); // strong ease-out, starts from the value on screen
      shown = from + (v - from) * e;
      out.textContent = num(shown);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function render(instant) {
    const p = fare(s);
    tweenTo(p.total, instant);
    $('#kmVal').textContent = km1(s.km);
    $('#minVal').textContent = s.min;
    $('#rcStart').textContent = num(p.start);
    $('#rcTime').textContent = num(p.time);
    $('#rcDist').textContent = num(p.dist);
    $('#rcTimeCalc').textContent = `${s.min} min × ${num(R.perMin)}`;
    $('#rcDistCalc').textContent = `${km1(s.km)} km × ${num(s.large ? R.kmLarge : R.kmSmall)}`;
    $('#exampleTag').classList.toggle('is-off', !(s.km === 10 && s.min === 15 && s.day && !s.large));
    fillRange(kmIn); fillRange(minIn);
    kmIn.setAttribute('aria-valuetext', `${km1(s.km)} km`); minIn.setAttribute('aria-valuetext', hm(s.min));
    $$('.chip', chipsEl).forEach((b) => {
      b.textContent = placeName(b.dataset.route);
      b.setAttribute('aria-pressed', String(b.dataset.route === s.route));
    });
  }

  $('#meterBook').addEventListener('click', () => {
    const r = s.route && routeById[s.route];
    booking.prefill({ destination: r ? (r.place ? r.place.replace(', Tampere', '') + (r.id === 'Hervanta' ? ', Tampere' : '') : longName(r.id)) : undefined, large: s.large });
  });

  return { render, setRoute, seg: { whenSeg, paxSeg } };
})();

/* ── Area map ───────────────────────────── */
const area = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = $('#map');
  const mk = (tag, attrs, parent) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); parent && parent.append(el); return el; };
  const pad = 30;
  svg.setAttribute('viewBox', `${-pad} ${-pad} ${MAP.w + pad * 2} ${MAP.h + pad * 2}`);
  const gM = mk('g', {}, svg);
  const muniFor = { 'Helsinki Airport': 'Uusimaa' };
  MAP.regions.forEach((m) => {
    const p = mk('path', { d: m.d, class: 'muni' + (m.code === '06' ? ' is-home' : '') + (m.route ? '' : ' is-off'), 'data-id': m.id }, gM);
    if (m.route) { muniFor[m.route] = muniFor[m.route] || m.id; p.addEventListener('click', () => select(m.route)); }
  });
  const gR = mk('g', {}, svg);
  MAP.routes.forEach((r) => mk('path', { d: r.d, class: 'rt' }, gR));
  const active = mk('path', { class: 'rt-on', d: '' }, svg);
  const gD = mk('g', {}, svg);
  const dots = {};
  MAP.routes.forEach((r) => {
    dots[r.id] = mk('circle', { cx: r.x, cy: r.y, r: 7, class: 'dot' }, gD);
    const hit = mk('circle', { cx: r.x, cy: r.y, r: 16, class: 'hit' }, gD);
    hit.addEventListener('click', () => select(r.id));
  });
  const [ox, oy] = MAP.origin;
  mk('circle', { cx: ox, cy: oy, r: 20, class: 'origin-ring' }, svg);
  mk('circle', { cx: ox, cy: oy, r: 9, class: 'origin' }, svg);
  const lblO = mk('text', { x: ox - 26, y: oy + 10, class: 'lbl lbl-o', 'text-anchor': 'end' }, svg); lblO.textContent = 'Tampere';
  const lbl = mk('text', { class: 'lbl' }, svg);

  // list
  const list = $('#townList');
  const sorted = [...MAP.routes].sort((a, b) => a.km - b.km);
  sorted.forEach((r, i) => {
    const li = document.createElement('li');
    if (i >= 8) li.className = 'is-extra';
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.route = r.id; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<span class="n"></span><span class="k"></span><span class="f"></span>';
    b.addEventListener('click', () => select(r.id));
    li.append(b); list.append(li);
  });
  $('#townMore').addEventListener('click', (e) => { list.classList.add('is-all'); e.currentTarget.hidden = true; });

  let cur = 'Helsinki Airport';
  function select(id, quiet) {
    const r = routeById[id]; if (!r) return;
    cur = id;
    $$('.muni', svg).forEach((p) => p.classList.toggle('is-on', p.dataset.id === (muniFor[id] || id)));
    Object.entries(dots).forEach(([k, c]) => c.classList.toggle('is-on', k === id));
    $$('button', list).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.route === id)));
    active.setAttribute('d', r.d);
    if (!quiet && !reduced.matches && active.getTotalLength) {
      const L = active.getTotalLength();
      active.style.strokeDasharray = L;
      active.animate([{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: Math.min(900, 380 + L * 0.9), easing: 'cubic-bezier(.77,0,.175,1)', fill: 'both' });
    }
    // label: keep inside the map
    const left = r.x > MAP.w * 0.62;
    lbl.setAttribute('x', left ? r.x - 20 : r.x + 20);
    lbl.setAttribute('y', r.y + (r.id === 'Helsinki' ? 30 : r.id === 'Helsinki Airport' ? -8 : 11));
    lbl.setAttribute('text-anchor', left ? 'end' : 'start');
    lbl.textContent = placeName(id);
    pick(r);
  }
  function pick(r) {
    $('#tpName').textContent = longName(r.id);
    $('#tpKm').textContent = `${km1(r.km)} km`;
    $('#tpMin').textContent = hm(r.min);
    $('#tpFare').textContent = money(fare({ km: r.km, min: r.min }).total);
  }
  function render() {
    $$('button', list).forEach((b) => {
      const r = routeById[b.dataset.route];
      $('.n', b).textContent = placeName(r.id);
      $('.k', b).textContent = `${km1(r.km)} km`;
      $('.f', b).textContent = '≈ ' + money(Math.round(fare({ km: r.km, min: r.min }).total), 0);
    });
    select(cur, true);
  }
  $('#tpUse').addEventListener('click', () => {
    meter.setRoute(cur);
    meter.seg.whenSeg.set('day'); meter.seg.paxSeg.set('small');
    $('#fares').scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth' });
  });
  return { render, select };
})();

/* ── Fleet copy (3D loads lazily). Sedan only for now. ── */
const car = 'sedan';
function fleetCopy() {
  $('#fleetText').textContent = t('fleetSedan');
  $('#fleetRate').textContent = num(R.kmSmall);
}
// 3D is off: the old model was a generic sedan, and the car is a Kia Ceed Sportswagon. Set fleet3d: true in config.js once media/car.glb exists.
const fleetIO = CFG.fleet3d && new IntersectionObserver((ents) => {
  if (!ents.some((e) => e.isIntersecting)) return;
  fleetIO.disconnect();
  import('./fleet.js').then((m) => m.initFleet({ canvas: $('#fleetCanvas'), section: $('#fleet'), hint: $('#dragHint'), initial: car }))
        .catch((err) => console.warn('3D unavailable', err));
}, { rootMargin: '900px 0px' });
if (fleetIO) { $('#fleetCanvas').hidden = false; $('#dragHint').hidden = false; fleetIO.observe($('#fleet')); }

/* ── Bar, dock, nav highlight ───────────── */
const bar = $('#bar'), dock = $('#dock');
let heroOut = false, ctaIn = false;
const onScroll = () => bar.classList.toggle('is-solid', scrollY > 24);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const setDock = () => {
  const up = heroOut && !ctaIn;
  dock.classList.toggle('is-up', up);
  dock.setAttribute('aria-hidden', String(!up));
  $('a', dock).tabIndex = up ? 0 : -1;
};
new IntersectionObserver(([e]) => { heroOut = !e.isIntersecting; setDock(); }, { rootMargin: '-40% 0px 0px 0px' }).observe($('.hero'));
new IntersectionObserver((ents) => { ctaIn = ents.some((e) => e.isIntersecting); setDock(); }).observe($('#cta'));
const navLinks = $$('.links a');
const secIO = new IntersectionObserver((ents) => {
  ents.forEach((e) => {
    if (!e.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle('is-here', a.getAttribute('href') === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
['top', 'fares', 'prices', 'fleet', 'rides', 'area', 'cta'].forEach((id) => secIO.observe(document.getElementById(id)));

/* ── Reveals ────────────────────────────── */
const revIO = new IntersectionObserver((ents) => {
  ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); revIO.unobserve(e.target); } });
}, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
$$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 60}ms`; revIO.observe(el); });

/* ── Area band parallax (transform only) ── */
const band = $('.area-band'), bandImg = $('.area-band img');
let bandTick = false;
function bandMove() {
  bandTick = false;
  if (reduced.matches) { bandImg.style.transform = ''; return; }
  const r = band.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight) return;
  const p = (innerHeight - r.top) / (innerHeight + r.height); // 0 → 1 through the viewport
  bandImg.style.transform = `translate3d(0, ${(-p * 15).toFixed(2)}%, 0)`;
}
addEventListener('scroll', () => { if (!bandTick) { bandTick = true; requestAnimationFrame(bandMove); } }, { passive: true });
bandMove();

/* ── Contact details from config ────────── */
if (CFG.phone) $$('.contact-phone').forEach((a) => { a.hidden = false; a.href = 'tel:' + CFG.phone.replace(/\s/g, ''); $('.v', a).textContent = CFG.phone; });
if (CFG.email) $$('.contact-email').forEach((a) => { a.hidden = false; a.href = 'mailto:' + CFG.email; $('.v', a).textContent = CFG.email; });

/* ── Start ──────────────────────────────── */
const qs = new URLSearchParams(location.search).get('lang');
let saved = null; try { saved = localStorage.getItem('averox-lang-v2'); } catch (e) {}
// Finnish is the primary language. English only when chosen (button or ?lang=en).
applyLang(qs || saved || 'fi', Boolean(qs));
