# Estilo visual de @teson_wines

Leído de las 28 imágenes de los 23 posts publicados (junio 2024 a agosto 2025). Es la gramática que siguen los templates de `contenido/build_posts.py`.

## Lo que se repite

1. **Foto limpia con el logotipo chico.** Es el formato más usado: una foto sola (macro de uvas, hojas o piedras; hileras; los Andes a la hora dorada; gente trabajando) sin ningún texto, con "T·E·S·Ó·N" en blanco, centrado, al 90% de la altura y con un 18% del ancho. El caption dice todo lo demás.
2. **Tarjeta carbón.** Fondo carbón (#2C2F30) con textura fina de lienzo. Una foto vertical inset a la izquierda; la botella (render) pisa el borde derecho de la foto y cae más abajo que ella. Arriba a la izquierda, una frase en dos registros en la misma línea: Engravers en versalitas espaciadas ("LA NATURALEZA Y EL ESFUERZO HUMANO") y Garamond itálica ("se unieron para crear algo extraordinario."). Arriba a la derecha, el nombre del vino en cobre y versalitas ("TESÓN MALBEC."). Sin logotipo: lo lleva la botella.
3. **Papel crema rasgado.** Sobre una foto en blanco y negro, un rectángulo de papel envejecido (grano, bordes rasgados, sombra) con la cita: primera línea en Garamond negrita, el resto en itálica, y el autor en versalitas con guion adelante ("-FELIPE ANDREU LÓPEZ"). Logotipo blanco abajo.
4. **Placa de portada.** Para reels y series: sobre la foto, un cartucho oscuro centrado arriba, con doble filete y un ornamento encima; adentro "CAPÍTULO I" en versalitas y "La finca" en itálica grande. Logotipo abajo.
5. **Marca sola.** Carbón con el logotipo cobre centrado (dos tercios del ancho). Carbón con el sello (la T con vides, "Abriendo caminos · Cultivando amistades") y "MENDOZA · ARGENTINA" debajo. Noche (#2E3B4A) con una tarjeta crema centrada y la frase de la casa en itálica. Arpillera con el sello.
6. **Blanco y negro para la historia.** El abuelo en el escritorio, las manos con la copa: lo que es memoria va sin color.
7. **Colores:** carbón, noche, crema y cobre. El crema aparece solo como papel o tarjeta, nunca como fondo de una foto.
8. **Tipografía:** Engravers Gothic para rótulos cortos en versalitas espaciadas (20 a 22 px a 1080 de ancho); EB Garamond itálica para lo emotivo (30 a 64 px); negrita solo en la primera línea de una cita. No hay títulos grandes sobre foto: el único caso ("Abriendo caminos", julio 2024) era un mosaico partido en placas.
9. **Fotos:** luz natural, hora dorada u otoño, poca profundidad de campo, encuadres cerrados. Nada de stock.

## Calidez y juventud: lo que se suma

La cuenta ya tenía tres fondos con textura (lienzo carbón, papel, arpillera) y un motivo de azulejo. Los usamos así, para que las piezas no queden todas oscuras ni iguales:

- **Arpillera** (`assets/tex/arpillera.jpg`, generada a partir de la del post de noviembre 2024): fondo de las piezas de regalo, caja y comunidad. Con ella van la etiqueta colgante de papel con hilo de cobre (empresas, Día de la Mujer, Día del Padre), las cinco botellas de Navidad y el sello en tinta (Gracias, Tres años). Texto en tinta, acentos en cobre hondo.
- **Azulejo sobre noche** (patrón `azulejo.svg`, cuadrifolio y estrellas en crema al 24%): la tradición murciana de la etiqueta, para los cierres de marca y el Día del Vino.
- **Papel rasgado** también sin foto, sobre noche o carbón, para condiciones y fechas.
- **Fatal, la línea joven,** se distingue sin salirse de la paleta: fondo noche (Sauvignon Blanc), tinta (Malbec) o carbón (los dos) con la misma textura de lienzo; el ángel de la etiqueta en grande, recortado por los bordes, en cobre o en crema y ghosteado; la botella inclinada; el titular grande en itálica; un anillo fino de cobre, girado, con el dato ("Bien frío · 8 a 10 °C", "Con empanadas y pizza"); y el logotipo FATAL en cobre. Nada de bloques de color ni stickers de colores: lo disruptivo lo ponen la figura, la inclinación y el tamaño del titular. Para que las piezas no se repitan, el ángel cambia de encuadre (`crop`: `full`, `face` las caras, `wing` el ala, `embrace` el abrazo), de color (`angel_c`: cobre, crema, claro) y de lado (`flip`, y `layout: left` con la botella a la izquierda y el titular a la derecha).

## Cómo lo aplican los templates

| Template | Regla | Se usa en |
| --- | --- | --- |
| `photo` | 1 (con `label` opcional en versalitas arriba a la izquierda) | placas de carrusel |
| `photo` + `plaque` | 4 | portadas de reel y de serie (Capítulos) |
| `product` | 2 | vino de la semana, Día de la Madre, empresas |
| `quote` | 3 | historia, citas de la etiqueta |
| `paper` | 3 sin foto, sobre noche o carbón | condiciones, fechas |
| `brand`, `sello` | 5, con fondo carbón, azulejo o arpillera | cierres de carrusel, CTA, fin de año, aniversario |
| `tag` | arpillera + papel colgante + botella inclinada | empresas, Día de la Mujer, Día del Padre |
| `fatal` | el lenguaje de Fatal (variantes `sb`, `mb`, `duo`) | todos los posts de Fatal |
| `trio`, `steps`, `label` | extensión de 2, con fondo carbón, azulejo o arpillera | cajas, personalizados, pasos |

## Lo que no copiamos

- El texto "Un Legado de Resiliencia y Pasión, VISITÁ WWW.TESONWINES.COM" sobre la foto del caminante (noviembre 2024): otra tipografía, rompe la regla 8.
- Emojis y el cierre bilingüe de los captions de 2024.

## Fotos disponibles y las que faltan

En `assets/img/`: 21 fotos y renders del sitio, más seis del export de Instagram recortadas sin el logotipo impreso (`ig-racimo-hojas`, `ig-brote-malla`, `ig-piedras`, `ig-abuelo-escritorio-bn`, `ig-caminante-atardecer`, `ig-cosecha-manos`). En el Drive, "1er Embotellado" (julio 2024) tiene 12 videos y 16 fotos de 13 a 18 MB.

Faltan, y hay que pedirlas o producirlas: Felipe y la familia; la caja de 6 armada; etiquetas personalizadas reales sobre botella; la brotación (octubre); la bodega y las barricas; una foto de archivo de Felipe Andreu López.
