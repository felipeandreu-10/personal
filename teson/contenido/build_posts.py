#!/usr/bin/env python3
"""Renderiza las piezas de Instagram de Tesón a partir de calendario.json.

Uso:  python3 build_posts.py [id-del-post ...]
Salida: contenido/posts/<id>-<n>.jpg (1080 x 1350) y contenido/posts/<id>.txt (caption).

Requiere: pip install playwright pillow; Chromium (PLAYWRIGHT_BROWSERS_PATH o CHROME_PATH).
Las fuentes se leen de contenido/build/fonts/ (EB Garamond está en assets/fonts; Engravers
Gothic BT es comercial y hay que copiarla ahí desde el design system de Tesón).
"""
import json, os, sys, html, shutil
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

THEMES = {
    "crema":    {"bg": "#FFF7E8", "ink": "#1D1D1B", "muted": "#5C5750", "accent": "#875A40", "logo": "#4A5581"},
    "noche":    {"bg": "#2E3B4A", "ink": "#FFF7E8", "muted": "#D9CFC0", "accent": "#D2A283", "logo": "#C17E55"},
    "prestige": {"bg": "#343433", "ink": "#FFF7E8", "muted": "#D9CFC0", "accent": "#D2A283", "logo": "#C17E55"},
    "tinta":    {"bg": "#1D1D1B", "ink": "#FFF7E8", "muted": "#B5AC9F", "accent": "#D2A283", "logo": "#C17E55"},
    "fatalsb":  {"bg": "#8E82AC", "ink": "#FFF7E8", "muted": "#F3EEFF", "accent": "#DDF6F4", "logo": "#FFF7E8"},
}

CSS = """
@font-face{font-family:"EB Garamond";src:url("fonts/EBGaramond[wght].ttf");font-weight:400 800}
@font-face{font-family:"EB Garamond";src:url("fonts/EBGaramond-Italic[wght].ttf");font-weight:400 800;font-style:italic}
@font-face{font-family:"Engravers";src:url("fonts/EngraversGothic-Regular.otf");font-weight:400}
@font-face{font-family:"Engravers";src:url("fonts/EngraversGothic-Heavy.otf");font-weight:800}
*{box-sizing:border-box}
html,body{margin:0;width:1080px;height:1350px;overflow:hidden}
body{background:var(--bg);color:var(--ink);font-family:"EB Garamond",Garamond,serif;font-size:32px;line-height:1.35;position:relative}
.eyebrow{font-family:"Engravers",serif;letter-spacing:.24em;text-transform:uppercase;font-size:22px;line-height:1.3;color:var(--accent)}
.h{font-weight:500;line-height:.98;letter-spacing:-.01em;margin:0}
.h em{font-style:italic;font-weight:500}
.body{font-size:34px;line-height:1.4;max-width:24em}
.logo{color:var(--logo)}
.logo svg{display:block;width:100%;height:auto}
.star{color:var(--accent);width:40px}
.star svg{display:block;width:100%;height:auto}
.legal{font-family:"Engravers",serif;letter-spacing:.12em;font-size:15px;text-transform:uppercase;color:var(--muted)}
.abs{position:absolute}
.photo{position:absolute;inset:0;object-fit:cover;width:100%;height:100%}
.bw{filter:grayscale(1) contrast(1.05)}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(29,29,27,.55) 0%,rgba(29,29,27,0) 32%,rgba(29,29,27,.05) 50%,rgba(29,29,27,.82) 100%)}
.wine{font-family:"Engravers",serif;font-weight:800;letter-spacing:.2em;text-transform:uppercase;font-size:54px;line-height:1.1;color:var(--accent)}
.rows{display:flex;flex-direction:column;gap:22px;margin-top:44px}
.rows div{font-size:31px;line-height:1.3;padding-left:32px;position:relative}
.rows div::before{content:"·";position:absolute;left:6px;color:var(--accent)}
.num{font-style:italic;font-weight:500;font-size:150px;line-height:.9;color:var(--accent);letter-spacing:-.02em}
.die{clip-path:polygon(0 0,46% 0,50% 5%,54% 0,100% 0,100% 100%,54% 100%,50% 95%,46% 100%,0 100%)}
"""


def theme_vars(name):
    t = THEMES.get(name, THEMES["crema"])
    return ";".join(f"--{k}:{v}" for k, v in t.items())


def page(theme, inner):
    return f'<!doctype html><html><head><meta charset="utf-8"><style>:root{{{theme_vars(theme)}}}{CSS}</style></head><body>{inner}</body></html>'


def img(name):
    return f"../../assets/img/{name}"


def logo(width, extra=""):
    return f'<div class="logo" style="width:{width}px;{extra}">{WORDMARK}</div>'


def star():
    return f'<div class="star">{STAR}</div>'


