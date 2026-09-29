/* Tesón · Worker de tesonwines.com. Sirve el sitio estático (ASSETS), redirige las URLs viejas
   y, desde el checkout, crea pedidos y cobra con Mercado Pago (Checkout Pro por API).

   Bindings (wrangler): ASSETS (sitio), PEDIDOS (KV).
   Secretos (panel de Cloudflare): MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET (opcional, valida la firma de los avisos),
   RESEND_API_KEY (mails; sin ella no se mandan).
   Variables opcionales: SITE (por defecto https://tesonwines.com; en la URL de prueba, la *.workers.dev),
   MAIL_FROM (por defecto pedidos@tesonwines.com), MAIL_TO (por defecto tesonwines@gmail.com). */
import { customerMail, shopMail } from './emails.js';

/* ---------- Precios y envío. El servidor es la fuente de verdad: nunca se usa el precio que manda
   el navegador. Tienen que coincidir con js/data.js (el sitio los muestra, acá se cobran). ---------- */
const WINES = {
  malbec: { name: 'Tesón Malbec 2022', price: 12000 },
  redblend: { name: 'Tesón Red Blend 2022', price: 18000 },
  prestige: { name: 'Tesón Malbec Prestige 2022', price: 23000 },
  fatalmalbec: { name: 'Fatal Malbec', price: 8000 },
  fatalsb: { name: 'Fatal Sauvignon Blanc', price: 8000 }
};
const BOX = 6, MAX_BOXES = 50;
// Andreani a domicilio, caja de 6 (7,1 kg), cotizado desde Mendoza el 29-09-2026: $ 25.223 la primera
// caja al resto del país (Patagonia $ 29.878, Ushuaia $ 35.753), y cada caja extra suma entre $ 5.700 y $ 8.200.
// En Mendoza lo lleva la logística de la familia.
const SHIPPING = { first: 25000, extra: 7000, free: ['Mendoza'] };
const TRANSFER_OFF = 0.10;   // sobre los vinos, no sobre el envío
const BANK = { holder: 'Tesón Wines', alias: 'tesonwines', cvu: '0000003100018360291217' };   // igual que pay.bank en js/data.js
const PROVINCES = ['Buenos Aires', 'CABA', 'Catamarca', 'Chaco', 'Chubut', 'Córdoba', 'Corrientes', 'Entre Ríos', 'Formosa', 'Jujuy', 'La Pampa', 'La Rioja', 'Mendoza', 'Misiones', 'Neuquén', 'Río Negro', 'Salta', 'San Juan', 'San Luis', 'Santa Cruz', 'Santa Fe', 'Santiago del Estero', 'Tierra del Fuego', 'Tucumán'];

/* ---------- URLs del sitio viejo (WordPress) ---------- */
const WINE_BY_WORD = [
  [/prestige/, '/vinos/malbec-prestige/'],
  [/red-?blend|blend/, '/vinos/red-blend/'],
  [/sauvignon|blanc/, '/vinos/fatal-sauvignon-blanc/'],
  [/fatal/, '/vinos/fatal-malbec/'],
  [/malbec/, '/vinos/malbec/']
];
function legacy(path) {
  const p = path.toLowerCase();
  if (/^\/(producto|product)\//.test(p)) {
    const hit = WINE_BY_WORD.find(([re]) => re.test(p));
    return hit ? hit[1] : '/';
  }
  if (/^\/(tienda|shop|carrito|cart|finalizar-compra|checkout|mi-cuenta|my-account|producto-categoria|product-category|categoria-producto)(-\d+)?(\/|$)/.test(p)) return '/';
  if (/^\/(nosotros|quienes-somos|historia|about|sobre-nosotros|la-bodega|bodega)(-\d+)?(\/|$)/.test(p)) return '/#historia';
  if (/^\/(finca|vinedo|viñedo|terroir)(-\d+)?(\/|$)/.test(p)) return '/#finca';
  if (/^\/(contacto|contact)(-\d+)?(\/|$)/.test(p)) return '/#faq';
  if (/^\/(inicio|home|index\.php|wp-login\.php|wp-admin|feed|blog)(\/|$)/.test(p)) return '/';
  return null;
}

