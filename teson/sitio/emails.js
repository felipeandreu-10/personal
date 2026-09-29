/* Tesón · mails de pedido. HTML de tabla con estilos en línea (lo único que respetan Gmail y Outlook),
   con la paleta del sitio: crema #FFF7E8, noche #2E3B4A, cobre #AB785D, rojo #C4461C. EB Garamond donde
   el cliente de mail la carga; Georgia en el resto. */

const C = { crema: '#FFF7E8', crema2: '#F6EBD6', noche: '#2E3B4A', muted: '#5E6A77', cobre: '#AB785D', rojo: '#C4461C', line: '#E6DCC9' };
const SERIF = "'EB Garamond', Garamond, Georgia, 'Times New Roman', serif";
const CAPS = "font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:3px;text-transform:uppercase";
const WA_PHONE = '5492615090170';

const ars = n => '$ ' + Math.round(n).toLocaleString('es-AR');
const esc = s => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const wa = text => `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(text)}`;

function row(label, value, strong) {
  const st = strong ? `font-size:20px;color:${C.noche};font-weight:600` : `font-size:17px;color:${C.muted}`;
  return `<tr><td style="padding:6px 0;font-family:${SERIF};${st}">${label}</td><td align="right" style="padding:6px 0;font-family:${SERIF};${st};white-space:nowrap">${value}</td></tr>`;
}

function summary(o, label = 'Tu caja') {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};margin:8px 0 28px">
    <tr><td colspan="2" style="padding:18px 0 6px;${CAPS};color:${C.cobre}">${label} · ${o.bottles} botellas</td></tr>
    ${o.lines.map(l => row(`${l.q} × ${esc(l.name)}`, ars(l.price * l.q))).join('')}
    ${o.discount ? row('10% off por transferencia', '−' + ars(o.discount)) : ''}
    ${row('Envío', o.shipping ? ars(o.shipping) : 'Incluido')}
    ${row('Total', ars(o.total), true)}
    <tr><td colspan="2" style="height:12px"></td></tr></table>`;
}

function button(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr><td style="border-radius:999px;background:${C.rojo}">
    <a href="${href}" style="display:inline-block;padding:16px 30px;${CAPS};font-size:12px;color:#ffffff;text-decoration:none">${label} &rarr;</a></td></tr></table>`;
}

function layout({ site, preheader, eyebrow, title, body }) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:0;background:${C.crema2}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.crema2}"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.crema};border-radius:24px">
    <tr><td align="center" style="padding:40px 32px 8px"><a href="${site}"><img src="${site}/assets/email/wordmark.png" width="200" height="28" alt="TESÓN" style="display:block;border:0"></a></td></tr>
    <tr><td style="padding:32px 40px 8px">
      <p style="margin:0 0 14px;${CAPS};color:${C.cobre}">${eyebrow}</p>
      <h1 style="margin:0 0 18px;font-family:${SERIF};font-weight:400;font-size:34px;line-height:1.1;color:${C.noche}">${title}</h1>
      ${body}
    </td></tr>
    <tr><td align="center" style="padding:28px 40px 36px;border-top:1px solid ${C.line}">
      <img src="${site}/assets/email/sello.png" width="56" height="56" alt="" style="display:block;border:0;margin:0 auto 14px">
      <p style="margin:0 0 6px;font-family:${SERIF};font-style:italic;font-size:19px;color:${C.noche}">A fuerza de tesón.</p>
      <p style="margin:0 0 14px;font-family:${SERIF};font-size:14px;color:${C.muted}">Finca Arcobaleno · Vista Flores, Valle de Uco, Mendoza<br>
        <a href="${wa('Hola Tesón!')}" style="color:${C.muted}">+54 9 261 509 0170</a> · <a href="https://instagram.com/teson_wines" style="color:${C.muted}">@teson_wines</a></p>
      <p style="margin:0;${CAPS};font-size:9px;letter-spacing:2px;color:${C.muted}">Beber con moderación. Prohibida su venta a menores de 18 años.</p>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

const p = html => `<p style="margin:0 0 18px;font-family:${SERIF};font-size:18px;line-height:1.5;color:${C.noche}">${html}</p>`;
const address = c => `${esc(c.address)}, ${esc(c.city)} (${esc(c.zip)}), ${esc(c.province)}`;

