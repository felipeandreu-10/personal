/* Tesón · TesonBottle ("Botella viva")
   The HD bottle PNG made to feel like a turntable render, with layers masked to the bottle's
   own alpha (CSS mask-image = the same webp):
   - wine glowing through the glass where there is no label (shoulder and heel), like backlight
   - two specular streaks that slide against the pointer tilt, so the glass reads as a cylinder
   - a slow diagonal light sweep that also makes the foil on the label glint
   - edge rim light, halo behind, soft floor shadow, a red caustic and a floor reflection
   - pointer-driven perspective tilt with inertia, idle float, and a slow fake "turn" when idle
   Switching wines: the bottle sinks and blurs out, the stage colour shifts, the next rises.
   API: const b = TesonBottle.mount(el, { wine: 'malbec', tilt: 10, stageColor: true }); b.setWine('redblend') */
(function () {
  const M = window.TesonMotion;
  const LABEL = { malbec: [41.5, 81.5], redblend: [41.5, 82], prestige: [42, 82] };  // label band, % of bottle height

  function mount(el, o = {}) {
    let id = o.wine || el.dataset.wine || 'malbec';
    el.classList.add('bv');
    el.innerHTML = `
      <div class="bv__halo"></div>
      <div class="bv__floor"><i class="bv__shadow"></i><i class="bv__caustic"></i></div>
      <div class="bv__tilt"><div class="bv__float">
        <div class="bv__reflect" aria-hidden="true"><img alt=""></div>
        <div class="bv__bottle">
          <img class="bv__img" alt="">
          <i class="bv__fx bv__wine"></i><i class="bv__fx bv__rim"></i><i class="bv__fx bv__spec"></i><i class="bv__fx bv__sweep"></i>
        </div>
      </div></div>`;
    const bottle = el.querySelector('.bv__bottle'), img = el.querySelector('.bv__img'), refl = el.querySelector('.bv__reflect img');
    const tiltEl = el.querySelector('.bv__tilt'), floatEl = el.querySelector('.bv__float');

    function apply(wid) {
      const w = M.wines[wid], src = M.asset(w.bottle), band = LABEL[wid] || LABEL.malbec;
      img.src = src; refl.src = src; img.alt = `Botella de Tesón ${w.name} 2022`;
      el.style.setProperty('--mask', `url("${new URL(src, location.href).href}")`);   // absolute: a relative url in a custom property resolves against the stylesheet
      el.style.setProperty('--wine-rim', w.rim); el.style.setProperty('--wine-body', w.body);
      el.style.setProperty('--label-top', band[0] + '%'); el.style.setProperty('--label-bot', band[1] + '%');
      el.dataset.wine = wid;
      if (o.stageColor !== false) { el.style.setProperty('--stage', w.page); el.style.setProperty('--stage-ink', w.ink); el.classList.toggle('bv--dark', wid !== 'malbec'); }
    }
    apply(id);

    const api = { el, get wine() { return id; } };
    let busy = false;
    api.setWine = (next) => {
      if (next === id || busy) return;
      id = next;
      if (M.reduced) { apply(next); return; }
      busy = true; el.classList.add('is-leaving');
      const pre = new Image(); pre.src = M.asset(M.wines[next].bottle);
      setTimeout(() => {
        const go = () => { apply(next); el.classList.remove('is-leaving'); el.classList.add('is-entering'); void el.offsetWidth; el.classList.remove('is-entering'); setTimeout(() => (busy = false), 700); };
        pre.decode ? pre.decode().then(go, go) : go();
      }, 450);
    };

    if (M.reduced) return api;

    /* pointer tilt with inertia + idle float + idle turn */
    let tx = 0, ty = 0, rx = 0, ry = 0, over = false;
    const max = o.tilt ?? 10;
    const onMove = e => {
      const r = el.getBoundingClientRect();
      tx = M.clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      ty = M.clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      over = true;
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', () => { over = false; });
    // gyroscope on phones is left out on purpose: iOS asks for permission and it feels like a gimmick
    api.job = M.tick((dt, t) => {
      const idleTurn = over ? 0 : Math.sin(t * 0.45) * 0.55;
      const gx = over ? tx : idleTurn, gy = over ? ty : Math.sin(t * 0.3) * 0.15;
      const k = 1 - Math.exp(-dt * 5);
      ry += (gx * max - ry) * k; rx += (-gy * max * 0.4 - rx) * k;
      const fy = Math.sin(t * 1.3) * 6, fr = Math.sin(t * 0.9) * 0.5;
      tiltEl.style.transform = `rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
      floatEl.style.transform = `translate3d(0, ${fy.toFixed(2)}px, 0) rotate(${fr.toFixed(2)}deg)`;
      el.style.setProperty('--ry', (ry / max).toFixed(3));
      el.style.setProperty('--lift', ((fy + 6) / 12).toFixed(3));
    }, el);
    return api;
  }
  window.TesonBottle = { mount };
})();
