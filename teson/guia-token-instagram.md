# Instrucción para Claude en mi computadora: token de Instagram para Tesón

Objetivo: obtener un token de acceso de larga duración de la API de Instagram para la cuenta @teson_wines y guardarlo en el entorno de Claude Code en la nube como la variable IG_ACCESS_TOKEN. Con ese token, la sesión de Claude en la nube publica los posts semanales directamente en Instagram, sin Zapier ni otros intermediarios.

## Reglas

- Trabajá en mi navegador, con mis sesiones ya iniciadas. Si una pantalla pide una contraseña o un código de verificación, parás y me lo pedís a mí. Lo escribo yo.
- El token nunca se escribe en el chat, en un archivo, en un mail ni en una captura. Solo se copia de la página de Meta al campo de la variable en claude.ai.
- Si una pantalla no coincide con lo descrito, buscá la opción equivalente por su nombre. Meta cambia los menús seguido. Si no la encontrás, avisame antes de improvisar.
- No crees cuentas nuevas, no aceptes ningún pago y no cambies nada en la cuenta de Instagram fuera de lo indicado.

## Parte 1. La cuenta de Instagram tiene que ser profesional

1. Abrí https://www.instagram.com/accounts/edit/ con la cuenta @teson_wines.
2. En Configuración, entrá en "Tipo de cuenta y herramientas" (o "Cuenta profesional") y comprobá que sea una cuenta profesional, de tipo Empresa o Creador. Si no lo es, cambiala a Empresa con la categoría "Bodega" o "Vinos". No hace falta vincular una página de Facebook.

## Parte 2. Crear la app en Meta for Developers

3. Abrí https://developers.facebook.com/ e iniciá sesión con mi cuenta de Facebook. Si pide registrarme como desarrollador, aceptá los términos y verificá con mi mail o mi teléfono. Si hace falta un código, me lo pedís.
4. Entrá en "Mis apps" y tocá "Crear app".
5. Cuando pregunte el caso de uso, elegí "Gestionar mensajes y contenido en Instagram" (en inglés, "Manage messaging and content on Instagram"). Si en cambio pide un tipo de app, elegí "Empresa" (Business) y después agregá el producto "Instagram" desde el panel.
6. Nombre de la app: "Teson Instagram". Mail de contacto: el mío. Si ofrece elegir una cartera comercial (Business portfolio), dejala sin seleccionar. Tocá "Crear app". Si pide mi contraseña de Facebook, me la pedís a mí.

## Parte 3. Generar el token

7. En el panel de la app, en el menú de la izquierda, entrá en "Instagram" y después en "Configuración de la API con inicio de sesión de Instagram" (en inglés, "API setup with Instagram login").
8. En el bloque "1. Generar tokens de acceso", tocá "Agregar cuenta" y escribí el usuario teson_wines. Meta le manda a esa cuenta una invitación para ser cuenta de prueba (tester).
9. Aceptá la invitación desde Instagram: abrí https://www.instagram.com/accounts/manage_access/ con @teson_wines, entrá en la pestaña "Invitaciones de tester" y aceptá la de "Teson Instagram". En la app del teléfono está en Configuración, "Sitio web y permisos", "Apps y sitios web", "Invitaciones de tester".
10. Volvé al panel de Meta y recargá la página. Al lado de la cuenta tocá "Generar token". Se abre una ventana de Instagram: si pide iniciar sesión con @teson_wines, me pedís la clave a mí. Aceptá los permisos. Tienen que quedar marcados al menos estos tres: instagram_business_basic, instagram_business_content_publish e instagram_business_manage_insights.
11. Meta muestra el token después de tildar "Entiendo". Copialo al portapapeles y no lo pegues en ningún otro lado.

## Parte 4. Guardarlo en el entorno de Claude Code

12. En otra pestaña abrí https://claude.ai/code y entrá en la sesión de Tesón, la que tiene el repositorio "personal". En la barra del título hay un menú del entorno en la nube. Tocá "Editar" (Edit).
13. En la sección de variables de entorno (o en "Credenciales de API", si aparece esa sección) agregá una variable con el nombre IG_ACCESS_TOKEN y pegá el token como valor. Guardá.
14. Cerrá la pestaña de Meta donde el token quedó visible.

## Parte 5. Avisarme

15. Escribime en el chat solo "token guardado" y, si algo fue distinto de lo descrito, contame qué. Sin el token y sin capturas donde se vea.

## Datos útiles

- El token dura 60 días. Cada 50 días la sesión en la nube va a recordar que hay que repetir la Parte 3 desde el paso 10 y la Parte 4. Son cinco minutos.
- La app queda en "modo desarrollo". Alcanza: con @teson_wines agregada como cuenta de prueba, la app puede publicar en esa cuenta sin pasar por la revisión de Meta.
- Si en el paso 10 Meta dice que la cuenta no es profesional, volvé a la Parte 1.
