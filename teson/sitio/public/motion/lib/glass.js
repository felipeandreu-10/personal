/* Tesón · TesonGlass
   A Bordeaux glass with wine, drawn in Canvas 2D as a 2.5D object (a surface of revolution
   seen from slightly above). What makes it read as real wine:
   - Body colour from Beer-Lambert: every pixel of the bowl gets the colour of backlight after
     crossing that much wine (thick core almost black, thin edges violet-ruby). Precomputed once
     per size and wine into an offscreen bitmap, so a frame is just a clipped drawImage.
   - Swirl: the surface is a tilted, rotating plane with a 2nd harmonic (the wine climbs the
     wall at the crest) plus a periodic spring ring for ripples. Idle, drag and scroll feed it.
   - Legs ("piernas"): after a swirl the wall keeps a film that fades; tears form at the film's
     crown and slide down in stick-slip until they rejoin the wine. Back-wall tears are drawn
     behind the wine and front-wall tears in front, so occlusion is correct.
   - Meniscus rim line, surface sheen, glass highlights, stem, foot, floor shadow and a red
     caustic where the light passes through the wine.
   - Optional pour stream (used by El servido): parabola from the bottle mouth, thinning with
     speed, wobbling, with foam and splash at the impact.
   API
     const g = TesonGlass.mount(canvas, { wine: 'malbec', level: .42, idle: .05, fit: {x:.5,y:.5,h:.9} })
     g.setWine('redblend') · g.level = .5 · g.kick(px) · g.swirl(radPerSec, dt) · g.destroy()
   Or render inside your own canvas: const g = new TesonGlass(opts); g.fit(w,h); g.update(dt); g.draw(ctx) */