/* ---------- Utilidades ---------- */
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const ars = n => '$ ' + Math.round(n).toLocaleString('es-AR');
const clean = (v, max = 120) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const site = env => (env.SITE || 'https://tesonwines.com').replace(/\/$/, '');
// Números argentinos para wa.me: 54 9 + característica sin 0 + número sin 15.
const waNumber = phone => {
  let d = String(phone).replace(/\D/g, '');
  if (d.startsWith('54')) return d;
  d = d.replace(/^0/, '');
  return '549' + (d.length === 12 ? d.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2') : d);
};
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

export function shippingFor(province, boxes) {
  if (SHIPPING.free.includes(province)) return 0;
  return SHIPPING.first + SHIPPING.extra * (boxes - 1);
}

// Arma el pedido con los precios del servidor. Devuelve { error } si algo no cierra.
export function quote(items, province, pay) {
  if (!Array.isArray(items) || !items.length) return { error: 'La caja está vacía.' };
  const lines = [];
  for (const it of items) {
    const w = WINES[it && it.id], q = Number(it && it.q);
    if (!w || !Number.isInteger(q) || q < 1) return { error: 'Hay un vino que no reconocemos. Recargá la página y armá la caja de nuevo.' };
    const prev = lines.find(l => l.id === it.id);
    if (prev) prev.q += q; else lines.push({ id: it.id, name: w.name, price: w.price, q });
  }
  const bottles = lines.reduce((s, l) => s + l.q, 0);
  if (bottles % BOX) return { error: `Enviamos cajas completas de ${BOX}.` };
  const boxes = bottles / BOX;
  if (boxes > MAX_BOXES) return { error: `Para más de ${MAX_BOXES} cajas escribinos por WhatsApp.` };
  if (!PROVINCES.includes(province)) return { error: 'Elegí la provincia de entrega.' };
  const wines = lines.reduce((s, l) => s + l.price * l.q, 0);
  const shipping = shippingFor(province, boxes);
  const discount = pay === 'bank' ? Math.round(wines * TRANSFER_OFF) : 0;
  return { lines, bottles, boxes, wines, shipping, discount, total: wines + shipping - discount };
}

function customer(c) {
  c = c || {};
  const out = {
    name: clean(c.name, 80), email: clean(c.email, 120).toLowerCase(), phone: clean(c.phone, 30),
    province: clean(c.province, 40), city: clean(c.city, 80), zip: clean(c.zip, 10), address: clean(c.address, 160), notes: clean(c.notes, 400)
  };
  if (out.name.length < 3) return { error: 'Falta tu nombre.' };
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(out.email)) return { error: 'Revisá el email.' };
  if (out.phone.replace(/\D/g, '').length < 8) return { error: 'Revisá el WhatsApp.' };
  if (!out.city || !out.address) return { error: 'Falta la dirección de entrega.' };
  if (!/^[a-z]?\d{4}[a-z]{0,3}$/i.test(out.zip)) return { error: 'Revisá el código postal.' };
  return out;
}

// Número de pedido correlativo (T-1001, T-1002...). KV no es atómico; con el volumen de Tesón alcanza,
// y si dos pedidos llegan en el mismo instante el segundo salta al siguiente número libre.
async function nextOrderId(env) {
  let n = Number(await env.PEDIDOS.get('seq')) || 1000;
  for (let i = 0; i < 20; i++) {
    n += 1;
    if (!(await env.PEDIDOS.get('pedido:T-' + n))) { await env.PEDIDOS.put('seq', String(n)); return 'T-' + n; }
  }
  return 'T-' + Date.now().toString(36).toUpperCase();
}
const getOrder = async (env, id) => JSON.parse((await env.PEDIDOS.get('pedido:' + id)) || 'null');
const putOrder = (env, o) => env.PEDIDOS.put('pedido:' + o.id, JSON.stringify(o));

