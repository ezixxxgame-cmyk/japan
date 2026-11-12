// Delivery map: dot-grid Russia (Albers conic, λ0=100°) with routes Asia → Vladivostok → cities.
(() => {
  const canvas = document.querySelector('.map-bg canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const D = {"W":130,"H":85.3,"runs":[[],[119,120],[118,120],[109,109,118,121],[109,109,117,122],[109,109,114,121],[113,119],[54,55,111,119],[111,118],[110,119],[110,120],[109,119],[33,33,110,124],[32,35,110,122],[32,35,70,70,109,123],[29,34,69,70,94,94,108,122],[29,35,70,71,93,94,107,123],[27,35,54,54,70,72,89,91,106,122],[6,6,27,30,32,35,51,58,72,73,89,91,103,104,106,123],[6,6,25,30,32,35,49,52,72,72,89,90,101,123],[7,7,25,29,32,35,48,50,98,98,101,123],[19,28,32,35,46,48,72,73,92,92,95,123],[16,28,33,35,38,38,46,48,73,77,94,124],[14,27,29,29,37,38,46,46,71,77,93,122],[13,30,32,34,37,38,47,47,67,78,94,123],[12,34,36,36,65,77,94,122],[12,36,39,39,55,56,65,76,84,87,93,117,120,123],[12,43,54,56,61,78,80,81,84,87,91,117,120,121],[13,42,48,48,53,56,58,58,62,88,90,118,120,121],[11,45,47,48,52,55,57,59,61,118,120,121],[11,46,48,49,52,55,57,60,62,116,121,122],[10,49,51,54,56,115,120,122],[9,9,11,50,52,54,56,115,121,123,125,125],[7,50,52,115,121,125],[9,50,52,54,56,115,121,126],[9,53,55,115,121,126],[9,53,55,116,121,127],[8,52,55,116,121,127],[8,52,54,116,122,127],[7,113,115,115,121,127],[8,113,122,129],[8,112,123,128],[9,112,124,128],[8,110,125,128],[9,110,127,129],[9,108,127,129],[5,5,8,108,129,129],[3,3,5,5,7,108],[1,108],[0,107],[1,108],[0,107],[1,15,17,108],[0,13,16,16,21,107],[1,12,22,107],[1,12,22,107,115,115],[2,12,23,107,112,112,115,116],[2,12,23,31,33,106,111,116],[3,12,24,31,35,118],[3,11,25,30,38,115,117,118],[4,7,27,29,42,115,118,120],[4,7,27,29,42,115,118,121],[4,7,29,29,42,116,119,120],[4,6,43,116,119,120],[5,6,44,117,120,121],[4,5,44,45,47,117,121,121],[48,118,122,123],[48,95,100,117,122,122],[49,94,101,118],[48,93,102,117],[49,94,103,118],[49,94,103,111,113,117],[49,94,108,110,114,118],[50,93,109,109,113,117],[53,94,114,118],[53,69,71,93,114,117],[54,69,74,93,114,117],[54,61,63,68,74,87,114,117],[57,59,66,69,75,77,81,87,112,117],[67,68,81,84,111,116],[113,116],[113,115],[113,113],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]],"P":{"vlad":[113.9,70.7],"khab":[112.9,60.2],"yak":[96.3,40.4],"mag":[114.2,33.7],"kam":[128.6,36.3],"sakh":[122.4,57.3],"irk":[76.6,64],"kras":[64.5,56.8],"nsk":[54,56.8],"omsk":[44.5,53.6],"ekb":[34.7,44.5],"kzn":[24.4,38.8],"sam":[21.8,43],"msk":[16.5,30],"spb":[19,19.8],"krd":[1.7,43.3],"rnd":[5.4,41.6],"kgd":[6,15.5],"mur":[34.5,12.7],"jp":[126.3,76.9],"kr":[116.4,85.3],"cn":[105.5,69.4]}};
  const PAD = { l: 1, r: 1, t: 2, b: 2 };
  const RED = '255,64,52';

  // id: [name, label side (r|l|t|b), shown on mobile, dy px]
  const NODES = {
    jp: ['Япония', 'b', 1], kr: ['Корея', 'l', 1], cn: ['Китай', 'l', 1],
    vlad: ['Владивосток', 'r', 1], khab: ['Хабаровск', 'r', 0], yak: ['Якутск', 'r', 0],
    mag: ['Магадан', 'r', 0], kam: ['Камчатка', 'l', 0], irk: ['Иркутск', 'b', 0],
    kras: ['Красноярск', 't', 0], nsk: ['Новосибирск', 'b', 1], omsk: ['Омск', 'b', 0],
    ekb: ['Екатеринбург', 'l', 0], kzn: ['Казань', 'r', 0], msk: ['Москва', 'l', 1],
    spb: ['Санкт-Петербург', 'r', 1], mur: ['Мурманск', 'r', 0], kgd: ['Калининград', 'r', 0],
    rnd: ['Ростов-на-Дону', 'r', 0, -7], krd: ['Краснодар', 'r', 1, 7],
  };
  const ORIGINS = ['jp', 'kr', 'cn'];
  // [from, to, sea]; listed in topological order so start times resolve in one pass.
  const EDGES = [
    ['jp', 'vlad', 1], ['kr', 'vlad', 1], ['cn', 'vlad', 1],
    ['vlad', 'khab'], ['vlad', 'kam', 1], ['khab', 'irk'], ['khab', 'yak'], ['yak', 'mag'],
    ['irk', 'kras'], ['kras', 'nsk'], ['nsk', 'omsk'], ['omsk', 'ekb'], ['ekb', 'kzn'],
    ['kzn', 'msk'], ['msk', 'spb'], ['msk', 'rnd'], ['msk', 'kgd'], ['spb', 'mur'], ['rnd', 'krd'],
  ].map(([a, b, sea]) => ({ a, b, sea: !!sea }));

  const dots = [];
  D.runs.forEach((row, r) => {
    for (let i = 0; i < row.length; i += 2)
      for (let c = row[i]; c <= row[i + 1]; c++) dots.push(c + (r % 2) * 0.5, r * 0.866);
  });
  const N = dots.length / 2;
  const hub = D.P.vlad;
  const dist = new Float32Array(N);
  for (let i = 0; i < N; i++) dist[i] = Math.hypot(dots[i * 2] - hub[0], dots[i * 2 + 1] - hub[1]);
  const maxDist = Math.max(...dist);

  // Edge geometry: quadratic curve sampled into a polyline with arc lengths (unit space).
  const INTRO_SPEED = 48, SAMPLES = 40;
  const arrive = { jp: 0.3, kr: 0.45, cn: 0.6 };
  const parent = {};
  for (const e of EDGES) {
    const [ax, ay] = D.P[e.a], [bx, by] = D.P[e.b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let nx = -dy / len, ny = dx / len;
    if (e.sea ? ny < 0 : ny > 0) { nx = -nx; ny = -ny; } // land bows north, sea bows south
    const bend = len * (e.sea ? 0.2 : 0.12);
    const cx = (ax + bx) / 2 + nx * bend, cy = (ay + by) / 2 + ny * bend;
    e.pts = []; e.cum = [0];
    for (let i = 0; i <= SAMPLES; i++) {
      const t = i / SAMPLES, u = 1 - t;
      e.pts.push(u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by);
      if (i) e.cum.push(e.cum[i - 1] + Math.hypot(e.pts[i * 2] - e.pts[i * 2 - 2], e.pts[i * 2 + 1] - e.pts[i * 2 - 1]));
    }
    e.len = e.cum[SAMPLES];
    e.t0 = arrive[e.a];
    e.t1 = e.t0 + e.len / INTRO_SPEED;
    arrive[e.b] = Math.max(arrive[e.b] || 0, e.t1);
    if (!ORIGINS.includes(e.a) || e.b !== 'vlad') parent[e.b] = e;
  }
  const INTRO_END = Math.max(...EDGES.map(e => e.t1)) + 0.5;
  const DESTS = Object.keys(NODES).filter(id => id !== 'vlad' && !ORIGINS.includes(id));

  function pointAt(e, s) {
    let i = 1;
    while (i < SAMPLES && e.cum[i] < s) i++;
    const k = Math.max(0, Math.min(1, (s - e.cum[i - 1]) / (e.cum[i] - e.cum[i - 1] || 1)));
    return [e.pts[i * 2 - 2] + (e.pts[i * 2] - e.pts[i * 2 - 2]) * k, e.pts[i * 2 - 1] + (e.pts[i * 2 + 1] - e.pts[i * 2 - 1]) * k];
  }

  // Layout (CSS px)
  let w = 0, h = 0, u = 1, dpr = 1, mobile = false, cache = null;
  const X = x => (x + PAD.l) * u, Y = y => (y + PAD.t) * u;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = rect.width; h = rect.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    u = w / (D.W + PAD.l + PAD.r);
    mobile = w < 640;
    cache = null;
  }

  const ease = t => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);

  function drawDots(c, t) {
    const r = Math.max(0.7, u * 0.19);
    const R = maxDist * ease(t / 2.4) + 2;
    c.fillStyle = 'rgba(205,218,238,0.24)';
    c.beginPath();
    for (let i = 0; i < N; i++) {
      if (dist[i] > R) continue;
      const x = X(dots[i * 2]), y = Y(dots[i * 2 + 1]);
      c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.2832);
    }
    c.fill();
    if (R < maxDist) { // bright reveal front
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.beginPath();
      for (let i = 0; i < N; i++) {
        if (dist[i] > R || dist[i] < R - 4) continue;
        const x = X(dots[i * 2]), y = Y(dots[i * 2 + 1]);
        c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.2832);
      }
      c.fill();
    }
  }

  function strokePart(c, e, upTo) {
    c.beginPath();
    c.moveTo(X(e.pts[0]), Y(e.pts[1]));
    for (let i = 1; i <= SAMPLES && e.cum[i - 1] < upTo; i++) {
      if (e.cum[i] <= upTo) c.lineTo(X(e.pts[i * 2]), Y(e.pts[i * 2 + 1]));
      else { const [x, y] = pointAt(e, upTo); c.lineTo(X(x), Y(y)); }
    }
    c.stroke();
  }

  function drawEdges(c, t) {
    c.lineWidth = mobile ? 1 : 1.3;
    c.lineCap = 'round';
    for (const e of EDGES) {
      const p = (t - e.t0) / (e.t1 - e.t0);
      if (p <= 0) continue;
      c.setLineDash(e.sea ? [3, 4] : []);
      c.strokeStyle = `rgba(${RED},${e.sea ? 0.55 : 0.5})`;
      strokePart(c, e, e.len * Math.min(p, 1));
      if (p < 1) {
        const [x, y] = pointAt(e, e.len * p);
        c.fillStyle = `rgb(${RED})`;
        c.beginPath(); c.arc(X(x), Y(y), 2.4, 0, 6.2832); c.fill();
      }
    }
    c.setLineDash([]);
  }

  function drawNodes(c, t) {
    const fs = mobile ? 10 : 12;
    for (const id in NODES) {
      const a = ease((t - arrive[id]) / 0.5);
      if (a <= 0) continue;
      const [name, side, onMobile, dy = 0] = NODES[id];
      const x = X(D.P[id][0]), y = Y(D.P[id][1]);
      const isHub = id === 'vlad', isOrigin = ORIGINS.includes(id);
      c.globalAlpha = a;
      c.lineWidth = 1;
      c.strokeStyle = `rgba(${RED},0.9)`;
      c.beginPath(); c.arc(x, y, (isHub ? 8 : 5) * (mobile ? 0.8 : 1), 0, 6.2832); c.stroke();
      c.fillStyle = isHub ? `rgb(${RED})` : isOrigin ? 'rgba(9,14,20,1)' : '#fff';
      c.beginPath(); c.arc(x, y, (isHub ? 3.6 : 2.4) * (mobile ? 0.8 : 1), 0, 6.2832); c.fill();
      if (isOrigin) c.stroke();

      if (mobile && !onMobile) continue;
      c.font = `${isHub || isOrigin ? 700 : 500} ${isOrigin ? fs - 1 : isHub ? fs + 1 : fs}px Manrope, sans-serif`;
      const label = isOrigin ? name.toUpperCase() : name;
      const tw = c.measureText(label).width, gap = isHub ? 13 : 9;
      let lx = side === 'r' ? x + gap : side === 'l' ? x - gap - tw : x - tw / 2;
      let ly = (side === 't' ? y - gap - fs / 2 : side === 'b' ? y + gap + fs / 2 : y) + dy;
      lx = Math.max(2, Math.min(w - tw - 2, lx));
      c.textBaseline = 'middle';
      c.lineWidth = 4; c.lineJoin = 'round';
      c.strokeStyle = 'rgba(9,14,20,0.85)';
      c.strokeText(label, lx, ly);
      c.fillStyle = isHub ? '#fff' : isOrigin ? `rgb(${RED})` : 'rgba(232,237,244,0.82)';
      c.fillText(label, lx, ly);
    }
    c.globalAlpha = 1;
  }

  function scene(c, t) {
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    drawDots(c, t);
    drawEdges(c, t);
    drawNodes(c, t);
  }

  // Live layer: signal wave from the hub, cars travelling along routes, arrival pulses.
  const comets = [], pulses = [];
  let spawnAt = 0;

  function spawn(t) {
    const dest = DESTS[Math.floor(Math.random() * DESTS.length)];
    const path = [];
    for (let id = dest; parent[id]; id = parent[id].a) path.unshift(parent[id]);
    const origin = ORIGINS[Math.floor(Math.random() * ORIGINS.length)];
    path.unshift(EDGES.find(e => e.a === origin));
    comets.push({ path, s: 0, len: path.reduce((n, e) => n + e.len, 0), leg: 0, legEnd: path[0].len, speed: 20 + Math.random() * 8 });
    spawnAt = t + 0.6 + Math.random() * 0.6;
  }

  function cometPoint(cm, s) {
    for (const e of cm.path) { if (s <= e.len) return pointAt(e, Math.max(s, 0)); s -= e.len; }
    const e = cm.path[cm.path.length - 1];
    return [e.pts[SAMPLES * 2], e.pts[SAMPLES * 2 + 1]];
  }

  function live(t, dt) {
    const r = Math.max(0.7, u * 0.19);
    const R = ((t - INTRO_END) % 7) / 7 * (maxDist + 12), band = 5;
    for (let k = 1; k <= 3; k++) {
      ctx.fillStyle = `rgba(255,255,255,${0.12 * k})`;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const q = 1 - Math.abs(dist[i] - R) / band;
        if (q <= 0 || Math.ceil(q * 3) !== k) continue;
        const x = X(dots[i * 2]), y = Y(dots[i * 2 + 1]);
        ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832);
      }
      ctx.fill();
    }

    if (t >= spawnAt && comets.length < 7) spawn(t);
    for (let j = comets.length - 1; j >= 0; j--) {
      const cm = comets[j];
      cm.s += cm.speed * dt;
      while (cm.leg < cm.path.length && cm.s >= cm.legEnd) {
        pulses.push({ id: cm.path[cm.leg].b, t0: t });
        cm.leg++;
        if (cm.leg < cm.path.length) cm.legEnd += cm.path[cm.leg].len;
      }
      if (cm.s >= cm.len) { comets.splice(j, 1); continue; }
      const tail = mobile ? 6 : 9;
      let prev = cometPoint(cm, cm.s);
      ctx.lineWidth = mobile ? 1.5 : 2;
      for (let k = 1; k <= 8; k++) {
        const p = cometPoint(cm, cm.s - (tail * k) / 8);
        ctx.strokeStyle = `rgba(255,120,100,${0.9 * (1 - k / 8)})`;
        ctx.beginPath(); ctx.moveTo(X(prev[0]), Y(prev[1])); ctx.lineTo(X(p[0]), Y(p[1])); ctx.stroke();
        prev = p;
      }
      const [hx, hy] = cometPoint(cm, cm.s);
      ctx.fillStyle = `rgba(${RED},0.22)`;
      ctx.beginPath(); ctx.arc(X(hx), Y(hy), mobile ? 4 : 6, 0, 6.2832); ctx.fill();
      ctx.fillStyle = '#ffd9d4';
      ctx.beginPath(); ctx.arc(X(hx), Y(hy), mobile ? 1.6 : 2.2, 0, 6.2832); ctx.fill();
    }

    for (let j = pulses.length - 1; j >= 0; j--) {
      const age = t - pulses[j].t0;
      if (age > 1.2) { pulses.splice(j, 1); continue; }
      const [px, py] = D.P[pulses[j].id];
      ctx.strokeStyle = `rgba(${RED},${0.8 * (1 - age / 1.2)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(X(px), Y(py), 5 + ease(age / 1.2) * (mobile ? 12 : 20), 0, 6.2832); ctx.stroke();
    }
  }

  let clock = 0, last = 0, visible = false, started = false, raf = 0;

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now; clock += dt;
    if (clock < INTRO_END) scene(ctx, clock);
    else {
      if (!cache) {
        cache = document.createElement('canvas');
        cache.width = canvas.width; cache.height = canvas.height;
        scene(cache.getContext('2d'), Infinity);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(cache, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      live(clock, dt);
    }
    raf = visible ? requestAnimationFrame(frame) : 0;
  }

  function play() {
    if (reduce) { scene(ctx, Infinity); return; }
    if (!raf && visible && started) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  new ResizeObserver(() => { resize(); if (reduce || (started && !raf)) scene(ctx, reduce ? Infinity : clock); }).observe(canvas);
  // The map is a fixed backdrop: it is visible once #delivery reaches the viewport (hero covers it before),
  // and it is lit (full opacity) while #delivery is in the middle of the viewport.
  const layer = canvas.parentElement;
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting || en.boundingClientRect.top < 0;
    if (visible) play();
  }).observe(document.querySelector('#delivery'));
  new IntersectionObserver(([en]) => {
    layer.classList.toggle('is-lit', en.isIntersecting);
    if (!started && (en.isIntersecting || en.boundingClientRect.top < 0)) { started = true; play(); }
  }, { rootMargin: '-15% 0px -15% 0px' }).observe(document.querySelector('#delivery'));
  document.fonts?.ready.then(() => { cache = null; if (reduce) scene(ctx, Infinity); });
})();

// Cars in stock and reviews come from data.json, edited via the Telegram bot (api/bot.js).
// A section and its nav link stay hidden while its list is empty.
(async () => {
  let data;
  try { data = await (await fetch('data.json')).json(); } catch { return; }
  const rub = n => new Intl.NumberFormat('ru-RU').format(n) + ' ₽';
  const card = (tpl, fields) => {
    const el = document.getElementById(tpl).content.firstElementChild.cloneNode(true);
    for (const sel in fields) el.querySelector(sel).textContent = fields[sel];
    return el;
  };
  const show = (id, items, render) => {
    if (!items?.length) return;
    document.querySelector(`#${id} ul`).append(...items.map(render));
    document.querySelectorAll(`#${id}, a[href="#${id}"]`).forEach(el => (el.hidden = false));
  };
  const request = document.querySelector('.form textarea');

  show('stock', data.cars, c => {
    const el = card('tpl-car', { h3: c.title, '.car__price b': rub(c.price), '.car__text': c.text });
    const img = el.querySelector('img');
    if (c.photo) { img.src = c.photo; img.alt = c.title; } else img.remove();
    el.querySelector('a').addEventListener('click', () => { request.value = `${c.title} из наличия, ${rub(c.price)}`; });
    return el;
  });
  show('reviews', data.reviews, r => {
    const el = card('tpl-review', {
      h3: r.name, '.review__who p': r.car, blockquote: r.text, '.review__route b': r.city,
      '.review__avatar': r.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    });
    if (!r.city) el.querySelector('.review__route').remove();
    return el;
  });
})();

// Lead form: client-side validation only.
// ponytail: no backend yet — wire submit to Telegram bot / CRM / email when the channel is chosen.
(() => {
  const form = document.querySelector('.form');
  if (!form) return;
  const fields = [...form.querySelectorAll('input[required]')];
  const check = el => {
    const ok = el.type === 'checkbox' ? el.checked : el.checkValidity() && (el.type !== 'tel' || el.value.replace(/\D/g, '').length >= 10);
    el.closest('label').classList.toggle('is-invalid', !ok);
    return ok;
  };
  fields.forEach(el => el.addEventListener(el.type === 'checkbox' ? 'change' : 'blur', () => check(el)));
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const bad = fields.filter(el => !check(el));
    if (bad.length) { bad[0].focus(); return; }
    form.querySelectorAll('label, button').forEach(el => (el.hidden = true));
    form.querySelector('.form__done').hidden = false;
  });
})();
