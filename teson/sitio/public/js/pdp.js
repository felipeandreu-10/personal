/* Tesón · wine page (PDP), modelled on Seed's Daily Synbiotic: media + sticky buy box,
   floating buy pill, tasting glass, lit-up timeline, tabs, the other wines.
   The content is prerendered by the build; this file only adds behaviour. */
(function () {
  const T = window.TESON, R = window.TESON_R, { $, $$, ARROW } = T, reduce = T.reduce, lite = T.lite;
  if (document.body.dataset.page !== 'vino') return;
  const w = T.byId(document.body.dataset.wine);
  const mid = { fatalmalbec: 'fatalMalbec', fatalsb: 'fatalSauvignon' }[w.id] || w.id;   // id in TesonMotion.wines
  const hasMotion = !!(window.TesonMotion && window.TesonBottle && window.TesonGlass);
  if (hasMotion) TesonMotion.lenis = T.lenis;
  let qty = 1, mode = 'mix';   // mix: bottles for a mixed box · box: closed boxes of this wine

  /* ---------- Media: live bottle on desktop, the photo with a slow float on phones ---------- */
  const shots = R.shots(w), mount = $('#media-mount');
  const shotHTML = s => s.k === 'bottle' ? (hasMotion && !lite ? '<div data-live style="position:absolute;inset:0"></div>' : R.mediaStatic(w))
    : s.k === 'finca' ? R.pic(s.src, { alt: 'Suelo pedregoso de la finca', sizes: '(max-width: 1024px) 100vw, 50vw', style: 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover' })
    : `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${R.pic(s.src, s.k === 'label' ? { alt: 'Etiqueta ' + w.full, sizes: '(max-width: 760px) 70vw, 520px', style: 'width:min(62%,520px);height:auto;transform:rotate(-4deg)', cls: 'pdp__shot' } : { alt: '', sizes: '(max-width: 760px) 60vw, 400px', style: 'height:80%;width:auto', cls: 'pdp__shot' })}</div>`;
  const showShot = (i, force) => {
    const tb = $$('#thumbs button'); if (!force && tb[i] && tb[i].classList.contains('on')) return;
    $$('#thumbs button').forEach((b, j) => b.classList.toggle('on', j === i));
    const next = document.createElement('div'); next.style.cssText = 'position:absolute;inset:0'; next.innerHTML = shotHTML(shots[i]);
    const prev = mount.firstElementChild; mount.appendChild(next);
    if (!reduce) gsap.fromTo(next, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .9, ease: 'expo.out', onComplete: () => prev && prev.remove() });
    else prev && prev.remove();
    const live = $('[data-live]', next); if (live) TesonBottle.mount(live, { wine: mid, tilt: 10, stageColor: false });
    float(next);
  };
  $('#thumbs').addEventListener('click', e => { const b = e.target.closest('[data-shot]'); if (b) showShot(+b.dataset.shot); });
  const float = scope => { const im = $('.pv img', scope); if (im && !reduce) gsap.to(im, { y: -10, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 }); };
  // The photo is the first paint (fast LCP); on desktop the live bottle replaces it once the page is idle.
  if (hasMotion && !lite) (window.requestIdleCallback || setTimeout)(() => showShot(0, true), { timeout: 1200 }); else float(mount);

  /* ---------- Buy box (markup prerendered) ---------- */
  const bottlesNow = () => mode === 'box' ? qty * T.box : qty;
  const setQty = n => {
    qty = Math.max(1, Math.min(mode === 'box' ? 50 : T.box, n)); $('#bb-qty').textContent = qty;
    const b = bottlesNow(), tot = w.price * b; $('#bb-price').textContent = T.ars(tot);
    $('#bb-unit').textContent = mode === 'box' ? `${qty} caja${qty > 1 ? 's' : ''} · ${b} botellas · ${T.ars(w.price)} c/u` : qty === 1 ? 'por botella' : `${qty} botellas · ${T.ars(w.price)} c/u`;
    $('#bb-cta').innerHTML = R.cta(mode, qty, tot); renderBar();
    $('[data-qty="1"]').disabled = qty >= (mode === 'box' ? 50 : T.box); $('[data-qty="-1"]').disabled = qty <= 1;
    if (!reduce) gsap.fromTo('#bb-price', { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .5, ease: 'expo.out' });
  };
  const drawBox = () => {
    const st = T.boxState(), inBox = st.bottles % T.box || (st.bottles ? T.box : 0);
    $('#bb-box').innerHTML = T.slotsHTML();
    $('#bb-boxtxt').innerHTML = !st.bottles ? `Vendemos por <b>caja de ${T.box}</b>. Combiná los vinos que quieras.` : st.missing ? `Tu caja: <b>${inBox} de ${T.box}</b>. Faltan ${st.missing}.` : `<b>Caja completa.</b> Podés enviarla o empezar otra.`;
  };
  document.addEventListener('teson:cart', drawBox); drawBox();
  document.addEventListener('click', e => { const q = e.target.closest('[data-qty]'); if (q) setQty(qty + +q.dataset.qty); });
  $('#bb-mode').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (!b) return; mode = b.dataset.mode; $$('#bb-mode button').forEach(x => x.setAttribute('aria-pressed', x === b)); T.segThumb($('#bb-mode')); $('#bb-promo').style.display = mode === 'box' ? 'none' : ''; qty = 1; setQty(1); });
  requestAnimationFrame(() => T.segThumb($('#bb-mode')));
  document.addEventListener('click', e => { const b = e.target.closest('[data-buy]'); if (b) T.addToCart(w.id, bottlesNow()); const o = e.target.closest('[data-add]'); if (o) T.addToCart(o.dataset.add, 1); });

  /* ---------- Floating buy pill (appears when the buy box leaves the screen) ---------- */
  function renderBar() {
    $('#buybar').style.setProperty('--c-bg', w.theme.bg);
    $('#buybar').innerHTML = `<span class="buybar__img"><img src="${R.thumb(w.img)}" alt=""></span><span class="buybar__txt"><b>${w.full}</b><span>${mode === 'box' ? qty + ' caja' + (qty > 1 ? 's' : '') + ' x' + T.box : qty + ' botella' + (qty > 1 ? 's' : '')} · ${T.ars(w.price * bottlesNow())}</span></span><button class="btn btn--accent btn--sm" data-buy><span class="lbl">${mode === 'box' ? 'Comprar' : innerWidth < 480 ? 'Sumar' : 'Sumar a la caja'}</span>${ARROW}</button>`;
  }
  renderBar();

  /* ---------- Tasting glass ---------- */
  let glass = null;
  if (hasMotion) {
    $('#glass').innerHTML = '<canvas aria-label="Copa de ' + w.full + ' que se mueve con el scroll" style="position:absolute;inset:0;width:100%;height:100%;touch-action:pan-y"></canvas>';
    glass = TesonGlass.mount($('#glass canvas'), { wine: mid, level: .12, idle: .05, fit: { x: .5, y: .5, h: .92 } });
  }

  /* ---------- Tabs ---------- */
  const tb = $$('#tabs [role="tab"]');
  const selTab = (i, focus) => { tb.forEach((x, j) => { x.setAttribute('aria-selected', j === i); x.tabIndex = j === i ? 0 : -1; }); $$('#panes > div').forEach((p, j) => p.classList.toggle('on', j === i)); if (focus) tb[i].focus(); };
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) selTab(+b.dataset.tab); });
  $('#tabs').addEventListener('keydown', e => { const i = tb.indexOf(document.activeElement), n = tb.length, k = { ArrowRight: (i + 1) % n, ArrowLeft: (i + n - 1) % n, Home: 0, End: n - 1 }[e.key]; if (i < 0 || k == null) return; e.preventDefault(); selTab(k, true); });

  /* ---------- Choreography ---------- */
  function play() {
    ScrollTrigger.create({ trigger: '#buybox', start: 'bottom top', endTrigger: 'main', end: 'bottom bottom', onToggle: s => $('#buybar').classList.toggle('show', s.isActive) });
    if (reduce) { $$('.crianza__step').forEach(s => s.classList.add('on')); T.reveals(); return; }
    gsap.from('#buybox > *', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: .06, delay: .1 });
    if (!lite) gsap.from('#media', { clipPath: 'inset(8% 8% 8% 8% round 32px)', duration: 1.4, ease: 'expo.out' });
    ScrollTrigger.create({ trigger: '#cata', start: 'top 75%', end: 'center 45%', scrub: true, onUpdate: s => { if (glass) { if (glass.setLevel) glass.setLevel(.12 + s.progress * .38); else glass.level = .12 + s.progress * .38; } } });
    ScrollTrigger.batch('#aromas .chip', { start: 'top 90%', onEnter: els => gsap.fromTo(els, { y: 30, opacity: 0, scale: .9 }, { y: 0, opacity: 1, scale: 1, duration: .8, ease: 'back.out(1.8)', stagger: .08 }) });
    $$('.crianza__step').forEach((s, i) => ScrollTrigger.create({ trigger: '#crianza', start: `top ${75 - i * 10}%`, onEnter: () => s.classList.add('on'), onLeaveBack: () => s.classList.remove('on') }));
    T.reveals();
  }
  T.ready(play);
})();
