# Andrés Arbit · Portfolio

Sitio estático (Vite + GSAP). Sin backend: se publica la carpeta `dist/`.

## Uso diario

```bash
npm install        # una vez
npm run dev        # http://localhost:5173 (también accesible desde el celu en la misma red)
npm run build      # genera dist/ para publicar
```

## Editar textos

Todo el texto visible (español e inglés) está en `src/content.js`:

- `copy.es` / `copy.en`: hero, frase, enfoque, bio, contacto.
- `contact`: email, WhatsApp, Instagram.
- `projects`: lista de proyectos en el orden en que aparecen en la grilla.
- `heroReel`: los 5 videos que se ven dentro de las letras del nombre.

## Agregar un proyecto de video

1. Sumar una línea en `LIST` dentro de `scripts/encode.sh`:
   `"slug|ruta/al/video.mp4|segundo_de_inicio_del_preview"`
2. Correr `bash scripts/encode.sh` (solo procesa lo nuevo). Genera en `public/media/<slug>/`:
   - `full.mp4` con sonido, menos de 22 MB
   - `preview.mp4` loop mudo de 6 s
   - `poster.webp`
3. Agregar el objeto en `projects` (`src/content.js`) con `slug`, `size`, `kind: 'video'`, título, tipo y texto.

Tamaños de la grilla: `v` vertical (3 por fila), `vs` vertical chico (4 por fila), `w` film 16:9 a ancho completo.
`offset: 1` baja la pieza para romper la fila.

## Agregar una serie de fotos

`scripts/stills.sh` toma carpetas enteras; `scripts/stills2.sh` toma una selección por número de orden
(la posición del archivo dentro de la carpeta, ordenada alfabéticamente). Después se crea el proyecto
con `kind: 'stills'` y `stills: <cantidad>`, o se le suma `stills: <cantidad>` a un proyecto de video.

Las fotos del inicio están en `public/media/hero/` y se listan en `heroStills` (`src/content.js`).

## Borradores

Un proyecto con `draft: true` en `src/content.js` se ve solo con `npm run dev`. No aparece en la web publicada y sus videos se borran del build (`scripts/prune-drafts.mjs`). Además, esas carpetas de `public/media/` están en `.gitignore`, así que tampoco viajan al repositorio.

Hoy están en borrador: Nuvo y Vikingo Urquiza.

## Publicar

El repositorio es `andresarbit/andresarbit.github.io`. Cada `git push` a `main` dispara la Action que compila y publica en https://andresarbit.github.io.

```bash
git add -A && git commit -m "actualizo textos" && git push
```


`dist/` también se puede subir a cualquier otro hosting estático (Vercel, Netlify, Cloudflare Pages).
Ningún archivo supera 25 MB, así que entra en todos.
