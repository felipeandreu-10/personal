/* Tesón · /gracias: muestra el pedido que vuelve de Mercado Pago (o de la transferencia) y, cuando el pago
   está confirmado, vacía la caja y avisa la compra a GA4 / Meta Pixel si están cargados. */
(function () {
  const T = window.TESON, box = document.getElementById('thanks');
  const q = new URLSearchParams(location.search), id = q.get('pedido') || '';
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
  const btn = (href, label, ext) => `<a class="btn btn--accent" href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}><span class="lbl">${label}</span>${T.ARROW || ''}</a>`;
  const sum = o => `<div class="co-sum">${o.lines.map(l => `<div><span>${l.q} × ${esc(l.name)}</span><span>${T.ars(l.price * l.q)}</span></div>`).join('')}
    ${o.discount ? `<div><span>10% off por transferencia</span><span>−${T.ars(o.discount)}</span></div>` : ''}
    <div><span>Envío</span><span>${o.shipping ? T.ars(o.shipping) : 'Incluido'}</span></div><div><b>Total</b><b>${T.ars(o.total)}</b></div></div>`;
  const show = (eyebrow, title, html) => { box.innerHTML = `<p class="eyebrow">${eyebrow}</p><h1 class="h-m">${title}</h1>${html}`; };

  function purchase(o) {
    const key = 'teson-purchase-' + o.id;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) {}
    if (T.clearCart) T.clearCart();
    const value = o.total;
    window.gtag && gtag('event', 'purchase', { transaction_id: o.id, value, currency: 'ARS', shipping: o.shipping, items: o.lines.map(l => ({ item_id: l.id, item_name: l.name, price: l.price, quantity: l.q })) });
    window.fbq && fbq('track', 'Purchase', { value, currency: 'ARS', content_ids: o.lines.map(l => l.id), content_type: 'product' }, { eventID: o.id });
  }

  let tries = 0;
  async function load() {
    if (!/^T-[A-Z0-9]+$/.test(id)) return show('Tu pedido', 'No encontramos el número de pedido.', `<p>Si ya pagaste, escribinos y lo buscamos.</p>${btn(T.wa('Hola Tesón! Hice un pedido en la web y no me apareció la confirmación.'), 'Escribinos por WhatsApp', 1)}`);
    let o;
    try { const r = await fetch('/api/pedido/' + id, { cache: 'no-store' }); o = (await r.json()).order; } catch (e) {}
    if (!o) return show('Pedido ' + esc(id), 'No encontramos este pedido.', `<p>Escribinos y lo resolvemos.</p>${btn(T.wa(`Hola Tesón! No encuentro mi pedido ${id}.`), 'Escribinos por WhatsApp', 1)}`);
    if (o.status === 'pagado') {
      purchase(o);
      return show('Pedido ' + o.id + ' · pagado', `Gracias, ${esc(o.firstName)}. Tu caja está en camino.`,
        `<p>Mercado Pago te mandó el comprobante por mail. Te escribimos por WhatsApp para coordinar la entrega.</p>${sum(o)}${btn(T.wa(`Hola Tesón! Soy ${o.firstName}, pedido ${o.id}.`), 'Escribinos por WhatsApp', 1)}`);
    }
    if (o.pay === 'bank') {
      return show('Pedido ' + o.id, `Gracias, ${esc(o.firstName)}. Falta la transferencia.`,
        `<p>Transferí <b>${T.ars(o.total)}</b> al alias <b>${esc(T.pay.bank.alias)}</b>${T.pay.bank.cvu ? ` (CVU ${esc(T.pay.bank.cvu)})` : ''} y mandanos el comprobante.</p>${sum(o)}${btn(T.wa(`Hola Tesón! Transferí ${T.ars(o.total)} del pedido ${o.id}. Les mando el comprobante.`), 'Mandar el comprobante', 1)}`);
    }
    if (o.status === 'rechazado' || q.get('collection_status') === 'rejected' || q.get('status') === 'rejected') {
      return show('Pedido ' + o.id, 'El pago no se aprobó.', `<p>No se cobró nada. Podés probar con otra tarjeta o pagar por transferencia con 10% off: tu caja sigue armada.</p>${btn('/', 'Volver a la caja')}`);
    }
    if (o.status === 'revisar') return show('Pedido ' + o.id, 'Recibimos tu pago.', `<p>Lo estamos revisando y te escribimos por WhatsApp en el día.</p>${sum(o)}`);
    // pendiente: el aviso de Mercado Pago suele llegar en segundos
    if (++tries < 15) { setTimeout(load, 3000); return show('Pedido ' + o.id, 'Estamos confirmando tu pago…', `<p>Esto tarda unos segundos. No cierres esta página.</p>${sum(o)}`); }
    show('Pedido ' + o.id, 'Todavía no nos llegó la confirmación.', `<p>Si Mercado Pago te dio el pago por aprobado, no te preocupes: te escribimos apenas nos llegue. Si no, podés volver a intentarlo.</p>${sum(o)}${btn(T.wa(`Hola Tesón! Pagué el pedido ${o.id} y no me apareció la confirmación.`), 'Escribinos por WhatsApp', 1)}`);
  }
  load();
})();
