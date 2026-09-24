# Tesón Wines · Marketing y contenido

Carpeta de trabajo de la estrategia de crecimiento de Tesón (Felipe Andreu S.A., Vista Flores, Valle de Uco).

| Qué | Dónde |
| --- | --- |
| Estrategia completa (diagnóstico, públicos, Instagram, personalizados, roadmap web, plan 30/60/90) | `estrategia.md` |
| Calendario de Instagram, 12 semanas, con copy final, slides y stories | `contenido/calendario.json` |
| Piezas renderizadas (1080 x 1350) y captions listos para publicar | `contenido/posts/` |
| Script que genera las piezas desde el calendario | `contenido/build_posts.py` |
| Qué dicen los 23 posts ya publicados (números, tono, qué cambia) | `instagram-historico.md` |
| Gramática visual de la cuenta y cómo la siguen los templates | `estilo-instagram.md` |
| Planilla de KPIs mensuales | `kpis.md` |
| Fotos, renders, etiquetas y ornamentos de la marca (del design system) | `assets/` |

Design system: https://claude.ai/artifact/RLwpU7FKDr53cKL9bNCYui · Sitio nuevo: https://claude.ai/artifact/8ymRohiFMLLWNchACMHEAa

## Cómo se publica cada semana

1. La pieza de la semana ya está en `contenido/posts/<id>-<n>.jpg` y el caption en `contenido/posts/<id>.txt`.
2. Publicación automática: conector "Instagram for Business" (Zapier) con la cuenta @teson_wines (tiene que ser cuenta Business ligada a una página de Facebook). Las imágenes se toman por URL pública desde este repo (`raw.githubusercontent.com`).
3. Si el conector no está autorizado, la pieza y el caption se envían por mail a tesonwines@gmail.com para subirlos a mano.

## Regenerar piezas

```bash
pip install playwright pillow
cp <design-system>/assets/fonts/EngraversGothic-*.otf teson/contenido/build/fonts/
python3 teson/contenido/build_posts.py            # todas
python3 teson/contenido/build_posts.py s02-dia-de-la-madre   # una
```
