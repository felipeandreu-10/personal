/* Tesón · content. Sources: fichas técnicas, contraetiquetas (cosecha 2022), lista de precios,
   "Después de una vida" (Leo Andreu, 2022). Prices are placeholders pending Felipe. */
window.TESON = {
  contact: { phone: '5492615090170', phoneLabel: '+54 9 261 509 0170', email: 'tesonwines@gmail.com', instagram: 'teson_wines', place: 'Vista Flores, Valle de Uco, Mendoza' },
  pay: {
    // Mixed boxes have variable totals, so Mercado Pago needs a checkout created per order (later: Cloudflare Function).
    mp: { box: '' },
    bank: { holder: '', alias: 'tesonwines', cbu: '' }   // holder and CBU pending Felipe; empty fields are hidden
  },
  box: 6,   // we only ship full boxes of 6; the customer mixes any wines
  wines: [
    { id: 'malbec', slug: 'malbec', name: 'Malbec', full: 'Malbec', vintage: '2022', price: 12000,
      tagline: 'Frescura y vivacidad de pequeñas cepas entre piedras.',
      line: 'Fruta roja, violetas y una acidez que no se olvida.',
      theme: { bg: '#FFF7E8', ink: '#2E3B4A', accent: '#EA5828', wine: '#4B0F22', deep: '#1f040c', rim: 'rgba(214,120,170,.55)' },
      composition: '100% Malbec', vineyard: 'Vista Flores, Tunuyán, Mendoza', altitude: '1.050 m s. n. m.', soil: 'Aluvional, poco profundo y pedregoso',
      harvest: 'Manual, segunda semana de marzo', ageing: 'Vasijas de cemento revestidas en epoxi', production: '6.000 botellas', alcohol: '14,0%', cellar: '10 años',
      notes: 'De color rojo profundo con destellos violáceos. Aromas intensos a frutos rojos y violetas. En boca impacta su gran concentración de fruta y firme acidez junto con notas de pimienta negra y ciruelas maduras. Final intenso y vibrante.',
      aromas: ['Frutos rojos', 'Violetas', 'Pimienta negra', 'Ciruela madura'], pairing: 'Platos mediterráneos, pastas y empanadas argentinas.',
      img: '/assets/img/malbec-hd.webp', tilt: '/assets/img/malbec-tilt-hd.webp', label: '/assets/img/label-malbec.webp' },
    { id: 'redblend', slug: 'red-blend', name: 'Red Blend', full: 'Red Blend', vintage: '2022', price: 18000,
      tagline: 'Una mezcla de historias, sueños y sacrificios.',
      line: 'Malbec y Cabernet co-fermentados, doce meses en roble francés.',
      theme: { bg: '#4A5581', ink: '#FFF7E8', accent: '#EB6665', wine: '#6d1426', deep: '#26040c', rim: 'rgba(240,120,130,.55)' },
      composition: '85% Malbec, 15% Cabernet Sauvignon (co-fermentados)', vineyard: 'Vista Flores, Tunuyán y La Gloria, Tupungato', altitude: '1.050 m s. n. m.', soil: 'Aluvional, poco profundo y pedregoso',
      harvest: 'Manual, tercera semana de marzo', ageing: '12 meses en barricas de roble francés nuevo y de segundo uso', production: '3.000 botellas', alcohol: '14,5%', cellar: '10 años',
      notes: 'Color rojo rubí distintivo con destellos violáceos. En nariz predominan los frutos rojos y el carácter balsámico. En boca, notable complejidad y estructura, taninos firmes y elegantes, sutiles notas especiadas y casis. Final intenso y elegante.',
      aromas: ['Frutos rojos', 'Balsámico', 'Especias', 'Casis'], pairing: 'Guisos y carnes contundentes, ojo de bife o tomahawk a la parrilla.',
      img: '/assets/img/redblend-hd.webp', tilt: '/assets/img/redblend-tilt-hd.webp', label: '/assets/img/label-redblend.webp' },
    { id: 'prestige', slug: 'malbec-prestige', name: 'Malbec', edition: 'Prestige', full: 'Malbec Prestige', vintage: '2022', price: 23000,
      tagline: 'La profundidad que solo dan el tiempo y la paciencia.',
      line: 'Doce meses de barrica para una guarda larga.',
      theme: { bg: '#343433', ink: '#FFF7E8', accent: '#C17E55', wine: '#3a0714', deep: '#140105', rim: 'rgba(200,110,140,.5)' },
      composition: '100% Malbec', vineyard: 'Vista Flores, Tunuyán, Mendoza', altitude: '1.050 m s. n. m.', soil: 'Aluvional, poco profundo y pedregoso',
      harvest: 'Manual, tercera semana de marzo', ageing: '12 meses en barricas de roble francés nuevo y de segundo uso', production: '3.000 botellas', alcohol: '14,0%', cellar: '10 años',
      notes: 'De color rojo profundo con destellos violáceos. Aromas intensos a frutos rojos maduros y notas especiadas. En boca resulta amplio, generoso, con gran concentración de fruta y firme acidez como pilar para una guarda prolongada. Final intenso y elegante.',
      aromas: ['Frutos rojos maduros', 'Especias', 'Roble francés'], pairing: 'Costillar a la llama, cordero patagónico o un buen steak.',
      img: '/assets/img/prestige-hd.webp', tilt: '/assets/img/prestige-tilt-hd.webp', label: '/assets/img/label-prestige.webp' },
    /* Fatal Wines: the younger line inside Tesón. Source: Brochure_Fatal.pdf. */
    { id: 'fatalmalbec', slug: 'fatal-malbec', name: 'Malbec', brand: 'Fatal', full: 'Fatal Malbec', vintage: '', price: 8000,
      tagline: 'Jugoso, fresco y sin tregua.', line: 'Fruta roja fresca, taninos suaves, para compartir.',
      theme: { bg: '#F2E6D3', ink: '#2B2340', accent: '#FF4D4D', wine: '#5a0f2e', deep: '#22041a', rim: 'rgba(200,110,200,.55)' },
      composition: '100% Malbec', vineyard: 'Vista Flores (corazón del Valle de Uco), Tunuyán, Mendoza', altitude: '1.050 m s. n. m.', alcohol: '14,0%',
      notes: 'De intenso color violeta, nos regala aromas de fruta roja fresca como ciruela y cereza. En boca se presenta jugoso y fresco, de acidez viva, taninos suaves y un final intenso y frutal.',
      aromas: ['Ciruela', 'Cereza', 'Fruta roja fresca'], pairing: 'Empanadas mendocinas, queso fresco y pizzas artesanales.',
      img: '/assets/img/fatal-malbec.webp', label: '/assets/img/label-fatal-mb.webp' },
    { id: 'fatalsb', slug: 'fatal-sauvignon-blanc', name: 'Sauvignon Blanc', brand: 'Fatal', full: 'Fatal Sauvignon Blanc', vintage: '', price: 8000,
      tagline: 'Cítrico, vibrante y refrescante.', line: 'Pomelo rosado, maracuyá y un final mineral.',
      theme: { bg: '#8E82AC', ink: '#FFF7E8', accent: '#6FD3CB', wine: '#e9dc8e', deep: '#c9b85a', rim: 'rgba(255,255,230,.7)' },
      composition: '100% Sauvignon Blanc', vineyard: 'Rivadavia, Mendoza', altitude: '850 m s. n. m.', alcohol: '12,0%',
      notes: 'Color amarillo pálido con reflejos acerados. En nariz despliega aromas cítricos con notas herbáceas. En boca resulta fresco, de vibrante acidez, con recuerdo de pomelo rosado y maracuyá, notas minerales y final refrescante.',
      aromas: ['Cítricos', 'Herbáceo', 'Pomelo rosado', 'Maracuyá'], pairing: 'Pescados grasos, ensaladas verdes y quesos de cabra.',
      img: '/assets/img/fatal-sauvignon.webp', label: '/assets/img/label-fatal-sb.webp' }
  ],
  story: [
    { year: '1937', title: 'Alcantarilla, Murcia', text: 'Felipe Andreu López nace el 8 de diciembre en plena Guerra Civil Española, tercero de cinco hermanos. Su padre era el encargado de la estación de trenes del pueblo.', img: '/assets/img/caminante.webp' },
    { year: '1951', title: 'Catorce años menos un día', text: 'El 7 de diciembre salen de Alcantarilla dieciséis personas con cuarenta y ocho valijas, despedidas por la banda del pueblo. En Bilbao se embarcan en el vapor Salta y llegan a Buenos Aires el 31 de diciembre. De ahí, en tren hasta Mendoza.', img: '/assets/img/aerea-cruce-caminos.webp' },
    { year: 'Años 50', title: 'Antes de los camiones, el pan', text: 'Felipe aprende el oficio de panadero en las panaderías de su padre y termina el secundario de noche.', img: '/assets/img/racimos.webp' },
    { year: '1962', title: 'Un Ford 600', text: 'El 15 de marzo compra su primer camión, un Ford 600, con la ayuda de su familia. Empieza a construir, a fuerza de tesón, su propio camino en el transporte.', img: '/assets/img/finca-camino-andes.webp' },
    { year: '1983', title: 'Volver a empezar', text: 'A los 45 años se reinventa y funda con sus hijos Felipe Andreu e Hijos, la empresa de transporte que hoy sigue en manos de la familia.', img: '/assets/img/finca-camino-dorado.webp' },
    { year: '2010', title: 'Finca Arcobaleno', text: 'Entre 2010 y 2012 se plantan en Vista Flores los 12 cuarteles de Malbec en pie franco, a 1.050 metros, al pie de los Andes.', img: '/assets/img/finca-aerea-atardecer.webp' },
    { year: 'Hoy', title: 'Tesón', text: 'La familia retoma el sueño de hacer vino con la uva de la finca. Tesón lleva su nombre por lo que lo trajo hasta acá.', img: '/assets/img/manos-racimo.webp' }
  ],
  terroir: [
    { k: '01', title: 'Valle de Uco', text: 'Vista Flores, Tunuyán. Al pie de la Cordillera de los Andes, donde el sol pega fuerte y las noches son frías.', img: '/assets/img/andes-atardecer.webp' },
    { k: '02', title: 'Entre piedras', text: 'Suelo aluvional, poco profundo y pedregoso. La vid sufre un poco, y eso se nota en la copa.', img: '/assets/img/vid-entre-piedras.webp' },
    { k: '03', title: 'A mano', text: 'Cosechamos a mano en marzo, racimo por racimo, en los 12 cuarteles de Malbec en pie franco. Más de 250 días de sol al año.', img: '/assets/img/manos-racimo.webp' },
    { k: '04', title: 'Paciencia', text: 'Cemento para el Malbec, doce meses de roble francés para el Red Blend y el Prestige.', img: '/assets/img/cosecha.webp' }
  ]
};
TESON.teson = TESON.wines.filter(w => !w.brand);
TESON.fatal = TESON.wines.filter(w => w.brand === 'Fatal');
TESON.byId = id => TESON.wines.find(w => w.id === id) || TESON.wines[0];
TESON.url = w => '/vinos/' + w.slug + '/';
TESON.site = 'https://tesonwines.com';
TESON.ars = n => '$' + Math.round(n).toLocaleString('es-AR');
TESON.wa = text => 'https://wa.me/' + TESON.contact.phone + '?text=' + encodeURIComponent(text || '');
