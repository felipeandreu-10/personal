#!/usr/bin/env python3
"""Renderiza las piezas de Instagram de Tesón a partir de calendario.json.

Uso:  python3 build_posts.py [id-del-post ...]
Salida: contenido/posts/<id>-<n>.jpg (1080 x 1350) y contenido/posts/<id>.txt (caption).

Requiere: pip install playwright pillow; Chromium (PLAYWRIGHT_BROWSERS_PATH o CHROME_PATH).
Las fuentes se leen de contenido/build/fonts/ (EB Garamond está en assets/fonts; Engravers
Gothic BT es comercial y hay que copiarla ahí desde el design system de Tesón).

Los templates siguen la gramática visual de la cuenta @teson_wines (ver ../estilo-instagram.md):
foto limpia con el logotipo chico abajo; tarjeta carbón con textura, una línea en versalitas
más una en itálica y la botella sobre una foto; papel crema rasgado para citas; placa oscura
para las portadas de reel y de serie; sello y logotipo cobre sobre carbón para la marca.
"""
import json, os, sys, html, shutil, random
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
ASSETS = ROOT / "assets"
BUILD = HERE / "build"
OUT = HERE / "posts"
BUILD.mkdir(exist_ok=True); OUT.mkdir(exist_ok=True); (BUILD / "fonts").mkdir(exist_ok=True)
for f in (ASSETS / "fonts").glob("*.ttf"):
    if not (BUILD / "fonts" / f.name).exists():
        shutil.copy(f, BUILD / "fonts" / f.name)

CAL = json.load(open(HERE / "calendario.json", encoding="utf-8"))
WORDMARK = open(ASSETS / "svg" / "wordmark.svg", encoding="utf-8").read()
STAR = open(ASSETS / "svg" / "estrella.svg", encoding="utf-8").read()
SELLO = open(ASSETS / "svg" / "sello.svg", encoding="utf-8").read()

NOISE = ('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><filter id="n">'
         '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>'
         '<feColorMatrix type="saturate" values="0"/></filter><rect width="320" height="320" filter="url(#n)"/></svg>')
(BUILD / "noise.svg").write_text(NOISE, encoding="utf-8")

CREMA, CARBON, NOCHE, COBRE, TINTA, PAPEL = "#FFF7E8", "#2C2F30", "#2E3B4A", "#C17E55", "#1D1D1B", "#EFE6D0"

