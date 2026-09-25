# Pasarela de pago de tesonwines.com · propuesta

*25-09-2026. Escrito para Felipe, después de leer el sitio que está online (Worker de Cloudflare "teson-wines", código en `js/site.js` y `js/data.js`).*

## 1. Cómo funciona hoy

- El carrito ("Tu caja") vive en el navegador. Obliga a completar cajas de 6 y suma el total con los precios de `data.js`.
- Al llegar a 6 botellas aparecen tres pestañas: WhatsApp, Transferencia y Mercado Pago. **Las tres terminan en un mensaje de WhatsApp.** La de Mercado Pago dice literalmente "¿Me pasan el link de Mercado Pago?": el cliente espera que vos armes el link a mano, con el total exacto de su caja.
- No hay número de pedido, no se pide dirección ni email, no se sabe cuánto cuesta el envío hasta que alguien contesta el WhatsApp, y no queda registro de nada fuera del chat.
- En `data.js` los datos bancarios están vacíos (`holder` y `cbu`), solo hay el alias `tesonwines`. El link de Mercado Pago (`pay.mp.box`) está vacío.

**Por qué importa para el objetivo del año.** Instagram va a mandar gente al sitio a cualquier hora. Hoy cada venta depende de que alguien conteste un WhatsApp, arme un link y espere el comprobante. Además, sin un pago confirmado en el sitio no hay evento de compra para el Pixel de Meta ni para GA4, y la pauta de noviembre no va a poder optimizar por ventas, solo por clics.

## 2. Las opciones, con mi recomendación

| Opción | Qué es | Lo bueno | Lo malo |
|---|---|---|---|
| A. Links de pago fijos por producto | Creás en el panel de Mercado Pago un link por caja cerrada (5 links) y se ponen en cada tarjeta | Cero código, se hace en una hora | No sirve para cajas mixtas, no calcula envío, no captura dirección ni email, no hay número de pedido, conciliación a mano |
| **B. Checkout Pro por API (recomendada)** | El sitio crea, para cada pedido, una preferencia de pago en Mercado Pago con el total exacto (vinos + envío) y manda al cliente a pagar. Mercado Pago avisa al sitio cuando el pago se aprueba | Cajas mixtas, envío calculado, número de pedido, datos del cliente, confirmación automática, página de gracias, tarjeta/débito/cuotas/dinero en cuenta, evento de compra para Meta y GA4 | Comisión de Mercado Pago (ver abajo). Un día de trabajo mío y media hora tuya para las credenciales |
| C. Tiendanube / Shopify | Mudar la tienda a una plataforma | Todo resuelto | Abono mensual además de la comisión, y se tira el sitio a medida que ya tenemos |
| D. Checkout Bricks (formulario de tarjeta dentro del sitio) | El cliente carga la tarjeta sin salir de tesonwines.com | Un poco más de conversión | Más integración; conviene después, cuando B ya venda |

Recomiendo **B**, manteniendo la transferencia (con un descuento que compense la comisión) y dejando WhatsApp como canal de consulta, no como pasarela.

**Comisión de Mercado Pago.** Depende del plazo en que elijas liberar la plata: aproximadamente entre 4% y 6,4% + IVA por venta (la cifra exacta está en tu cuenta, sección "Costos"). Con un descuento del 10% por transferencia el cliente que paga por transferencia te cuesta menos que uno que paga con tarjeta, y el que quiere cuotas paga la comisión con el precio de lista.

## 3. Cómo queda el flujo para el cliente

1. Arma su caja de 6 como hoy (esto ya funciona bien y no se toca).
2. Al completar la caja aparece **"Tus datos"**: nombre, WhatsApp, email, provincia y dirección. Con la provincia el sitio muestra el costo de envío antes de pagar.
3. Elige cómo pagar:
   - **Pagar con Mercado Pago** (botón principal): va a la página de Mercado Pago con el total exacto, paga con tarjeta, débito, cuotas o dinero en cuenta y vuelve a `tesonwines.com/gracias` con su número de pedido.
   - **Transferencia (10% off)**: ve titular, alias y CBU, el total con descuento y un botón "Ya transferí" que abre WhatsApp con el número de pedido y el comprobante.
   - Abajo, chico: "¿Querés que te asesoremos? Escribinos por WhatsApp" con el pedido ya armado, como hoy.
4. Página de gracias: "Pedido T-1043 confirmado. Te escribimos por WhatsApp para coordinar la entrega." Con el resumen de la caja y un botón para escribirnos.

## 4. Cómo queda del lado nuestro

- Cada pedido se guarda con número, cliente, caja, envío, forma de pago y estado (`pendiente`, `pagado`, `rechazado`).
- Cuando Mercado Pago aprueba el pago avisa al sitio (webhook), el pedido pasa a `pagado` y llega un mail a tesonwines@gmail.com con todo lo necesario para despachar. Mercado Pago también te notifica en la app y le manda el comprobante al cliente.
- Las transferencias se confirman a mano como hoy, pero con número de pedido y datos completos.
- Devoluciones: desde el panel de Mercado Pago, sin código.