/* ---------- POST /api/checkout ---------- */
async function checkout(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Pedido inválido.' }, 400); }
  const pay = body.pay === 'bank' ? 'bank' : 'mp';
  const c = customer(body.customer);
  if (c.error) return json(c, 400);
  const q = quote(body.items, c.province, pay);
  if (q.error) return json(q, 400);

  const id = await nextOrderId(env);
  const order = { id, created: new Date().toISOString(), status: 'pendiente', pay, customer: c, ...q };
  await putOrder(env, order);

  if (pay === 'bank') {
    await mails(env, order, 'Pedido nuevo · espera transferencia', true);
    return json({ order: publicOrder(order) });
  }

  const base = site(env), back = `${base}/gracias/?pedido=${id}`;
  const [first, ...rest] = c.name.split(' ');
  const pref = {
    items: [
      ...q.lines.map(l => ({ id: l.id, title: l.name, quantity: l.q, unit_price: l.price, currency_id: 'ARS', category_id: 'food' })),
      ...(q.shipping ? [{ id: 'envio', title: `Envío Andreani (${q.boxes} ${q.boxes === 1 ? 'caja' : 'cajas'})`, quantity: 1, unit_price: q.shipping, currency_id: 'ARS' }] : [])
    ],
    payer: { name: first, surname: rest.join(' '), email: c.email, phone: { number: c.phone }, address: { zip_code: c.zip, street_name: c.address } },
    external_reference: id,
    back_urls: { success: back, failure: back, pending: back },
    auto_return: 'approved',
    notification_url: `${base}/api/mp/webhook`,
    statement_descriptor: 'TESON WINES',
    binary_mode: true,
    metadata: { pedido: id }
  };
  const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, 'content-type': 'application/json', 'x-idempotency-key': id },
    body: JSON.stringify(pref)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.init_point) {
    console.log('mp preference error', r.status, JSON.stringify(data));
    return json({ error: 'No pudimos abrir Mercado Pago. Probá de nuevo o escribinos por WhatsApp.', order: id }, 502);
  }
  order.mpPreference = data.id;
  await putOrder(env, order);
  // Con credenciales de prueba se usa sandbox_init_point para pagar con las tarjetas de prueba.
  const test = String(env.MP_ACCESS_TOKEN || '').startsWith('TEST-');
  return json({ order: publicOrder(order), init_point: test && data.sandbox_init_point ? data.sandbox_init_point : data.init_point });
}

/* ---------- POST /api/mp/webhook ---------- */
// Firma de Mercado Pago: x-signature "ts=...,v1=..." = HMAC-SHA256(secret, "id:{data.id};request-id:{x-request-id};ts:{ts};")
export async function validSignature(request, url, secret) {
  const sig = request.headers.get('x-signature') || '', reqId = request.headers.get('x-request-id') || '';
  const parts = Object.fromEntries(sig.split(',').map(p => p.trim().split('=')));
  if (!parts.ts || !parts.v1 || !secret) return false;
  let dataId = url.searchParams.get('data.id') || '';
  if (/^[a-z0-9]+$/i.test(dataId)) dataId = dataId.toLowerCase();
  let manifest = '';
  if (dataId) manifest += `id:${dataId};`;
  if (reqId) manifest += `request-id:${reqId};`;
  manifest += `ts:${parts.ts};`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  if (mac.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < mac.length; i++) diff |= mac.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  return diff === 0;
}