CSS = f"""
@font-face{{font-family:"EB Garamond";src:url("fonts/EBGaramond[wght].ttf");font-weight:400 800}}
@font-face{{font-family:"EB Garamond";src:url("fonts/EBGaramond-Italic[wght].ttf");font-weight:400 800;font-style:italic}}
@font-face{{font-family:"Engravers";src:url("fonts/EngraversGothic-Regular.otf");font-weight:400}}
@font-face{{font-family:"Engravers";src:url("fonts/EngraversGothic-Heavy.otf");font-weight:800}}
*{{box-sizing:border-box}}
html,body{{margin:0;width:1080px;height:1350px;overflow:hidden}}
body{{background:{CARBON};color:{CREMA};font-family:"EB Garamond",Garamond,serif;font-size:31px;line-height:1.4;position:relative}}
.abs{{position:absolute}}
.photo{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.bw{{filter:grayscale(1) contrast(1.06)}}
.sc{{font-family:"Engravers",serif;letter-spacing:.22em;text-transform:uppercase;font-size:21px;line-height:1.7}}
.it{{font-style:italic;font-weight:400}}
.mixed{{font-size:31px;line-height:1.5;font-style:italic}}
.mixed .sc{{font-style:normal;font-size:21px;letter-spacing:.22em;line-height:inherit}}
.cobre{{color:{COBRE}}}
.wm svg{{display:block;width:100%;height:auto}}
.wm{{position:absolute;left:50%;transform:translateX(-50%);bottom:76px;width:196px;color:{CREMA}}}
.carbon{{position:absolute;inset:0;background:{CARBON}}}
.carbon::before{{content:"";position:absolute;inset:0;background:url("noise.svg");opacity:.16;mix-blend-mode:overlay}}
.carbon::after{{content:"";position:absolute;inset:0;background:
  repeating-linear-gradient(0deg,rgba(255,255,255,.028) 0 1px,transparent 1px 3px),
  repeating-linear-gradient(90deg,rgba(255,255,255,.022) 0 1px,transparent 1px 3px),
  radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 50%,rgba(0,0,0,.30) 100%)}}
.noche{{position:absolute;inset:0;background:{NOCHE}}}
.noche::before{{content:"";position:absolute;inset:0;background:url("noise.svg");opacity:.12;mix-blend-mode:overlay}}
.paperwrap{{filter:drop-shadow(0 30px 40px rgba(0,0,0,.45)) drop-shadow(0 4px 6px rgba(0,0,0,.25))}}
.paper{{position:relative;background:{PAPEL};color:{TINTA};overflow:hidden}}
.paper::before{{content:"";position:absolute;inset:0;background:url("noise.svg");opacity:.22;mix-blend-mode:multiply}}
.paper::after{{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 60%,rgba(120,90,50,.16) 100%)}}
.paper > *{{position:relative;z-index:1}}
.legal{{font-family:"Engravers",serif;letter-spacing:.12em;font-size:14px;text-transform:uppercase;color:rgba(255,247,232,.55)}}
.plaque{{position:absolute;left:50%;transform:translateX(-50%);top:150px;display:flex;flex-direction:column;align-items:center;gap:22px}}
.plaque .box{{background:rgba(29,29,27,.86);border:1px solid rgba(255,247,232,.38);box-shadow:inset 0 0 0 6px rgba(29,29,27,.86),inset 0 0 0 7px rgba(255,247,232,.34);padding:36px 64px 40px;text-align:center;border-radius:4px;min-width:460px}}
.plaque .sc{{font-size:22px;letter-spacing:.34em;color:{CREMA}}}
.plaque .it{{font-size:64px;line-height:1.05;color:{CREMA};margin-top:6px}}
.plaque .orn{{width:34px;color:{CREMA}}}
.orn svg,.sello svg{{display:block;width:100%;height:auto}}
.label{{position:absolute;left:84px;top:84px;color:{CREMA};text-shadow:0 2px 12px rgba(0,0,0,.45)}}
.num{{font-style:italic;font-weight:500;font-size:96px;line-height:.9;color:{COBRE};letter-spacing:-.02em}}
.die{{clip-path:polygon(0 0,46% 0,50% 5%,54% 0,100% 0,100% 100%,54% 100%,50% 95%,46% 100%,0 100%)}}
"""


def torn(w, h, seed=7, step=8, amp=4, wave=7, period=150):
    """Polígono con bordes rasgados para un bloque de w x h px: una onda suave más fibra fina."""
    import math
    r = random.Random(seed); pts = []
    def edge(n, L):
        ph = r.uniform(0, 6.28); ph2 = r.uniform(0, 6.28)
        return [(i, wave * (0.5 + 0.5 * math.sin(6.28 * i / period + ph)) + 0.5 * wave * (0.5 + 0.5 * math.sin(6.28 * i / (period * 0.37) + ph2)) + r.uniform(0, amp)) for i in range(0, L + 1, step)]
    # cada borde arranca en su segundo punto: la esquina queda cortada en diagonal, como papel rasgado
    for x, d in edge(0, w)[1:]: pts.append((x, d))
    for y, d in edge(1, h)[1:]: pts.append((w - d, y))
    for x, d in edge(2, w)[1:]: pts.append((w - x, h - d))
    for y, d in edge(3, h)[1:]: pts.append((d, h - y))
    return "polygon(" + ",".join(f"{x:.1f}px {y:.1f}px" for x, y in pts) + ")"


def page(inner):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{inner}</body></html>'


def img(name):
    return f"../../assets/img/{name}"


def wm(color=CREMA, width=196, bottom=76):
    return f'<div class="wm" style="color:{color};width:{width}px;bottom:{bottom}px">{WORDMARK}</div>'


def mixed(sc, it, color=CREMA, width=620):
    return (f'<div class="mixed" style="max-width:{width}px;color:{color}">'
            f'<span class="sc">{html.escape(sc)}</span> {it}</div>')


