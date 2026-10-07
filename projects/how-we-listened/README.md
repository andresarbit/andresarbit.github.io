# How We Listened · 2000–2010

Video tutorial de 1:40 (1920×1080, 30 fps) sobre cómo se escuchaba música entre 2000 y 2010.
Narración en inglés nivel 7.º grado con la voz **Dante** (ElevenLabs vía Higgsfield).
Estética: recortes de papel, tipografía cinética y gráficos de datos sobre la trasera de una caja
Marshall 4x12 (tolex negro con stickers de las bandas), con cámara 3D virtual.

## Guion (locución)

> Two thousand... to twenty ten. The ten years that changed how we listen to music.
>
> Let's start with the king: the CD. In the year 2000, stores in the United States got more than 940 million CDs. You played them on a Discman, and hoped the music would not skip. That October, Linkin Park released Hybrid Theory. It became the best-selling first album of the 21st century.
>
> But something was changing. Napster let people share songs for free, from one computer to another. It reached 80 million users, until a court shut it down in July 2001. Then came Kazaa, LimeWire, and burning your own mix CDs.
>
> In October 2001, Apple showed the first iPod: a thousand songs in your pocket. In 2003, the iTunes Store opened. One song cost 99 cents. That same year, The White Stripes, from Detroit, released Seven Nation Army. That famous riff sounds like a bass... but it's a guitar, with a pedal that drops it one octave lower.
>
> By the middle of the decade, phones became music players: the Motorola RAZR, the Sony Ericsson Walkman phones, and ringtones. On MySpace, bands got noticed. From Sheffield, England, Arctic Monkeys got famous because fans shared their songs online. In January 2006, their first album sold more than 360,000 copies in one week. The fastest first album in British history.
>
> Look at the numbers: from over 940 million CDs in 2000, down to 225 million in 2010. That's a drop of 76 percent.
>
> In 2008, Spotify arrived. Music was no longer something you owned... It was something you could reach. So... what did you use to listen?

La frase "Meanwhile, iTunes sold more than 10 billion songs" se grabó pero se cortó de la
locución para llegar a 1:40; el dato queda en pantalla como nota.

## Datos usados y fuentes

| Dato en pantalla | Fuente |
|---|---|
| 942,5 M de CD (álbumes) despachados en EE. UU. en 2000; 225,8 M en 2010; serie 2000–2010 del gráfico | RIAA, estadísticas anuales de despachos (año 2010: [resumen RIAA 2010](https://www.tnt-audio.com/edcorner/june11.html)) |
| −76 % (225,8 / 942,5) | Cálculo propio sobre la serie RIAA |
| Hybrid Theory, Linkin Park: 24 oct 2000, debut más vendido del siglo XXI | [Wikipedia: Hybrid Theory](https://en.wikipedia.org/wiki/Hybrid_Theory) |
| Napster: ~80 M de usuarios registrados en su pico; cierre en julio de 2001 | [Wikipedia: Napster](https://en.wikipedia.org/wiki/Napster) |
| iPod: presentado el 23 oct 2001, 1.000 canciones | [Apple Newsroom, 23/10/2001](https://www.apple.com/newsroom/2001/10/23Apple-Presents-iPod/) |
| iTunes Store: 28 abr 2003, USD 0,99 por canción | [Sound & Vision: Flashback 2003](https://www.soundandvision.com/content/flashback-2003-apple-launches-itunes-store) |
| iTunes: más de 10.000 M de canciones (25 feb 2010) | [Apple Newsroom, 25/02/2010](https://www.apple.com/newsroom/2010/02/25iTunes-Store-Tops-10-Billion-Songs-Sold/) |
| Seven Nation Army (2003): riff de guitarra con DigiTech Whammy una octava abajo | [Wikipedia: Seven Nation Army](https://en.wikipedia.org/wiki/Seven_Nation_Army), [Guitar World](https://www.guitarworld.com/amp/gear/secrets-behind-jack-white-guitar-sound-white-stripes-seven-nation-army) |
| Arctic Monkeys: 23 ene 2006, 363.735 copias en la primera semana; récord anterior Hear'Say (306.631) | [Far Out Magazine](https://faroutmagazine.co.uk/fastest-selling-debut-album-uk-history/) / Official Charts Company |
| Motorola RAZR V3 (2004), Sony Ericsson W800 Walkman (2005), Spotify (7 oct 2008) | Fechas de lanzamiento públicas |

## Producción

- **Voz:** Higgsfield `text2speech_v2`, motor ElevenLabs, elemento de voz *Dante-Espacial*.
  Alineada palabra por palabra en local (Echogarden, DTW) para sincronizar la tipografía cinética.
  Se aceleró 5,5 % y se cortó una frase para cerrar en 1:40.
- **Imágenes:** Higgsfield (Nano Banana): trasera de caja Marshall con stickers, dos hojas de stickers de
  dispositivos, siluetas de shows (sin rostros reconocibles) y fotos de Detroit y Sheffield.
  Las bandas **no** son fotos reales: son escenas genéricas en siluetas tratadas con halftone y
  bordes rasgados. Para piezas públicas conviene reemplazarlas por fotos licenciadas
  (mismo nombre de archivo en `assets/ph_*.png` y volver a renderizar).
- **Música y efectos:** sintetizados por código (`audio.py`): base garage-rock a 112 BPM,
  golpes de papel, sellos, whooshes, ticks de contador. Es un placeholder libre de derechos;
  se puede cambiar por un tema licenciado sin tocar el video.
- **Motor:** `index.html` + `main.js` (CSS 3D para la cámara y el papel, Three.js para el CD 3D).
  `render.mjs` captura cuadro por cuadro con Playwright y codifica con ffmpeg.

## Re-render

```bash
npm i gsap three @fontsource/anton   # solo si falta lib/ o fonts/
npx http-server -p 8765 -c-1 -s . &
node render.mjs stills 12.9 45.2         # fotogramas de control
node render.mjs video 100 0 video_raw.mp4
python3 audio.py                         # stems: vo_track.wav, music_bed.wav, sfx.wav
```
