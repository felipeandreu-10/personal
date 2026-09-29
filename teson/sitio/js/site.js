/* Tesón · site chrome shared by every page: smooth scroll, glass nav, mega menu, side menu
   (opens with a sideways swipe or trackpad gesture), cart drawer with the three ways to pay,
   age gate, reveals, toasts. Needs gsap + ScrollTrigger + Lenis + data.js. */
(function () {
  const T = window.TESON, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lite = document.documentElement.classList.contains('lite');   // phones/tablets: set in <head> before paint
  const R = window.TESON_R;
  const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
  const ARROW = '<span class="arr"><svg width="16" height="10" viewBox="0 0 16 10" fill="none"><path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" stroke-width="1.4"/></svg></span>';
  const X = '<svg width="14" height="14" viewBox="0 0 14 14"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5"/></svg>';
  const WA = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.6 14.1c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3.1s.8-2.2 1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.1.1.3 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.1.1.7-.1 1.4Z"/></svg>';
  const href = p => p;   // every asset path is absolute
  T.ARROW = ARROW; T.lite = lite;

  /* ---------- Chrome markup ---------- */
  const wineLink = T.url;
  document.body.insertAdjacentHTML('afterbegin', `
  <div class="gate" id="gate" role="dialog" aria-modal="true" aria-labelledby="gate-t">
    <div><span class="logo-mask" role="img" aria-label="Tesón"></span>
      <h2 id="gate-t">¿Sos mayor de 18 años?</h2><p>Para entrar necesitamos confirmar tu edad.</p>
      <div class="gate__btns"><button class="btn btn--light" data-gate="yes"><span class="lbl">Sí, entrar</span>${ARROW}</button><button class="btn btn--ghost" data-gate="no"><span class="lbl">Soy menor</span></button></div>
      <small>Beber con moderación. Prohibida su venta a menores de 18 años.</small></div>
  </div>
  <header class="nav" id="nav">
    <div class="island" data-island>
      <span class="island__pill"></span>
      <a class="island__logo" href="/" aria-label="Tesón, inicio"><span class="logo-mask"></span></a>
      <button class="nl nl--hide-m" data-mega aria-expanded="false" aria-controls="mega">Vinos</button>
      <a class="nl nl--hide-m" href="/#historia">Historia</a>
      <a class="nl nl--hide-m" href="/#finca">Finca</a>
      <div class="mega" id="mega">${T.wines.map(w => `<a href="${wineLink(w)}" style="--c-bg:${w.theme.bg};--c-ink:${w.theme.ink}"><img src="${R.thumb(w.img)}" alt="" loading="lazy"><span><b>${w.full}</b><small>${w.brand ? w.brand + " · " : ""}${T.ars(w.price)}</small></span></a>`).join('')}</div>
    </div>
    <div class="island" data-island>
      <span class="island__pill"></span>
      <a class="nl nl--hide-m" href="${T.wa('Hola Tesón, quería hacer una consulta.')}" target="_blank" rel="noopener">${WA} WhatsApp</a>
      <button class="nl nl--box" data-cart-open aria-label="Abrir tu caja"><span class="nbx" aria-hidden="true">${'<i></i>'.repeat(6)}</span><span class="navbox__n" id="navbox-n">0/6</span><span class="cart-count" id="cart-count">0</span></button>
      <button class="nl nl--menu" data-menu-open aria-label="Abrir menú"><span class="burger"></span></button>
    </div>
  </header>
  <div class="edge-hint" id="edge-hint"></div>
  <div class="scrim" id="scrim"></div>
  <aside class="drawer drawer--left" id="menu" role="dialog" aria-modal="true" aria-label="Menú" aria-hidden="true" data-lenis-prevent>
    <div class="drawer__head"><span class="logo-mask"></span><button class="drawer__close" data-close aria-label="Cerrar">${X}</button></div>
    <div class="drawer__body"><ul class="menu-list">
      <li><a href="/#historia">Historia</a></li>
      <li><a href="/#finca">La finca</a></li>
      <li><a href="/#personalizados">Vinos personalizados</a></li>
      <li><a href="/#tienda">Tienda</a></li>
    </ul></div>
    <div class="menu-foot"><a href="${T.wa('Hola Tesón!')}" target="_blank" rel="noopener">WhatsApp ${T.contact.phoneLabel}</a><a href="https://instagram.com/${T.contact.instagram}" target="_blank" rel="noopener">Instagram @${T.contact.instagram}</a><span>${T.contact.place}</span></div>
  </aside>
  <aside class="drawer drawer--right" id="cart" role="dialog" aria-modal="true" aria-label="Tu caja" aria-hidden="true" data-lenis-prevent>
    <div class="drawer__head"><span class="h-m">Tu caja</span><button class="drawer__close" data-close aria-label="Cerrar">${X}</button></div>
    <div class="drawer__body" id="cart-body"></div>
    <div class="drawer__foot" id="cart-foot"></div>
  </aside>
  <div class="toast" id="toast" role="status"></div>`);

  if (!$('.foot')) $('main').insertAdjacentHTML('afterend', R.footer());

  /* ---------- Smooth scroll ---------- */
  if (!window.gsap || !window.ScrollTrigger) { document.documentElement.classList.remove('tw-incoming'); return; }   // libraries missing: leave the prerendered page readable
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });   // the mobile URL bar showing/hiding must not re-measure every trigger
  let lenis = null;
  if (!reduce && !lite && window.Lenis) {   // phones keep native momentum scrolling
    lenis = new Lenis({ lerp: 0.12, smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    lenis.on('scroll', e => { if (window.TesonLiquid) TesonLiquid.kick(e.velocity * 0.9); document.dispatchEvent(new CustomEvent('teson:velocity', { detail: e.velocity })); });
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  T.lenis = lenis;
  T.scrollTo = (y, instant) => { if (lenis) lenis.scrollTo(y, instant ? { immediate: true, force: true } : { duration: 1.4 }); else window.scrollTo({ top: y, behavior: instant || reduce ? 'auto' : 'smooth' }); };
  // Links to a section of the page we are on scroll there; links to another page get the wine wave
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname) {
      const el = u.hash.length > 1 && document.getElementById(u.hash.slice(1)); if (!el) return;
      e.preventDefault(); closeAll(); T.scrollTo(el.getBoundingClientRect().top + scrollY); history.replaceState(null, '', u.hash); return;
    }
    const m = u.pathname.match(/^\/vinos\/([a-z-]+)\/?$/), w = m && T.wines.find(x => x.slug === m[1]);
    const color = w ? (w.id === 'fatalsb' ? '#8E82AC' : w.theme.wine) : '#2E3B4A';
    e.preventDefault(); closeAll();
    T.wave.flood(color).then(() => { try { sessionStorage.setItem('teson-wave2', JSON.stringify({ color })); } catch (err) {} location.href = u.href; });
  });
  // Prefetch the next page as soon as the finger or pointer is on its link
  const pre = new Set();
  const prefetch = e => { const a = e.target.closest && e.target.closest('a[href^="/"]'); if (!a) return; const p = new URL(a.href).pathname; if (p === location.pathname || pre.has(p)) return; pre.add(p); const l = document.createElement('link'); l.rel = 'prefetch'; l.href = p; document.head.append(l); };
  document.addEventListener('pointerover', prefetch, { passive: true }); document.addEventListener('touchstart', prefetch, { passive: true });
  const lock = on => { if (lenis) on ? lenis.stop() : lenis.start(); else document.documentElement.style.overflow = on ? 'hidden' : ''; };

  /* ---------- Age gate ---------- */
  const gate = $('#gate');
  if (store.get('teson-age', false)) gate.remove(); else {
    lock(true);
    const behindGate = $$('#nav, main, .foot'); behindGate.forEach(n => n.inert = true);
    requestAnimationFrame(() => gate.querySelector('[data-gate="yes"]').focus());
    gate.addEventListener('click', e => {
      const b = e.target.closest('[data-gate]'); if (!b) return;
      if (b.dataset.gate === 'yes') { store.set('teson-age', true); gate.classList.add('out'); lock(false); behindGate.forEach(n => n.inert = false); setTimeout(() => gate.remove(), 1000); document.dispatchEvent(new Event('teson:enter')); }
      else { gate.querySelector('p').textContent = 'Lo sentimos, este sitio es solo para mayores de 18 años.'; }
    });
  }
  T.entered = () => !document.getElementById('gate');

  /* ---------- Nav: glass on scroll, dark sections, sliding pill ---------- */
  const nav = $('#nav');
  ScrollTrigger.create({ start: 60, end: 'max', onToggle: s => nav.classList.toggle('is-scrolled', s.isActive) });
  // Each pill looks at what is actually painted behind its centre (the sticky footer, pinned
  // sections and cards stacked on top of each other made rectangle tests lie) and picks
  // milky glass with dark letters over light content, smoky glass with light letters over dark.
  const islands = $$('#nav .island');
  const behind = (x, y) => document.elementsFromPoint(x, y).find(e => !e.closest('#nav, .wave, .scrim, .edge-hint, .toast, .gate, .drawer'));
  let centres = [];
  const measureNav = () => { centres = islands.map(isl => { const r = isl.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); };
  const setDark = () => {
    let anyDark = false;
    islands.forEach((isl, i) => {
      const el = behind(centres[i][0], centres[i][1]);
      const zone = el && el.closest('[data-nav]'), dark = !!zone && zone.dataset.nav === 'dark';
      isl.classList.toggle('ink-dark', !dark); anyDark = anyDark || dark;
    });
    nav.classList.toggle('on-dark', anyDark);
  };
  // The islands never move, so their centres are measured once; the hit-test runs at most once per frame, only while scrolling
  measureNav(); ScrollTrigger.addEventListener('refresh', () => { measureNav(); setDark(); });
  let lastY = -1; gsap.ticker.add(() => { if (scrollY !== lastY) { lastY = scrollY; setDark(); } }); setDark();
  const mouse = fn => e => { if (e.pointerType === 'mouse') fn(e); };   // hover behaviour only for a real mouse, never for a tap
  $$('[data-island]').forEach(isl => {
    const pill = $('.island__pill', isl);
    $$('.nl', isl).forEach(l => l.addEventListener('pointerenter', mouse(() => { pill.style.width = l.offsetWidth + 'px'; pill.style.transform = `translateX(${l.offsetLeft}px)`; pill.style.opacity = 1; })));
    isl.addEventListener('pointerleave', mouse(() => { pill.style.opacity = 0; }));
  });
  // Mega menu on hover (desktop), click fallback
  const mega = $('#mega'), megaBtn = $('[data-mega]'); let megaT;
  // Cards stagger in only when the panel actually opens, so moving the mouse around never restarts them
  const megaOpen = on => { clearTimeout(megaT); const was = mega.classList.contains('open'); mega.classList.toggle('open', on); megaBtn.setAttribute('aria-expanded', on);
    if (on && !was && !reduce) gsap.fromTo($$('a', mega), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .04, ease: 'expo.out', overwrite: true }); };
  megaBtn.addEventListener('pointerenter', mouse(() => megaOpen(true)));
  megaBtn.addEventListener('click', e => megaOpen(e.pointerType === 'mouse' ? true : !mega.classList.contains('open')));
  megaBtn.parentElement.addEventListener('pointerleave', mouse(() => { megaT = setTimeout(() => megaOpen(false), 180); }));
  mega.addEventListener('pointerenter', () => clearTimeout(megaT));

  /* ---------- Drawers ---------- */
  const scrim = $('#scrim'), menu = $('#menu'), cart = $('#cart');
  // Drawers are modal: the page behind goes inert while one is open, and focus returns to where it was
  let openEl = null, lastFocus = null, inertT;
  const bgEls = () => $$('#nav, main, .foot, .buybar');
  const show = n => { clearTimeout(n._hideT); n.style.display = n === scrim ? 'block' : 'flex'; void n.offsetWidth; };
  const hideLater = n => { clearTimeout(n._hideT); n._hideT = setTimeout(() => { if (!n.classList.contains('open')) n.style.display = ''; }, 360); };
  function open(el) {
    if (openEl === el) return;
    if (openEl) { openEl.classList.remove('open'); openEl.setAttribute('aria-hidden', 'true'); hideLater(openEl); } else lastFocus = document.activeElement;
    show(el); show(scrim);
    openEl = el; el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); scrim.classList.add('open'); lock(true); megaOpen(false);
    clearTimeout(inertT); inertT = setTimeout(() => bgEls().forEach(n => n.inert = true), 520);
    if (el === menu && !reduce) gsap.fromTo($$('.menu-list a', menu), { yPercent: 110 }, { yPercent: 0, duration: .6, stagger: .04, ease: 'expo.out', delay: .06 });
    setTimeout(() => $('.drawer__close', el).focus({ preventScroll: true }), 50);
  }
  function closeAll() {
    if (!openEl) return; openEl.classList.remove('open'); openEl.setAttribute('aria-hidden', 'true'); hideLater(openEl); openEl = null; scrim.classList.remove('open'); hideLater(scrim); lock(false);
    clearTimeout(inertT); bgEls().forEach(n => { if (n.inert) n.inert = false; }); if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true }); lastFocus = null;
  }
  T.openCart = () => open(cart);
  scrim.addEventListener('click', closeAll);
  $$('[data-close]').forEach(b => b.addEventListener('click', closeAll));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeAll(); megaOpen(false); } });
  $('[data-menu-open]').addEventListener('click', () => open(menu));
  $('[data-cart-open]').addEventListener('click', () => open(cart));

  /* Sideways gesture opens the menu: trackpad horizontal swipe, touch swipe from the left edge,
     and a hint when the pointer rests on the left edge (click it to open). */
  let acc = 0, accT;
  window.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.5 || e.target.closest('[data-hscroll]')) return;
    acc += e.deltaX; clearTimeout(accT); accT = setTimeout(() => acc = 0, 220);
    if (!openEl && acc < -90) { acc = 0; open(menu); }
    else if (openEl === menu && acc > 90) { acc = 0; closeAll(); }
    else if (!openEl && acc > 90) { acc = 0; open(cart); }
    else if (openEl === cart && acc < -90) { acc = 0; closeAll(); }
  }, { passive: true });
  let tx = null, ty = null;
  window.addEventListener('touchstart', e => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; }, { passive: true });
  window.addEventListener('touchend', e => {
    if (tx == null) return; const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      if (!openEl && dx > 0 && tx < 40) open(menu);
      else if (openEl === menu && dx < 0) closeAll();
      else if (openEl === cart && dx > 0) closeAll();
    } tx = null;
  }, { passive: true });
  const hint = $('#edge-hint');
  window.addEventListener('mousemove', e => { hint.classList.toggle('show', !openEl && e.clientX < 14 && e.clientY > 90); }, { passive: true });
  window.addEventListener('mousedown', e => { if (!openEl && e.clientX < 14 && e.clientY > 90) open(menu); });

  /* ---------- Cart: we only ship full boxes of 6, mixed however the customer likes ---------- */
  const BOX = T.box;
  // [{ id, q }] bottles per wine. A saved box is checked on load: unknown wines (renamed or removed) are dropped, never swapped for another.
  const MAXB = 50 * BOX, saved = store.get('teson-box', []);
  let items = (Array.isArray(saved) ? saved : []).filter(it => it && T.wines.some(w => w.id === it.id) && Number.isInteger(it.q) && it.q > 0).map(it => ({ id: it.id, q: Math.min(it.q, MAXB) }));
  let payMode = 'wa';
  const save = () => store.set('teson-box', items);
  const bottles = () => items.reduce((s, it) => s + it.q, 0);
  const total = () => items.reduce((s, it) => s + T.byId(it.id).price * it.q, 0);
  const boxes = () => Math.max(1, Math.ceil(bottles() / BOX));
  const missing = () => bottles() ? boxes() * BOX - bottles() : BOX;
  T.boxState = () => ({ bottles: bottles(), boxes: boxes(), missing: missing(), items });
  function orderText() {
    const b = bottles(), n = b / BOX;
    return `Hola Tesón! Armé ${n === 1 ? 'una caja' : n + ' cajas'} de ${BOX}:\n` + items.map(it => { const w = T.byId(it.id); return `• ${it.q} x ${w.full}${w.vintage ? ' ' + w.vintage : ''} = ${T.ars(w.price * it.q)}`; }).join('\n') +
      `\nTotal: ${T.ars(total())} (${b} botellas)\n` + (payMode === 'bank' ? 'Pago por transferencia, les envío el comprobante.' : payMode === 'mp' ? '¿Me pasan el link de Mercado Pago?' : '¿Cómo seguimos con el envío?');
  }
  const slotsHTML = () => {
    const flat = []; items.forEach(it => { for (let k = 0; k < it.q; k++) flat.push(T.byId(it.id)); });
    let html = '';
    for (let b = 0; b < boxes(); b++) {
      html += '<div class="box"><div class="box__slots">';
      for (let s = 0; s < BOX; s++) { const w = flat[b * BOX + s]; html += w ? `<span class="box__slot is-full" style="--c-bg:${w.theme.bg}"><img src="${R.thumb(w.img)}" alt="${w.full}"></span>` : '<span class="box__slot"></span>'; }
      html += '</div></div>';
    }
    return html;
  };
  T.slotsHTML = slotsHTML;
  function renderCart() {
    const body = $('#cart-body'), foot = $('#cart-foot'), c = $('#cart-count'), b = bottles(), miss = missing();
    c.textContent = b; c.classList.toggle('has', b > 0); paintNavBox();
    document.dispatchEvent(new Event('teson:cart'));
    const quick = `<div class="quick"><p class="caps">Sumá a tu caja</p><div class="quick__row">${T.wines.map(w => `<button class="quick__w" data-plus="${w.id}" style="--c-bg:${w.theme.bg};--c-ink:${w.theme.ink}" aria-label="Sumar ${w.full}"><img src="${R.thumb(w.img)}" alt="" loading="lazy"><span>${w.full}</span><i>+</i></button>`).join('')}</div></div>`;
    const status = !b ? `Elegí ${BOX} botellas, combinadas como quieras.` : miss ? `Te ${miss === 1 ? 'falta 1 botella' : `faltan ${miss} botellas`} para completar ${boxes() > 1 ? 'la caja ' + boxes() : 'la caja'}.` : `${boxes() === 1 ? 'Caja completa' : boxes() + ' cajas completas'}. Lista para enviar.`;
    body.innerHTML = `<div class="boxwrap"><div class="boxwrap__head"><span class="caps">Tu caja de ${BOX}</span><b>${b ? (b % BOX || BOX) : 0}/${BOX}</b></div>${slotsHTML()}<p class="boxwrap__msg ${miss ? '' : 'ok'}">${status}</p></div>` +
      items.map((it, i) => { const w = T.byId(it.id); return `<div class="line" style="--c-bg:${w.theme.bg}"><div class="line__img"><img src="${R.thumb(w.img)}" alt=""></div>
      <div><h4>${w.full}</h4><p>${w.vintage ? w.vintage + ' · ' : ''}${T.ars(w.price)} c/u</p><div class="qty"><button data-q="${i}" data-d="-1" aria-label="Restar una botella de ${w.full}">−</button><span>${it.q}</span><button data-q="${i}" data-d="1" aria-label="Sumar una botella de ${w.full}">+</button></div></div>
      <div class="line__price">${T.ars(w.price * it.q)}<button class="line__rm" data-rm="${i}" aria-label="Quitar ${w.full}">Quitar</button></div></div>`; }).join('') + quick;
    if (!b) { foot.innerHTML = ''; return; }
    const note = { wa: 'Te armamos el pedido en un mensaje de WhatsApp y coordinamos el envío.', bank: 'Transferí el total y mandanos el comprobante por WhatsApp. Despachamos al acreditarse.', mp: 'Te mandamos por WhatsApp un link de Mercado Pago con el total exacto de tu caja.' }[payMode];
    foot.innerHTML = `<div class="tot"><span class="caps">Total · ${b} botella${b > 1 ? 's' : ''}</span><b>${T.ars(total())}</b></div>
      <div class="seg pay-tabs on-seg" style="--c-ink:var(--noche);--c-bg:var(--crema);width:100%"><span class="seg__thumb"></span>
        <button aria-pressed="${payMode === 'wa'}" data-pay="wa" style="flex:1">WhatsApp</button><button aria-pressed="${payMode === 'bank'}" data-pay="bank" style="flex:1">Transferencia</button><button aria-pressed="${payMode === 'mp'}" data-pay="mp" style="flex:1"><span class="l-long">Mercado Pago</span><span class="l-short">M. Pago</span></button></div>
      <p class="pay-note">${note}</p>
      ${payMode === 'bank' ? `<div class="pay-bank">${T.pay.bank.holder ? `<span>Titular: ${T.pay.bank.holder}</span>` : ""}<span>Alias: ${T.pay.bank.alias}</span>${T.pay.bank.cbu ? `<span>CBU: ${T.pay.bank.cbu}</span>` : ""}<button data-copy="${T.pay.bank.alias}">Copiar alias</button></div>` : ''}
      ${miss ? `<button class="btn btn--block" disabled style="opacity:.5"><span class="lbl">Faltan ${miss} para completar</span></button>`
        : `<a class="btn btn--accent btn--block" data-go href="${T.wa(orderText())}" target="_blank" rel="noopener"><span class="lbl">${payMode === 'bank' ? 'Enviar pedido y comprobante' : payMode === 'mp' ? 'Pedir link de Mercado Pago' : 'Enviar pedido por WhatsApp'}</span>${ARROW}</a>`}`;
    segThumb($('.seg', foot));
  }
  function add(id, q) { const it = items.find(x => x.id === id); if (it) it.q = Math.min(MAXB, it.q + q); else items.push({ id, q: Math.min(MAXB, q) }); }
  document.addEventListener('click', e => {
    const q = e.target.closest('[data-q]'), rm = e.target.closest('[data-rm]'), pay = e.target.closest('[data-pay]'), cp = e.target.closest('[data-copy]'), go = e.target.closest('[data-go]'), plus = e.target.closest('[data-plus]');
    if (q) { const it = items[+q.dataset.q]; it.q = Math.min(MAXB, Math.max(0, it.q + +q.dataset.d)); if (!it.q) items.splice(+q.dataset.q, 1); save(); renderCart(); }
    if (rm) { items.splice(+rm.dataset.rm, 1); save(); renderCart(); }
    if (plus) { add(plus.dataset.plus, 1); save(); renderCart(); if (!reduce) { const s = $$('#cart-body .box__slot.is-full img'); s.length && gsap.from(s[s.length - 1], { yPercent: -120, rotate: -20, duration: .7, ease: 'back.out(1.6)' }); } }
    if (pay) { payMode = pay.dataset.pay; renderCart(); }
    if (cp) { try { navigator.clipboard.writeText(cp.dataset.copy).then(() => toast('Alias copiado'), () => toast('Alias: ' + cp.dataset.copy)); } catch (err) { toast('Alias: ' + cp.dataset.copy); } }
    if (go) { go.classList.add('is-loading'); setTimeout(() => go.classList.remove('is-loading'), 1600); }
  });
  T.addToCart = (id, q = 1, openIt = false) => {
    const from = lastFrom; lastFrom = null;
    add(id, q); save();
    flyToBox(from, id).then(() => { renderCart(); const nb = $('[data-cart-open]'); nb.classList.remove('is-bump'); void nb.offsetWidth; nb.classList.add('is-bump'); }); const c = $('#cart-count'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
    const m = missing(); toast(m ? `${T.byId(id).full} en tu caja · faltan ${m}` : 'Caja completa, lista para enviar');
    if (openIt) setTimeout(() => open(cart), 900);
  };
  renderCart();

  /* ---------- Segmented pill control ---------- */
  function segThumb(seg) {
    if (!seg) return; const on = $('[aria-pressed="true"]', seg), th = $('.seg__thumb', seg); if (!on || !th) return;
    th.style.width = on.offsetWidth + 'px'; th.style.transform = `translateX(${on.offsetLeft}px)`;
  }
  T.segThumb = segThumb;
  window.addEventListener('resize', () => $$('.seg').forEach(segThumb));

  /* ---------- Toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; clearTimeout(toastT); clearTimeout(t._hideT);
    t.style.display = 'flex'; void t.offsetWidth; t.classList.add('show');
    toastT = setTimeout(() => { t.classList.remove('show'); t._hideT = setTimeout(() => { t.style.display = ''; }, 700); }, 2200);
  }
  T.toast = toast;

  /* ---------- Reveals ---------- */
  T.reveals = () => {
    if (reduce) return;
    if (lite) {
      // Phones: IntersectionObserver, which stays right when images or fonts shift the layout.
      // Nothing is hidden until it is about to animate in, so nothing can get stuck invisible.
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return; io.unobserve(e.target); const t = e.target;
        if (t.matches('[data-lines]')) gsap.fromTo($$('.line-mask > span', t), { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: .08 });
        else gsap.fromTo(t, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'expo.out' });
      }), { rootMargin: '0px 0px -8% 0px' });
      $$('[data-lines], [data-reveal]').forEach(el => io.observe(el));
      $$('[data-parallax]').forEach(el => gsap.to(el, { yPercent: +el.dataset.parallax || -12, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
      return;
    }
    $$('[data-lines]').forEach(el => gsap.from($$('.line-mask > span', el), { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: el, start: 'top 85%' } }));
    ScrollTrigger.batch('[data-reveal]', { start: 'top 88%', once: true, onEnter: els => gsap.fromTo(els, { y: 40, opacity: 0, filter: 'blur(6px)' }, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1, ease: 'expo.out', stagger: .12, clearProps: 'filter' }) });
    $$('[data-parallax]').forEach(el => gsap.to(el, { yPercent: +el.dataset.parallax || -12, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
  };
  /* ---------- Box of 6 in the nav: the bottle flies into its slot ---------- */
  let lastFrom = null;
  document.addEventListener('click', e => { const b = e.target.closest('[data-add],[data-buy],[data-plus]'); if (b) lastFrom = b; }, true);
  function paintNavBox() {
    const st = T.boxState(), inBox = st.bottles ? (st.bottles % T.box || T.box) : 0;
    const flat = []; st.items.forEach(it => { for (let k = 0; k < it.q; k++) flat.push(it.id); });
    const cur = flat.slice(flat.length - inBox);
    const nb = $('[data-cart-open]'); if (!nb) return;
    $$('.nbx i', nb).forEach((s, k) => { const id = cur[k]; s.className = id ? 'is-in' : ''; s.style.setProperty('--fill', id ? T.byId(id).theme.accent : ''); });
    nb.classList.toggle('is-full', inBox === T.box);
    $('#navbox-n').textContent = st.boxes > 1 && !st.missing ? st.boxes + ' cajas' : inBox + '/' + T.box;
    nb.setAttribute('aria-label', st.bottles ? `Abrir tu caja: ${st.bottles} botella${st.bottles > 1 ? 's' : ''}` : 'Abrir tu caja');
  }
  function flyToBox(from, id) {
    const nb = $('[data-cart-open]');
    if (reduce || !from || !nb || !nb.getClientRects().length) return Promise.resolve();
    const st = T.boxState(), idx = Math.max(0, ((st.bottles - 1) % T.box)), slot = $$('.nbx i', nb)[idx];
    if (!slot) return Promise.resolve();
    const a = from.getBoundingClientRect(), s = slot.getBoundingClientRect();
    const img = new Image(); img.src = R.thumb(T.byId(id).img); img.className = 'tb-fly'; img.alt = ''; document.body.append(img);
    const h0 = 150, h1 = s.height * 1.3, x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = s.left + s.width / 2, y1 = s.top + s.height / 2;
    const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - Math.max(90, Math.abs(x1 - x0) * .25), kf = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, q = (p0, p1, p2) => (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
      const hh = h0 + (h1 - h0) * t, yy = q(y0, cy, y1);
      kf.push({ transform: `translate(${q(x0, cx, x1)}px, ${yy}px) translate(-50%, -50%) rotate(${((1 - t) * -24 + Math.sin(t * Math.PI) * 14).toFixed(1)}deg)`, height: hh + 'px', opacity: t < .82 ? 1 : Math.max(0, 1 - (t - .82) / .18), offset: t });
    }
    return new Promise(res => {
      let done = false; const fin = () => { if (done) return; done = true; img.remove(); res(); };
      const an = img.animate(kf, { duration: 820, easing: 'cubic-bezier(.45,0,.55,1)', fill: 'forwards' }); an.onfinish = fin; setTimeout(fin, 1200);
    });
  }
  paintNavBox();

  /* ---------- Wine wave between pages (CSS transform only, so it never stutters) ---------- */
  const wave = document.createElement('div'); wave.className = 'wave'; wave.setAttribute('aria-hidden', 'true');
  wave.innerHTML = '<svg viewBox="0 0 1440 120" preserveAspectRatio="none" class="wave__top"><path d="M0 60 C 240 0 480 120 720 60 C 960 0 1200 120 1440 60 L1440 120 L0 120 Z"/></svg><div class="wave__body"></div><svg viewBox="0 0 1440 120" preserveAspectRatio="none" class="wave__bot"><path d="M0 0 L1440 0 L1440 60 C 1200 120 960 0 720 60 C 480 120 240 0 0 60 Z"/></svg>';
  document.body.append(wave);
  const ease = 'cubic-bezier(.75,0,.25,1)';
  T.wave = {
    flood(color) {
      wave.style.setProperty('--tw', color); wave.style.visibility = 'visible'; wave.style.display = 'flex';
      if (reduce) { wave.style.transform = 'translate3d(0,-12vh,0)'; return Promise.resolve(); }
      const an = wave.animate([{ transform: 'translate3d(0,100vh,0)' }, { transform: 'translate3d(0,-12vh,0)' }], { duration: 650, easing: ease, fill: 'forwards' });
      return new Promise(r => { an.onfinish = r; setTimeout(r, 900); });
    },
    arrive() {
      let s = null; try { s = JSON.parse(sessionStorage.getItem('teson-wave2') || 'null'); sessionStorage.removeItem('teson-wave2'); } catch (e) {}
      document.documentElement.classList.remove('tw-incoming');
      if (!s) return;
      wave.style.setProperty('--tw', s.color); wave.style.visibility = 'visible'; wave.style.display = 'flex'; wave.style.transform = 'translate3d(0,-12vh,0)';
      let ended = false;
      const end = () => { if (ended) return; ended = true; wave.getAnimations().forEach(x => x.cancel()); wave.style.visibility = 'hidden'; wave.style.display = ''; wave.style.transform = ''; };
      const go = () => setTimeout(() => {
        const an = wave.animate([{ transform: 'translate3d(0,-12vh,0)' }, { transform: 'translate3d(0,-135vh,0)' }], { duration: reduce ? 1 : 750, easing: ease, fill: 'forwards' });
        an.onfinish = end; setTimeout(end, 1100);   // hidden tabs may never fire onfinish
      }, 40);
      // wait for the first screen's images so the reveal runs on an idle main thread
      const imgs = [...document.images].filter(i => i.getBoundingClientRect().top < innerHeight && !i.complete);
      Promise.race([Promise.all(imgs.map(i => i.decode ? i.decode().catch(() => {}) : Promise.resolve())), new Promise(r => setTimeout(r, 900))]).then(go);
    }
  };
  T.wave.arrive();
  // Back/forward from the browser cache: the page comes back exactly as we left it, wave included
  window.addEventListener('pageshow', e => { if (e.persisted) { wave.getAnimations().forEach(x => x.cancel()); wave.style.visibility = 'hidden'; wave.style.display = ''; wave.style.transform = ''; } });

  T.ready = fn => { if (T.entered()) fn(); else document.addEventListener('teson:enter', fn, { once: true }); };
  T.$ = $; T.$$ = $$; T.reduce = reduce; T.href = href;
})();