def T_photo(s):
    bw = " bw" if s.get("bw") else ""
    inner = f'''
<img class="photo{bw}" src="{img(s["img"])}" alt="">
<div class="shade"></div>
<div class="abs" style="left:72px;top:64px;right:72px;display:flex;justify-content:space-between;align-items:flex-start;--accent:#F0D2B6;--logo:#FFF7E8">
  <div class="eyebrow" style="max-width:640px">{html.escape(s.get("eyebrow",""))}</div>{logo(230)}
</div>
<div class="abs" style="left:72px;right:72px;bottom:84px;color:#FFF7E8;--accent:#F0D2B6">
  <h1 class="h" style="font-size:112px;max-width:9.5em">{s["headline"]}</h1>
  {('<p class="body" style="margin:34px 0 0;color:rgba(255,247,232,.92)">'+html.escape(s["body"])+'</p>') if s.get("body") else ''}
</div>'''
    return page("tinta", inner)


def T_card(s):
    bw = " bw" if s.get("bw") else ""
    inner = f'''
<div class="abs" style="left:0;top:0;width:1080px;height:760px;overflow:hidden"><img class="photo{bw}" src="{img(s["img"])}" alt=""></div>
<div class="abs" style="left:0;top:760px;width:1080px;height:590px;padding:56px 72px 60px;display:flex;flex-direction:column;justify-content:space-between">
  <div>
    <div class="eyebrow">{html.escape(s.get("eyebrow",""))}</div>
    <h1 class="h" style="font-size:72px;margin-top:18px">{s["headline"]}</h1>
    <p class="body" style="margin:22px 0 0;font-size:31px;max-width:27em">{html.escape(s.get("body",""))}</p>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end">{star()}{logo(210)}</div>
</div>'''
    return page("crema", inner)


def T_text(s):
    theme = s.get("theme", "crema")
    has_img = bool(s.get("img"))
    quote = s.get("quote")
    big = f'<div class="num" style="margin:26px 0 8px">{html.escape(s["big"])}</div>' if s.get("big") else ""
    if has_img:
        fit = s.get("img_fit", "cover")
        media = f'<div class="abs" style="left:72px;right:72px;bottom:80px;height:{430 if fit=="cover" else 470}px;overflow:hidden;display:flex;align-items:center;justify-content:center"><img src="{img(s["img"])}" alt="" style="width:100%;height:100%;object-fit:{fit}"></div>'
        top_h = 760
    else:
        media = ""
        top_h = 1200
    hsize = 60 if quote else (84 if has_img else 96)
    inner = f'''
<div class="abs" style="left:72px;top:64px;right:72px;display:flex;justify-content:space-between;align-items:flex-start">
  <div class="eyebrow" style="max-width:640px">{html.escape(s.get("eyebrow",""))}</div>{logo(230)}
</div>
<div class="abs" style="left:72px;right:72px;top:190px;height:{top_h-190}px;display:flex;flex-direction:column;justify-content:{'center' if not has_img else 'flex-start'}">
  {big}
  <h1 class="h" style="font-size:{hsize}px;{'font-style:italic;font-weight:400;line-height:1.12' if quote else ''}">{s["headline"]}</h1>
  <div style="margin:30px 0 22px">{star()}</div>
  <p class="body" style="margin:0;color:var(--muted)">{html.escape(s.get("body",""))}</p>
</div>
{media}'''
    return page(theme, inner)


def T_bottle(s):
    theme = s.get("theme", "noche")
    inner = f'''
<div class="abs" style="left:72px;top:64px;right:72px;display:flex;justify-content:space-between;align-items:flex-start">
  <div class="eyebrow" style="max-width:600px">{html.escape(s.get("eyebrow",""))}</div>{logo(230)}
</div>
<img src="{img(s["img"])}" alt="" style="position:absolute;right:60px;bottom:0;height:1160px;width:auto;filter:drop-shadow(0 44px 36px rgba(0,0,0,.45))">
<div class="abs" style="left:72px;top:250px;width:640px">
  <div class="wine">{html.escape(s.get("wine",""))}</div>
  <h1 class="h" style="font-size:96px;margin-top:26px;max-width:6.4em">{s["headline"]}</h1>
  <div class="rows">{"".join(f"<div>{html.escape(r)}</div>" for r in s.get("rows", []))}</div>
</div>
<div class="abs legal" style="left:72px;bottom:56px">{html.escape(CAL["legal"])}</div>'''
    return page(theme, inner)