def legal(s, left=84):
    return f'<div class="abs legal" style="left:{left}px;bottom:40px">{html.escape(CAL["legal"])}</div>' if s.get("legal") else ""


def T_photo(s):
    """Foto limpia. Opcional: label (versalitas arriba a la izquierda), plaque (portada de reel/serie)."""
    bw = " bw" if s.get("bw") else ""
    pos = f'object-position:{s["pos"]};' if s.get("pos") else ""
    parts = [f'<img class="photo{bw}" src="{img(s["img"])}" alt="" style="{pos}">',
             '<div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(29,29,27,.18) 0%,rgba(29,29,27,0) 30%,rgba(29,29,27,0) 70%,rgba(29,29,27,.30) 100%)"></div>']
    if s.get("label"):
        parts.append(f'<div class="label sc">{html.escape(s["label"])}</div>')
    if s.get("plaque"):
        p = s["plaque"]
        parts.append(f'<div class="plaque"><div class="orn">{STAR}</div><div class="box"><div class="sc">{html.escape(p["sc"])}</div><div class="it">{p["it"]}</div></div></div>')
    parts.append(wm())
    return page("".join(parts))


def T_product(s):
    """Tarjeta carbón: frase en versalitas + itálica, nombre del vino en cobre, foto inset y botella encima."""
    parts = ['<div class="carbon"></div>']
    parts.append(f'<div class="abs" style="left:84px;top:84px">{mixed(s["sc"], s["it"], width=540)}</div>')
    parts.append(f'<div class="abs sc cobre" style="right:84px;top:84px;width:360px;text-align:right">{html.escape(s.get("name",""))}</div>')
    if s.get("img"):
        bw = " bw" if s.get("bw") else ""
        parts.append(f'<div class="abs" style="left:104px;top:340px;width:600px;height:800px;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.45)"><img class="photo{bw}" src="{img(s["img"])}" alt=""></div>')
        parts.append(f'<img src="{img(s["bottle"])}" alt="" style="position:absolute;left:600px;bottom:96px;height:{s.get("h",930)}px;width:auto;filter:drop-shadow(0 40px 34px rgba(0,0,0,.55))">')
    else:
        parts.append(f'<img src="{img(s["bottle"])}" alt="" style="position:absolute;left:50%;transform:translateX(-50%);bottom:110px;height:{s.get("h",960)}px;width:auto;filter:drop-shadow(0 40px 34px rgba(0,0,0,.55))">')
    parts.append(legal(s))
    return page("".join(parts))


def T_quote(s):
    """Foto (en general blanco y negro) con papel crema rasgado: cita o dato, y autor en versalitas."""
    bw = "" if s.get("color") else " bw"
    w, h = 880, s.get("h", 470)
    q1 = f'<div style="font-size:46px;font-weight:600;line-height:1.2">{s["q1"]}</div>' if s.get("q1") else ""
    q2 = f'<div class="it" style="font-size:44px;line-height:1.22;margin-top:6px">{s["q2"]}</div>' if s.get("q2") else ""
    head = f'<div class="sc" style="font-size:19px;color:#6B5A43;margin-bottom:22px">{html.escape(s["sc"])}</div>' if s.get("sc") else ""
    author = f'<div class="sc" style="font-size:22px;margin-top:34px;color:#3A3530">{html.escape(s["author"])}</div>' if s.get("author") else ""
    top = s.get("top", 440)
    parts = [f'<img class="photo{bw}" src="{img(s["img"])}" alt="">',
             '<div class="abs" style="inset:0;background:rgba(29,29,27,.10)"></div>',
             f'<div class="abs paperwrap" style="left:{(1080-w)//2}px;top:{top}px"><div class="paper" style="width:{w}px;height:{h}px;clip-path:{torn(w,h,seed=s.get("seed",7))};display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:60px 70px">{head}{q1}{q2}{author}</div></div>',
             wm()]
    return page("".join(parts))