## 5. Arquitectura técnica (para quien lo implemente)

Todo corre en el mismo Worker `teson-wines`, sin agregar servidores ni plataformas.

**Rutas nuevas en `worker.js`**

- `POST /api/checkout`: recibe la caja `[{id, q}]`, los datos del cliente y la forma de pago. Valida en el servidor (vinos existentes, múltiplos de 6, máximo 50 cajas), **recalcula el total con los precios del servidor** (nunca confía en el precio que manda el navegador), aplica envío por provincia y descuento por transferencia, crea el pedido en KV (`pedido:T-xxxx`) y, si es Mercado Pago, crea la preferencia con `POST https://api.mercadopago.com/checkout/preferences` (`Authorization: Bearer MP_ACCESS_TOKEN`) con `items` (un ítem por vino y otro por envío), `payer`, `external_reference = número de pedido`, `back_urls` (`/gracias?pedido=…`), `auto_return: approved`, `notification_url = https://tesonwines.com/api/mp/webhook`, `statement_descriptor: "TESON WINES"`, `binary_mode: true` (aprobado o rechazado, sin pendientes eternos) y `metadata`. Devuelve `{pedido, init_point}` y el navegador redirige a `init_point`.
- `POST /api/mp/webhook`: valida la firma `x-signature` (HMAC-SHA256 con la clave secreta del webhook sobre `id:{data.id};request-id:{x-request-id};ts:{ts};`), responde 200 enseguida, consulta `GET https://api.mercadopago.com/v1/payments/{id}`, chequea que `external_reference` y `transaction_amount` coincidan con el pedido guardado, actualiza el estado y manda el mail. Idempotente: si el pedido ya está `pagado`, no hace nada.
- `GET /api/pedido/:id`: estado público mínimo (número, estado, resumen de la caja, nombre de pila) para la página de gracias.
- `GET /gracias`: página estática nueva con el estilo del sitio.

**Almacenamiento:** un namespace de KV (`PEDIDOS`). Un contador `seq` para numerar. Sin base de datos.

**Secretos (nunca en el código ni en el chat):** `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET`, cargados con `wrangler secret put` desde tu computadora, igual que el token de Instagram. El Public Key de Mercado Pago no hace falta con este esquema.

**Mail al vender:** binding `send_email` de Cloudflare Email Routing a tesonwines@gmail.com (sin proveedor extra). Si Email Routing no está activo en el dominio, alternativa: Resend con una API key.

**Front (`site.js`, `data.js`):** `renderCart()` gana el paso "Tus datos" y reemplaza las tres pestañas por los dos botones y el link de WhatsApp. `data.js` suma `shipping` (tabla por provincia), `bank` completo y `transferDiscount`. El envío se muestra antes de pagar.

**Medición:** evento `purchase` de GA4 y del Pixel de Meta en `/gracias` con valor y número de pedido, deduplicado por pedido. Es lo que después permite pautar por ventas.

**Prueba antes de salir:** se despliega en una URL de vista previa (`*.workers.dev`) con las credenciales de prueba de Mercado Pago y se hace una compra con tarjeta de prueba de punta a punta (pago aprobado, rechazado y abandono). Recién ahí se cargan las credenciales de producción.

## 6. Lo que necesito de vos para arrancar

1. **Credenciales de Mercado Pago.** En https://www.mercadopago.com.ar/developers, con tu cuenta de vendedor, crear una aplicación "Tesón Wines" con producto "Checkout Pro". Ahí aparecen el Access Token de producción y el de prueba, y en "Webhooks" la clave secreta. Se cargan como secretos del Worker desde tu computadora; no me los pases por chat.
2. **Política de envío.** Mi propuesta: envío incluido en Mendoza (Gran Mendoza y Valle de Uco, con la logística de Andreu) y un valor fijo por caja para el resto del país, incluido a partir de 2 cajas. Decime el número.
3. **Transferencia.** ¿10% de descuento por transferencia, o mismo precio? Y titular y CBU de la cuenta (el alias `tesonwines` ya está).
4. **Cuotas.** Propongo permitir cuotas sin absorber el costo (el cliente paga el interés del banco). Si querés ofrecer 3 cuotas sin interés en fechas puntuales, se activa desde el panel de Mercado Pago.
5. **Dónde está el código del sitio.** El Worker se publicó desde una computadora con `wrangler` (última publicación hoy a las 10:43). Necesito que ese proyecto esté en un repo de GitHub al que pueda empujar, o que me digas en qué carpeta de tu computadora está para que Claude ahí aplique los cambios que yo dejo listos en este repo.

Con las respuestas, el orden de trabajo es: backend y página de gracias (medio día), cambios en el carrito (medio día), prueba de punta a punta en la URL de vista previa, y salida a producción. La compra queda funcionando sola las 24 horas y vos solo despachás.
