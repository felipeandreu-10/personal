#!/usr/bin/env python3
"""Publica en Instagram (@teson_wines) por la API oficial (Instagram API con inicio de sesión de Instagram).

El token se lee de la variable de entorno IG_ACCESS_TOKEN y nunca se imprime.
Las imágenes y videos tienen que estar en una URL pública (Meta los descarga).

Uso (desde teson/contenido):
  python3 ig_publish.py --caption posts/s00-brotacion-en-vista-flores.txt --image https://.../foto.jpg
  python3 ig_publish.py --caption posts/x.txt --image URL1 --image URL2 --image URL3      # carrusel (2 a 10)
  python3 ig_publish.py --caption posts/x.txt --video https://.../reel.mp4 --cover URL    # reel
  Agregá --dry-run para validar token, texto y URLs sin publicar nada.

Registra cada publicación en publicado.json (fecha, id, permalink, pieza).
"""
import argparse, json, os, sys, time, datetime, urllib.request, urllib.parse, urllib.error

API = "https://graph.instagram.com/v21.0"
TOKEN = os.environ.get("IG_ACCESS_TOKEN", "")


def call(method, path, **params):
    params["access_token"] = TOKEN
    data = urllib.parse.urlencode(params)
    if method == "GET":
        req = urllib.request.Request(f"{API}/{path}?{data}")
    else:
        req = urllib.request.Request(f"{API}/{path}", data=data.encode(), method="POST")
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            body = r.read().decode()
    except urllib.error.HTTPError as e:
        body = e.read().decode()
    except Exception as e:  # red, DNS, timeout
        body = json.dumps({"error": {"message": str(e).replace(TOKEN, "<token>")}})
    if TOKEN:
        body = body.replace(TOKEN, "<token>")
    try:
        return json.loads(body)
    except ValueError:
        return {"error": {"message": body[:500]}}


def fail(msg, obj=None):
    print("ERROR:", msg)
    if obj is not None:
        print(json.dumps(obj, ensure_ascii=False, indent=1))
    sys.exit(2)


def check_url(u):
    try:
        req = urllib.request.Request(u, method="HEAD", headers={"User-Agent": "teson-check"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.headers.get("Content-Type", ""), r.headers.get("Content-Length", "?")
    except Exception as e:
        return None, str(e), "?"


def wait_ready(container_id, max_s=420):
    t0 = time.time()
    while time.time() - t0 < max_s:
        st = call("GET", container_id, fields="status_code,status")
        code = st.get("status_code")
        if code == "FINISHED":
            return st
        if code in ("ERROR", "EXPIRED"):
            fail("el contenedor de medios falló", st)
        time.sleep(6)
    fail("el contenedor no quedó listo a tiempo", st)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--caption", required=True, help="archivo .txt con el texto del post")
    ap.add_argument("--image", action="append", default=[], help="URL pública de imagen (repetir para carrusel)")
    ap.add_argument("--video", help="URL pública de video para reel")
    ap.add_argument("--cover", help="URL pública de la portada del reel")
    ap.add_argument("--pieza", help="nombre de la pieza para el registro (por defecto, el archivo del texto)")
    ap.add_argument("--log", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "publicado.json"))
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    if not TOKEN:
        fail("IG_ACCESS_TOKEN ausente: cargala en las variables del entorno y abrí una sesión nueva")
    caption = open(a.caption, encoding="utf-8").read().strip()
    if len(caption) > 2200:
        fail(f"el texto tiene {len(caption)} caracteres; el máximo es 2200")
    if caption.count("#") > 30:
        fail("más de 30 hashtags")
    if a.video and a.image:
        fail("un reel no lleva imágenes; usá --video solo (y --cover opcional)")
    if not a.video and not (1 <= len(a.image) <= 10):
        fail("indicá 1 imagen (foto), 2 a 10 (carrusel) o --video (reel)")

    me = call("GET", "me", fields="id,username,account_type")
    if "id" not in me:
        fail("el token no responde para /me", me)
    ig = me["id"]
    print(f"Cuenta: @{me.get('username')} ({me.get('account_type')}), id {ig}")

    urls = a.image + ([a.video] if a.video else []) + ([a.cover] if a.cover else [])
    for u in urls:
        status, ctype, clen = check_url(u)
        print(f"  {status or 'sin acceso'}  {ctype}  {clen} bytes  {u}")
        if status != 200:
            fail(f"la URL no responde con 200: {u}")

    kind = "reel" if a.video else ("carrusel" if len(a.image) > 1 else "foto")
    print(f"Tipo: {kind}. Texto: {len(caption)} caracteres, {caption.count('#')} hashtags.")
    if a.dry_run:
        print("--- dry-run: no se publica. Texto:\n" + caption)
        return

    if a.video:
        params = dict(media_type="REELS", video_url=a.video, caption=caption, share_to_feed="true")
        if a.cover:
            params["cover_url"] = a.cover
        c = call("POST", f"{ig}/media", **params)
    elif len(a.image) == 1:
        c = call("POST", f"{ig}/media", image_url=a.image[0], caption=caption)
    else:
        children = []
        for u in a.image:
            r = call("POST", f"{ig}/media", image_url=u, is_carousel_item="true")
            if "id" not in r:
                fail("no se pudo crear un ítem del carrusel", r)
            wait_ready(r["id"])
            children.append(r["id"])
        c = call("POST", f"{ig}/media", media_type="CAROUSEL", children=",".join(children), caption=caption)
    if "id" not in c:
        fail("no se pudo crear el contenedor", c)
    wait_ready(c["id"])

    pub = call("POST", f"{ig}/media_publish", creation_id=c["id"])
    if "id" not in pub:
        fail("la publicación falló", pub)
    info = call("GET", pub["id"], fields="id,permalink,timestamp,media_type")
    print("PUBLICADO:", json.dumps(info, ensure_ascii=False))

    rec = {
        "fecha": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "pieza": a.pieza or os.path.splitext(os.path.basename(a.caption))[0],
        "tipo": kind, "id": info.get("id"), "permalink": info.get("permalink"), "urls": urls,
    }
    try:
        log = json.load(open(a.log, encoding="utf-8")) if os.path.exists(a.log) else []
    except ValueError:
        log = []
    log.append(rec)
    json.dump(log, open(a.log, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("Registrado en", a.log)


if __name__ == "__main__":
    main()