def T_paper(s):
    """Papel rasgado grande sobre noche o carbón: título en versalitas y texto en itálica."""
    bg = '<div class="noche"></div>' if s.get("theme", "noche") == "noche" else '<div class="carbon"></div>'
    w, h = 880, s.get("h", 760)
    lines = "".join(f'<div class="sc" style="font-size:20px;color:#3A3530">{html.escape(l)}</div>' for l in s.get("lines", []))
    parts = [bg,
             f'<div class="abs paperwrap" style="left:100px;top:{(1350-h)//2}px"><div class="paper" style="width:{w}px;height:{h}px;clip-path:{torn(w,h,seed=s.get("seed",11))};display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:70px 80px;gap:26px">'
             f'<div class="orn" style="width:30px;color:{COBRE}">{STAR}</div>'
             f'<div class="sc" style="font-size:22px;color:#6B5A43">{html.escape(s.get("sc",""))}</div>'
             f'<div class="it" style="font-size:42px;line-height:1.25">{s["it"]}</div>'
             f'<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">{lines}</div></div></div>',
             wm(COBRE if s.get("theme","noche")=="carbon" else CREMA), legal(s)]
    return page("".join(parts))


def T_brand(s):
    """Marca: logotipo cobre centrado sobre carbón, una frase en itálica y líneas en versalitas (cierre y CTA)."""
    lines = "".join(f'<div class="sc" style="font-size:20px;color:rgba(255,247,232,.85)">{html.escape(l)}</div>' for l in s.get("lines", []))
    it = f'<div class="it" style="font-size:54px;line-height:1.15;max-width:760px;text-align:center">{s["it"]}</div>' if s.get("it") else ""
    parts = ['<div class="carbon"></div>',
             f'<div class="abs" style="left:0;right:0;top:0;height:1350px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:44px">'
             f'<div class="wm" style="position:static;transform:none;width:{s.get("w",720)}px;color:{COBRE}">{WORDMARK}</div>{it}'
             f'<div class="orn" style="width:30px;color:{COBRE}">{STAR}</div>'
             f'<div style="display:flex;flex-direction:column;gap:10px;text-align:center">{lines}</div></div>', legal(s)]
    return page("".join(parts))


def T_sello(s):
    """Sello ornamental en cobre sobre carbón con una frase."""
    lines = "".join(f'<div class="sc" style="font-size:20px;color:rgba(255,247,232,.85)">{html.escape(l)}</div>' for l in s.get("lines", []))
    it = f'<div class="it" style="font-size:58px;line-height:1.15;max-width:800px;text-align:center">{s["it"]}</div>' if s.get("it") else ""
    parts = ['<div class="carbon"></div>',
             f'<div class="abs" style="left:0;right:0;top:0;height:1350px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:56px">'
             f'<div class="sello" style="width:{s.get("w",470)}px;color:{COBRE}">{SELLO}</div>{it}'
             f'<div style="display:flex;flex-direction:column;gap:10px;text-align:center">{lines}</div></div>']
    return page("".join(parts))


def T_trio(s):
    """Botellas sobre carbón con la frase arriba."""
    wines = ["malbec-hd.webp", "redblend-hd.webp", "prestige-hd.webp"]
    if s.get("fatal"):
        wines += ["fatal-malbec.webp", "fatal-sauvignon.webp"]
    h = 620 if s.get("fatal") else 760
    gap = 10 if s.get("fatal") else 40
    cols = "".join(f'<img src="{img(f)}" alt="" style="height:{h}px;width:auto;filter:drop-shadow(0 40px 34px rgba(0,0,0,.55))">' for f in wines)
    parts = ['<div class="carbon"></div>',
             f'<div class="abs" style="left:84px;top:84px">{mixed(s["sc"], s["it"], width=600)}</div>',
             f'<div class="abs sc cobre" style="right:84px;top:84px;width:300px;text-align:right">{html.escape(s.get("name",""))}</div>',
             f'<div class="abs" style="left:0;right:0;bottom:150px;display:flex;justify-content:center;align-items:flex-end;gap:{gap}px">{cols}</div>',
             (f'<div class="abs sc" style="left:0;right:0;bottom:80px;text-align:center;font-size:19px;color:rgba(255,247,232,.8)">{html.escape(s["foot"])}</div>' if s.get("foot") else ""),
             legal(s)]
    return page("".join(parts))


