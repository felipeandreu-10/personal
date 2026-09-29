/* Tesón · home page. Content is prerendered by the build; this file adds the custom-wine
   builder and the scroll choreography. Phones ("lite": touch or narrow) get the same story
   with native scrolling: sticky card stack, swipe carousel, time-based reveals, no pinning. */
(function () {
  const T = window.TESON, { $, $$ } = T, reduce = T.reduce, lite = T.lite;
  if (document.body.dataset.page !== 'home') return;

  // Old one-page links (#vino-prestige) now live at /vinos/<slug>/
  const legacy = location.hash.match(/^#vino-([a-z]+)$/);
  if (legacy) { location.replace(T.url(T.byId(legacy[1]))); return; }

  document.addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (b) T.addToCart(b.dataset.add, +(b.dataset.n || 1)); });

  /* ---------- Custom wines: live label preview ---------- */
  const styles = [
    { id: 'clasica', name: 'Clásica', hint: 'Sobria y elegante: negro, dorado y blanco. Para cenas y eventos formales.' },
    { id: 'divertida', name: 'Divertida', hint: 'Colores vivos, tipografía bold y alguna ilustración simple.' },
    { id: 'minimal', name: 'Minimal', hint: 'Líneas limpias, fondo plano y todo el foco en tu texto.' },
    { id: 'propio', name: 'Mi diseño', hint: 'Si ya tenés tu etiqueta, subila para verla en la botella y mandánosla por WhatsApp o mail. La revisamos y la adaptamos al tamaño de la etiqueta.' }
  ];
  let upload = null;   // { url, name, isImg } of the viewer's own label file (stays in the browser)
  const persoWines = [
    { id: 'malbec', label: 'Malbec', range: 'Tesón', bottle: '/assets/img/malbec-hd.webp' },
    { id: 'redblend', label: 'Red Blend', range: 'Tesón', bottle: '/assets/img/redblend-hd.webp' },
    { id: 'prestige', label: 'Malbec Prestige', range: 'Tesón', bottle: '/assets/img/prestige-hd.webp' },
    { id: 'fatalmalbec', label: 'Malbec', range: 'Fatal', bottle: '/assets/img/fatal-malbec.webp' },
    { id: 'fatalsb', label: 'Sauvignon Blanc', range: 'Fatal', bottle: '/assets/img/fatal-sauvignon.webp' }
  ];
  let pw = persoWines[0], ps = styles[0];
  $('#perso-wines').innerHTML = persoWines.map((w, i) => `<button aria-pressed="${!i}" data-pw="${i}"><small>${w.range}</small>${w.label}</button>`).join('');
  $('#perso-style').insertAdjacentHTML('beforeend', styles.map((s, i) => `<button aria-pressed="${!i}" data-ps="${i}">${s.name}</button>`).join(''));
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function drawPerso(anim) {
    // Empty fields preview the example text but are never sent as if the visitor wrote it
    const nameIn = $('#perso-name'), dateIn = $('#perso-date');
    const name = esc(nameIn.value || nameIn.placeholder), date = esc(dateIn.value || dateIn.placeholder), boxesN = Math.min(200, Math.max(1, Math.round(+$('#perso-boxes').value) || 1));
    const own = ps.id === 'propio';
    $('#perso-upload').hidden = !own;
    const ownLabel = upload && upload.isImg ? `<div class="plabel plabel--propio" style="background-image:url(${upload.url})"></div>` : `<div class="plabel plabel--propio is-empty"><span class="plabel__top">${upload ? 'Archivo recibido' : 'Tu diseño'}</span><b>${upload ? esc(upload.name) : 'Acá va tu etiqueta'}</b><small>110 × 120 mm</small></div>`;
    $('#perso-stage').innerHTML = own ? `<div class="pbottle"><img src="${pw.bottle}" alt="${pw.label} con tu etiqueta">${ownLabel}</div><p class="perso__cap">${boxesN} caja${boxesN > 1 ? 's' : ''} · ${boxesN * T.box} botellas de ${pw.label}</p>` : `<div class="pbottle"><img src="${pw.bottle}" alt="${pw.label} con etiqueta personalizada"><div class="plabel plabel--${ps.id}"><span class="plabel__top">${ps.id === 'divertida' ? '¡Salud!' : 'Edición especial'}</span><b>${name}</b><span class="plabel__line"></span><i>${date}</i><small>${pw.label} · Mendoza</small></div></div><p class="perso__cap">${boxesN} caja${boxesN > 1 ? 's' : ''} · ${boxesN * T.box} botellas de ${pw.label}</p>`;
    $('#perso-style-hint').textContent = ps.hint;
    $('#perso-cta').href = T.wa(`Hola Tesón! Quiero cotizar vinos personalizados:\n• Vino: ${pw.label}\n• Etiqueta: ${own ? 'diseño propio' + (upload ? ' (' + upload.name + ', se los envío por acá)' : ' (se los envío por acá)') : ps.name}\n${own ? '' : '• Texto: ' + (nameIn.value || 'a definir') + (dateIn.value ? ' / ' + dateIn.value : '') + '\n'}• Cantidad: ${boxesN} caja${boxesN > 1 ? 's' : ''} de ${T.box} (${boxesN * T.box} botellas)`);
    if (anim && !reduce) gsap.from('.pbottle', { y: 30, rotate: 3, opacity: 0, duration: .8, ease: 'expo.out' });
  }
  $('#perso-wines').addEventListener('click', e => { const b = e.target.closest('[data-pw]'); if (!b) return; pw = persoWines[+b.dataset.pw]; $$('#perso-wines button').forEach(x => x.setAttribute('aria-pressed', x === b)); drawPerso(true); });
  $('#perso-style').addEventListener('click', e => { const b = e.target.closest('[data-ps]'); if (!b) return; ps = styles[+b.dataset.ps]; $$('#perso-style button').forEach(x => x.setAttribute('aria-pressed', x === b)); T.segThumb($('#perso-style')); drawPerso(true); });
  $('#perso-file').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; if (upload && upload.url) URL.revokeObjectURL(upload.url); const img = f.type.startsWith('image/'); upload = { name: f.name, isImg: img, url: img ? URL.createObjectURL(f) : null }; $('#perso-file-name').textContent = f.name; drawPerso(true); });
  ['#perso-name', '#perso-date', '#perso-boxes'].forEach(id => $(id).addEventListener('input', () => drawPerso(false)));
  drawPerso(false); requestAnimationFrame(() => T.segThumb($('#perso-style')));

  /* ---------- Choreography ---------- */
  function play() {
    if (reduce) {
      // Reduced motion runs the phone layout (set in <head>): every wine and every step stays on
      // the page, states change without movement.
      const bgs = $$('.tmob__bg img'), steps = $$('.tmob__step');
      const io = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) return; const i = +e.target.dataset.i;
        bgs.forEach((b, j) => b.classList.toggle('on', j === i)); steps.forEach((s, j) => s.classList.toggle('on', j === i)); }), { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(s => io.observe(s)); if (steps[0]) steps[0].classList.add('on');
      const lis = $$('#tl li'), ph = $$('#story-photo img');
      lis.forEach((li, i) => ScrollTrigger.create({ trigger: li, start: 'top 62%', end: 'bottom 62%', onToggle: s => { if (s.isActive) { lis.forEach((x, j) => x.classList.toggle('on', j <= i)); ph.forEach((p, j) => p.classList.toggle('on', j === i)); } } }));
      lis[0].classList.add('on');
      gsap.to('#tl-fill', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#tl', start: 'top 60%', end: 'bottom 60%', scrub: true } });   // the line follows the finger, same as without the setting
      $$('.orbit').forEach(o => o.hidden = true);
      T.reveals(); return;
    }
    // Hero intro
    gsap.from('[data-hero-lines] .line-mask > span', { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: .1, delay: .15 });
    gsap.from('.hero__row > *', { y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: .1, delay: .45 });
    gsap.from('.hero__bottle', { yPercent: 40, opacity: 0, rotate: 6, duration: 1.8, ease: 'expo.out', delay: .3 });
    // Hero on scroll: desktop clips into a card; phones only move (clip-path repaints every frame)
    const hero = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: lite ? .3 : true } });
    if (!lite) hero.to('.hero__media', { clipPath: 'inset(16px 16px 16px 16px round 40px)', ease: 'none', duration: .25 }, 0);
    hero.to('.hero__media img', { yPercent: 12, ease: 'none', duration: 1 }, 0)
      .to('.hero__bottle', { yPercent: -30, rotate: -5, ease: 'none', duration: 1 }, 0)
      .to('.hero__copy', { yPercent: -30, opacity: 0, ease: 'none', duration: .7 }, 0);

    // Manifesto words light up
    const m = $('#manifesto'); m.innerHTML = m.textContent.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
    const words = $$('.w', m);
    ScrollTrigger.create({ trigger: m, start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: s => { const k = Math.round(s.progress * words.length); words.forEach((w, i) => w.classList.toggle('on', i < k)); } });

    const cards = $$('.deck__card');
    if (lite) {
      // Phones: CSS sticky stack (each card slides over the last with native scroll); contents animate in once
      cards.forEach(c => {
        const tl = gsap.timeline({ paused: true })
          .from($('.deck__bottle', c), { yPercent: 25, rotate: 6, opacity: 0, duration: 1.1, ease: 'expo.out' }, 0)
          .from($('.deck__label', c), { xPercent: 50, rotate: 25, opacity: 0, duration: .9, ease: 'expo.out' }, .15)
          .from($$('.deck__copy > *', c), { y: 30, opacity: 0, stagger: .06, duration: .8, ease: 'expo.out' }, .1);
        const seal = $('[data-seal]', c); if (seal) tl.fromTo(seal, { scale: 2.2, rotate: -40, opacity: 0 }, { scale: 1, rotate: -8, opacity: 1, duration: .5, ease: 'back.out(2)' }, .5);
        const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); tl.play(0); } }, { rootMargin: '0px 0px -35% 0px' });
        io.observe(c);
      });
    } else {
      // Desktop: pinned deck, each card slides up over the previous one, which sinks and darkens
      const dots = $$('#deck-dots i');
      gsap.set(cards.slice(1), { yPercent: 100 });
      const deck = gsap.timeline({ scrollTrigger: { trigger: '[data-deck]', start: 'top top', end: '+=' + innerHeight * 2.4, pin: true, scrub: .6,
        onUpdate: s => { const i = Math.min(2, Math.floor(s.progress * 2.999 + .15)); dots.forEach((d, j) => d.classList.toggle('on', j === i)); $('#deck-dots').style.color = i ? 'var(--crema)' : 'var(--noche)'; } } });
      cards.slice(1).forEach((c, k) => {
        const prev = cards[k], at = k * 1.2;
        deck.to(c, { yPercent: 0, duration: 1, ease: 'power2.inOut' }, at)
          .fromTo(c, { borderTopLeftRadius: 48, borderTopRightRadius: 48 }, { borderTopLeftRadius: 0, borderTopRightRadius: 0, duration: 1, ease: 'power2.inOut' }, at)
          .to(prev, { yPercent: -18, scale: .92, duration: 1, ease: 'power2.inOut' }, at)
          .to($('.deck__shade', prev), { opacity: .45, duration: 1, ease: 'power2.inOut' }, at)
          .from($('.deck__bottle', c), { yPercent: 35, rotate: 8, duration: 1, ease: 'power2.out' }, at + .15)
          .from($('.deck__label', c), { xPercent: 60, rotate: 30, opacity: 0, duration: .8, ease: 'power2.out' }, at + .35)
          .from($$('.deck__copy > *', c), { y: 60, opacity: 0, stagger: .06, duration: .7, ease: 'power2.out' }, at + .3);
        const seal = $('[data-seal]', c);
        if (seal) deck.fromTo(seal, { scale: 2.6, rotate: -40, opacity: 0 }, { scale: 1, rotate: -8, opacity: 1, duration: .35, ease: 'back.out(2.2)' }, at + .9);
      });
      deck.to({}, { duration: .4 });
      dots[0].classList.add('on');
      gsap.from($$('.deck__card:first-child .deck__copy > *'), { y: 50, opacity: 0, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '[data-deck]', start: 'top 70%' } });
      gsap.from('.deck__card:first-child .deck__bottle', { yPercent: 30, rotate: 6, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '[data-deck]', start: 'top 70%' } });
    }

    if (lite) {
      // Terroir: the photo is a sticky background; the step whose text crosses the middle of the
      // screen picks it (cross-fade in CSS). IntersectionObserver, so layout shifts never break it.
      const bgs = $$('.tmob__bg img'), steps = $$('.tmob__step');
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting) return;
        const i = +e.target.dataset.i; bgs.forEach((b, j) => b.classList.toggle('on', j === i)); steps.forEach((s, j) => s.classList.toggle('on', j === i));
      }), { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(s => io.observe(s)); steps[0].classList.add('on');
    } else {
      // Terroir stepper with a 600 ms queue so fast scrolling never skips a step
      const imgs = $$('#st-imgs img'), panes = $$('.stepper__pane'), idx = $$('#st-idx button'), N = imgs.length;
      let cur = -1, want = 0, busy = false;
      const show = i => {
        const back = i < cur;
        imgs.forEach((im, j) => {
          if (j === i) { gsap.set(im, { zIndex: 2 }); gsap.fromTo(im, { yPercent: back ? -100 : 100 }, { yPercent: 0, duration: .8, ease: 'expo.out', overwrite: true }); }
          else if (j === cur) { gsap.set(im, { zIndex: 1 }); gsap.to(im, { yPercent: back ? 30 : -30, duration: .8, ease: 'expo.out', overwrite: true }); }
          else gsap.set(im, { yPercent: 100, zIndex: 0 });
        });
        panes.forEach((p, j) => p.classList.toggle('on', j === i)); idx.forEach((b, j) => b.classList.toggle('on', j === i)); cur = i;
      };
      const pump = () => { if (busy || want === cur) return; busy = true; show(want > cur ? cur + 1 : cur - 1); setTimeout(() => { busy = false; pump(); }, 600); };
      const st = ScrollTrigger.create({ trigger: '#finca', start: 'top top', end: '+=' + innerHeight * 3, pin: true,
        onUpdate: s => { want = Math.min(N - 1, Math.floor(s.progress * N)); gsap.set('#st-bar', { scaleX: s.progress }); pump(); } });
      gsap.set(imgs, { yPercent: 100 }); show(0);
      idx.forEach((b, i) => b.addEventListener('click', () => T.scrollTo(st.start + (st.end - st.start) * (i + .5) / N)));
    }

    // Big number with orbiting photos (positions set once, then only transforms move)
    const statEl = $('#stat'), orb = $$('.orbit', statEl), n = { v: 0 };
    $('#stat-n').textContent = '0';
    gsap.to(n, { v: 1050, duration: 2.2, ease: 'power2.out', scrollTrigger: { trigger: statEl, start: 'top 60%', once: true }, onUpdate: () => $('#stat-n').textContent = Math.round(n.v).toLocaleString('es-AR') });
    gsap.set(orb, { left: 0, top: 0 });
    // Sizes are measured once (and on resize), so scrolling only writes transforms
    let W = 0, H = 0, half = [];
    const measureOrb = () => { W = innerWidth; H = statEl.offsetHeight; half = orb.map(o => [o.offsetWidth / 2, o.offsetHeight / 2]); };
    measureOrb(); ScrollTrigger.addEventListener('refresh', measureOrb);
    ScrollTrigger.create({ trigger: statEl, start: 'top bottom', end: 'bottom top', scrub: true, onUpdate: s => {
      const rx = lite ? .4 : .36, ry = lite ? .38 : .34, k = Math.min(1, s.progress * 2.4);
      orb.forEach((o, i) => { const a = i / orb.length * Math.PI * 2 + s.progress * Math.PI * .9;
        gsap.set(o, { x: W / 2 + Math.cos(a) * W * rx - half[i][0], y: H / 2 + Math.sin(a) * H * ry - half[i][1], scale: .4 + .6 * k, rotate: Math.sin(a) * 6 }); });
    } });

    // Story timeline
    const lis = $$('#tl li'), ph = $$('#story-photo img');
    gsap.to('#tl-fill', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#tl', start: 'top 60%', end: 'bottom 60%', scrub: true } });
    lis.forEach((li, i) => ScrollTrigger.create({ trigger: li, start: 'top 62%', end: 'bottom 62%', onToggle: s => { if (s.isActive) { lis.forEach((x, j) => x.classList.toggle('on', j <= i)); ph.forEach((p, j) => p.classList.toggle('on', j === i)); } } }));
    ph[0].classList.add('on'); lis[0].classList.add('on');

    T.reveals();
    ScrollTrigger.refresh();
    // Arriving with /#historia: jump there once the pinned sections have their final height
    const el = location.hash.length > 1 && document.getElementById(location.hash.slice(1));
    if (el) setTimeout(() => T.scrollTo(el.getBoundingClientRect().top + scrollY, true), 60);
  }
  T.ready(play);
})();