/* ---------- Al cliente ---------- */
export function customerMail(o, site, bank) {
  const c = o.customer, first = esc(c.name.split(' ')[0]);
  if (o.status === 'pagado') {
    const title = `Gracias, ${first}. Tu caja está en camino.`;
    return {
      subject: `Tu pedido ${o.id} está confirmado · Tesón`,
      html: layout({ site, preheader: `Recibimos tu pago de ${ars(o.total)}. Te escribimos por WhatsApp para coordinar la entrega.`, eyebrow: `Pedido ${o.id} · pagado`, title, body:
        p(`Recibimos tu pago y ya estamos armando la caja en la finca. Te escribimos por WhatsApp para coordinar la entrega en <b>${address(c)}</b>.`) +
        summary(o) +
        p(`Cada botella sale de los 12 cuarteles de Malbec en pie franco que plantó la familia en Vista Flores. Esperamos que la disfrutes tanto como nosotros haciéndola.`) +
        button(wa(`Hola Tesón! Soy ${c.name.split(' ')[0]}, pedido ${o.id}.`), 'Escribinos por WhatsApp') }),
      text: `Gracias, ${c.name.split(' ')[0]}. Tu pedido ${o.id} está pagado: ${ars(o.total)}.\nTe escribimos por WhatsApp para coordinar la entrega en ${c.address}, ${c.city}.\n\n${plainLines(o)}\n\nTesón · +54 9 261 509 0170`
    };
  }
  const bankLines = [bank.holder && `Titular: ${esc(bank.holder)}`, `Alias: <b>${esc(bank.alias)}</b>`, bank.cbu && `CBU: ${esc(bank.cbu)}`].filter(Boolean).join('<br>');
  return {
    subject: `Recibimos tu pedido ${o.id} · falta la transferencia · Tesón`,
    html: layout({ site, preheader: `Transferí ${ars(o.total)} al alias ${bank.alias} y mandanos el comprobante.`, eyebrow: `Pedido ${o.id} · reservado`, title: `Gracias, ${first}. Tu caja está reservada.`, body:
      p(`Para confirmarlo, transferí <b>${ars(o.total)}</b> (ya tiene el 10% off) y mandanos el comprobante por WhatsApp con tu número de pedido. Despachamos a <b>${address(c)}</b> cuando se acredita.`) +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr><td style="padding:18px 22px;border-radius:16px;background:${C.crema2};font-family:${SERIF};font-size:17px;line-height:1.6;color:${C.noche}">${bankLines}</td></tr></table>` +
      summary(o) +
      button(wa(`Hola Tesón! Transferí ${ars(o.total)} del pedido ${o.id}. Les mando el comprobante.`), 'Mandar el comprobante') }),
    text: `Gracias, ${c.name.split(' ')[0]}. Tu pedido ${o.id} está reservado.\nTransferí ${ars(o.total)} al alias ${bank.alias}${bank.cbu ? ' (CBU ' + bank.cbu + ')' : ''} y mandanos el comprobante por WhatsApp al +54 9 261 509 0170.\n\n${plainLines(o)}`
  };
}

/* ---------- A Tesón (para despachar) ---------- */
export function shopMail(o, site, headline, waCustomer) {
  const c = o.customer;
  const pay = o.pay === 'bank' ? 'Transferencia (10% off) · falta el comprobante' : 'Mercado Pago' + (o.method ? ' · ' + esc(o.method) : '');
  const info = [['Cliente', esc(c.name)], ['WhatsApp', `<a href="https://wa.me/${waCustomer}" style="color:${C.rojo}">${esc(c.phone)}</a>`], ['Email', `<a href="mailto:${esc(c.email)}" style="color:${C.noche}">${esc(c.email)}</a>`],
    ['Entrega', address(c)], ['Pago', pay], c.notes && ['Notas', esc(c.notes)]].filter(Boolean);
  return {
    subject: `${o.id} · ${headline} · ${ars(o.total)} · ${c.name}`,
    html: layout({ site, preheader: `${c.name} · ${o.bottles} botellas · ${c.city}, ${c.province}`, eyebrow: `Pedido ${o.id} · ${esc(o.status)}`, title: headline, body:
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px">${info.map(([k, v]) => `<tr><td valign="top" style="padding:5px 16px 5px 0;${CAPS};font-size:10px;color:${C.cobre};white-space:nowrap">${k}</td><td style="padding:5px 0;font-family:${SERIF};font-size:17px;color:${C.noche}">${v}</td></tr>`).join('')}</table>` +
      summary(o, 'La caja') + button(`https://wa.me/${waCustomer}?text=${encodeURIComponent(`Hola ${c.name.split(' ')[0]}! Te escribimos de Tesón por tu pedido ${o.id}.`)}`, 'Escribirle por WhatsApp') }),
    text: `${headline}\nPedido ${o.id} · ${o.status} · ${pay.replace(/<[^>]+>/g, '')}\n\n${plainLines(o)}\n\n${c.name} · ${c.phone} · ${c.email}\n${c.address}, ${c.city} (${c.zip}), ${c.province}${c.notes ? '\nNotas: ' + c.notes : ''}\nWhatsApp: https://wa.me/${waCustomer}`
  };
}

function plainLines(o) {
  return [...o.lines.map(l => `${l.q} x ${l.name} · ${ars(l.price * l.q)}`), o.discount ? `10% off transferencia: -${ars(o.discount)}` : '', `Envío: ${o.shipping ? ars(o.shipping) : 'incluido'}`, `TOTAL: ${ars(o.total)}`].filter(Boolean).join('\n');
}