def T_steps(s):
    """Pasos numerados sobre carbón: número cobre en itálica, título en versalitas, texto en itálica."""
    rows = "".join(f'''<div style="display:grid;grid-template-columns:150px 1fr;gap:30px;align-items:start;padding:34px 0;border-top:1px solid rgba(193,126,85,.35)">
      <div class="num">{html.escape(n)}</div>
      <div><div class="sc" style="color:{COBRE}">{html.escape(t)}</div><div class="it" style="font-size:31px;line-height:1.35;margin-top:8px;color:rgba(255,247,232,.92)">{html.escape(b)}</div></div>
    </div>''' for n, t, b in s["steps"])
    parts = ['<div class="carbon"></div>',
             f'<div class="abs" style="left:84px;top:84px">{mixed(s["sc"], s["it"], width=800)}</div>',
             f'<div class="abs" style="left:84px;right:84px;top:300px">{rows}</div>',
             wm(COBRE)]
    return page("".join(parts))


def T_label(s):
    """Portada de personalizados: botella con la etiqueta mockup."""
    parts = ['<div class="carbon"></div>',
             f'<img src="{img("malbec-hd.webp")}" alt="" style="position:absolute;left:40px;bottom:-30px;height:1040px;width:auto;filter:drop-shadow(0 44px 36px rgba(0,0,0,.6))">',
             f'<div class="abs" style="left:84px;top:84px">{mixed(s["sc"], s["it"], width=600)}</div>',
             f'<div class="abs sc cobre" style="right:84px;top:84px;width:300px;text-align:right">{html.escape(s.get("name",""))}</div>',
             f'<div class="abs die" style="right:96px;top:520px;width:420px;height:470px;background:{CREMA};color:#4A5581;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:40px 30px;text-align:center;box-shadow:0 30px 50px rgba(0,0,0,.5)">'
             f'<div class="wm" style="position:static;transform:none;width:160px;color:#4A5581">{WORDMARK}</div>'
             f'<div class="it" style="font-size:60px;font-weight:500;line-height:1;color:{TINTA}">{html.escape(s.get("label_name","Sofi & Juan"))}</div>'
             f'<div class="sc" style="color:#4A5581;font-size:18px">{html.escape(s.get("label_date",""))}</div>'
             f'<div class="sc" style="color:#EA5828;font-size:21px;font-weight:800;margin-top:8px">Malbec</div></div>',
             (f'<div class="abs sc" style="right:96px;top:1040px;width:420px;text-align:center;font-size:18px;color:rgba(255,247,232,.8)">{html.escape(s["foot"])}</div>' if s.get("foot") else "")]
    return page("".join(parts))


TEMPLATES = {"photo": T_photo, "product": T_product, "quote": T_quote, "paper": T_paper, "brand": T_brand,
             "sello": T_sello, "trio": T_trio, "steps": T_steps, "label": T_label}


def render(ids):
    from playwright.sync_api import sync_playwright
    exe = os.environ.get("CHROME_PATH")
    if not exe:
        base = os.environ.get("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
        cands = sorted(Path(base).glob("chromium-*/chrome-linux/chrome"))
        exe = str(cands[-1]) if cands else None
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=exe, args=["--no-sandbox"]) if exe else p.chromium.launch()
        pg = b.new_page(viewport={"width": 1080, "height": 1350}, device_scale_factor=1)
        for post in CAL["posts"]:
            if ids and post["id"] not in ids:
                continue
            (OUT / f'{post["id"]}.txt').write_text(post["caption"], encoding="utf-8")
            for i, slide in enumerate(post["slides"], 1):
                htmlp = BUILD / f'{post["id"]}-{i}.html'
                htmlp.write_text(TEMPLATES[slide["template"]](slide), encoding="utf-8")
                pg.goto(htmlp.as_uri()); pg.wait_for_timeout(400)
                pg.evaluate("document.fonts.ready")
                out = OUT / f'{post["id"]}-{i}.jpg'
                pg.screenshot(path=str(out), type="jpeg", quality=90)
                print("ok", out.relative_to(ROOT))
        b.close()


if __name__ == "__main__":
    render(set(sys.argv[1:]))
