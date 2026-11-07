// Scroll route: the dotted route draws in gold as you scroll, a plane flies the flight legs
// and a three-car shinkansen runs on the railway inside Japan. Stops light up as they are reached.
(() => {
  const section = document.getElementById('route');
  if (!section) return;

  // Set to true to keep the plane for every leg instead of switching to the shinkansen inside Japan
  const PLANE_ONLY = false;

  const svgs = section.querySelectorAll('svg');
  const base = document.getElementById('routeBase');
  const done = document.getElementById('routeDone');
  const wrap = document.getElementById('vehicleWrap');
  const plane = document.getElementById('plane');
  const cars = [...section.querySelectorAll('#train .car')];
  const railPaths = ['railTies', 'railOuter', 'railOuterDone', 'railInner'].map(id => document.getElementById(id));
  const railDone = document.getElementById('railOuterDone');
  const stops = [...section.querySelectorAll('.stop')];
  const scenery = [...section.querySelectorAll('.scenery')];
  const mobile = matchMedia('(max-width: 899px), (max-height: 500px) and (pointer: coarse)');
  // With "reduce motion" on, show the finished route: everything lit, no moving vehicles
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let total = 0, dotLengths = [], sceneryLengths = [], railStart = 0, railLen = 0, ready = false;
  let ys = []; // height of the route sampled every STEP px of length, built once per layout
  const STEP = 4;

  // Length along the route where it reaches height y (the route only ever moves downward).
  // Binary search over the sampled heights, then interpolate, so scrolling stays cheap.
  function lengthAtY(y) {
    if (!ys.length) return 0;
    if (y <= ys[0]) return 0;
    if (y >= ys[ys.length - 1]) return total;
    let lo = 0, hi = ys.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ys[mid] < y) lo = mid; else hi = mid;
    }
    const t = (y - ys[lo]) / ((ys[hi] - ys[lo]) || 1);
    return Math.min(total, (lo + t) * STEP);
  }

  function layout() {
    const box = section.getBoundingClientRect();
    const w = section.clientWidth, h = section.clientHeight;
    svgs.forEach(s => s.setAttribute('viewBox', `0 0 ${w} ${h}`));
    const pts = stops.map(li => {
      const r = li.querySelector('.stop-dot').getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
    });
    const swing = mobile.matches ? 14 : 70;
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], dy = b.y - a.y, s = (i % 2 ? 1 : -1) * swing;
      segs.push(` C${a.x + s} ${a.y + dy * .5} ${b.x + s} ${b.y - dy * .5} ${b.x} ${b.y}`);
    }
    const d = `M${pts[0].x} ${pts[0].y}` + segs.join('');
    base.setAttribute('d', d);
    done.setAttribute('d', d);
    total = base.getTotalLength();
    done.style.strokeDasharray = `${total} ${total}`;
    ys = [];
    for (let l = 0; l < total; l += STEP) ys.push(base.getPointAtLength(l).y);
    ys.push(base.getPointAtLength(total).y);
    dotLengths = pts.map(p => lengthAtY(p.y));
    dotLengths[0] = 0;

    // Railway: the run of legs that leave a stop by train (Tokyo → Kyoto → Nara → Osaka)
    const trainLegs = stops.map((li, i) => li.dataset.vehicleAfter === 'train' ? i : -1).filter(i => i >= 0);
    if (trainLegs.length) {
      const r0 = trainLegs[0], r1 = trainLegs[trainLegs.length - 1];
      const railD = `M${pts[r0].x} ${pts[r0].y}` + segs.slice(r0, r1 + 1).join('');
      railPaths.forEach(p => p.setAttribute('d', railD));
      railStart = dotLengths[r0];
      railLen = railDone.getTotalLength();
      railDone.style.strokeDasharray = `${railLen} ${railLen}`;
    }

    sceneryLengths = scenery.map(el => {
      const r = el.querySelector('.stop-art').getBoundingClientRect();
      return lengthAtY(r.top + r.height / 2 - box.top);
    });
    ready = true;
    update();
  }

  function placeAt(el, len, flip) {
    const p = base.getPointAtLength(len);
    const a = base.getPointAtLength(Math.min(total, len + 2));
    const b = base.getPointAtLength(Math.max(0, len - 2));
    const angle = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI + (flip ? 180 : 0);
    el.setAttribute('transform', `translate(${p.x} ${p.y}) rotate(${angle})`);
  }

  function update() {
    if (!ready) return;
    const box = section.getBoundingClientRect();
    const len = reduceMotion ? total : lengthAtY(innerHeight * 0.55 - box.top);
    wrap.style.display = reduceMotion ? 'none' : '';
    placeAt(wrap, len, false);
    done.style.strokeDashoffset = total - len;
    railDone.style.strokeDashoffset = railLen - Math.min(railLen, Math.max(0, len - railStart));

    let reached = 0;
    stops.forEach((li, i) => {
      const on = len >= dotLengths[i] - 1;
      li.classList.toggle('is-reached', on);
      if (on) reached = i;
    });
    scenery.forEach((el, i) => el.classList.toggle('is-reached', len >= sceneryLengths[i]));

    const kind = PLANE_ONLY ? 'plane' : (stops[reached].dataset.vehicleAfter || 'plane');
    plane.classList.toggle('is-hidden', kind !== 'plane');
    // Each car shows only while it is on the railway, so the train rolls out of Tokyo and into Osaka
    cars.forEach(car => {
      const l = len - Number(car.dataset.offset);
      const onRails = !reduceMotion && kind === 'train' && l >= railStart && l <= railStart + railLen;
      car.classList.toggle('is-hidden', !onRails);
      if (onRails) placeAt(car, l, car.dataset.flip === '1');
    });
  }

  // Scroll events already arrive about once per frame, and update() is cheap (lookup table, no path searches)
  if (!reduceMotion) addEventListener('scroll', update, { passive: true });
  new ResizeObserver(layout).observe(section);
  document.fonts?.ready.then(layout);
  section.querySelectorAll('img').forEach(img => img.addEventListener('load', layout));
  layout();
})();
