/* Tesón · TesonLiquid v2 (evolution of teson-web/js/liquid.js, same API plus more)
   A wine surface as a chain of springs (1D damped wave equation) inside any Path2D clip.
   What changed from v1:
   - fixed 60 Hz sub-steps, so it behaves the same at 30, 60 or 120 fps and never explodes
   - wine optics: the colour under the surface goes from a thin violet-ruby wedge to an almost
     black core (Beer-Lambert from TesonMotion.wines), with a meniscus highlight and a sheen
   - a second, lighter wave layer behind the front one for depth
   - setWine()/setColors() crossfade instead of snapping; level eases with a spring
   - runs on the shared TesonMotion clock and pauses offscreen; static under reduced motion
   API (v1 compatible): new TesonLiquid(canvas, { level, wine | deep/body/rim, clip, points })
        .impulse(v, x?) · .level / .target · TesonLiquid.register(l) · TesonLiquid.kick(v) · TesonLiquid.bowl(w,h)
   New:  TesonLiquid.mount(canvas, opts) = new + register + react to scroll velocity */
(function () {
  const M = window.TesonMotion;
  const DPR = M ? M.DPR : Math.min(window.devicePixelRatio || 1, 2);
  const hex = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  class Liquid {
    constructor(canvas, opts = {}) {
      this.c = canvas; this.ctx = canvas.getContext('2d');
      this.n = opts.points || 64;
      this.h = new Float32Array(this.n); this.v = new Float32Array(this.n);
      this.h2 = new Float32Array(this.n); this.v2 = new Float32Array(this.n);
      this.level = opts.level ?? 0.5; this.target = this.level; this.lv = 0;
      this.tilt = 0;
      this.tension = opts.tension ?? 0.022; this.damping = opts.damping ?? 0.03; this.spread = opts.spread ?? 0.24;
      this.idle = opts.idle ?? 1;                         // idle ripple amplitude in px
      this.clip = opts.clip || null;
      this.glint = opts.glint ?? true;
      this.back = opts.back ?? true;
      this.t = 0; this.acc = 0;
      this.col = this._colors(opts); this.colTo = null; this.colT = 1;
      this.resize();
      if ('ResizeObserver' in window) { this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(canvas); }
    }
    _colors(o) {
      if (o.wine && M) {
        const w = typeof o.wine === 'string' ? M.wines[o.wine] : o.wine;
        return { rim: M.transmit(w, 0.12), body: M.transmit(w, 0.55), deep: M.transmit(w, 2.2) };
      }
      return { rim: hex(o.rimHex || '#b0405e'), body: hex(o.body || '#5b1022'), deep: hex(o.deep || '#2a0610') };
    }
    setWine(w) { this.colFrom = this._cur(); this.colTo = this._colors({ wine: w }); this.colT = 0; }
    setColors(o) { this.colFrom = this._cur(); this.colTo = this._colors(o); this.colT = 0; }
    _cur() {
      if (!this.colTo) return this.col;
      const t = this.colT, a = this.colFrom, b = this.colTo;
      return { rim: mix(a.rim, b.rim, t), body: mix(a.body, b.body, t), deep: mix(a.deep, b.deep, t) };
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      this.w = Math.max(1, r.width); this.hgt = Math.max(1, r.height);
      this.c.width = Math.round(this.w * DPR); this.c.height = Math.round(this.hgt * DPR);
      this.path = this.clip ? this.clip(this.w, this.hgt) : null;
    }
    /* push energy: v ~ px/frame; x in 0..1 where it hits (default: a travelling pattern across) */
    impulse(v, x) {
      const k = Math.max(-40, Math.min(40, v));
      if (x == null) { for (let i = 0; i < this.n; i++) this.v[i] += k * 0.05 * Math.sin((i / (this.n - 1)) * Math.PI * 2 + this.t * 3); }
      else { const i = Math.round(x * (this.n - 1)); for (let d = -4; d <= 4; d++) { const j = i + d; if (j >= 0 && j < this.n) this.v[j] += k * (1 - Math.abs(d) / 5); } }
    }
    _sub(h, v, ten, dam, spr) {
      const n = this.n;
      for (let i = 0; i < n; i++) { v[i] += -ten * h[i] - dam * v[i]; h[i] += v[i]; }
      for (let pass = 0; pass < 2; pass++) for (let i = 0; i < n; i++) {
        if (i > 0) v[i - 1] += spr * (h[i] - h[i - 1]);
        if (i < n - 1) v[i + 1] += spr * (h[i] - h[i + 1]);
      }
    }
    step(dt = 1 / 60) {
      this.acc += Math.min(dt, 0.1);
      while (this.acc >= 1 / 60) {
        this.acc -= 1 / 60; this.t += 1 / 60;
        // level as a critically-damped spring, and the surface reacts to its acceleration
        const a = (this.target - this.level) * 0.012 - this.lv * 0.2;
        this.lv += a; this.level += this.lv;
        this._sub(this.h, this.v, this.tension, this.damping, this.spread);
        // the back layer follows the front with lag: depth without extra cost
        for (let i = 0; i < this.n; i++) this.v2[i] += (this.h[i] - this.h2[i]) * 0.02;
        this._sub(this.h2, this.v2, this.tension * 0.8, this.damping, this.spread);
        if (this.colTo) { this.colT = Math.min(1, this.colT + 1 / 45); if (this.colT >= 1) { this.col = this.colTo; this.colTo = null; } }
      }
    }
    _pts(h, phase, amp) {
      const w = this.w, H = this.hgt, base = H * (1 - this.level), pts = [];
      for (let i = 0; i < this.n; i++) {
        const x = (i / (this.n - 1)) * w;
        const idle = (Math.sin(this.t * 1.3 + i * 0.35 + phase) * 1.1 + Math.sin(this.t * 0.7 + i * 0.12 + phase) * 1.5) * this.idle * amp;
        pts.push([x, base + h[i] + idle + (x - w / 2) * Math.tan(this.tilt)]);
      }
      return pts;
    }
    _curve(ctx, pts) {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2); }
      ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    }
    draw() {
      const ctx = this.ctx, w = this.w, H = this.hgt, C = this._cur();
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, w, H);
      if (this.level <= 0.0005) return;
      ctx.save();
      if (this.path) ctx.clip(this.path);
      const base = H * (1 - this.level);
      if (this.back) {
        const p2 = this._pts(this.h2, 2.1, 1.6).map(([x, y]) => [x, y - 6]);
        ctx.beginPath(); this._curve(ctx, p2); ctx.lineTo(w, H); ctx.lineTo(0, H); ctx.closePath();
        ctx.fillStyle = css(mix(C.rim, [255, 240, 235], 0.15), 0.55); ctx.fill();
      }
      const pts = this._pts(this.h, 0, 1);
      // body: thin wedge under the surface is ruby, the depth goes to near black
      const depth = Math.max(40, H - base);
      const g = ctx.createLinearGradient(0, base - 12, 0, base + depth);
      g.addColorStop(0, css(C.rim)); g.addColorStop(Math.min(0.5, 28 / depth), css(C.body)); g.addColorStop(1, css(C.deep));
      ctx.beginPath(); this._curve(ctx, pts); ctx.lineTo(w, H + 2); ctx.lineTo(0, H + 2); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
      // meniscus light
      ctx.beginPath(); this._curve(ctx, pts);
      ctx.strokeStyle = css(mix(C.rim, [255, 235, 240], 0.45), 0.8); ctx.lineWidth = 1.4; ctx.stroke();
      if (this.glint) {
        const gx = w * (0.3 + 0.12 * Math.sin(this.t * 0.5));
        ctx.save(); ctx.translate(gx, base + 16); ctx.scale(1, 0.18);
        const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.35);
        rg.addColorStop(0, 'rgba(255,240,240,.18)'); rg.addColorStop(1, 'rgba(255,240,240,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, w * 0.35, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      ctx.restore();
    }
    frame(dt) { this.step(dt); this.draw(); }
  }

  /* One clock for every liquid; pauses offscreen. */
  const all = new Set();
  Liquid.register = (l) => {
    all.add(l);
    if (M) { l.job = M.tick(dt => l.frame(dt), l.c); if (M.reduced) { l.idle = 0; l.draw(); } }
    else {
      const io = new IntersectionObserver(es => es.forEach(e => { l.visible = e.isIntersecting; }), { rootMargin: '200px' }); io.observe(l.c);
      const loop = () => { if (l.visible !== false) l.frame(1 / 60); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
    }
    return l;
  };
  Liquid.kick = (v) => all.forEach(l => { if (!l.job || l.job.visible) l.impulse(v); });
  Liquid.mount = (canvas, opts = {}) => {
    const l = Liquid.register(new Liquid(canvas, opts));
    if (M && !M.reduced && opts.scroll !== false) M.tick(() => { if (Math.abs(M.scrollV) > 0.8) l.impulse(M.scrollV * (opts.scrollGain ?? 0.25)); }, canvas);
    return l;
  };
  /* A wine glass bowl as a Path2D, in a w x h box (bowl only). Kept from v1. */
  Liquid.bowl = (w, h) => {
    const p = new Path2D();
    p.moveTo(w * 0.06, 0);
    p.bezierCurveTo(w * 0.0, h * 0.45, w * 0.08, h * 0.92, w * 0.5, h);
    p.bezierCurveTo(w * 0.92, h * 0.92, w * 1.0, h * 0.45, w * 0.94, 0);
    p.closePath(); return p;
  };
  window.TesonLiquid = Liquid;
})();
