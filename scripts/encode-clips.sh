#!/usr/bin/env bash
# Proyectos con varias piezas: cada clip va a public/media/<slug>/clips/<nombre>.mp4
# con su propio poster. El loop de la ficha se arma aparte, en encode.sh.
set -u
P="D:/Produccion IA/Portfolio"; OUT="D:/Andi AI Web/public/media"

slug="mercado-libre"; src="$P/Mercado Libre"
mkdir -p "$OUT/$slug/clips"

# nombre | archivo | segundo del poster
LIST=(
"hero-uy|Meli_Hero_Uru_01.mp4|6"
"hero-cl|MLCBW_Hero_01.mp4|3.5"
"social-cl|MLC_ABW_SOCIAL.mp4|7"
"social-uy|MLU_SCL_01.mp4|6"
"dooh-uy|MLU_DOOH_01.mp4|6.5"
"bumper-uy|MLU_BumperEnvios_01.mp4|3"
"bumper-cl|MLC_BW_BUMPER ENVIOS_01.mp4|3"
)

for row in "${LIST[@]}"; do
  IFS='|' read -r name file ss <<< "$row"
  f="$src/$file"
  [ -f "$f" ] || { echo "falta: $file"; continue; }
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  vb=$(python -c "print(int(min(2600, 22*8*1024/float($dur) - 140)))")
  [ -f "$OUT/$slug/clips/$name.mp4" ] || ffmpeg -v error -y -i "$f" -vf "scale=1280:-2,format=yuv420p" \
    -c:v libx264 -preset slow -crf 23 -maxrate ${vb}k -bufsize $((vb*2))k -profile:v high \
    -c:a aac -b:a 128k -ac 2 -movflags +faststart "$OUT/$slug/clips/$name.mp4"
  [ -f "$OUT/$slug/clips/$name.webp" ] || ffmpeg -v error -y -ss "$ss" -i "$f" -frames:v 1 -vf "scale=1280:-2" -q:v 80 "$OUT/$slug/clips/$name.webp"
  printf "%-10s %5.1fs  %sKB\n" "$name" "$dur" "$(( $(stat -c%s "$OUT/$slug/clips/$name.mp4")/1024 ))"
done
echo CLIPS_DONE
