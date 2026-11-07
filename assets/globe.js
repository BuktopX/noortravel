// Hero globe: a 3D Earth (NASA Blue Marble, December) drawn with WebGL, with routes, city lights and
// labels drawn on top as light. Each <div class="globe" data-globe="…"> picks a scene from SCENES below.
// The map loads at 2048 px on small screens and 4096 px on large ones. With "reduce motion" on,
// the finished frame is drawn once and nothing moves. Without WebGL the globe area simply stays empty.
(() => {
  const els = document.querySelectorAll('.globe[data-globe]');
  if (!els.length) return;

  const D2R = Math.PI / 180;
  const vec = (lat, lon) => [Math.cos(lat * D2R) * Math.cos(lon * D2R), Math.cos(lat * D2R) * Math.sin(lon * D2R), Math.sin(lat * D2R)];
  const easeOut = (x) => { x = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - x, 3); };
  const easeInOut = (x) => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const slerp = (a, b, f) => {
    const om = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
    if (om < 1e-6) return a;
    const s1 = Math.sin((1 - f) * om) / Math.sin(om), s2 = Math.sin(f * om) / Math.sin(om);
    return [s1 * a[0] + s2 * b[0], s1 * a[1] + s2 * b[1], s1 * a[2] + s2 * b[2]];
  };

  const ALMATY = { name: 'Алматы', lat: 43.24, lon: 76.89 };

  // Scenes. view(t, mx, my) returns where the globe faces; t is seconds since the globe appeared.
  // draggable: people can grab and spin it. href on a destination turns its tag into a link to the tour page
  // (add one per tour as its page goes live; the path is relative to the page the globe is on).
  const SCENES = {
    home: {
      finalT: 9,
      draggable: true,
      view: (t, mx, my) => ({ lon: 72 + 46 * Math.sin(t * 0.07) + mx * 30, lat: 24 - my * 14 }),
      from: ALMATY,
      to: [
        { name: 'Япония', lat: 35.68, lon: 139.69, href: 'tours/japan.html' },
        { name: 'Гонконг', lat: 22.32, lon: 114.17 },
        { name: 'Куала-Лумпур', lat: 3.14, lon: 101.69 },
        { name: 'Австралия', lat: -33.87, lon: 151.21 },
        { name: 'Великобритания', lat: 51.51, lon: -0.13 },
        { name: 'Исландия', lat: 64.15, lon: -21.94 }
      ]
    },
    japan: {
      finalT: 9,
      view: (t, mx, my) => ({ lon: 62 + 50 * easeInOut(t / 6) + 3 * Math.sin(t * 0.1) + mx * 14, lat: 30 - my * 8 }),
      from: ALMATY,
      flight: { name: 'Токио', lat: 35.68, lon: 139.69 },
      train: [[35.68, 139.69], [35.01, 135.77], [34.69, 135.80], [34.69, 135.50]],
      trainLabel: 'Киото · Нара · Осака'
    }
  };

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}';
  const FS = [
    'precision highp float;',
    'uniform sampler2D tex; uniform vec3 globe; uniform vec2 view; uniform float ready;',
    'const float PI=3.14159265;',
    'void main(){',
    ' vec2 q=(gl_FragCoord.xy-globe.xy)/globe.z; float r2=dot(q,q); vec3 atm=vec3(0.56,0.73,0.96);',
    ' if(r2>1.0){ float g=smoothstep(1.07,1.0,sqrt(r2)); g=g*g*0.55; gl_FragColor=vec4(atm*g,g); return; }',
    ' float d=sqrt(1.0-r2); float sp=sin(view.y), cp=cos(view.y);',
    ' float x1=d*cp-q.y*sp; float z1=d*sp+q.y*cp; float y1=q.x;',
    ' float sl=sin(view.x), cl=cos(view.x); float v0=x1*cl-y1*sl; float v1=x1*sl+y1*cl;',
    ' float lat=asin(clamp(z1,-1.0,1.0)); float lon=atan(v1,v0);',
    ' vec3 c=texture2D(tex,vec2((lon+PI)/(2.0*PI),(PI*0.5-lat)/PI)).rgb;',
    ' c=mix(vec3(0.16,0.27,0.42),c,ready);',
    ' vec3 n=vec3(q,d); vec3 L=normalize(vec3(-0.55,0.45,0.70));',
    ' vec3 col=c*(0.2+0.95*smoothstep(-0.2,0.6,dot(n,L)));',
    ' float ocean=smoothstep(0.02,0.12,c.b-max(c.r,c.g));',
    ' vec3 H=normalize(L+vec3(0.0,0.0,1.0)); col+=vec3(1.0,0.97,0.9)*pow(max(dot(n,H),0.0),60.0)*0.35*ocean;',
    ' col=mix(col,atm,pow(1.0-d,2.5)*0.65);',
    ' float edge=smoothstep(1.0,0.995,sqrt(r2)); gl_FragColor=vec4(col*edge,edge);',
    '}'
  ].join('\n');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const base = document.currentScript ? document.currentScript.src.replace(/globe\.js.*$/, '') : 'assets/';

  els.forEach((el) => {
    const scene = SCENES[el.dataset.globe];
    if (!scene) return;

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!gl) { el.classList.add('no-webgl'); return; }
    el.append(canvas);

    // Overlay: glowing route lines and light points in SVG, labels as HTML so they stay crisp
    const svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <defs>
        <filter id="glow-${el.dataset.globe}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
        <radialGradient id="light-${el.dataset.globe}"><stop offset="0%" stop-color="#FFF6E0" stop-opacity=".95"/><stop offset="35%" stop-color="#F2D49B" stop-opacity=".45"/><stop offset="100%" stop-color="#F2D49B" stop-opacity="0"/></radialGradient>
      </defs>
      <path class="g-route-glow" filter="url(#glow-${el.dataset.globe})"/>
      <path class="g-route"/>
      <path class="g-trail-glow" filter="url(#glow-${el.dataset.globe})"/>
      <path class="g-trail"/>
      <path class="g-train-glow" filter="url(#glow-${el.dataset.globe})"/>
      <path class="g-train"/>
      <circle class="g-pulse" r="0"/>`;
    el.append(svg);
    const P = (sel) => svg.querySelector(sel);
    const routeGlow = P('.g-route-glow'), route = P('.g-route'), trailGlow = P('.g-trail-glow'), trail = P('.g-trail');
    const trainGlow = P('.g-train-glow'), train = P('.g-train'), pulse = P('.g-pulse');

    // The canvas carries the description; tags that link to a tour stay reachable for keyboards and screen readers
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', el.dataset.label || '');
    const lightsLayer = document.createElement('div');
    lightsLayer.className = 'g-lights';
    el.append(lightsLayer);
    const makeCity = (name, href) => {
      const c = document.createElement('div');
      c.className = 'g-city';
      const label = document.createElement(href ? 'a' : 'span');
      label.className = 'g-label' + (href ? ' is-link' : '');
      label.textContent = name;
      if (href) { label.href = href; label.setAttribute('aria-label', `${name}: подробнее о туре`); }
      else label.setAttribute('aria-hidden', 'true');
      const dot = document.createElement('span');
      dot.className = 'g-dot';
      dot.setAttribute('aria-hidden', 'true');
      c.append(dot, label);
      lightsLayer.append(c);
      return c;
    };
    const makeHead = () => { const h = document.createElement('span'); h.className = 'g-head'; h.setAttribute('aria-hidden', 'true'); lightsLayer.append(h); return h; };

    // Scene data
    const from = vec(scene.from.lat, scene.from.lon);
    const cities = [{ v: from, el: makeCity(scene.from.name), at: 1.2, side: 'left' }];
    let dests = [], heads = [], stops = [];
    if (scene.to) {
      dests = scene.to.map((d) => ({ v: vec(d.lat, d.lon) }));
      scene.to.forEach((d, i) => cities.push({ v: dests[i].v, el: makeCity(d.name, d.href), at: 1 + i * 0.55 + 2.0, side: 'auto' }));
      heads = dests.map(() => makeHead());
    } else {
      const tk = vec(scene.flight.lat, scene.flight.lon);
      dests = [{ v: tk }];
      stops = scene.train.map((c) => vec(c[0], c[1]));
      cities.push({ v: tk, el: makeCity(scene.flight.name), at: 5.0, side: 'above' });
      cities.push({ v: stops[2], el: makeCity(scene.trainLabel), at: 6.8, side: 'below-left' });
      heads = [makeHead()];
    }

    // WebGL setup
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = { globe: gl.getUniformLocation(prog, 'globe'), view: gl.getUniformLocation(prog, 'view'), ready: gl.getUniformLocation(prog, 'ready') };
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40, 70, 110, 255]));
    const texParams = () => {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    texParams();
    let ready = 0;

    // Size: the globe fills the box, leaving room for the atmosphere glow
    let W = 0, H = 0, CX = 0, CY = 0, R = 0;
    const resize = () => {
      const r = el.getBoundingClientRect();
      W = r.width; H = r.height;
      const dpr = Math.min(2, devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      R = Math.min(W, H) * 0.465; CX = W / 2; CY = H / 2;
      draw();
    };

    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const max = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      let src = img;
      if (img.width > max) { const c = document.createElement('canvas'); c.width = max; c.height = max / 2; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); src = c; }
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
      texParams();
      ready = 1;
      el.classList.add('is-ready');
      draw();
    };

    // Projection, shared by the shader (via uniforms) and the overlay
    let lon0 = 0, lat0 = 0;
    const proj = (v, lift = 0) => {
      const l0 = lon0 * D2R, p0 = lat0 * D2R;
      const x1 = v[0] * Math.cos(-l0) - v[1] * Math.sin(-l0);
      const y1 = v[0] * Math.sin(-l0) + v[1] * Math.cos(-l0);
      const z1 = v[2];
      const sx = y1, sy = z1 * Math.cos(p0) - x1 * Math.sin(p0);
      const depth = x1 * Math.cos(p0) + z1 * Math.sin(p0);
      const k = 1 + lift;
      return { x: CX + sx * R * k, y: CY - sy * R * k, z: depth, vis: depth >= 0 || (sx * sx + sy * sy) * k * k > 1.0001 };
    };
    const line = (pts) => {
      let d = '', pen = false;
      for (const p of pts) {
        if (p.vis) { d += (pen ? ' L' : ' M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); pen = true; } else pen = false;
      }
      return d;
    };
    const setD = (paths, d) => paths.forEach((p) => p.setAttribute('d', d));

    let t = 0, mx = 0, my = 0, tx = 0, ty = 0;
    // Spin added by dragging, on top of the scene's own slow sway
    let spinLon = 0, spinLat = 0, velLon = 0, velLat = 0, dragging = false;

    function draw() {
      if (!W) return;
      const v = scene.view(t, mx, my);
      lon0 = v.lon + spinLon;
      lat0 = Math.max(-70, Math.min(70, v.lat + spinLat));

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const s = canvas.width / W;
      gl.uniform3f(U.globe, CX * s, (H - CY) * s, R * s);
      gl.uniform2f(U.view, lon0 * D2R, lat0 * D2R);
      gl.uniform1f(U.ready, ready);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // Routes
      let routeD = '', trailD = '';
      const N = 72;
      dests.forEach((d, i) => {
        const om = Math.acos(Math.max(-1, Math.min(1, from[0] * d.v[0] + from[1] * d.v[1] + from[2] * d.v[2])));
        const lift = scene.to ? 0.16 * Math.min(1, om / 1.2) : 0.09;
        const prog = scene.to ? easeOut((t - 1 - i * 0.55) / 2.4) : easeInOut((t - 1.6) / 3.6);
        const full = [], drawn = [];
        for (let j = 0; j <= N; j++) {
          const f = j / N, p = proj(slerp(from, d.v, f), lift * Math.sin(Math.PI * f));
          full.push(p); if (f <= prog) drawn.push(p);
        }
        routeD += line(drawn);
        // A moving light: on the home globe one per route, looping; on the Japan globe it flies the arc every 11 s
        let k = -1;
        if (scene.to) { if (prog >= 1) k = Math.floor(((t * 0.12 + i * 0.19) % 1) * N); }
        else { const loop = Math.max(0, t - 1.6) % 11; if (t > 1.6 && loop < 7) k = Math.min(N, Math.floor(easeInOut(loop / 7) * N)); }
        const head = heads[i];
        if (k >= 0 && full[k].vis) {
          trailD += line(full.slice(Math.max(0, k - (scene.to ? 14 : 22)), k + 1));
          head.style.transform = `translate(${full[k].x}px, ${full[k].y}px)`;
          head.style.opacity = 1;
        } else head.style.opacity = 0;
      });
      setD([routeGlow, route], routeD);
      setD([trailGlow, trail], trailD);

      // Train line inside Japan
      if (stops.length) {
        const tp = easeInOut((t - 5.4) / 1.8), pts = [], segs = stops.length - 1;
        for (let i = 0; i <= 48; i++) {
          const g = i / 48; if (g > tp) break;
          const sI = Math.min(segs - 1, Math.floor(g * segs));
          pts.push(proj(slerp(stops[sI], stops[sI + 1], g * segs - sI)));
        }
        setD([trainGlow, train], line(pts));
      }

      // Almaty pulse
      const hp = proj(from), ph = (t % 2.6) / 2.6;
      pulse.setAttribute('cx', hp.x.toFixed(1)); pulse.setAttribute('cy', hp.y.toFixed(1));
      pulse.setAttribute('r', reduceMotion ? 0 : (6 + ph * 22).toFixed(1));
      pulse.style.opacity = hp.z > 0 ? (1 - ph) : 0;

      // City lights and labels
      cities.forEach((c) => {
        const p = proj(c.v);
        const shown = easeOut((t - c.at) / 0.6);
        c.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
        const op = p.z > 0.05 ? Math.min(1, p.z * 3) * shown : 0;
        c.el.style.opacity = op;
        // A tag on the far side can't be clicked or tabbed to
        c.el.style.visibility = op > 0.15 ? 'visible' : 'hidden';
        let side = c.side === 'auto' ? (p.x < CX - 40 ? 'left' : 'right') : c.side;
        // Flip a label that would run past the edge of the globe box (matters on phones)
        const lw = c.lw || (c.lw = c.el.querySelector('.g-label').offsetWidth);
        const toLeft = side === 'left' || side === 'below-left';
        if (!toLeft && lw && p.x + 16 + lw > W + 8) side = side === 'above' ? 'above-left' : 'left';
        else if (toLeft && lw && p.x - 16 - lw < -8) side = 'right';
        if (c.el.dataset.side !== side) c.el.dataset.side = side;
      });
    }

    // Animation loop: runs only while the globe is on screen
    let running = false, last = 0, visible = true;
    const frame = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      if (!dragging) {
        t += dt;
        // After a throw the globe keeps turning and slows down
        spinLon += velLon; spinLat += velLat;
        velLon *= 0.95; velLat *= 0.95;
      }
      mx += (tx - mx) * 0.06; my += (ty - my) * 0.06;
      draw();
      requestAnimationFrame(frame);
    };
    const start = () => { if (running || reduceMotion || !visible || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(frame); };
    const stop = () => { running = false; };

    if (reduceMotion) t = scene.finalT;
    new ResizeObserver(resize).observe(el);
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; visible ? start() : stop(); }).observe(el);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    if (finePointer && !reduceMotion) {
      const area = el.closest('section') || el;
      area.addEventListener('pointermove', (e) => {
        if (dragging) return;
        const r = area.getBoundingClientRect();
        tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
      });
      area.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
    }

    // Grab and spin. On touch screens a vertical swipe still scrolls the page (touch-action: pan-y),
    // a sideways swipe turns the globe.
    if (scene.draggable) {
      el.classList.add('is-draggable');
      let lastX = 0, lastY = 0, id = null, lastMove = 0;
      el.addEventListener('pointerdown', (e) => {
        if (e.target.closest('a') || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - r.left - CX, dy = e.clientY - r.top - CY;
        if (dx * dx + dy * dy > (R * 1.05) ** 2) return;
        dragging = true; id = e.pointerId; lastX = e.clientX; lastY = e.clientY; velLon = velLat = 0;
        try { el.setPointerCapture(id); } catch {}
        el.classList.add('is-dragging');
      });
      el.addEventListener('pointermove', (e) => {
        if (!dragging || e.pointerId !== id) return;
        const dLon = -(e.clientX - lastX) / R / D2R, dLat = (e.clientY - lastY) / R / D2R;
        lastX = e.clientX; lastY = e.clientY;
        spinLon += dLon; spinLat = Math.max(-46, Math.min(46, spinLat + dLat));
        const cap = (v) => Math.max(-6, Math.min(6, v));
        velLon = cap(dLon); velLat = cap(dLat * 0.5); lastMove = performance.now();
        if (!running) draw();
      });
      const end = (e) => {
        if (!dragging || e.pointerId !== id) return;
        dragging = false; id = null;
        el.classList.remove('is-dragging');
        // No throw if the pointer was held still before letting go
        if (reduceMotion || performance.now() - lastMove > 80) velLon = velLat = 0;
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }

    const big = el.getBoundingClientRect().width * Math.min(2, devicePixelRatio || 1) > 900;
    img.src = base + (big ? 'illustrations/japan/earth.jpg' : 'illustrations/japan/earth-2k.jpg');
    resize();
    start();
  });
})();