(function () {
  const M = window.TesonMotion;
  const TAU = Math.PI * 2;
  const HB = 2.35;       // bowl interior height, in bowl radii
  const TH = 0.028;      // glass wall thickness
  const RIM = 0.74;      // rim radius
  const TM = 0.6;        // where the bowl is widest (0 rim .. 1 bottom)
  const STEM = 1.45, FOOT = 0.82, BASE = 0.14;
  const N = 72;          // surface samples

  function rin(t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    if (t <= TM) return RIM + (1 - RIM) * Math.sin((Math.PI / 2) * (t / TM));
    const u = (t - TM) / (1 - TM);
    return Math.sqrt(Math.max(0, 1 - u * u));
  }

  function hull(pts) {
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    up.pop(); lo.pop(); return lo.concat(up);
  }
  const toPath = pts => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };

  /* periodic spring ring: ripples that travel around the wall */
  class Ring {
    constructor(n = 48) { this.n = n; this.h = new Float32Array(n); this.v = new Float32Array(n); this.acc = 0; }
    step(dt) {
      this.acc += dt; const n = this.n, h = this.h, v = this.v;
      while (this.acc >= 1 / 60) {
        this.acc -= 1 / 60;
        for (let i = 0; i < n; i++) { const l = h[(i - 1 + n) % n], r = h[(i + 1) % n]; v[i] += 0.16 * (l + r - 2 * h[i]) - 0.018 * h[i] - 0.035 * v[i]; }
        for (let i = 0; i < n; i++) h[i] += v[i];
      }
    }
    at(th) { const f = (((th % TAU) + TAU) % TAU) / TAU * this.n; const i = Math.floor(f) % this.n, j = (i + 1) % this.n, a = f - Math.floor(f); return this.h[i] * (1 - a) + this.h[j] * a; }
    impulse(th, amt, spread = 2) {
      const n = this.n, c = Math.round((((th % TAU) + TAU) % TAU) / TAU * n);
      for (let d = -spread; d <= spread; d++) { const j = (((c + d) % n) + n) % n; this.v[j] += amt * (1 - Math.abs(d) / (spread + 1)); }
    }
  }

  class Glass {
    constructor(o = {}) {
      this.setWine(o.wine || 'malbec', true);
      this.level = o.level ?? 0.42;       // wine height as a fraction of the bowl, from the bottom
      this.idle = o.idle ?? 0.05;         // idle swirl amplitude (0 = still)
      this.k = o.k ?? 0.2;                // ellipse ratio = how much from above we look
      this.floor = o.floor ?? true;
      this.tearsOn = o.tears ?? true;
      this.theme = o.theme || 'light';
      this.A = this.idle; this.phi = 0; this.omega = 2.3; this.dir = 1;
      this.ring = new Ring(48);
      this.film = { top: 1 - this.level, a: 0, calm: 9 };
      this.tears = []; this.bubbles = []; this.drops = [];
      this.stream = null;                 // { x0,y0,vx,vy,g,flow,from,to }
      this.ox = 0; this.oy = 0; this.dragX = 0; this.dragY = 0;
      this.time = 0;
      this.px = new Float32Array(N + 1); this.py = new Float32Array(N + 1); this.pt = new Float32Array(N + 1);
    }

    setWine(w, silent) {
      this.wine = typeof w === 'string' ? M.wines[w] : w;
      const T = d => M.transmit(this.wine, d);
      this.col = { thin: T(0.05), rim: T(0.16), mid: T(0.5), core: T(1.8), foam: M.mix(T(0.08), [255, 250, 245], 0.45) };
      this._tex = null;
    }

    /* place the glass: centre x, rim y, scale (px per bowl radius) */
    setLayout(cx, y0, s) { this.cx = cx; this.y0 = y0; this.s = s; this._geom(); this._tex = null; }
    /* fit into a w x h box. o.x/o.y = centre as a fraction, o.h = fraction of the height used */
    fit(w, h, o = {}) {
      const k = this.k, total = HB + BASE + STEM + FOOT * k + RIM * k + 0.3;
      const s = Math.min((h * (o.h ?? 0.88)) / total, (w * (o.w ?? 0.8)) / 2.2);
      const top = h * (o.y ?? 0.5) - (total * s) / 2;
      this.setLayout(w * (o.x ?? 0.5), top + RIM * k * s, s);
    }
    get height() { return (HB + BASE + STEM + FOOT * this.k + RIM * this.k + 0.04) * this.s; }
    yS(t) { return this.y0 + t * HB * this.s; }
    ringXY(t, th, r) { r = r ?? rin(t); return [this.cx + r * this.s * Math.cos(th), this.yS(t) + r * this.s * this.k * Math.sin(th)]; }
    /* where the wine surface centre is on screen */
    get surfaceY() { return this.yS(1 - this.level); }

    _geom() {
      const inner = [], outer = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60, r = rin(t);
        for (let j = 0; j < 40; j++) {
          const th = (j / 40) * TAU;
          inner.push(this.ringXY(t, th, r));
          outer.push(this.ringXY(t, th, r + TH));
        }
      }

      const hi = hull(inner), ho = hull(outer);
      this.inner = toPath(hi); this.outer = toPath(ho);
      const xs = hi.map(p => p[0]), ys = hi.map(p => p[1]);
      this.bb = { x: Math.floor(Math.min(...xs)) - 1, y: Math.floor(Math.min(...ys)) - 1, w: 0, h: 0 };
      this.bb.w = Math.ceil(Math.max(...xs)) + 1 - this.bb.x; this.bb.h = Math.ceil(Math.max(...ys)) + 1 - this.bb.y;
      this.yBase = this.yS(1) + (TH + 0.03) * this.s;
      this.yFoot = this.yBase + STEM * this.s;
    }

    /* Beer-Lambert body, computed per pixel once */
    _buildTex() {
      const D = M.DPR, bb = this.bb, W = Math.max(1, Math.round(bb.w * D)), H = Math.max(1, Math.round(bb.h * D));
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const cx = c.getContext('2d'), img = cx.createImageData(W, H), a = img.data;
      const L = this.wine.light, sg = this.wine.sigma, s = this.s;
      for (let py = 0; py < H; py++) {
        const y = bb.y + (py + 0.5) / D;
        const t = (y - this.y0) / (HB * s);
        const r = Math.max(0.02, rin(t));
        const vert = 1 + 0.06 * Math.max(0, 0.5 - t);          // a touch more light near the top
        for (let px = 0; px < W; px++) {
          const x = bb.x + (px + 0.5) / D, dx = Math.abs(x - this.cx) / s, q = dx / r;
          let d = (q < 1 ? 2 * r * Math.sqrt(1 - q * q) : 0) + 0.035;
          const edge = 1 - 0.5 * M.smoothstep(0.9, 1.0, q);      // dark refraction line at the wall
          const lens = 1 + 0.18 * Math.exp(-((q - 0.78) * (q - 0.78)) / 0.012); // focused backlight band
          const n = (Math.random() - 0.5) * 3;
          const i = (py * W + px) * 4;
          a[i] = Math.min(255, L[0] * Math.exp(-sg[0] * d) * edge * lens * vert + n);
          a[i + 1] = Math.min(255, L[1] * Math.exp(-sg[1] * d) * edge * lens * vert + n);
          a[i + 2] = Math.min(255, L[2] * Math.exp(-sg[2] * d) * edge * lens * vert + n);
          a[i + 3] = 255;
        }
      }
      cx.putImageData(img, 0, 0);
      this._tex = c;
    }

    /* ---------- input ---------- */
    get maxA() { const tL = 1 - this.level; return Math.max(0, Math.min(0.42, (tL - 0.05) * HB, (this.level - 0.015) * HB)); }
    swirl(w, dt) {                    // w: angular speed (rad/s) of the hand around the glass
      const Ad = Math.min(this.maxA, Math.abs(w) * 0.03);
      if (Ad > this.A) this.A += (Ad - this.A) * Math.min(1, dt * 2.2);
      if (Math.abs(w) > 1.2) this.dir = Math.sign(w);
    }
    kick(v) {                         // v: scroll velocity in px/frame
      const a = Math.min(Math.abs(v), 60);
      this.A = Math.min(this.maxA, this.A + a * 0.0009);
      if (a > 2) this.ring.impulse(Math.random() * TAU, (Math.random() - 0.5) * a * 0.0016, 3);
    }
    splash(th, amt) { this.ring.impulse(th, amt, 3); }

    /* ---------- simulation ---------- */
    update(dt) {
      this.time += dt;
      const tL = 1 - this.level;
      if (this.level < 0.004) { this.A = 0; }
      this.A += (this.idle - this.A) * (1 - Math.exp(-dt * 0.8));
      if (this.stream && this.stream.to > 0.98 && this.stream.flow > 0.05) this.A = Math.max(this.A, 0.02 + 0.03 * this.stream.flow);
      if (this.A > this.maxA) this.A = this.maxA;
      const wT = this.dir * (2.3 + 9 * this.A);
      this.omega += (wT - this.omega) * (1 - Math.exp(-dt * 2));
      this.phi += this.omega * dt;
      this.ring.step(dt);
      // the glass follows the hand a little (drag) and circles with a strong swirl
      const sw = this.A * 0.05 * this.s;
      const tx = this.dragX + Math.cos(this.phi - 1.2) * sw, ty = this.dragY + Math.sin(this.phi - 1.2) * sw * 0.3;
      this.ox += (tx - this.ox) * Math.min(1, dt * 10); this.oy += (ty - this.oy) * Math.min(1, dt * 10);

      // film on the wall + legs
      const F = this.film, crest = tL - this.A / HB;
      if (this.A > 0.085) {
        F.top = Math.min(F.top, crest + 0.004);
        F.a = Math.min(1, F.a + dt * 2.2 * M.smoothstep(0.085, 0.2, this.A)); F.calm = 0;
      } else F.calm += dt;
      if (F.calm > 0.3) F.a *= Math.exp(-dt / 6);
      if (F.a < 0.02) F.top = Math.min(tL, crest);
      F.top = Math.max(0.02, Math.min(F.top, tL));
      if (this.tearsOn && F.a > 0.1 && F.calm > 0.2 && tL - F.top > 0.03 && this.tears.length < 36 && Math.random() < dt * 11) {
        this.tears.push({ th: Math.random() * TAU, t0: F.top + Math.random() * 0.01, t: 0, v: 0, delay: 0.15 + Math.random() * 0.9, life: 0,
          w: 0.7 + Math.random() * 0.7, hr: 0.011 + Math.random() * 0.012, ph: Math.random() * 9, a: 0.7 + Math.random() * 0.3 });
        const tr = this.tears[this.tears.length - 1]; tr.t = tr.t0;
      }
      for (let i = this.tears.length - 1; i >= 0; i--) {
        const tr = this.tears[i]; tr.life += dt;
        if (tr.life > tr.delay) {
          const slip = 0.3 + 0.7 * Math.abs(Math.sin(tr.life * 1.6 + tr.ph));
          tr.v = Math.min(0.085, tr.v + dt * 0.05) * slip + 0.006;
          tr.t += tr.v * dt;
        }
        const surf = tL - this.delta(tr.th) / HB;
        if (tr.t >= surf - 0.003 || tr.t0 > surf) { this.ring.impulse(tr.th, 0.0025, 1); this.tears.splice(i, 1); }
      }

      // pour: foam and splash
      const S = this.stream;
      if (S && S.to > 0.98 && S.flow > 0.03 && this.impact) {
        const ix = (this.impact[0] - this.cx) / this.s;
        if (Math.random() < dt * 60 * S.flow) this.bubbles.push({ x: ix + (Math.random() - 0.5) * 0.3, z: (Math.random() - 0.5) * 0.3, r: 0.01 + Math.random() * 0.028, life: 0, max: 0.8 + Math.random() * 1.6 });
        if (Math.random() < dt * 40 * S.flow) {
          this.drops.push({ x: this.impact[0], y: this.impact[1], vx: (Math.random() - 0.5) * 1.4 * this.s, vy: -(0.7 + Math.random() * 1.2) * this.s, r: 0.6 + Math.random() * 1.8, y0: this.impact[1] });
        }
        if (Math.random() < dt * 30) this.ring.impulse(Math.random() * TAU, (Math.random() - 0.5) * 0.02 * S.flow, 2);
      }
      for (let i = this.bubbles.length - 1; i >= 0; i--) { const b = this.bubbles[i]; b.life += dt; b.x *= 1 + dt * 0.25; b.z *= 1 + dt * 0.25; if (b.life > b.max) this.bubbles.splice(i, 1); }
      if (this.bubbles.length > 160) this.bubbles.splice(0, this.bubbles.length - 160);
      for (let i = this.drops.length - 1; i >= 0; i--) { const d = this.drops[i]; d.vy += 9 * this.s * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.vy > 0 && d.y > d.y0) this.drops.splice(i, 1); }
    }

    delta(th) {
      return this.A * Math.cos(th - this.phi) + this.A * 0.2 * Math.cos(2 * (th - this.phi) + 0.7) + this.ring.at(th);
    }
    _surface() {
      const tL = 1 - this.level;
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * TAU;
        const t = Math.max(0.004, Math.min(0.998, tL - this.delta(th) / HB));
        const r = rin(t);
        this.px[i] = this.cx + r * this.s * Math.cos(th);
        this.py[i] = this.yS(t) + r * this.s * this.k * Math.sin(th);
        this.pt[i] = t;
      }
    }

    /* ---------- drawing ---------- */
    draw(ctx) {
      if (!this.s) return;
      if (!this._tex) this._buildTex();
      const s = this.s, k = this.k, cx = this.cx, C = this.col, dark = this.theme === 'dark';
      const has = this.level > 0.004;
      if (has) this._surface();
      ctx.save();
      ctx.translate(this.ox, this.oy);

      /* floor: contact shadow + caustic of light through the wine */
      if (this.floor) {
        const fy = this.yFoot + 0.02 * s;
        ctx.save(); ctx.translate(cx, fy); ctx.scale(1, 0.2);
        let g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1.25 * s);
        g.addColorStop(0, `rgba(29,29,27,${dark ? 0.5 : 0.22})`); g.addColorStop(1, 'rgba(29,29,27,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1.25 * s, 0, TAU); ctx.fill();
        ctx.restore();
        if (has) {
          ctx.save(); ctx.translate(cx + 0.12 * s, fy + 0.2 * s); ctx.scale(1, 0.24);
          const cc = M.transmit(this.wine, 0.3);
          g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.95 * s);
          g.addColorStop(0, M.rgba(cc, 0.34 * Math.min(1, this.level * 2.5))); g.addColorStop(0.5, M.rgba(cc, 0.12 * Math.min(1, this.level * 2.5))); g.addColorStop(1, M.rgba(cc, 0));
          ctx.globalCompositeOperation = dark ? 'screen' : 'multiply';
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 0.95 * s, 0, TAU); ctx.fill();
          ctx.restore();
        }
      }

      /* stem and foot */
      this._stem(ctx, dark);

      /* glass body tint (fresnel: edges greyer than the middle) */
      let g = ctx.createLinearGradient(cx - 1.05 * s, 0, cx + 1.05 * s, 0);
      const e = dark ? 'rgba(255,255,255,.10)' : 'rgba(60,52,44,.10)', m = dark ? 'rgba(255,255,255,.02)' : 'rgba(255,255,255,.10)';
      g.addColorStop(0, e); g.addColorStop(0.18, m); g.addColorStop(0.82, m); g.addColorStop(1, e);
      ctx.fillStyle = g; ctx.fill(this.outer);

      const tL = 1 - this.level, F = this.film;
      /* back wall: film + legs, seen through the glass, hidden by the wine */
      if (has && F.a > 0.01) {
        ctx.save(); ctx.clip(this.inner);
        ctx.beginPath();
        for (let i = N; i >= N / 2; i--) { const [x, y] = this.ringXY(F.top, (i / N) * TAU); i === N ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.lineTo(cx - 3 * s, this.ringXY(F.top, Math.PI)[1]); ctx.lineTo(cx - 3 * s, this.yS(1) + s); ctx.lineTo(cx + 3 * s, this.yS(1) + s); ctx.closePath();
        ctx.fillStyle = M.rgba(C.thin, 0.13 * F.a); ctx.fill();
        this._crown(ctx, F, Math.PI, TAU);
        ctx.restore();
      }
      if (has) this._tears(ctx, false);

      if (has) {
        /* body */
        ctx.save(); ctx.clip(this.inner);
        ctx.beginPath(); ctx.moveTo(this.px[0], this.py[0]);
        for (let i = N - 1; i >= N / 2; i--) ctx.lineTo(this.px[i], this.py[i]);
        const ly = this.py[N / 2];
        ctx.lineTo(cx - 3 * s, ly); ctx.lineTo(cx - 3 * s, this.yS(1) + 2 * s); ctx.lineTo(cx + 3 * s, this.yS(1) + 2 * s); ctx.lineTo(cx + 3 * s, this.py[0]); ctx.closePath();
        ctx.clip();
        ctx.drawImage(this._tex, this.bb.x, this.bb.y, this.bb.w, this.bb.h);
        ctx.restore();

        /* surface */
        ctx.save(); ctx.clip(this.inner);
        const sp = new Path2D(); sp.moveTo(this.px[0], this.py[0]); for (let i = 1; i < N; i++) sp.lineTo(this.px[i], this.py[i]); sp.closePath();
        let top = Infinity, bot = -Infinity; for (let i = 0; i < N; i++) { if (this.py[i] < top) top = this.py[i]; if (this.py[i] > bot) bot = this.py[i]; }
        g = ctx.createLinearGradient(0, top, 0, bot);
        g.addColorStop(0, M.rgba(M.mix(C.rim, this.wine.light, 0.28)));
        g.addColorStop(0.16, M.rgba(C.rim));
        g.addColorStop(0.45, M.rgba(C.mid));
        g.addColorStop(0.8, M.rgba(C.core));
        g.addColorStop(1, M.rgba(M.mix(C.core, C.mid, 0.5)));
        ctx.fillStyle = g; ctx.fill(sp);
        ctx.save(); ctx.clip(sp);
        // thin wedge of wine against the wall: the rim colour
        ctx.strokeStyle = M.rgba(C.rim, 0.55); ctx.lineWidth = Math.max(1.5, 0.05 * s); ctx.stroke(sp);
        // sheen: the window reflected on the surface, drifting with the swirl
        const scx = cx - 0.25 * s + Math.cos(this.phi) * this.A * 0.5 * s, scy = (top + bot) / 2 - (bot - top) * 0.12;
        ctx.translate(scx, scy); ctx.scale(1, k * 1.6);
        g = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.55 * s);
        g.addColorStop(0, 'rgba(255,248,240,.20)'); g.addColorStop(1, 'rgba(255,248,240,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 0.55 * s, 0, TAU); ctx.fill();
        ctx.restore();
        // foam from the pour
        if (this.bubbles.length) {
          ctx.save(); ctx.clip(sp);
          const sy = this.yS(tL);
          for (const b of this.bubbles) {
            const a = Math.min(1, b.life * 6) * (1 - b.life / b.max);
            const bx = cx + b.x * s, by = sy + b.z * s * k, br = b.r * s;
            ctx.beginPath(); ctx.ellipse(bx, by, br, br * 0.62, 0, 0, TAU);
            ctx.fillStyle = M.rgba(C.foam, 0.38 * a); ctx.fill();
            ctx.strokeStyle = `rgba(255,245,245,${0.45 * a})`; ctx.lineWidth = 0.7; ctx.stroke();
          }
          ctx.restore();
        }
        // meniscus: light caught on the back edge, rim colour on the front edge
        ctx.beginPath(); for (let i = N / 2; i <= N; i++) i === N / 2 ? ctx.moveTo(this.px[i], this.py[i]) : ctx.lineTo(this.px[i % N], this.py[i % N]);
        ctx.strokeStyle = 'rgba(255,250,244,.42)'; ctx.lineWidth = 1.1; ctx.stroke();
        ctx.beginPath(); for (let i = 0; i <= N / 2; i++) i === 0 ? ctx.moveTo(this.px[i], this.py[i]) : ctx.lineTo(this.px[i], this.py[i]);
        ctx.strokeStyle = M.rgba(M.mix(C.rim, [255, 235, 240], 0.35), 0.75); ctx.lineWidth = 1.3; ctx.stroke();
        ctx.restore();
      }

      /* the stream from a bottle, splash drops */
      if (this.stream) this._stream(ctx);

      /* front wall: film + legs over the wine */
      if (has && F.a > 0.01) {
        ctx.save(); ctx.clip(this.inner);
        ctx.beginPath();
        for (let i = 0; i <= N / 2; i++) { const [x, y] = this.ringXY(F.top, (i / N) * TAU); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        for (let i = N / 2; i >= 0; i--) ctx.lineTo(this.px[i], this.py[i]);
        ctx.closePath(); ctx.fillStyle = M.rgba(C.thin, 0.11 * F.a); ctx.fill();
        this._crown(ctx, F, 0, Math.PI);
        ctx.restore();
      }
      if (has) this._tears(ctx, true);

      this._highlights(ctx, dark);
      ctx.restore();
    }

    /* the crown of the film: a ridge that dips into arches where each leg starts */
    _crownT(F, th) {
      let d = 0;
      for (const tr of this.tears) { let a = Math.abs(th - tr.th) % TAU; if (a > Math.PI) a = TAU - a; if (a < 0.2) d += 0.012 * Math.exp(-(a * a) / 0.0025) * Math.min(1, tr.life * 2); }
      return F.top + d;
    }
    _crown(ctx, F, a0, a1) {
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const th = a0 + (a1 - a0) * (i / 72);
        const [x, y] = this.ringXY(this._crownT(F, th), th);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = M.rgba(this.col.thin, 0.26 * F.a); ctx.lineWidth = Math.max(1, 0.014 * this.s); ctx.stroke();
    }

    /* legs: a tapered rivulet from the crown to a teardrop bead */
    _tears(ctx, front) {
      const s = this.s, C = this.col, F = this.film;
      for (const tr of this.tears) {
        const sn = Math.sin(tr.th);
        if ((sn > 0) !== front) continue;
        const vis = (front ? 1 : 0.7) * tr.a * Math.min(1, tr.life * 2.5);
        const grow = Math.min(1, 0.35 + tr.life / 1.4);
        const hw = tr.hr * s * grow * (0.35 + 0.65 * Math.abs(Math.sin(tr.th)));   // foreshortened at the sides
        const hh = tr.hr * s * grow * 1.9;
        const [hx, hy] = this.ringXY(tr.t, tr.th);
        const steps = 10, Lp = [], Rp = [];
        const t0 = this._crownT(F, tr.th);
        for (let j = 0; j <= steps; j++) {
          const u = j / steps, t = t0 + (tr.t - t0) * u;
          const [x, y] = this.ringXY(t, tr.th + Math.sin(t * 60 + tr.ph) * 0.004);
          const w = Math.max(0.7, (0.35 + 0.65 * u * u) * hw * 0.85);
          Lp.push([x - w, y]); Rp.push([x + w, y]);
        }
        if (tr.t - t0 > 0.002) {
          ctx.beginPath(); Lp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); for (let i = Rp.length - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]); ctx.closePath();
          ctx.fillStyle = M.rgba(C.rim, 0.34 * vis); ctx.fill();
          ctx.beginPath(); Lp.forEach((p, i) => (i ? ctx.lineTo(p[0] + 0.4, p[1]) : ctx.moveTo(p[0] + 0.4, p[1])));
          ctx.strokeStyle = `rgba(255,255,255,${0.45 * vis})`; ctx.lineWidth = 0.6; ctx.stroke();
          ctx.beginPath(); Rp.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
          ctx.strokeStyle = M.rgba(C.rim, 0.22 * vis); ctx.lineWidth = 0.6; ctx.stroke();
        }
        // bead: pointed on top, round and heavier at the bottom
        ctx.beginPath();
        ctx.moveTo(hx, hy - hh);
        ctx.bezierCurveTo(hx + hw * 0.5, hy - hh * 0.55, hx + hw, hy - hh * 0.1, hx + hw, hy + hh * 0.15);
        ctx.bezierCurveTo(hx + hw, hy + hh * 0.62, hx - hw, hy + hh * 0.62, hx - hw, hy + hh * 0.15);
        ctx.bezierCurveTo(hx - hw, hy - hh * 0.1, hx - hw * 0.5, hy - hh * 0.55, hx, hy - hh);
        const g = ctx.createLinearGradient(0, hy - hh, 0, hy + hh * 0.5);
        g.addColorStop(0, M.rgba(C.thin, 0.25 * vis)); g.addColorStop(1, M.rgba(C.rim, 0.55 * vis));
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = M.rgba(C.mid, 0.28 * vis); ctx.lineWidth = 0.6; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hx - hw * 0.35, hy - hh * 0.05, Math.max(0.5, hw * 0.28), Math.max(0.7, hh * 0.2), 0, 0, TAU);
        ctx.fillStyle = `rgba(255,255,255,${0.75 * vis})`; ctx.fill();
      }
    }

    _stem(ctx, dark) {
      const s = this.s, cx = this.cx, k = this.k, yb = this.yBase, yf = this.yFoot, sw = 0.045 * s;
      const edge = dark ? 'rgba(255,255,255,.28)' : 'rgba(70,62,54,.30)', mid = dark ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.85)';
      const g = ctx.createLinearGradient(cx - sw * 2, 0, cx + sw * 2, 0);
      g.addColorStop(0, edge); g.addColorStop(0.35, mid); g.addColorStop(0.55, dark ? 'rgba(255,255,255,.12)' : 'rgba(120,110,100,.18)'); g.addColorStop(0.8, mid); g.addColorStop(1, edge);
      // foot
      ctx.beginPath(); ctx.ellipse(cx, yf, FOOT * s, FOOT * s * k, 0, 0, TAU);
      const fg = ctx.createLinearGradient(0, yf - FOOT * s * k, 0, yf + FOOT * s * k);
      fg.addColorStop(0, dark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.35)'); fg.addColorStop(1, dark ? 'rgba(255,255,255,.14)' : 'rgba(90,80,70,.14)');
      ctx.fillStyle = fg; ctx.fill();
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.22)' : 'rgba(29,29,27,.18)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, yf + 0.018 * s, FOOT * s, FOOT * s * k, 0, 0.1, Math.PI - 0.1);
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.2; ctx.stroke();
      // stem with flares at both ends
      ctx.beginPath();
      ctx.moveTo(cx - 0.16 * s, yb - 0.1 * s);
      ctx.quadraticCurveTo(cx - sw, yb + 0.05 * s, cx - sw * 0.9, yb + 0.35 * s);
      ctx.lineTo(cx - sw * 0.9, yf - 0.3 * s);
      ctx.quadraticCurveTo(cx - sw, yf - 0.02 * s, cx - 0.2 * s, yf);
      ctx.lineTo(cx + 0.2 * s, yf);
      ctx.quadraticCurveTo(cx + sw, yf - 0.02 * s, cx + sw * 0.9, yf - 0.3 * s);
      ctx.lineTo(cx + sw * 0.9, yb + 0.35 * s);
      ctx.quadraticCurveTo(cx + sw, yb + 0.05 * s, cx + 0.16 * s, yb - 0.1 * s);
      ctx.closePath(); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.14)' : 'rgba(29,29,27,.14)'; ctx.lineWidth = 0.8; ctx.stroke();
    }

    _highlights(ctx, dark) {
      const s = this.s, cx = this.cx;
      const w = (a) => (dark ? `rgba(255,255,255,${a * 0.8})` : `rgba(255,255,255,${a})`);
      // outline of the glass
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.2)' : 'rgba(29,29,27,.16)'; ctx.lineWidth = 1; ctx.stroke(this.outer);
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(29,29,27,.07)'; ctx.stroke(this.inner);
      // window reflections that follow the curvature
      const streak = (th, t0, t1, width, alpha) => {
        ctx.beginPath();
        for (let i = 0; i <= 24; i++) { const t = t0 + (t1 - t0) * (i / 24); const [x, y] = this.ringXY(t, th, rin(t) + TH * 0.5); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.lineCap = 'round'; ctx.strokeStyle = w(alpha); ctx.lineWidth = width; ctx.stroke();
      };
      ctx.save(); ctx.clip(this.outer);
      streak(Math.PI * 0.86, 0.07, 0.74, 0.11 * s, 0.13);
      streak(Math.PI * 0.86, 0.1, 0.58, 0.028 * s, 0.75);
      streak(Math.PI * 0.8, 0.62, 0.8, 0.018 * s, 0.4);
      streak(Math.PI * 0.1, 0.16, 0.5, 0.03 * s, 0.35);
      streak(Math.PI * 0.14, 0.2, 0.38, 0.012 * s, 0.7);
      ctx.restore();
      // rim: thin lip, bright at the front
      const rr = RIM + TH * 0.5, [, ry] = this.ringXY(0, 0, rr);
      ctx.beginPath(); ctx.ellipse(cx, ry, rr * s, rr * s * this.k, 0, Math.PI, TAU);
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.35)' : 'rgba(29,29,27,.28)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, ry, rr * s, rr * s * this.k, 0, 0, Math.PI);
      ctx.strokeStyle = w(0.9); ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, ry + 1.2, rr * s, rr * s * this.k, 0, 0.15, Math.PI - 0.15);
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.12)' : 'rgba(29,29,27,.14)'; ctx.lineWidth = 0.8; ctx.stroke();
    }

    /* stream: {x0,y0,vx,vy,g,flow,from,to} in the same css px space as the glass */
    _stream(ctx) {
      const S = this.stream, s = this.s; if (!S || S.flow <= 0.001 || S.to <= S.from) { this.impact = null; return; }
      const yImp = this.surfaceY + 0.03 * s;
      const a = 0.5 * S.g, b = S.vy, c = S.y0 - yImp;
      const T = c < 0 ? (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a) : 0.001;
      const n = 30, L = [], R = [], sp0 = Math.max(Math.hypot(S.vx, S.vy), 0.5 * s);
      const w0 = s * (0.03 + 0.1 * S.flow);
      let cxEnd = 0, cyEnd = 0;
      for (let i = 0; i <= n; i++) {
        const u = S.from + (S.to - S.from) * (i / n), tau = T * u;
        const vx = S.vx, vy = S.vy + S.g * tau, sp = Math.hypot(vx, vy);
        const dx = vx / sp, dy = vy / sp, nx = -dy, ny = dx;
        const wob = Math.sin(u * 11 - this.time * 12) * 0.018 * s * u * (0.4 + S.flow);
        const x = S.x0 + vx * tau + nx * wob, y = S.y0 + S.vy * tau + 0.5 * S.g * tau * tau + ny * wob;
        const w = Math.max(0.8, w0 * Math.sqrt(sp0 / sp)) * (i === 0 && S.from > 0 ? 0.5 : 1) * (i === n && S.to < 1 ? 0.6 : 1);
        L.push([x + nx * w / 2, y + ny * w / 2]); R.push([x - nx * w / 2, y - ny * w / 2]);
        if (i === n) { cxEnd = x; cyEnd = y; }
      }
      const p = new Path2D(); L.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); for (let i = R.length - 1; i >= 0; i--) p.lineTo(R[i][0], R[i][1]); p.closePath();
      const g = ctx.createLinearGradient(S.x0, S.y0, cxEnd, cyEnd);
      g.addColorStop(0, M.rgba(M.transmit(this.wine, 0.6))); g.addColorStop(1, M.rgba(M.transmit(this.wine, 0.34)));
      ctx.fillStyle = g; ctx.fill(p);
      // specular line along the stream and a darker edge: reads as a glossy cylinder of wine
      ctx.beginPath(); L.forEach((q, i) => { const r = R[i], x = q[0] * 0.72 + r[0] * 0.28, y = q[1] * 0.72 + r[1] * 0.28; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.strokeStyle = 'rgba(255,240,240,.5)'; ctx.lineWidth = Math.max(0.7, w0 * 0.1); ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); R.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.strokeStyle = M.rgba(this.col.core, 0.35); ctx.lineWidth = 0.8; ctx.stroke();
      this.impact = S.to > 0.98 ? [cxEnd, cyEnd] : null;
      if (this.impact) {
        ctx.save(); ctx.translate(cxEnd, cyEnd); ctx.scale(1, this.k * 1.5);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.22 * s);
        rg.addColorStop(0, M.rgba(this.col.foam, 0.5 * S.flow)); rg.addColorStop(1, M.rgba(this.col.foam, 0));
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 0.22 * s, 0, TAU); ctx.fill(); ctx.restore();
      }
      for (const d of this.drops) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fillStyle = M.rgba(this.col.rim, 0.85); ctx.fill(); }
    }
  }

  /* Standalone: fits a canvas, runs on the shared clock, reacts to pointer and scroll. */
  Glass.mount = (canvas, o = {}) => {
    const g = new Glass(o);
    g.canvas = canvas;
    const render = () => { const ctx = canvas.getContext('2d'); ctx.setTransform(M.DPR, 0, 0, M.DPR, 0, 0); ctx.clearRect(0, 0, g.w, g.h); g.draw(ctx); };
    g.render = render;
    M.fitCanvas(canvas, (w, h) => { g.w = w; g.h = h; g.fit(w, h, o.fit || {}); render(); });
    if (M.reduced) { g.idle = 0; g.A = 0; g.tearsOn = false; render(); return g; }

    let last = null, down = false, sx = 0, sy = 0;
    const center = () => { const r = canvas.getBoundingClientRect(); return [r.left + g.cx, r.top + g.surfaceY]; };
    canvas.addEventListener('pointerdown', e => { down = true; sx = e.clientX; sy = e.clientY; last = null; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); });
    const up = () => { down = false; g.dragX = 0; g.dragY = 0; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('pointerleave', () => { last = null; });
    canvas.addEventListener('pointermove', e => {
      if (o.interactive === false) return;
      const [cx, cy] = center(), now = performance.now();
      const ang = Math.atan2((e.clientY - cy) / 0.45, e.clientX - cx);
      if (last) {
        const dt = Math.max(0.008, (now - last.t) / 1000);
        let da = ang - last.a; if (da > Math.PI) da -= TAU; if (da < -Math.PI) da += TAU;
        const lin = Math.hypot(e.clientX - last.x, e.clientY - last.y) / dt / g.s;
        const w = da / dt;
        g.swirl((down ? 1.25 : 0.4) * (Math.abs(w) > 0.5 ? w : Math.sign(w || 1) * lin * 0.35), dt);
      }
      if (down) { const f = 0.12 * g.s; g.dragX = Math.max(-f, Math.min(f, (e.clientX - sx) * 0.25)); g.dragY = Math.max(-f * 0.4, Math.min(f * 0.4, (e.clientY - sy) * 0.1)); }
      last = { a: ang, t: now, x: e.clientX, y: e.clientY };
    });
    g.job = M.tick((dt) => {
      if (o.scroll !== false && Math.abs(M.scrollV) > 0.5) g.kick(M.scrollV * (o.scrollGain ?? 1));
      g.update(dt); render();
    }, canvas);
    g.destroy = () => g.job && g.job.stop();
    return g;
  };

  Glass.rin = rin; Glass.HB = HB; Glass.RIM = RIM;
  window.TesonGlass = Glass;
})();
