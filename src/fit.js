// Type fitting. Measurements use offsetWidth (layout box), so transforms
// running on ancestors (the hero zoom) never skew the result.

const PROBE = 200;

function widthAt(el, size, stretch) {
  el.style.fontSize = size + 'px';
  el.style.fontStretch = stretch + '%';
  return el.offsetWidth;
}

/** Scale a single line so that, at `stretch`, it spans exactly `target` px. */
export function fitToWidth(el, target, stretch) {
  const prev = el.style.fontStretch;
  const w = widthAt(el, PROBE, stretch);
  if (!w) return;
  el.style.fontSize = (PROBE * target) / w + 'px';
  el.style.fontStretch = prev || stretch + '%';
}

/**
 * Justify a block of lines to one width by moving the width axis instead of
 * tracking: every line shares one size, each finds the stretch that fills.
 */
export function justifyByWidth(lines, target, maxSize) {
  if (!lines.length) return;
  // tallest size at which the longest line still fits once fully condensed
  const at62 = lines.map((el) => widthAt(el, PROBE, 62));
  let size = Math.min(...at62.map((w) => (PROBE * target) / w));
  if (maxSize) size = Math.min(size, maxSize);

  lines.forEach((el) => {
    let lo = 62, hi = 125;
    el.style.fontSize = size + 'px';
    const wide = widthAt(el, size, hi);
    if (wide <= target) {
      // even fully expanded it falls short: grow this line until it fills
      el.style.fontSize = (size * target) / wide + 'px';
      el.style.fontStretch = hi + '%';
      return;
    }
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (widthAt(el, size, mid) > target) hi = mid; else lo = mid;
    }
    el.style.fontStretch = lo.toFixed(2) + '%';
  });
}
