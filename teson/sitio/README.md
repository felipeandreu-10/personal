# Checkout de tesonwines.com con Mercado Pago

*29-09-2026. Implementa la opción B de `../pasarela-pago.md`.*

Estos archivos son la versión nueva de los del proyecto que se publica con `wrangler` desde la computadora de Felipe. El punto de partida fue una copia del sitio online del 25-09 (commit anterior a este en el repo), así que el diff de git muestra exactamente qué cambió.

| Archivo | Qué hace |
|---|---|
| `worker.js` | Reemplaza al Worker actual. Mantiene las redirecciones del sitio viejo y suma `/api/checkout`, `/api/mp/webhook` y `/api/pedido/:id` |
| `emails.js` | Los mails de pedido con la estética de Tesón: uno al cliente y otro a tesonwines@gmail.com. Vista previa en `emails-preview/` |
| `assets/email/` | Logo y sello en PNG para los mails (los mails no muestran SVG) |
| `js/data.js` | Agrega envío, provincias y el 10% por transferencia. Saca el link fijo de Mercado Pago |
| `js/site.js` | El carrito ahora tiene tres pasos: la caja, "Tus datos" con el pago, y los datos de la transferencia |
| `css/site.css` | Estilos del formulario, del resumen y de `/gracias` (agregados al final del archivo) |
| `gracias/index.html`, `js/gracias.js` | Página nueva a la que vuelve Mercado Pago |
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

## Cómo probarlo (con las credenciales de prueba)

Todo esto se hace desde la carpeta del proyecto del sitio, en tu computadora.

1. Copiar estos archivos sobre los del proyecto (mismas rutas). `gracias/` y `js/gracias.js` son nuevos.
2. Crear el lugar donde se guardan los pedidos:
   ```
   npx wrangler kv namespace create PEDIDOS
   ```
   y agregar al `wrangler.toml` (o `wrangler.jsonc`) lo que imprime:
   ```toml
   [[kv_namespaces]]
   binding = "PEDIDOS"
   id = "<el id que te dio el comando>"
   ```
3. Cargar las credenciales **de prueba** como secretos (te las pide el comando; no quedan en ningún archivo):
   ```
   npx wrangler secret put MP_ACCESS_TOKEN      # el Access Token de prueba (empieza con TEST- o APP_USR-)
   npx wrangler secret put MP_WEBHOOK_SECRET    # la clave secreta de Webhooks
   npx wrangler secret put RESEND_API_KEY       # para los mails (ver abajo); sin ella todo funciona, pero no salen mails
   ```
4. Si tu proyecto calcula los `?v=` de los scripts al publicar, `gracias/index.html` va a necesitar el mismo tratamiento. Publicar con el comando de siempre.
5. En Mercado Pago Developers → tu aplicación → Webhooks → modo prueba: URL `https://tesonwines.com/api/mp/webhook`, evento **Pagos**.
6. Hacer una compra con una [tarjeta de prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/your-integrations/test/cards): nombre del titular `APRO` para aprobado, `OTHE` para rechazado. Hay que pagar logueado con un **usuario de prueba comprador** (se crea en "Cuentas de prueba"), no con tu cuenta.

Qué tiene que pasar: vuelve a `tesonwines.com/gracias/?pedido=T-1001`, a los segundos dice "pagado", la caja queda vacía y llegan los dos mails.

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
3. API Keys → Create API key (permiso "Sending access") y cargarla con `npx wrangler secret put RESEND_API_KEY`.

Los mails salen desde `pedidos@tesonwines.com`; si se quiere otra dirección, se define la variable `MAIL_FROM`.

## Pasar a producción

1. Activar las credenciales de producción en la aplicación de Mercado Pago.
2. `npx wrangler secret put MP_ACCESS_TOKEN` con el Access Token de producción, y `MP_WEBHOOK_SECRET` con la clave del webhook de producción (se configura igual que el de prueba, en modo productivo).
3. Una compra real chica y devolverla desde el panel de Mercado Pago.

## Nota

El sitio sigue publicado con el carrito viejo hasta que se publique esto. Mientras las credenciales no estén cargadas, "Pagar con Mercado Pago" muestra un error y ofrece WhatsApp; la transferencia funciona igual.
