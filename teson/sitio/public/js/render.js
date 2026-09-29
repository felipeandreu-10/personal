/* Tesón · markup builders shared by the build (prerender, so Google reads real HTML) and the
   browser (dynamic bits). Pure functions of the data in data.js; no DOM access.
   Node: require('./render.js')(TESON) · Browser: window.TESON_R */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.TESON_R = factory(root.TESON);
})(this, function (T) {
  const ARROW = '<span class="arr"><svg width="16" height="10" viewBox="0 0 16 10" fill="none" aria-hidden="true"><path d="M0 5h14M10 1l4 4-4 4" stroke="currentColor" stroke-width="1.4"/></svg></span>';
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const glow = { malbec: 'rgba(234,88,40,.22)', redblend: 'rgba(235,102,101,.28)', prestige: 'rgba(193,126,85,.3)', fatalmalbec: 'rgba(255,77,77,.22)', fatalsb: 'rgba(111,211,203,.3)' };

  /* Responsive image. T.IMG (written by the build) maps src -> [width, height, smallWidth]. */
  const small = src => src.replace(/\.webp$/, '-sm.webp');
  function pic(src, o = {}) {
    const m = (T.IMG || {})[src], a = [];
    a.push(`src="${m && m[2] ? small(src) : src}"`);
    if (m && m[2]) a.push(`srcset="${small(src)} ${m[2]}w, ${src} ${m[0]}w"`, `sizes="${o.sizes || '100vw'}"`);
    if (m) a.push(`width="${m[0]}" height="${m[1]}"`);
    a.push(`alt="${esc(o.alt || '')}"`);
    if (o.cls) a.push(`class="${o.cls}"`);
    if (o.style) a.push(`style="${o.style}"`);
    if (o.attrs) a.push(o.attrs);
    if (o.priority) a.push('fetchpriority="high"'); else if (o.lazy !== false) a.push('loading="lazy"');
    a.push('decoding="async"');
    return `<img ${a.join(' ')}>`;
  }
  const thumb = src => (T.IMG || {})[src] && T.IMG[src][2] ? small(src) : src;   // small file for tiny UI images

  const name = (w, brandMargin) => `${w.brand ? `<small style="margin:${brandMargin || '0 6px 0 0'}">${w.brand}</small>` : ''}${w.name}${w.edition ? `<small>${w.edition}</small>` : ''}`;
  const cardBg = w => w.theme.bg === '#FFF7E8' ? '#F6EBD6' : w.theme.bg;
  const BOTTLE_SIZES = '(max-width: 760px) 110px, 220px';

  /* ---------- Home ---------- */
  const deck = () => T.teson.map((w, i) => `
    <article class="deck__card" data-nav="${i ? 'dark' : ''}" style="--c-bg:${w.theme.bg};--c-ink:${w.theme.ink};--c-accent:${w.theme.accent};--c-glow:${glow[w.id]};z-index:${i + 1}">
      <div class="deck__copy">
        <p class="eyebrow">0${i + 1} · Cosecha ${w.vintage}</p>
        <h2 class="deck__name">${name(w)}</h2>
        <p>${w.tagline} ${w.line}</p>
        <div class="deck__meta"><span class="chip" style="--dot:${w.theme.accent}"><i></i>${w.composition.split('(')[0].trim()}</span><span class="chip">${w.alcohol} vol.</span><span class="chip">${w.production}</span></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn ${i ? 'btn--light' : ''}" href="${T.url(w)}"><span class="lbl">Conocelo</span>${ARROW}</a><button class="btn btn--ghost" data-add="${w.id}" aria-label="Sumar una botella de ${w.full} a tu caja"><span class="lbl">Sumar · ${T.ars(w.price)}</span></button></div>
      </div>
      <div class="deck__stage">
        ${w.id === 'prestige' ? '<span class="deck__seal" data-seal></span>' : ''}
        ${pic(w.img, { cls: 'deck__bottle', alt: `${w.full} ${w.vintage}`, sizes: BOTTLE_SIZES })}
        ${pic(w.label, { cls: 'deck__label', sizes: '(max-width: 760px) 110px, 190px' })}
      </div>
      <span class="deck__num">0${i + 1} / 03</span>
      <span class="deck__shade"></span>
    </article>`).join('');

  const fatalCards = () => T.fatal.map(w => `
    <article class="fcard ${w.id === 'fatalsb' ? 'fcard--sb' : ''}" data-reveal>
      <a class="fcard__img" href="${T.url(w)}">${pic(w.img, { alt: w.full, sizes: BOTTLE_SIZES })}</a>
      <h3><a href="${T.url(w)}">${w.name}</a></h3><p>${w.tagline}</p>
      <div class="fcard__row"><span class="price">${T.ars(w.price)} <small>c/u</small></span><button class="btn btn--sm" data-add="${w.id}" aria-label="Sumar una botella de ${w.full} a tu caja"><span class="lbl">Sumar</span>${ARROW}</button></div>
    </article>`).join('');

  const shopCards = () => T.wines.map(w => `
    <article class="card ${w.brand ? 'card--fatal' : ''}" data-reveal style="--c-bg:${cardBg(w)};--c-ink:${w.theme.ink};--c-accent:${w.theme.accent};--c-glow:${glow[w.id]}">
      <div class="card__top"><span class="chip" style="background:rgba(127,127,127,.16);color:inherit">${w.brand ? 'Línea joven' : w.vintage}</span><span class="caps" style="opacity:.7">${w.alcohol}</span></div>
      <a class="card__stage" href="${T.url(w)}">${pic(w.img, { alt: w.full, sizes: BOTTLE_SIZES })}</a>
      <h3><a href="${T.url(w)}">${name(w)}</a></h3>
      <p>${w.tagline}</p>
      <div class="card__row"><span class="price">${T.ars(w.price)} <small>c/u</small></span><div style="display:flex;gap:8px"><button class="btn btn--ghost btn--sm" data-add="${w.id}" aria-label="Sumar una botella de ${w.full} a tu caja"><span class="lbl">+ 1 botella</span></button><button class="btn btn--sm ${['malbec', 'fatalmalbec'].includes(w.id) ? '' : 'btn--light'}" data-add="${w.id}" data-n="${T.box}" aria-label="Sumar una caja cerrada de ${T.box} ${w.full}"><span class="lbl">Caja de ${T.box}</span>${ARROW}</button></div></div>
    </article>`).join('');

  const terroirImgs = () => T.terroir.map((s, i) => pic(s.img, { alt: s.title, sizes: '(max-width: 1024px) 100vw, 50vw', lazy: i > 0 })).join('');
  const terroirIdx = () => T.terroir.map((s, i) => `<button data-step="${i}" aria-label="${esc(s.title)}">${s.k}</button>`).join('');
  const terroirPanes = () => T.terroir.map((s, i) => `<div class="stepper__pane${i ? '' : ' on'}"><h3 class="h-l">${s.title}</h3><p>${s.text}</p></div>`).join('');
  /* Phones: the photo stays fixed as a background while each step's text scrolls over it */
  const terroirMobile = () => `<div class="tmob__bg">${T.terroir.map((s, i) => pic(s.img, { alt: '', cls: i ? '' : 'on', sizes: '100vw', lazy: i > 0 })).join('')}<span class="tmob__shade"></span></div>
      <div class="tmob__steps">${T.terroir.map((s, i) => `<article class="tmob__step" data-i="${i}"><div class="tmob__card"><b>${s.k} / 0${T.terroir.length}</b><h3>${s.title}</h3><p>${s.text}</p></div></article>`).join('')}</div>`;

  const timeline = () => T.story.map(s => `<li><time>${s.year}</time><h3>${s.title}</h3><p>${s.text}</p></li>`).join('');
  const storyPhotos = () => T.story.map((s, i) => pic(s.img, { alt: '', cls: i ? '' : 'on', sizes: '(max-width: 1024px) 100vw, 40vw', lazy: i > 0 })).join('');

  const FAQ = [
    ['¿Cómo se compra?', `Vendemos por caja de ${T.box} botellas. Podés llevar la caja cerrada de un solo vino o armarla a tu gusto combinando Tesón y Fatal.`],
    ['¿Hacen envíos?', 'Sí, enviamos a todo el país. Coordinamos el envío por WhatsApp apenas recibimos tu pedido.'],
    ['¿Cómo pago?', 'Con Mercado Pago (tarjeta, débito o dinero en cuenta) o por transferencia bancaria. Todo lo coordinamos por WhatsApp.'],
    ['¿Hacen vinos con etiqueta personalizada?', 'Sí. Para casamientos, cumpleaños, empresas o egresados: elegís el vino y el estilo de etiqueta, o nos mandás tu propio diseño.'],
    ['¿Cómo conservo el vino?', 'Acostado, en un lugar fresco y oscuro, lejos de vibraciones. El Malbec, el Red Blend y el Prestige tienen potencial de guarda de hasta 10 años; la línea Fatal está pensada para tomar joven.'],
    ['¿Puedo visitar la finca?', 'Escribinos por WhatsApp y vemos cómo organizarlo.']
  ];
  const faq = () => FAQ.map(([q, a]) => `<details data-reveal><summary>${q}<i aria-hidden="true">+</i></summary><div class="ans">${a}</div></details>`).join('');

  const orbit = () => ['finca-piedras', 'racimos', 'finca-sol-entre-alamos', 'caminante', 'finca-camino-dorado', 'manos-racimo']
    .map(p => `<div class="orbit">${pic(`/assets/img/${p}.webp`, { sizes: '200px' })}</div>`).join('');

  /* ---------- Footer (every page) ---------- */
  const footer = () => `
  <footer class="foot">
  <div class="foot__body" data-nav="dark"><div class="wrap">
    <div class="foot__grid">
      <div><h2>Pedidos</h2><a class="btn btn--light" href="${T.wa('Hola Tesón! Quiero hacer un pedido.')}" target="_blank" rel="noopener"><span class="lbl">Escribinos por WhatsApp</span>${ARROW}</a></div>
      <div><h2>Vinos</h2>${T.wines.map(w => `<a href="${T.url(w)}">${w.full}</a>`).join('')}</div>
      <div><h2>Tesón</h2><a href="/#historia">Historia</a><a href="/#finca">La finca</a><a href="/#personalizados">Vinos personalizados</a><a href="/#faq">Preguntas</a></div>
      <div><h2>Contacto</h2><a href="${T.wa('Hola Tesón!')}" target="_blank" rel="noopener">${T.contact.phoneLabel}</a><a href="mailto:${T.contact.email}">${T.contact.email}</a><a href="https://instagram.com/${T.contact.instagram}" target="_blank" rel="noopener">@${T.contact.instagram}</a></div>
    </div>
  </div></div>
  <!-- Like seed.com: a fixed photo behind the page, uncovered in the last stretch of the scroll -->
  <div class="foot__reveal" data-nav="dark">${pic("/assets/img/andes-atardecer.webp", { alt: "", sizes: "100vw", cls: "foot__photo" })}<span class="foot__shade"></span>
    <div class="wrap foot__end"><p class="foot__big">A fuerza<br>de <em>tesón.</em></p>
    <div class="foot__legal"><span>Beber con moderación. Prohibida su venta a menores de 18 años.</span><span>© 2026 Tesón Wines · ${T.contact.place}</span></div></div>
  </div></footer>`;

  /* ---------- Wine page ---------- */
  const facts = w => [w.composition, `Viñedo en ${w.vineyard.split(',')[0]}, ${w.altitude}`, w.harvest && `Cosecha ${w.harvest.toLowerCase()}`, w.production ? `Producción de ${w.production}` : w.pairing && `Ideal con ${w.pairing.split(',')[0].toLowerCase()}`].filter(Boolean);
  /* Buy button label: long on desktop, short on phones (CSS picks one) */
  const cta = (mode, qty, tot) => mode === 'box' ? `<span class="l-long">Comprar ${qty > 1 ? qty + ' cajas' : 'la caja'}</span><span class="l-short">Comprar</span> · ${T.ars(tot)}` : `<span class="l-long">Sumar a mi caja</span><span class="l-short">Sumar</span> · ${T.ars(tot)}`;
  const buybox = w => `
    <p class="eyebrow">${w.brand ? w.brand + ' Wines · línea joven' : 'Cosecha ' + w.vintage} · ${w.alcohol} vol.</p>
    <h1>${name(w, '0 0 6px')}</h1>
    <p class="tag">${w.tagline}</p>
    <div class="buybox__price" aria-live="polite"><b id="bb-price">${T.ars(w.price)}</b><span id="bb-unit">por botella</span></div>
    <div class="seg on-seg" id="bb-mode" style="width:100%;margin-bottom:6px"><span class="seg__thumb"></span><button aria-pressed="true" data-mode="mix" style="flex:1">Armá tu caja</button><button aria-pressed="false" data-mode="box" style="flex:1">Caja cerrada x${T.box}</button></div>
    <div class="boxpromo" id="bb-promo"><div id="bb-box"></div><span id="bb-boxtxt">Vendemos por <b>caja de ${T.box}</b>. Combiná los vinos que quieras.</span></div>
    <ul class="checks">${facts(w).map(f => `<li>${f}</li>`).join('')}</ul>
    <div style="display:flex;gap:10px;align-items:center"><div class="qty" style="height:56px"><button data-qty="-1" aria-label="Restar" style="width:48px;height:56px">−</button><span id="bb-qty" style="min-width:28px">1</span><button data-qty="1" aria-label="Sumar" style="width:48px;height:56px">+</button></div>
    <button class="btn btn--accent btn--block" data-buy style="height:56px;flex:1"><span class="lbl" id="bb-cta">${cta('mix', 1, w.price)}</span>${ARROW}</button></div>
    <div class="paylogos"><span>Caja cerrada o a tu gusto</span><span>Mercado Pago</span><span>Transferencia</span><span>WhatsApp</span></div>`;

  const shots = w => [
    { k: 'bottle', src: w.img },
    { k: 'label', src: w.label },
    w.tilt && { k: 'tilt', src: w.tilt },
    { k: 'finca', src: '/assets/img/finca-piedras.webp' }
  ].filter(Boolean);
  const thumbs = w => shots(w).map((s, i) => `<button data-shot="${i}" class="${i ? '' : 'on'}" aria-label="${{ bottle: 'Botella', label: 'Etiqueta', tilt: 'Botella inclinada', finca: 'La finca' }[s.k]}"><img src="${thumb(s.src)}" alt="" loading="lazy" style="object-fit:${s.k === 'finca' ? 'cover' : 'contain'}"></button>`).join('');
  /* First paint of the media box: the bottle photo (the live bottle takes over on desktop) */
  const mediaStatic = w => `<div style="position:absolute;inset:0"><div class="pv" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${pic(w.img, { alt: `${w.full} ${w.vintage}`, sizes: '(max-width: 760px) 140px, 260px', priority: true, lazy: false, style: 'height:84%;width:auto' })}<span class="pv__floor"></span></div></div>`;

  const cataH = w => `<span class="line-mask"><span>${w.aromas.slice(0, 2).join(' y ')}.</span></span><span class="line-mask"><span><em>${w.aromas.slice(2).join(', ') || 'Y un final largo'}.</em></span></span>`;
  const aromas = w => w.aromas.map(a => `<span class="chip">${a}</span>`).join('') + `<span class="chip" style="background:var(--noche);color:var(--crema)">${w.pairing.split(',')[0]}</span>`;
  const crianza = w => [
    ['Viñedo', `${w.vineyard}, ${w.altitude}.${w.soil ? ' ' + w.soil + '.' : ''}`],
    w.harvest && ['Cosecha', `${w.harvest}.`],
    ['Crianza', w.ageing ? `${w.ageing}.` : 'Sin paso por madera, para cuidar la fruta fresca.'],
    ['Botella', w.production ? `${w.production}. Potencial de guarda de ${w.cellar}.` : `${w.alcohol} de alcohol. Para disfrutar joven.`]
  ].filter(Boolean).map((x, i) => `<div class="crianza__step"><b>0${i + 1}</b><h3>${x[0]}</h3><p>${x[1]}</p></div>`).join('');
  const terroirLine = w => `${w.vineyard}, a ${w.altitude}.${w.soil ? ' ' + w.soil + '.' : ''}`;
  const TABS = w => [
    ['Ficha', `<dl class="specs">${[['Uva', w.composition], ['Viñedo', w.vineyard], ['Altura', w.altitude], ['Suelo', w.soil], ['Cosecha', w.harvest], ['Crianza', w.ageing], ['Alcohol', w.alcohol], ['Producción', w.production], ['Guarda', w.cellar], ['Añada', w.vintage]].filter(r => r[1]).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`],
    ['Maridaje', `<p class="h-m" style="max-width:22em">${w.pairing}</p><p class="lede" style="margin-top:18px">${w.id === 'fatalsb' ? 'Servilo bien frío, entre 8 y 10 °C.' : 'Servilo entre 16 y 18 °C. Si podés, abrilo media hora antes.'}</p>`],
    ['Envíos y pagos', `<div class="specs"><div><dt>Envíos</dt><dd>A todo el país, coordinados por WhatsApp</dd></div><div><dt>Mercado Pago</dt><dd>Tarjeta, débito o dinero en cuenta</dd></div><div><dt>Transferencia</dt><dd>Enviás el comprobante por WhatsApp</dd></div><div><dt>Cajas</dt><dd>De ${T.box} botellas: cerrada de un vino o combinada</dd></div></div>`]
  ];
  const tabs = w => TABS(w).map((t, i) => `<button role="tab" id="tab-${i}" aria-controls="tabp-${i}" aria-selected="${!i}" tabindex="${i ? -1 : 0}" data-tab="${i}">${t[0]}</button>`).join('');
  const panes = w => TABS(w).map((t, i) => `<div role="tabpanel" id="tabp-${i}" aria-labelledby="tab-${i}" tabindex="0" class="${i ? '' : 'on'}">${t[1]}</div>`).join('');
  const others = w => T.wines.filter(x => x.id !== w.id).map(o => `
    <article class="card" data-reveal style="--c-bg:${cardBg(o)};--c-ink:${o.theme.ink};--c-accent:${o.theme.accent};--c-glow:${glow[o.id]}">
      <a class="card__stage card__stage--sm" href="${T.url(o)}">${pic(o.img, { alt: o.full, sizes: BOTTLE_SIZES })}</a>
      <h3><a href="${T.url(o)}">${name(o)}</a></h3><p>${o.tagline}</p>
      <div class="card__row"><span class="price">${T.ars(o.price)} <small>c/u</small></span><div style="display:flex;gap:8px"><a class="btn btn--ghost btn--sm" href="${T.url(o)}"><span class="lbl">Ver</span></a><button class="btn btn--sm ${o.id !== 'malbec' ? 'btn--light' : ''}" data-add="${o.id}" aria-label="Sumar una botella de ${o.full} a tu caja"><span class="lbl">Sumar</span>${ARROW}</button></div></div>
    </article>`).join('');

  return { ARROW, esc, pic, thumb, name, glow, deck, fatalCards, shopCards, terroirImgs, terroirIdx, terroirPanes, terroirMobile, timeline, storyPhotos, faq, FAQ, orbit, footer,
    facts, cta, buybox, shots, thumbs, mediaStatic, cataH, aromas, crianza, terroirLine, tabs, panes, others };
});