async function webhook(request, env) {
  const url = new URL(request.url);
  const body = await request.json().catch(() => ({}));
  const type = url.searchParams.get('type') || body.type;
  const paymentId = url.searchParams.get('data.id') || (body.data && body.data.id);
  if (type !== 'payment' || !paymentId) return new Response('ok');   // otros avisos no nos interesan
  // La firma es una capa extra: se valida si está cargada la clave del panel de Webhooks. Sin ella el aviso llega
  // igual (por la notification_url de cada preferencia) y la seguridad la da el paso siguiente.
  if (env.MP_WEBHOOK_SECRET && !(await validSignature(request, url, env.MP_WEBHOOK_SECRET))) return new Response('bad signature', { status: 401 });

  // Nunca se confía en el aviso: se consulta el pago a Mercado Pago con nuestra clave y se chequean pedido y monto.
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } });
  if (!r.ok) return new Response('retry', { status: 502 });   // Mercado Pago reintenta
  const p = await r.json();
  const order = await getOrder(env, p.external_reference);
  if (!order) return new Response('ok');
  if (order.status === 'pagado') return new Response('ok');   // idempotente: el aviso puede llegar varias veces

  order.payments = [...(order.payments || []).filter(x => x.id !== p.id), { id: p.id, status: p.status, detail: p.status_detail, amount: p.transaction_amount, at: new Date().toISOString() }];
  if (p.status === 'approved') {
    if (Math.abs(Number(p.transaction_amount) - order.total) > 1 || p.currency_id !== 'ARS') {
      order.status = 'revisar';   // pagó un monto distinto: no se despacha sin mirar
      await putOrder(env, order);
      await mails(env, order, `Revisar pago · monto ${ars(p.transaction_amount)} distinto del pedido`, false);
      return new Response('ok');
    }
    order.status = 'pagado'; order.paidAt = new Date().toISOString(); order.mpPayment = p.id;
    const TYPES = { credit_card: 'Tarjeta de crédito', debit_card: 'Tarjeta de débito', prepaid_card: 'Tarjeta prepaga', account_money: 'Dinero en cuenta', ticket: 'Efectivo', bank_transfer: 'Transferencia' };
    const brand = p.payment_method_id && p.payment_type_id !== 'account_money' ? p.payment_method_id.charAt(0).toUpperCase() + p.payment_method_id.slice(1) : '';
    order.method = [TYPES[p.payment_type_id] || p.payment_type_id, brand, p.installments > 1 ? p.installments + ' cuotas' : ''].filter(Boolean).join(' · ');
    await putOrder(env, order);
    await mails(env, order, 'Venta confirmada · a despachar', true);
  } else if (p.status === 'rejected' || p.status === 'cancelled') {
    order.status = 'rechazado';
    await putOrder(env, order);
  } else {
    await putOrder(env, order);
  }
  return new Response('ok');
}

/* ---------- GET /api/pedido/:id (lo mínimo para la página de gracias) ---------- */
function publicOrder(o) {
  return {
    id: o.id, status: o.status, pay: o.pay, firstName: o.customer.name.split(' ')[0],
    lines: o.lines.map(l => ({ id: l.id, name: l.name, q: l.q, price: l.price })),
    bottles: o.bottles, boxes: o.boxes, wines: o.wines, shipping: o.shipping, discount: o.discount, total: o.total
  };
}

/* ---------- Mails (Resend): confirmación al cliente y aviso a Tesón para despachar ---------- */
async function sendMail(env, { to, subject, html, text, replyTo }) {
  if (!env.RESEND_API_KEY) return console.log('mail skipped (no RESEND_API_KEY):', subject);
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: `Tesón Wines <${env.MAIL_FROM || 'pedidos@tesonwines.com'}>`, to: [to], subject, html, text, reply_to: replyTo })
  });
  if (!r.ok) console.log('mail error', r.status, await r.text());
}
// Un mail que falla nunca frena el pedido ni el webhook.
async function mails(env, o, headline, toCustomer) {
  const base = site(env), jobs = [];
  const shop = shopMail(o, base, headline, waNumber(o.customer.phone));
  jobs.push(sendMail(env, { to: env.MAIL_TO || 'tesonwines@gmail.com', replyTo: o.customer.email, ...shop }));
  if (toCustomer) jobs.push(sendMail(env, { to: o.customer.email, replyTo: env.MAIL_TO || 'tesonwines@gmail.com', ...customerMail(o, base, BANK) }));
  await Promise.all(jobs.map(j => j.catch(e => console.log('mail error', e && e.message))));
}

/* ---------- Router ---------- */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname.startsWith('/api/')) {
      try {
        if (url.pathname === '/api/checkout' && request.method === 'POST') return await checkout(request, env);
        if (url.pathname === '/api/mp/webhook' && request.method === 'POST') return await webhook(request, env);
        const m = url.pathname.match(/^\/api\/pedido\/(T-[A-Z0-9]+)$/);
        if (m && request.method === 'GET') {
          const o = await getOrder(env, m[1]);
          return o ? json({ order: publicOrder(o) }) : json({ error: 'No encontramos ese pedido.' }, 404);
        }
        return json({ error: 'No existe.' }, 404);
      } catch (e) {
        console.log('api error', e && e.stack);
        return json({ error: 'Algo falló de nuestro lado. Escribinos por WhatsApp.' }, 500);
      }
    }
    const to = legacy(decodeURIComponent(url.pathname));
    if (to) return Response.redirect(url.origin + to, 301);
    return env.ASSETS.fetch(request);
  }
};
