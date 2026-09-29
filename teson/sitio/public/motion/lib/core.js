/* Tesón · motion core
   One clock, one scroll, one palette for every motion piece.
   - TesonMotion.tick(fn, el)   run fn(dt, t) every frame while el is on screen (null el = always)
   - TesonMotion.smooth()       Lenis (lerp .12) driven by gsap.ticker, wired to ScrollTrigger
   - TesonMotion.scrollV        smoothed scroll velocity in px/frame (signed), for liquids
   - TesonMotion.wines          colour + optics per wine (Beer-Lambert absorption for the liquid)
   - TesonMotion.reduced        prefers-reduced-motion
   - TesonMotion.advance(n)     step every ticker n frames synchronously (debug / hidden tabs)
   No dependencies. Uses gsap.ticker when GSAP is on the page so Lenis, ScrollTrigger and the
   canvases share a single requestAnimationFrame. */
(function () {
  const M = {};
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  M.reduced = !!mq.matches || /[?&]reduced=1/.test(location.search);
  M.DPR = Math.min(window.devicePixelRatio || 1, document.documentElement.classList.contains('lite') ? 1.5 : 2);
  M.ease = { out: 'cubic-bezier(.16,1,.3,1)', io: 'cubic-bezier(.75,0,.25,1)', soft: 'cubic-bezier(.22,1,.36,1)' };
  M.dur = { fast: 0.3, medium: 0.6, slow: 1 };

  /* ---------- math ---------- */
  M.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.map = (v, a, b, c = 0, d = 1) => M.clamp((v - a) / (b - a)) * (d - c) + c;
  M.smoothstep = (a, b, v) => { const t = M.clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  M.expoOut = t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  /* CSS-style cubic-bezier as a JS easing, e.g. M.bezier(.75,0,.25,1) = Seed's signature curve */
  M.bezier = (x1, y1, x2, y2) => { const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by; const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx; return x => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 8; i++) { const e = X(t) - x, d = dX(t); if (Math.abs(e) < 1e-5 || !d) break; t -= e / d; } return Y(M.clamp(t)); }; };
  M.easeSeed = (t) => M._seed(t);
  M.inOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  M.hex = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  M.rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  M.mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

  M._seed = M.bezier(.75, 0, .25, 1); M._expo = M.bezier(.16, 1, .3, 1);

  /* ---------- wine optics ----------
     sigma = absorption per unit of path (1 unit = the glass bowl radius), per channel R,G,B.
     Light through a path of length d keeps exp(-sigma*d) of each channel (Beer-Lambert), so a
     thin edge reads violet-ruby and the core reads almost black, exactly like wine against light.
     Malbec: young, violet rim (blue absorbed less than green). Red Blend: ruby. Prestige: garnet. */
  M.wines = {
    malbec: {
      id: 'malbec', name: 'Malbec', sigma: [1.5, 7.0, 3.6], light: [255, 247, 232],
      rim: '#9b2a4f', body: '#4B0F22', deep: '#2a0610', page: '#FFF7E8', ink: '#1D1D1B', accent: '#EA5828',
      bottle: 'img/malbec-hd.webp', tilt: 'img/malbec-tilt-hd.webp', label: 'img/label-malbec.webp'
    },
    redblend: {
      id: 'redblend', name: 'Red Blend', sigma: [1.3, 7.2, 4.4], light: [255, 247, 232],
      rim: '#a8243c', body: '#6d1426', deep: '#300711', page: '#4A5581', ink: '#FFF7E8', accent: '#EB6665',
      bottle: 'img/redblend-hd.webp', tilt: 'img/redblend-tilt-hd.webp', label: 'img/label-redblend.webp'
    },
    prestige: {
      id: 'prestige', name: 'Malbec Prestige', sigma: [1.8, 8.2, 5.8], light: [255, 247, 232],
      rim: '#8a2330', body: '#3a0714', deep: '#1a0307', page: '#343433', ink: '#FFF7E8', accent: '#C17E55',
      bottle: 'img/prestige-hd.webp', tilt: 'img/prestige-tilt-hd.webp', label: 'img/label-prestige.webp'
    },
    /* Fatal Wines line: younger, cream #F2E6D3 / red #FF4D4D / lavender #8E82AC */
    fatalMalbec: {
      id: 'fatalMalbec', name: 'Fatal Malbec', line: 'fatal', sigma: [1.4, 7.2, 3.0], light: [255, 247, 232],
      rim: '#a02a5a', body: '#4d0d2a', deep: '#22040f', page: '#F2E6D3', ink: '#1D1D1B', accent: '#FF4D4D',
      bottle: 'img/fatal-malbec.webp', label: 'img/label-fatal-mb.webp'
    },
    fatalSauvignon: {
      id: 'fatalSauvignon', name: 'Fatal Sauvignon Blanc', line: 'fatal', white: true, sigma: [0.035, 0.06, 0.42], light: [255, 250, 240],
      rim: '#efe3a4', body: '#e2d27a', deep: '#c9b64f', page: '#8E82AC', ink: '#F2E6D3', accent: '#FF4D4D',
      bottle: 'img/fatal-sauvignon.webp', label: 'img/label-fatal-sb.webp'
    }
  };
  /* colour of light after d units of wine */
  M.transmit = (wine, d, light) => {
    const L = light || wine.light, s = wine.sigma;
    return [L[0] * Math.exp(-s[0] * d), L[1] * Math.exp(-s[1] * d), L[2] * Math.exp(-s[2] * d)];
  };

  /* ---------- the clock ---------- */
  const jobs = new Set();
  let last = 0, own = 0, t0 = performance.now();
  M.time = 0;
  M.scrollV = 0;          // px per 60fps-frame, smoothed, signed (down = +)
  let lastY = window.scrollY, rawV = 0;

  function frame(now) {
    const dt = Math.min(1 / 20, Math.max(1 / 240, (now - (last || now - 16.7)) / 1000));
    last = now; M.time = (now - t0) / 1000;
    const y = M.lenis ? M.lenis.scroll : window.scrollY;
    rawV = (y - lastY) / (dt * 60); lastY = y;
    M.scrollV += (rawV - M.scrollV) * 0.25;
    jobs.forEach(j => { if (j.visible && !j.dead) j.fn(dt, M.time); });
  }
  function start() {
    if (start.done) return; start.done = true;
    if (window.gsap && window.gsap.ticker) {
      window.gsap.ticker.add((time, deltaMs) => frame(performance.now()));
    } else {
      const loop = now => { frame(now); own = requestAnimationFrame(loop); };
      own = requestAnimationFrame(loop);
    }
  }
  /* Register a per-frame job. Pauses while el is offscreen (200px margin). Returns a handle with stop(). */
  M.tick = (fn, el, margin = '200px') => {
    const job = { fn, visible: true, dead: false };
    if (el && 'IntersectionObserver' in window) {
      job.visible = false;
      job.io = new IntersectionObserver(es => es.forEach(e => { job.visible = e.isIntersecting; }), { rootMargin: margin });
      job.io.observe(el);
    }
    jobs.add(job); start();
    job.stop = () => { job.dead = true; jobs.delete(job); job.io && job.io.disconnect(); };
    return job;
  };
  /* Synchronous stepping, for tests and hidden panes where rAF is throttled. */
  M.advance = (n = 1, dt = 1 / 60, force = true) => {
    for (let i = 0; i < n; i++) { M.time += dt; jobs.forEach(j => { if ((force || j.visible) && !j.dead) j.fn(dt, M.time); }); }
  };

  /* ---------- smooth scroll ---------- */
  M.smooth = (opts = {}) => {
    if (M.lenis || M.reduced || !window.Lenis) return M.lenis || null;
    const touch = matchMedia('(hover: none)').matches;
    if (touch && !opts.touch) return null;           // native scroll on touch, as in the synthesis
    const lenis = new window.Lenis({ lerp: opts.lerp || 0.12, smoothWheel: true, syncTouch: false });
    M.lenis = lenis;
    if (window.gsap) {
      if (window.ScrollTrigger) { lenis.on('scroll', window.ScrollTrigger.update); window.ScrollTrigger.config({ ignoreMobileResize: true }); }
      window.gsap.ticker.add(time => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    start();
    return lenis;
  };

  /* ---------- canvas helper ---------- */
  /* Keeps a canvas at css size x DPR. onResize(w, h) gets css pixels. */
  M.fitCanvas = (canvas, onResize) => {
    const ctx = canvas.getContext('2d');
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(1, r.width), h = Math.max(1, r.height);
      const W = Math.round(w * M.DPR), H = Math.round(h * M.DPR);
      if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
      onResize && onResize(w, h);
    };
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(canvas); else addEventListener('resize', fit);
    return ctx;
  };

  /* Asset paths are relative to assetBase (default: the motion lab lives one level under the site root). */
  M.assetBase = (document.currentScript && document.currentScript.dataset.assets) || '../assets/';
  M.asset = p => M.assetBase + p;
  M.loadImage = src => new Promise((res, rej) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = rej; i.src = src; });

  window.TesonMotion = M;
})();
