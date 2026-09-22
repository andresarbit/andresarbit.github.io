#!/usr/bin/env bash
# Selección curada de fotos por proyecto. Los números son la posición del archivo
# dentro de la carpeta, ordenada alfabéticamente (ver README).
set -u
P="D:/Produccion IA/Portfolio"; B="D:/Produccion IA/BoomBit"; OUT="D:/Andi AI Web/public/media"

pick() { # slug  dir  "indices..."
  local slug="$1" dir="$2"; shift 2
  local all=(); while IFS= read -r f; do all+=("$f"); done < <(find "$dir" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) | sort)
  mkdir -p "$OUT/$slug/stills"; local i=1
  for n in $@; do
    printf -v out "%s/%s/stills/%02d.webp" "$OUT" "$slug" "$i"
    [ -f "$out" ] || ffmpeg -v error -y -i "${all[$((n-1))]}" -vf "scale='if(gt(iw,ih),min(1800,iw),-2)':'if(gt(iw,ih),-2,min(1800,ih))'" -q:v 78 "$out"
    i=$((i+1))
  done
  echo "$slug: $((i-1)) fotos"
}

pick anteojos-skull "$P/Anteojos Skull"      1 2 4 5 8 9 15 16 17 21 22 24
pick labor-camperas "$P/Labor Camperas"      1 3 4 7 11 12 13 14 16 17 26 29 33 35
pick portraits-of-waiting "$P/Portraits of Waiting"  1 2 3 4 5
pick deriva "$P/Muebles Deriva/Fotos"        2 3 5 6 7 8 10 12 14 16 20 23
pick ugc-crime-life "$B/Crime Life/Personajes/01/V01"  2 3 4 5 6 7
echo STILLS2_DONE
