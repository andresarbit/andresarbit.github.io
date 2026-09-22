# Design system

**Idea:** "La marca no existe. El sistema sí." El sitio es el sistema: una sola familia tipográfica, una sola regla de composición, distintos negros.

## Tipografía

- Una familia: **Archivo** variable (peso 100–900, ancho 62–125%).
- La expresión viene del eje de ancho, no del tracking (referencia: Paula Scher). Las líneas display se justifican cambiando el ancho hasta llenar la medida (`src/fit.js`).
- Display: peso 900, mayúsculas, interlineado 0.8–0.84.
- Texto: peso 400–450, ancho 100%, 17–30 px, medida de 34–44 caracteres.
- Etiquetas: 12–13 px, mayúsculas, tracking 0.06em, solo para metadatos (nunca encima de un título).

## Color

| Token | Valor | Uso |
|---|---|---|
| `--void` | `#070707` | hero, contacto, vista de proyecto |
| `--matte` | `#0b0b0a` | frase |
| `--deep` | `#090909` | trabajo |
| `--lacquer` | `#0a0a0c` | enfoque (con brillo que se mueve con el scroll) |
| `--warm` | `#100e0d` | bio |
| `--paper` | `#ecebe7` | texto principal |
| `--paper-2` | `#b9b6b0` | texto secundario |
| `--mute` | `#8f8c87` | metadatos |
| `--red` | `#e5391c` | un solo acento: "SÍ.", "SIN TECHO DE PRODUCCIÓN", "HABLEMOS.", foco |

Grano de película fijo sobre toda la página (5.5%, overlay). Sin gradientes decorativos, sin vidrio, sin sombras.

## Forma

- Esquinas rectas en todo (radio 0). La única excepción es el control del reproductor.
- Grilla de 12 columnas, margen `clamp(16px, 2.6vw, 44px)`.
- Los films 16:9 ocupan el ancho completo y cortan las filas de verticales.

## Movimiento

- Curvas: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` para entradas, `--ease-io: cubic-bezier(0.77, 0, 0.175, 1)` para transiciones de pantalla.
- Momento principal: el nombre con los videos dentro de las letras; al hacer scroll la cámara entra por la "I".
- Frase: cada línea anima el eje de ancho con el scroll.
- Proyecto: se abre desde el recorte de su propio tile (clip-path).
- Con `prefers-reduced-motion` todo queda quieto y visible.
