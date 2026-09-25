#!/usr/bin/env bash
# Verifica el token de la API de Instagram (variable IG_ACCESS_TOKEN) sin mostrarlo nunca.
# Uso: bash teson/contenido/ig_check.sh
set -u
API="https://graph.instagram.com/v21.0"
if [ -z "${IG_ACCESS_TOKEN:-}" ]; then
  echo "IG_ACCESS_TOKEN: ausente. Cargala en las variables del entorno y abrí una sesión nueva."
  exit 1
fi
echo "IG_ACCESS_TOKEN: presente (${#IG_ACCESS_TOKEN} caracteres)"
q() { # q <ruta> [param=valor ...]  -> JSON, el token viaja en la consulta pero no se imprime
  local path="$1"; shift
  local args=(-sS -G "$API/$path" --data-urlencode "access_token=$IG_ACCESS_TOKEN")
  for p in "$@"; do args+=(--data-urlencode "$p"); done
  curl "${args[@]}" 2>&1 | sed "s/${IG_ACCESS_TOKEN}/<token>/g"
}
echo; echo "== Cuenta (me)"
ME=$(q me "fields=id,username,name,account_type,followers_count,media_count")
echo "$ME"
ID=$(printf '%s' "$ME" | python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("id",""))
except Exception: print("")')
if [ -z "$ID" ]; then echo; echo "No se obtuvo el id de la cuenta: el token no sirve o le faltan permisos."; exit 2; fi
echo; echo "== Cupo de publicación (permiso instagram_business_content_publish)"
q "$ID/content_publishing_limit" "fields=quota_usage,config"; echo
echo; echo "== Insights (permiso instagram_business_manage_insights)"
q "$ID/insights" "metric=reach" "period=day" "metric_type=total_value"; echo