def T_trio(s):
    wines = [("malbec-hd.webp", "Malbec"), ("redblend-hd.webp", "Red Blend"), ("prestige-hd.webp", "Prestige")]
    if s.get("fatal"):
        wines = [("malbec-hd.webp", "Malbec"), ("redblend-hd.webp", "Red Blend"), ("prestige-hd.webp", "Prestige"), ("fatal-malbec.webp", "Fatal Malbec"), ("fatal-sauvignon.webp", "Fatal S. Blanc")]
    h = 640 if s.get("fatal") else 700
    cols = "".join(f'<div style="display:flex;flex-direction:column;align-items:center;gap:26px"><img src="{img(f)}" alt="" style="height:{h}px;width:auto;filter:drop-shadow(0 34px 28px rgba(29,29,27,.35))"><div class="eyebrow" style="color:var(--ink);font-size:18px">{html.escape(n)}</div></div>' for f, n in wines)
    inner = f'''
<div class="abs" style="left:72px;top:64px;right:72px;display:flex;justify-content:space-between;align-items:flex-start">
  <div class="eyebrow" style="max-width:640px">{html.escape(s.get("eyebrow",""))}</div>{logo(230)}
</div>
<h1 class="h abs" style="left:72px;top:178px;font-size:92px">{s["headline"]}</h1>
<div class="abs" style="left:0;right:0;top:340px;display:flex;justify-content:center;gap:{18 if s.get("fatal") else 54}px;align-items:flex-end">{cols}</div>
<div class="abs" style="left:72px;right:72px;bottom:70px;display:flex;justify-content:space-between;align-items:flex-end;gap:40px">
  <p class="body" style="margin:0;font-size:30px;max-width:22em;color:var(--muted)">{html.escape(s.get("body",""))}</p>{star()}
</div>'''
    return page("crema", inner)


def T_steps(s):
    theme = s.get("theme", "noche")
    rows = "".join(f'''<div style="display:grid;grid-template-columns:150px 1fr;gap:34px;align-items:start">
      <div class="num" style="font-size:120px">{html.escape(n)}</div>
      <div><div class="h" style="font-size:54px">{html.escape(t)}</div><p class="body" style="margin:12px 0 0;font-size:30px;color:var(--muted)">{html.escape(b)}</p></div>
    </div>''' for n, t, b in s["steps"])
    inner = f'''
<div class="abs" style="left:72px;top:64px;right:72px;display:flex;justify-content:space-between;align-items:flex-start">
  <div class="eyebrow">{html.escape(s.get("eyebrow",""))}</div>{logo(230)}
</div>
<div class="abs" style="left:72px;right:72px;top:210px;display:flex;flex-direction:column;gap:70px">{rows}</div>
<div class="abs" style="left:72px;bottom:64px">{star()}</div>'''
    return page(theme, inner)


def T_label(s):
    inner = f'''
<img src="{img("malbec-hd.webp")}" alt="" style="position:absolute;left:-30px;bottom:-40px;height:1080px;width:auto;filter:drop-shadow(0 44px 36px rgba(0,0,0,.5))">
<div class="abs" style="left:72px;top:64px;right:72px;display:flex;justify-content:space-between;align-items:flex-start">
  <div class="eyebrow">{html.escape(s.get("eyebrow",""))}</div>{logo(230)}
</div>
<h1 class="h abs" style="left:72px;top:190px;font-size:104px;max-width:8em">{s["headline"]}</h1>
<div class="abs die" style="right:80px;top:560px;width:440px;height:480px;background:#FFF7E8;color:#4A5581;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:40px 30px;text-align:center;box-shadow:0 30px 50px rgba(0,0,0,.35)">
  {logo(170, "color:#4A5581")}
  <div style="font-size:64px;font-style:italic;font-weight:500;line-height:1;color:#1D1D1B">{html.escape(s.get("label_name","Sofi & Juan"))}</div>
  <div class="eyebrow" style="color:#4A5581;font-size:19px">{html.escape(s.get("label_date",""))}</div>
  <div class="eyebrow" style="color:#EA5828;font-size:22px;font-weight:800;margin-top:10px">Malbec</div>
</div>
<p class="body abs" style="right:72px;bottom:80px;width:520px;margin:0;color:var(--muted);text-align:right">{html.escape(s.get("body",""))}</p>'''
    return page("noche", inner)


def T_cta(s):
    theme = s.get("theme", "crema")
    lines = "".join(f'<div class="eyebrow" style="color:var(--ink);font-size:22px;line-height:1.5">{html.escape(l)}</div>' for l in s.get("lines", []))
    inner = f'''
<div class="abs" style="left:72px;top:64px"><div class="eyebrow">{html.escape(s.get("eyebrow",""))}</div></div>
<div class="abs" style="left:72px;right:72px;top:0;height:1350px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:44px">
  {logo(560)}
  <h1 class="h" style="font-size:96px;max-width:8.5em">{s["headline"]}</h1>
  {star()}
  <div style="display:flex;flex-direction:column;gap:14px">{lines}</div>
</div>
<div class="abs legal" style="left:72px;right:72px;bottom:56px;text-align:center">{html.escape(CAL["legal"])}</div>'''
    return page(theme, inner)


TEMPLATES = {"photo": T_photo, "card": T_card, "text": T_text, "bottle": T_bottle, "trio": T_trio, "steps": T_steps, "label": T_label, "cta": T_cta}


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
                pg.goto(htmlp.as_uri()); pg.wait_for_timeout(350)
                pg.evaluate("document.fonts.ready")
                out = OUT / f'{post["id"]}-{i}.jpg'
                pg.screenshot(path=str(out), type="jpeg", quality=90)
                print("ok", out.relative_to(ROOT))
        b.close()


if __name__ == "__main__":
    render(set(sys.argv[1:]))
