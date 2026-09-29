# Checkout de tesonwines.com con Mercado Pago

*29-09-2026. Implementa la opción B de `../pasarela-pago.md`.*

Este es el proyecto **completo** del sitio: se reconstruyó desde tesonwines.com el 29-09-2026 (el proyecto original quedó en otra computadora) y se le sumó el checkout. Cloudflare lo publica solo en cada push (Workers Builds), así que no hace falta terminal.

| Ruta | Qué es |
|---|---|
| `wrangler.jsonc` | Configuración del Worker `teson-wines` (sitio estático + API + KV `teson-pedidos`) |
| `src/worker.js` | Redirecciones del sitio viejo, `/api/checkout`, `/api/mp/webhook` y `/api/pedido/:id` |
| `src/emails.js` | Mails de pedido con la estética de Tesón (vista previa en `emails-preview/`) |
| `public/` | El sitio: páginas, `js/`, `css/`, imágenes, `gracias/`, `_headers` |
| `tools/version.mjs` | Actualiza los `?v=` de JS y CSS en los HTML. **Correrlo después de tocar cualquier .js o .css** (se cachean un año) |
| `andreani_quotes.json` | Cotizaciones de Andreani usadas para fijar el envío |

## Reglas de negocio

- **Precios:** los mismos de hoy. Están en dos lugares, `worker.js` (lo que se cobra) y `js/data.js` (lo que se muestra). Si se cambia un precio, se cambia en los dos.
- **Envío a domicilio (Andreani):** $ 25.000 la primera caja y $ 7.000 cada caja adicional. En Mendoza, incluido.
  Cotizado en el sistema de Andreani el 29-09-2026, desde Mendoza, con su tipo de envío "Vinos, caja x 6":

  | Destino | A domicilio, 1 caja |
  |---|---|
  | CABA, GBA, La Plata, Mar del Plata, Córdoba, Rosario, Santa Fe, Tucumán, Salta, NEA, Cuyo, Santa Rosa | $ 25.223 |
  | Neuquén, Bariloche, Bahía Blanca, Comodoro, Río Gallegos | $ 29.878 |
  | Ushuaia | $ 35.753 |
  | Gran Mendoza / Tunuyán | $ 17.939 / $ 21.581 |

  Una caja adicional le suma a Andreani entre $ 5.700 y $ 8.200. Con $ 25.000 + $ 7.000 queda cubierto casi todo el país; en Patagonia y Tierra del Fuego se pierde un poco por envío.
- **Transferencia:** 10% de descuento sobre los vinos (el envío no se descuenta). Titular Tesón Wines, alias `tesonwines` y CVU de Mercado Pago, en `js/data.js` (`pay.bank`) y en `worker.js` (`BANK`).
- **Mercado Pago:** Checkout Pro, `binary_mode` (aprobado o rechazado, sin pendientes). El webhook valida la firma, consulta el pago a Mercado Pago, confirma que el monto coincide con el pedido y recién ahí lo marca `pagado`. Si el monto no coincide, lo marca `revisar` y avisa por mail.

## Cómo se publica

Cloudflare → Workers & Pages → `teson-wines` → Settings → Build: conectado a `felipeandreu-10/personal`, directorio `teson/sitio`, comando de deploy `npx wrangler deploy`. Cada push a la rama conectada publica el sitio.

Claves (Settings → Variables and Secrets, tipo **Secret**): `MP_ACCESS_TOKEN` (obligatoria), `RESEND_API_KEY` (mails) y `MP_WEBHOOK_SECRET` (opcional: si está, se valida la firma de los avisos de Mercado Pago; sin ella los avisos llegan igual y cada pago se verifica consultándolo a Mercado Pago). Sin la de Mercado Pago, el botón de pagar muestra un error y ofrece WhatsApp; la transferencia funciona igual.

Webhook de Mercado Pago: `https://tesonwines.com/api/mp/webhook`, evento **Pagos**.

Prueba: con credenciales de prueba, comprar logueado con un usuario de prueba **comprador** (Mercado Pago Developers → Cuentas de prueba) y una [tarjeta de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards) con titular `APRO`. Tiene que volver a `/gracias/?pedido=T-…`, pasar a "pagado", vaciar la caja y mandar los dos mails.

Los pedidos quedan en el KV `teson-pedidos` (Cloudflare → Storage → KV), uno por clave `pedido:T-xxxx`.

## Mails de pedido

| Cuándo | Al cliente | A tesonwines@gmail.com |
|---|---|---|
| Pago aprobado en Mercado Pago | "Tu pedido T-xxxx está confirmado", con la caja, el total y la dirección | "Venta confirmada · a despachar", con cliente, WhatsApp, dirección, medio de pago y la caja |
| Pedido por transferencia | "Tu caja está reservada", con alias, CVU y el total con descuento | "Pedido nuevo · espera transferencia" |
| Pago con monto distinto al pedido | nada | "Revisar pago" |

Si el cliente contesta el mail, la respuesta llega a tesonwines@gmail.com, y viceversa.

Se mandan con **Resend** (gratis hasta 3.000 mails por mes). Cloudflare solo puede mandar mails a direcciones verificadas, así que no sirve para escribirle al cliente. Para activarlo:

1. Crear la cuenta en resend.com con tesonwines@gmail.com.
2. Domains → Add domain → `tesonwines.com`. Resend muestra 3 o 4 registros DNS; como el dominio está en Cloudflare, el botón "Auto configure" los carga solo. Si no, se copian a mano en Cloudflare → DNS.
3. API Keys → Create API key (permiso "Sending access") y cargarla en Cloudflare como secret `RESEND_API_KEY`.

Los mails salen desde `pedidos@tesonwines.com`; si se quiere otra dirección, se define la variable `MAIL_FROM`.

## Pasar a producción

1. Activar las credenciales de producción en la aplicación de Mercado Pago y configurar el webhook en modo productivo.
2. Reemplazar `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` en Cloudflare por los de producción.
3. Una compra real chica y devolverla desde el panel de Mercado Pago.
