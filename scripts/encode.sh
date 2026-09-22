#!/usr/bin/env bash
# Encodes portfolio videos for the web: full (with audio, <24MB), muted preview loop, poster.
# usage: bash scripts/encode.sh   (re-runs skip existing outputs)
set -u
P="D:/Produccion IA/Portfolio"; R="D:/Produccion IA"; OUT="D:/Andi AI Web/public/media"
# slug | source | preview start (s)
LIST=(
"fuga|$P/Fuga/Exports/Armado Fuga 03.mp4|9"
"calle|$P/Calle Zapas/Exports/Calle_IG01.mp4|14"
"neto|$P/Cocina Cheta/Exports/Neto Resto7.mp4|2"
"total-normalidad|$P/Total Normalidad/Exports/Armado 03.mp4|12"
"delivery-thriller|$P/Video Test/Video Test IA IG02.mp4|5"
"manifiesto|$P/Comercial Manifiesto/Exports/Manifiesto Armado 03.mp4|25"
"yapa|$P/Yapa/Video/Exports/Yapa_Durazno_IGOK.mp4|2"
"deriva|$P/Muebles Deriva/Exports/IG04_largo.mp4|12"
"chori|$P/Chori/Exports/Chori_IG02.mp4|8"
"como-corre-elisa|$P/CCE 2/Exports/Cc2 Trailer 02 comp.mp4|47"
"nuvo|$R/Nuvo/Paris Boliche/11_Produccion_H3/montaje/NUVO_corte_final_v2b_BW+NeonFinal.mp4|14"
"colgate|$R/Colgate MF/Exports/Colgate_MartinFierro_V05_Logo.mp4|45"
"vikingo-urquiza|$R/Vikingo Urquiza/Exports/Vikingo Urquiza E01.mp4|3"
"f1-test|$P/F1 Test/Test01.mp4|8"
)
for row in "${LIST[@]}"; do
  IFS='|' read -r slug src ss <<< "$row"
  d="$OUT/$slug"; mkdir -p "$d"
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  w=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$src")
  h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$src")
  if [ "$w" -gt "$h" ]; then full="scale=1280:-2"; prev="scale=1280:-2"; post="scale=1280:-2"; else full="scale=720:-2"; prev="scale=480:-2"; post="scale=720:-2"; fi
  # cap bitrate so the file stays under ~22MB
  pmax=1100k; [ "$w" -gt "$h" ] && pmax=2200k
  vb=$(python -c "print(int(min(2600, 22*8*1024/float($dur) - 140)))")
  [ -f "$d/full.mp4" ] || ffmpeg -v error -y -i "$src" -vf "$full,format=yuv420p" -c:v libx264 -preset slow -crf 23 -maxrate ${vb}k -bufsize $((vb*2))k -profile:v high -c:a aac -b:a 128k -ac 2 -movflags +faststart "$d/full.mp4"
  [ -f "$d/preview.mp4" ] || ffmpeg -v error -y -ss "$ss" -t 6 -i "$src" -vf "$prev,format=yuv420p" -an -c:v libx264 -preset slow -crf 27 -maxrate $pmax -bufsize $((2*${pmax%k}))k -profile:v high -movflags +faststart "$d/preview.mp4"
  [ -f "$d/poster.webp" ] || ffmpeg -v error -y -ss "$(python -c "print($ss+0.5)")" -i "$src" -frames:v 1 -vf "$post" -q:v 80 "$d/poster.webp"
  printf "%s  dur=%.1fs  %sx%s  full=%sKB prev=%sKB\n" "$slug" "$dur" "$w" "$h" "$(( $(stat -c%s "$d/full.mp4")/1024 ))" "$(( $(stat -c%s "$d/preview.mp4")/1024 ))"
done
echo ALL_DONE
