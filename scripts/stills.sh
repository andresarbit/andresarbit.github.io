#!/usr/bin/env bash
# Converts still series + portraits to web WebP (long side 1800px) into public/media/<slug>/stills
set -u
P="D:/Produccion IA/Portfolio"; OUT="D:/Andi AI Web/public/media"
conv() { # src dst
  ffmpeg -v error -y -i "$1" -vf "scale='if(gt(iw,ih),min(1800,iw),-2)':'if(gt(iw,ih),-2,min(1800,ih))'" -q:v 78 "$2"; }
series() { # slug srcdir
  local slug="$1" dir="$2" i=1; mkdir -p "$OUT/$slug/stills"
  while IFS= read -r f; do printf -v n "%02d" $i; [ -f "$OUT/$slug/stills/$n.webp" ] || conv "$f" "$OUT/$slug/stills/$n.webp"; i=$((i+1)); done < <(find "$dir" -maxdepth 1 -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) | sort -V)
  echo "$slug: $((i-1)) stills"; }
series orbita-club "$P/Orbital Club"
series fuga "$P/Fuga/Campaña Fotos"
series the-dude "$P/Andi Influencer/Moda Peliculas/Look 01"
series cauce "$P/Campaña Vestidos Naturales/Fotos/Posteo 01"
mkdir -p "$OUT/andres"
conv "D:/Produccion IA/Andy pics/_MG_3404-3 - copia.jpg" "$OUT/andres/real.webp"
conv "$P/Andi Influencer/Retrato Director Creativo/hf_20260122_211139_62230697-4180-4393-bc71-fc3c21c4b0b6.png" "$OUT/andres/ia.webp"
echo STILLS_DONE
