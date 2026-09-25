#!/usr/bin/env python3
"""Rutina semanal de Instagram de Tesón.

Busca en calendario.json el post cuya fecha es hoy (hora de Mendoza), arma las URL públicas de
sus piezas (repo en GitHub) y lo publica con ig_publish.py. Después marca el post como publicado.

Freno: los posts con fecha hasta el 28-10-2026 salen solo con estado "aprobado"; desde entonces
salen con "listo" o "aprobado". Un post con estado "pausado" no sale nunca.

Uso (desde la raíz del repo o desde teson/contenido):
  python3 teson/contenido/ig_semana.py            # publica lo de hoy
  python3 teson/contenido/ig_semana.py --dry-run  # muestra qué haría, sin publicar
  python3 teson/contenido/ig_semana.py --id s00-lo-que-hay-abajo   # fuerza un post
"""
import argparse, datetime, json, os, subprocess, sys, zoneinfo

HERE = os.path.dirname(os.path.abspath(__file__))
CAL = os.path.join(HERE, "calendario.json")
RAW = "https://raw.githubusercontent.com/felipeandreu-10/personal/claude/eloquent-cray-7jy30v/teson/contenido/posts/"
APROBACION_HASTA = "2026-10-28"


def hoy():
    return datetime.datetime.now(zoneinfo.ZoneInfo("America/Argentina/Mendoza")).date().isoformat()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", help="publicar este post aunque no sea de hoy")
    ap.add_argument("--fecha", help="usar esta fecha (AAAA-MM-DD) en vez de hoy")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    cal = json.load(open(CAL, encoding="utf-8"))
    fecha = a.fecha or hoy()
    if a.id:
        posts = [p for p in cal["posts"] if p["id"] == a.id]
    else:
        posts = [p for p in cal["posts"] if p["fecha"] == fecha]
    if not posts:
        print(f"Sin post para {fecha}.")
        prox = sorted([p for p in cal["posts"] if p["fecha"] > fecha], key=lambda p: p["fecha"])[:1]
        if prox:
            p = prox[0]
            print(f"Próximo: {p['fecha']} · {p['titulo']} ({p['formato']}, estado {p['estado']})"
                  + (f" · necesita: {p['necesita']}" if p.get("necesita") else ""))
        return 0

    rc = 0
    for p in posts:
        est = p.get("estado", "")
        if est == "publicado":
            print(f"{p['id']}: ya publicado ({p.get('publicado', {}).get('permalink', '')}).")
            continue
        if est == "pausado":
            print(f"{p['id']}: pausado, no sale."); continue
        if p["fecha"] <= APROBACION_HASTA and est != "aprobado":
            print(f"{p['id']}: falta la aprobación de Felipe (estado '{est}'). No se publica."); rc = 3; continue
        if est not in ("listo", "aprobado"):
            print(f"{p['id']}: estado '{est}', no sale."); rc = 3; continue

        cap = os.path.join(HERE, "posts", f"{p['id']}.txt")
        if not os.path.exists(cap):
            open(cap, "w", encoding="utf-8").write(p["caption"] + "\n")
        args = [sys.executable, os.path.join(HERE, "ig_publish.py"), "--caption", cap, "--pieza", p["id"]]
        if p.get("video"):
            args += ["--video", p["video"]]
            if p.get("cover"):
                args += ["--cover", p["cover"]]
        else:
            n = len(p.get("slides", []))
            for i in range(1, n + 1):
                f = f"{p['id']}-{i}.jpg"
                if not os.path.exists(os.path.join(HERE, "posts", f)):
                    print(f"{p['id']}: falta la pieza {f}"); rc = 4; break
                args += ["--image", RAW + f]
            else:
                pass
            if rc == 4:
                continue
        if a.dry_run:
            args.append("--dry-run")
        print("→", p["id"], "·", p["titulo"], "·", p["formato"])
        r = subprocess.run(args, capture_output=True, text=True)
        print(r.stdout.strip())
        if r.returncode != 0:
            print(r.stderr.strip()); rc = r.returncode; continue
        if a.dry_run:
            continue
        # tomar el permalink del registro
        log = json.load(open(os.path.join(HERE, "publicado.json"), encoding="utf-8"))
        rec = [x for x in log if x.get("pieza") == p["id"]][-1]
        p["estado"] = "publicado"
        p["publicado"] = {"fecha": rec["fecha"], "id": rec["id"], "permalink": rec["permalink"]}
        json.dump(cal, open(CAL, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"PUBLICADO {p['id']}: {rec['permalink']}")
    return rc


if __name__ == "__main__":
    sys.exit(main())
