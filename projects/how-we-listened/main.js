import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------- utils ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, p) => a + (b - a) * p;
const E = {
  lin: p => p,
  oc: p => 1 - Math.pow(1 - p, 3),
  ic: p => p * p * p,
  iq: p => p * p,
  io: p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  oe: p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  ob: p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  ob2: p => { const c1 = 2.4, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
};
let seedState = 1234567;
const rnd = () => { seedState |= 0; seedState = seedState + 0x6D2B79F5 | 0; let t = Math.imul(seedState ^ seedState >>> 15, 1 | seedState); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const rr = (a, b) => lerp(a, b, rnd());
const fmt = n => Math.round(n).toLocaleString('en-US');

const world = document.getElementById('world');
const camEl = document.getElementById('cam');
const blurG = document.getElementById('mblurG');
const subEl = document.getElementById('sub');
const grainEl = document.getElementById('grain');

const PH = await (await fetch('phrases.json')).json();
function ts(p, word, nth = 0) {
  const ws = PH[p].words; let c = 0;
  for (const w of ws) if (w[0].toLowerCase().replace(/[^a-z0-9$]/g, '').startsWith(word.toLowerCase())) { if (c++ === nth) return w[1]; }
  throw new Error('word not found ' + p + ' ' + word);
}
function pw(p, from, to) { // words of phrase p between word indices -> [[text,time]]
  return PH[p].words.slice(from, to).map(w => [w[0], w[1]]);
}

// ---------- cues ----------
const cues = [];
const cue = (t, type, vol = 1) => cues.push({ t: +t.toFixed(3), type, vol });

// ---------- camera ----------
const CK = [];
const k = (t, x, y, z, tilt, rz) => CK.push({ t, x, y, z, tilt, rz });
k(0, -420, -300, 1.5, 28, -6);
k(2.6, 0, 0, 1.0, 12, 0);
k(5.6, 15, 8, 1.06, 13, 1);
k(6.05, -380, -120, 1.02, 16, -2);
k(13.4, -370, -130, 1.07, 15, 0);
k(14.0, -400, -110, 1.1, 18, -1);
k(16.95, -400, -115, 1.14, 18, 0);
k(17.4, 420, -160, 1.0, 12, 2);
k(23.65, 440, -150, 1.09, 15, 0);
k(24.05, -300, 260, 1.04, 20, -2);
k(29.0, -300, 250, 1.0, 16, 0);
k(34.2, -290, 250, 1.04, 16, 1);
k(38.15, -300, 255, 1.08, 18, 0);
k(38.55, 380, 240, 1.0, 13, 2);
k(43.4, 390, 235, 1.06, 14, 0);
k(48.2, 380, 240, 1.1, 15, 0);
k(48.6, -420, -200, 1.0, 12, -2);
k(52.6, -420, -210, 1.07, 14, 0);
k(52.9, -420, -40, 1.0, 16, 0);
k(57.95, -410, -30, 1.07, 17, 0);
k(58.35, 300, -220, 1.0, 13, 2);
k(66.95, 300, -210, 1.09, 15, 0);
k(67.35, -250, 220, 1.0, 14, -2);
k(71.85, -250, 210, 1.07, 16, 0);
k(72.2, -250, 220, 1.0, 14, 0);
k(80.75, -250, 215, 1.08, 15, 0);
k(81.3, 0, 70, 0.8, 42, -4);
k(90.6, 20, 60, 0.86, 38, 4);
k(91.05, 0, 0, 1.0, 12, 0);
k(96.9, 0, 0, 1.04, 13, 0);
k(100.5, 0, 10, 0.78, 21, -2);
for (let i = 1; i < CK.length; i++) if (CK[i].t - CK[i - 1].t < 0.7) cue(CK[i - 1].t, 'whoosh', 0.9);

const shakes = [];
function camAt(t) {
  let i = 0; while (i < CK.length - 2 && t > CK[i + 1].t) i++;
  const a = CK[i], b = CK[i + 1];
  const p = E.io(clamp((t - a.t) / (b.t - a.t)));
  const c = { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), z: lerp(a.z, b.z, p), tilt: lerp(a.tilt, b.tilt, p), rz: lerp(a.rz, b.rz, p) };
  // handheld drift
  c.x += 5 * Math.sin(t * 0.71) + 2.5 * Math.sin(t * 1.93 + 1);
  c.y += 4 * Math.sin(t * 0.53 + 2) + 2 * Math.sin(t * 1.61);
  c.rz += 0.35 * Math.sin(t * 0.43);
  let sx = 0, sy = 0;
  for (const s of shakes) { const d = t - s.t; if (d > 0 && d < 0.6) { const e = Math.exp(-d * 9) * s.a; sx += e * Math.sin(d * 70); sy += e * Math.cos(d * 55); } }
  c.sx = sx; c.sy = sy;
  return c;
}
let cam = camAt(0);
function camSpace(wx, wy, wz) { // replicate CSS: scale rotX rotZ translate
  const r = cam.rz * Math.PI / 180, tl = cam.tilt * Math.PI / 180;
  const x = wx - cam.x + cam.sx, y = wy - cam.y + cam.sy, z = wz;
  const x1 = x * Math.cos(r) - y * Math.sin(r), y1 = x * Math.sin(r) + y * Math.cos(r), z1 = z;
  const y2 = y1 * Math.cos(tl) - z1 * Math.sin(tl), z2 = y1 * Math.sin(tl) + z1 * Math.cos(tl);
  return { x: x1 * cam.z, y: y2 * cam.z, z: z2 };
}

// ---------- elements ----------
const els = [];
let elCount = 0;
function make(html, cls) {
  const piv = document.createElement('div'); piv.className = 'piv';
  const inn = document.createElement('div'); inn.className = 'inn' + (cls ? ' ' + cls : '');
  if (typeof html === 'string') inn.innerHTML = html; else if (html) inn.appendChild(html);
  piv.appendChild(inn); world.appendChild(piv); piv.style.display = 'none';
  return { piv, inn };
}
function add(html, o) {
  const { piv, inn } = make(html, o.cls);
  if (o.style) Object.assign(inn.style, o.style);
  const e = Object.assign({ piv, inn, a: [0, 0], x: 0, y: 0, z: 0, rot: 0, rx: 0, ry: 0, s: 1, inS: 'drop', outS: 'lift', dIn: 0.45, dOut: 0.42, shadow: true, vis: false, sr: rr(-1, 1), bill: false }, o);
  e.id = elCount++;
  if (o.p3) piv.classList.add('p3');
  if (!o.silent) {
    if (e.inS === 'drop' || e.inS === 'flip') cue(e.tIn + e.dIn * 0.9, 'slap', e.vol ?? 1);
    if (e.inS === 'stamp') { cue(e.tIn + e.dIn * 0.95, 'thud', e.vol ?? 1); shakes.push({ t: e.tIn + e.dIn * 0.95, a: 9 }); }
    if (e.inS === 'pop') cue(e.tIn + 0.03, 'pop', (e.vol ?? 0.7));
    if (e.outS === 'lift' || e.outS.startsWith('sweep')) cue(e.tOut, 'swish', 0.35);
  }
  els.push(e); return e;
}
function upd(e, t) {
  const t0 = e.tIn, t1 = e.tOut;
  if (t < t0 - 0.0001 || t > t1 + e.dOut) { if (e.vis) { e.piv.style.display = 'none'; e.vis = false; } return; }
  if (!e.vis) { e.piv.style.display = 'block'; e.vis = true; }
  let x = e.a[0] + e.x, y = e.a[1] + e.y, z = e.z, rot = e.rot, rx = e.rx, ry = e.ry, s = e.s, o = 1;
  const pi = clamp((t - t0) / e.dIn), po = clamp((t - t1) / e.dOut);
  switch (e.inS) {
    case 'drop': { const q = E.oc(pi); z += 640 * (1 - q); rot += e.sr * 22 * (1 - q); x += e.sr * 70 * (1 - q); y += -90 * (1 - q); o *= clamp(pi * 4);
      if (pi >= 1) { const b = t - (t0 + e.dIn); z += 9 * Math.exp(-b * 9) * Math.sin(b * 30); } break; }
    case 'flip': { const q = E.ob(pi); ry += 95 * (1 - q) * (e.sr > 0 ? 1 : -1); z += 260 * (1 - E.oc(pi)) + 40 * Math.abs(Math.sin(ry * Math.PI / 180)); o *= clamp(pi * 5); break; }
    case 'pop': { const q = E.ob2(pi); s *= lerp(0.25, 1, q); z += 70 * (1 - E.oc(pi)); o *= clamp(pi * 6); break; }
    case 'stamp': { const q = E.iq(pi); s *= lerp(2.6, 1, q); z += 260 * (1 - q); o *= clamp(pi * 3); break; }
    case 'slideL': { const q = E.oe(pi); x += -1600 * (1 - q); rot += -9 * (1 - q); break; }
    case 'slideR': { const q = E.oe(pi); x += 1600 * (1 - q); rot += 9 * (1 - q); break; }
    case 'rise': { const q = E.oe(pi); y += 500 * (1 - q); z += 200 * (1 - E.oc(pi)); o *= clamp(pi * 4); break; }
    case 'fade': o *= pi; break;
  }
  switch (e.outS) {
    case 'lift': { const q = E.ic(po); z += 1000 * q; rot += e.sr * 34 * q; x += e.sr * 140 * q; y += -170 * q; o *= 1 - clamp((po - 0.5) / 0.5); break; }
    case 'sweepL': { const q = E.ic(po); x += -1900 * q; rot += -12 * q; break; }
    case 'sweepR': { const q = E.ic(po); x += 1900 * q; rot += 12 * q; break; }
    case 'fade': o *= 1 - po; break;
    case 'none': break;
  }
  z += 3 + e.id * 0.04;
  if (e.wob) rot += Math.sin(t * 1.3 + e.sr * 5) * e.wob;
  const st = { x, y, z, rot, rx, ry, s, o };
  if (e.fx) e.fx(e, t, st);
  const blur = st.z > 230 ? (st.z - 230) / 150 : 0;
  const bb = e.bill ? `rotateX(${-cam.tilt}deg)` : '';
  e.piv.style.transform = `translate3d(${st.x.toFixed(2)}px,${st.y.toFixed(2)}px,${st.z.toFixed(2)}px) ${bb} rotateZ(${st.rot.toFixed(3)}deg) rotateX(${st.rx.toFixed(3)}deg) rotateY(${st.ry.toFixed(3)}deg) scale(${st.s.toFixed(4)})`;
  e.piv.style.opacity = st.o.toFixed(3);
  if (e.shadow) {
    const L = Math.max(0, st.z) + (e.lift0 || 0);
    const sh = `drop-shadow(${(5 + L * 0.2).toFixed(1)}px ${(8 + L * 0.3).toFixed(1)}px ${(3 + L * 0.2).toFixed(1)}px rgba(0,0,0,${clamp(0.7 - L * 0.0003, 0.25, 0.7).toFixed(3)}))`;
    e.inn.style.filter = sh + (blur > 0.05 ? ` blur(${blur.toFixed(2)}px)` : '');
  } else if (blur > 0.05) e.inn.style.filter = `blur(${blur.toFixed(2)}px)`;
}

// ---------- builders ----------
function img(src, a, x, y, w, tIn, tOut, o = {}) {
  return add(`<img src="assets/${src}" style="width:${w}px">`, Object.assign({ a, x, y, tIn, tOut, rot: o.rot ?? rr(-6, 6) }, o));
}
let filtN = 0;
function photo(src, a, x, y, w, tIn, tOut, o = {}) {
  const id = 'dist' + (filtN++);
  const svgNS = 'http://www.w3.org/2000/svg';
  const defs = document.querySelector('svg defs');
  const f = document.createElementNS(svgNS, 'filter');
  f.setAttribute('id', id); f.setAttribute('x', '-4%'); f.setAttribute('y', '-4%'); f.setAttribute('width', '108%'); f.setAttribute('height', '108%');
  f.setAttribute('color-interpolation-filters', 'sRGB');
  f.innerHTML = `<feTurbulence type="fractalNoise" baseFrequency="0.0025 0.09" numOctaves="1" seed="${filtN * 7}" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" result="d"/>
    <feColorMatrix in="d" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
    <feOffset in="r" dx="0" dy="0" result="ro"/>
    <feColorMatrix in="d" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb"/>
    <feBlend in="ro" in2="gb" mode="screen"/>`;
  defs.appendChild(f);
  const disp = f.querySelector('feDisplacementMap'), off = f.querySelector('feOffset'), turb = f.querySelector('feTurbulence');
  const e = add(`<img src="assets/${src}" style="width:${w}px;filter:url(#${id})">`, Object.assign({ a, x, y, tIn, tOut, rot: o.rot ?? rr(-4, 4) }, o));
  cue(tIn + 0.3, 'glitch', 0.6);
  e.fx = (e, t, st) => {
    const d = t - (tIn + 0.2);
    let amt = d < 0 ? 1 : Math.exp(-d * 3.2);
    // occasional micro-glitches while on screen
    const g = Math.sin(t * 2.3 + e.id) > 0.985 ? 0.35 : 0;
    amt = Math.max(amt, g);
    disp.setAttribute('scale', (amt * 70 + 3).toFixed(1));
    off.setAttribute('dx', (amt * 16 + 1.2).toFixed(1));
    turb.setAttribute('seed', String(e.id * 13 + Math.floor(t * 12)));
  };
  return e;
}
function chipHTML(text, cls, size, extra = '') {
  return `<span class="chip ${cls || ''}" style="font-size:${size}px;${extra}">${text}</span>`;
}
// kinetic word group: list of [text, time, cls, size]
function words(list, a, x, y, o = {}) {
  const size = o.size || 70;
  const wrap = document.createElement('div');
  wrap.style.whiteSpace = 'normal'; wrap.style.width = (o.width || 1200) + 'px'; wrap.style.textAlign = o.align || 'center';
  wrap.style.lineHeight = (o.lh || 1.12); wrap.style.fontSize = '0px';
  const spans = [];
  for (const it of list) {
    const [text, tm, cls, sz] = it;
    const s = document.createElement('span');
    s.className = 'chip ' + (cls || o.cls || '');
    s.textContent = text;
    s.style.fontSize = (sz || size) + 'px'; s.style.margin = `0 ${(sz || size) * 0.09}px ${(sz || size) * 0.09}px`;
    s.style.display = 'inline-block'; s.style.transformOrigin = '50% 70%';
    if (o.nocase || (it[4] && it[4].nocase)) s.style.textTransform = 'none';
    const r = rr(-3.5, 3.5);
    s._r = r; s._t = tm; s._sz = sz || size;
    wrap.appendChild(s); spans.push(s);
    if (!o.silent) cue(tm, 'pop', 0.45);
  }
  const tIn = Math.min(...list.map(l => l[1])) - 0.02;
  const e = add(wrap, Object.assign({ a, x, y, tIn, tOut: o.tOut, inS: 'none', outS: o.outS || 'lift', silent: true, rot: o.rot ?? 0 }, o));
  e.fx = (e, t, st) => {
    for (const s of spans) {
      const p = clamp((t - s._t) / 0.22);
      const q = E.ob2(p);
      s.style.opacity = clamp(p * 5).toFixed(3);
      s.style.transform = `translateY(${((1 - E.oc(p)) * -30).toFixed(1)}px) rotate(${(s._r + (1 - q) * 14).toFixed(2)}deg) scale(${lerp(1.5, 1, q).toFixed(3)})`;
      if (s._jit && t > s._jit && t < s._jit + 0.7) { const j = Math.exp(-(t - s._jit) * 5); s.style.transform += ` translate(${(Math.sin(t * 90) * 14 * j).toFixed(1)}px,${(Math.cos(t * 77) * 6 * j).toFixed(1)}px)`; }
    }
    if (o.fx2) o.fx2(e, t, st);
  };
  e.spans = spans;
  return e;
}
const PAL = [['#f4efe3', '#121110'], ['#151413', '#f4efe3'], ['#c8262c', '#fff7ea'], ['#f2c230', '#121110'], ['#ece6d8', '#c8262c'], ['#262523', '#f2c230'], ['#ffffff', '#121110'], ['#d8cdb4', '#121110']];
const FONTS = ['Anton', 'Archivo', 'Bebas', 'Elite', 'Plex', 'Anton', 'Archivo'];
function ransom(text, a, x, y, size, tIn, tOut, o = {}) {
  const wrap = document.createElement('div');
  wrap.style.fontSize = '0px';
  const spans = []; let i = 0;
  const pal = o.pal || PAL;
  for (const ch of text) {
    if (ch === ' ') { const sp = document.createElement('span'); sp.style.display = 'inline-block'; sp.style.width = (size * 0.32) + 'px'; wrap.appendChild(sp); i++; continue; }
    const s = document.createElement('span');
    const [bg, fg] = pal[Math.floor(rnd() * pal.length)];
    const f = FONTS[Math.floor(rnd() * FONTS.length)];
    const sz = size * rr(0.82, 1.12);
    s.className = 'rl';
    s.textContent = ch;
    Object.assign(s.style, { background: bg, color: fg, fontFamily: f, fontSize: sz + 'px', lineHeight: '1', padding: `${sz * 0.08}px ${sz * 0.12}px ${sz * 0.02}px`, fontWeight: f === 'Plex' ? 700 : 400,
      backgroundImage: 'url(assets/paper.jpg)', backgroundBlendMode: 'multiply', textTransform: 'uppercase' });
    s._r = rr(-9, 9); s._dy = rr(-sz * 0.08, sz * 0.08); s._t = tIn + i * (o.stagger ?? 0.045);
    wrap.appendChild(s); spans.push(s); i++;
    if (i % 2 === 0) cue(s._t, 'pop', 0.35);
  }
  const e = add(wrap, Object.assign({ a, x, y, tIn: tIn - 0.01, tOut, inS: 'none', outS: 'lift', silent: true }, o));
  e.fx = (e, t) => {
    for (const s of spans) {
      const p = clamp((t - s._t) / 0.2), q = E.ob2(p);
      s.style.opacity = clamp(p * 5).toFixed(3);
      s.style.transform = `translateY(${s._dy.toFixed(1)}px) rotate(${(s._r * (0.6 + 0.4 * q) + (1 - q) * 25).toFixed(2)}deg) scale(${lerp(1.8, 1, q).toFixed(3)})`;
    }
  };
  return e;
}
function tape(text, a, x, y, size, cls, tIn, tOut, o = {}) {
  return add(`<span class="tape ${cls}" style="font-size:${size}px;${o.nocase ? 'text-transform:none;letter-spacing:.06em' : ''}">${text}</span>`, Object.assign({ a, x, y, tIn, tOut, inS: 'pop', dIn: 0.3, rot: o.rot ?? rr(-4, 4) }, o));
}
function date(text, a, x, y, size, tIn, tOut, o = {}) {
  return add(`<span class="date" style="font-size:${size}px">${text}</span>`, Object.assign({ a, x, y, tIn, tOut, inS: 'stamp', dIn: 0.2, rot: o.rot ?? rr(-7, 7), shadow: false }, o));
}
function stamp(text, a, x, y, size, tIn, tOut, o = {}) {
  return add(`<span class="stamp" style="font-size:${size}px">${text}</span>`, Object.assign({ a, x, y, tIn, tOut, inS: 'stamp', dIn: 0.2, rot: o.rot ?? -9, shadow: false }, o));
}
function mono(text, a, x, y, size, tIn, tOut, o = {}) {
  return add(`<span class="mono" style="font-size:${size}px">${text}</span>`, Object.assign({ a, x, y, tIn, tOut, inS: 'fade', dIn: 0.35, outS: 'fade', rot: 0, shadow: false, silent: true }, o));
}
function counter(a, x, y, size, tIn, t0, t1, to, tOut, o = {}) {
  const e = add(`<span class="chip ${o.cls || 'blk'}" style="font-size:${size}px;font-variant-numeric:tabular-nums;min-width:${o.minw || 0}px;text-align:center">0</span>`, Object.assign({ a, x, y, tIn, tOut, inS: 'pop', dIn: 0.3 }, o));
  const sp = e.inn.firstChild;
  const steps = 14;
  for (let i = 0; i <= steps; i++) cue(lerp(t0, t1, E.oe(i / steps)), 'tick', 0.5);
  e.fx = (e, t) => { const p = E.oe(clamp((t - t0) / (t1 - t0))); sp.textContent = (o.pre || '') + fmt(to * p) + (o.suf || ''); };
  return e;
}
// marker doodle: paths in viewBox w x h, drawn from tIn over dur
function doodle(paths, a, x, y, w, h, tIn, dur, tOut, o = {}) {
  const col = o.color || '#efe9dc', sw = o.sw || 8;
  const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible">${paths.map(p => `<path d="${p}" pathLength="1" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1.02" stroke-dashoffset="1" ${o.dash ? '' : ''}/>`).join('')}</svg>`;
  const e = add(svg, Object.assign({ a, x, y, tIn, tOut, inS: 'none', outS: 'fade', dOut: 0.25, rot: 0, shadow: false, silent: true }, o));
  const ps = [...e.inn.querySelectorAll('path')];
  cue(tIn, 'scribble', 0.5);
  e.fx = (e, t) => { ps.forEach((p, i) => { const s = tIn + dur * i / ps.length, d = dur / ps.length; p.setAttribute('stroke-dashoffset', (1 - E.oc(clamp((t - s) / d))).toFixed(4)); }); };
  return e;
}

// ---------- 3D CD (three.js) ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(1920, 1080, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
const fov = 2 * Math.atan(540 / 1500) * 180 / Math.PI;
const tcam = new THREE.PerspectiveCamera(fov, 1920 / 1080, 1, 20000);
tcam.position.set(0, 0, 1500); tcam.lookAt(0, 0, 0);
scene.add(new THREE.DirectionalLight(0xffffff, 1.4).translateX(-500).translateY(800).translateZ(900));
scene.add(new THREE.AmbientLight(0xffffff, 0.25));
function cdTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  const grd = g.createRadialGradient(512, 512, 60, 512, 512, 512);
  grd.addColorStop(0, '#d9dde2'); grd.addColorStop(0.35, '#c4c9cf'); grd.addColorStop(1, '#e8ebee');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 1024);
  for (let r = 160; r < 505; r += 1.6) { g.strokeStyle = `rgba(${120 + Math.random() * 80},${120 + Math.random() * 80},${140 + Math.random() * 80},${0.05 + Math.random() * 0.06})`; g.lineWidth = 1; g.beginPath(); g.arc(512, 512, r, 0, Math.PI * 2); g.stroke(); }
  // baked rainbow diffraction sheen
  const cg = g.createConicGradient(0.6, 512, 512);
  ['#ff4d6d','#ffd23f','#3bf0a0','#3ab0ff','#b45cff','#ff4d6d','#ffd23f','#3bf0a0','#3ab0ff','#b45cff','#ff4d6d'].forEach((c, i, arr) => cg.addColorStop(i / (arr.length - 1), c));
  g.globalAlpha = 0.33; g.fillStyle = cg; g.beginPath(); g.arc(512, 512, 505, 0, Math.PI * 2); g.arc(512, 512, 160, 0, Math.PI * 2, true); g.fill(); g.globalAlpha = 1;
  // hub
  g.fillStyle = 'rgba(235,240,245,0.9)'; g.beginPath(); g.arc(512, 512, 150, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(150,155,165,0.8)'; g.lineWidth = 3; g.beginPath(); g.arc(512, 512, 150, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(512, 512, 92, 0, Math.PI * 2); g.stroke();
  // ring text
  g.fillStyle = 'rgba(40,40,50,0.75)'; g.font = 'bold 30px Plex, monospace';
  const txt = 'DIGITAL AUDIO  •  80 MIN  •  700 MB  •  RECORDABLE  •  MIX 2000  •  ';
  const R = 470; let ang = -Math.PI / 2;
  for (const ch of txt) { const w = g.measureText(ch).width; g.save(); g.translate(512 + R * Math.cos(ang), 512 + R * Math.sin(ang)); g.rotate(ang + Math.PI / 2); g.fillText(ch, 0, 0); g.restore(); ang += (w + 2) / R; }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; return tex;
}
const shape = new THREE.Shape(); shape.absarc(0, 0, 1, 0, Math.PI * 2, false);
const hole = new THREE.Path(); hole.absarc(0, 0, 0.075, 0, Math.PI * 2, true); shape.holes.push(hole);
const cdGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false, curveSegments: 128 });
{ const pos = cdGeo.attributes.position, uv = cdGeo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 2 + 0.5, pos.getY(i) / 2 + 0.5); }
cdGeo.translate(0, 0, -0.006);
const cdMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: cdTexture(), metalness: 1.0, roughness: 0.07, iridescence: 1, iridescenceIOR: 1.9, iridescenceThicknessRange: [150, 950], clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 2.4, transparent: true });
const cdGroup = new THREE.Group(); const cd = new THREE.Mesh(cdGeo, cdMat); cdGroup.add(cd); scene.add(cdGroup);
const A1 = [-380, -120];
const cdShadow = add(`<div style="width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(0,0,0,.75) 0%,rgba(0,0,0,.35) 45%,rgba(0,0,0,0) 70%)"></div>`, { a: A1, x: -430, y: 40, tIn: 7.0, tOut: 14.4, inS: 'fade', outS: 'fade', dOut: 0.2, shadow: false, silent: true, rot: 0 });
cdShadow.fx = (e, t, st) => { const l = cdLift(t); st.x += l * 0.18; st.y += l * 0.25; st.s = 0.75 + l / 900; st.o *= clamp(1 - l / 1400) * (cdVis(t) ? 1 : 0); };
function cdLift(t) {
  if (t < 7.45) return lerp(1100, 170, E.oc(clamp((t - 7.0) / 0.45)));
  if (t < 13.95) return 170 + 14 * Math.sin((t - 7.45) * 2.1);
  return lerp(170, 6, E.io(clamp((t - 13.95) / 0.45)));
}
function cdVis(t) { return (t > 0.15 && t < 2.6) || (t > 7.0 && t < 14.42); }
cue(0.35, 'whoosh', 0.8); cue(7.05, 'whoosh', 0.8); cue(7.42, 'slap', 0.5);
function updCD(t) {
  if (!cdVis(t)) { cdGroup.visible = false; return; }
  cdGroup.visible = true;
  if (t < 3) { // intro fly-through in camera space
    const p = clamp((t - 0.15) / 2.45);
    const q = E.io(p);
    cdGroup.position.set(lerp(-200, 900, q), lerp(-80, 560, q * q), lerp(-1400, 1000, q * q));
    cdGroup.scale.setScalar(300);
    cdGroup.rotation.set(lerp(-1.2, 0.9, q), lerp(0.6, -0.4, q), 0);
    cd.rotation.z = -t * 5;
    cdMat.opacity = clamp(p * 6);
    return;
  }
  const l = cdLift(t);
  const c = camSpace(A1[0] - 430, A1[1] + 40, l);
  cdGroup.position.set(c.x, -c.y, c.z);
  let sc = 230 * cam.z;
  if (t > 13.95) sc *= lerp(1, 0.5, E.io(clamp((t - 13.95) / 0.45)));
  cdGroup.scale.setScalar(sc);
  const intro = clamp((t - 7.0) / 0.45);
  cdGroup.rotation.set(-0.55 + 0.09 * Math.sin(t * 1.3) + (1 - E.oc(intro)) * 1.4 + cam.tilt * Math.PI / 180 * 0.5, 0.28 * Math.sin(t * 0.7), (cam.rz * Math.PI / 180));
  cd.rotation.z = -t * 2.6;
  cdMat.opacity = t > 14.2 ? clamp(1 - (t - 14.2) / 0.22) : 1;
}

// ---------- scenes ----------
const S = [];
// S0 intro
{
  const a = [0, 0], out = 5.72;
  words([['2000', ts(0, 'Two'), 'blk', 250]], a, -470, -70, { tOut: out, size: 250 });
  doodle(['M10 60 C 120 10, 230 10, 330 55', 'M285 20 L 332 56 L 280 88'], a, 0, -80, 340, 100, 1.45, 0.5, out, { color: '#c41d23', sw: 10 });
  words([['2010', ts(1, 'ten'), 'red', 250]], a, 470, -70, { tOut: out, size: 250 });
  tape('HOW WE LISTENED', a, 0, -330, 46, 'k', 0.9, out, { rot: -2 });
  const w2 = PH[2].words.map(w => [w[0].replace('.', '').toUpperCase(), w[1], /changed/i.test(w[0]) ? 'red' : /music/i.test(w[0]) ? 'blk' : '', /changed|music/i.test(w[0]) ? 104 : 84]);
  words(w2, a, 0, 230, { tOut: out, width: 1500, size: 84 });
  img('jewel.png', a, -790, 330, 300, 2.7, out, { rot: -14 });
  img('earbuds.png', a, 800, -300, 240, 3.0, out, { rot: 12 });
}
// S1 CD
{
  const a = A1, out = 17.0;
  words([['LET’S', ts(3, 'Let')], ['START', ts(3, 'start')], ['WITH', ts(3, 'with')], ['THE', ts(3, 'the')], ['KING:', ts(3, 'king'), 'red', 92]], a, -430, -400, { tOut: 13.75, size: 66, width: 900 });
  doodle(['M20 120 L 50 30 L 110 95 L 160 10 L 210 95 L 270 30 L 300 120 Z', 'M30 150 L 290 150'], a, -430, -235, 320, 160, ts(3, 'king') + 0.1, 0.55, 13.75, { color: '#e0a400', sw: 11 });
  words([['THE', ts(4, 'the')], ['CD', ts(4, 'CD'), 'blk', 130]], a, -430, 290, { tOut: 13.75, size: 80 });
  date('2000 · U.S.A.', a, 660, -330, 58, ts(5, '2000'), 13.7, { rot: -5, outS: 'sweepR' });
  words(pw(5, 4, 12).map(w => [w[0].replace(',', '').toUpperCase(), w[1]]), a, 430, -215, { tOut: 13.7, size: 50, width: 860, outS: 'sweepR' });
  counter(a, 430, -50, 150, ts(5, '940') - 0.15, ts(5, '940'), ts(5, 'CDs') - 0.05, 942500000, 13.7, { outS: 'sweepR', minw: 860 });
  words([['CDs', ts(5, 'CDs'), 'red', 110]], a, 430, 105, { tOut: 13.7, outS: 'sweepR', nocase: true });
  mono('SHIPPED IN 2000 · SOURCE: RIAA', a, 430, 195, 26, ts(5, 'CDs') + 0.2, 13.55);
  const dm = img('discman.png', a, -430, 40, 520, ts(6, 'Discman') - 0.38, out, { rot: -6 });
  const skipT = ts(6, 'skip');
  const base = dm.fx;
  dm.fx = (e, t, st) => { if (t > skipT && t < skipT + 0.8) { const j = Math.exp(-(t - skipT) * 5); st.rot += Math.sin(t * 95) * 5 * j; st.x += Math.sin(t * 70) * 16 * j; st.z += Math.abs(Math.sin(t * 40)) * 30 * j; } };
  cue(skipT, 'skip', 1);
  const w6 = PH[6].words.map(w => { const tx = w[0].replace(/[,.]/g, '').toUpperCase(); return [tx, w[1], tx === 'DISCMAN' ? 'blk' : tx === 'SKIP' ? 'red' : '', tx === 'DISCMAN' ? 96 : tx === 'SKIP' ? 130 : 56]; });
  const g6 = words(w6, a, 420, -70, { tOut: out, size: 56, width: 860 });
  g6.spans[g6.spans.length - 1]._jit = skipT;
  doodle(['M0 0 L 40 40', 'M70 -10 L 80 45', 'M130 0 L 105 45'], a, -210, -230, 140, 60, skipT + 0.05, 0.3, out, { color: '#c41d23', sw: 9 });
}
// S2 Linkin Park
{
  const a = [420, -160], out = 23.8;
  date('OCT 24, 2000', a, -640, -385, 54, ts(7, 'October'), out, { rot: -6 });
  photo('ph_lp.png', a, -260, -10, 1000, ts(7, 'Linkin') - 0.2, out, { rot: -2.5 });
  ransom('LINKIN PARK', a, -280, 335, 96, ts(7, 'Linkin'), out, { stagger: 0.05 });
  tape('HYBRID THEORY', a, 590, -310, 50, 'k', ts(7, 'Hybrid'), out, { rot: 3 });
  add(`<span class="marker" style="font-size:38px">← their first album</span>`, { a, x: 590, y: -238, tIn: ts(7, 'Theory') + 0.25, tOut: out, inS: 'fade', dIn: 0.3, rot: -3, shadow: false });
  const w8 = PH[8].words.map(w => { const tx = w[0].replace('.', '').toUpperCase(); const red = /BEST|SELLING|21ST|CENTURY/.test(tx); const blk = /FIRST|ALBUM/.test(tx); return [tx, w[1], red ? 'red' : blk ? 'blk' : '', red || blk ? 78 : 54]; });
  words(w8, a, 590, 70, { tOut: out, size: 54, width: 600 });
}
// S3 Napster
{
  const a = [-300, 260], out = 38.2;
  const w9 = PH[9].words.map(w => [w[0].replace('.', '').toUpperCase(), w[1], /CHANGING/i.test(w[0]) ? 'red' : '', /CHANGING/i.test(w[0]) ? 130 : 100]);
  words(w9, a, 0, -60, { tOut: 25.25, size: 100, width: 1600 });
  img('crt.png', a, -560, 210, 450, ts(10, 'Napster') - 0.4, out, { rot: -4 });
  words([['NAPSTER', ts(10, 'Napster'), 'blk', 130]], a, -520, -310, { tOut: 34.2, rot: -3 });
  tape('1999 – 2001', a, -520, -200, 34, 'r', ts(10, 'Napster') + 0.4, 34.2, { rot: 2 });
  const w10 = pw(10, 1, 7).map(w => { const tx = w[0].replace(',', '').toUpperCase(); return [tx, w[1], tx === 'FREE' ? 'red' : '', tx === 'FREE' ? 92 : 60]; });
  words(w10, a, 360, -330, { tOut: 29.1, size: 60, width: 900, outS: 'fade' });
  const lap = img('laptop.png', a, 560, 230, 400, ts(10, 'from') - 0.35, 34.25, { rot: 5 });
  doodle(['M0 110 C 200 -40, 480 -40, 690 120'], a, 15, 90, 690, 130, ts(10, 'computer'), 0.6, 34.2, { color: '#efe9dc', sw: 6 });
  // traveling notes along arc
  for (let n = 0; n < 4; n++) {
    const e = add(`<span class="chip yel" style="font-size:44px;font-family:Archivo">♫</span>`, { a, x: 0, y: 0, tIn: ts(10, 'another'), tOut: 34.1, inS: 'fade', dIn: 0.2, outS: 'fade', silent: true, rot: 0 });
    e.fx = (e, t, st) => {
      const u = ((t - ts(10, 'another')) * 0.42 + n / 4) % 1;
      const P0 = [-330, 200], P1 = [-130, 50], P2 = [150, 50], P3 = [360, 210];
      const b = (p0, p1, p2, p3, u) => (1 - u) ** 3 * p0 + 3 * (1 - u) ** 2 * u * p1 + 3 * (1 - u) * u * u * p2 + u ** 3 * p3;
      st.x = a[0] + b(P0[0], P1[0], P2[0], P3[0], u); st.y = a[1] + b(P0[1], P1[1], P2[1], P3[1], u) - 30; st.z = 40 + Math.sin(u * Math.PI) * 60;
      st.o *= Math.sin(u * Math.PI) ** 0.5; st.rot = Math.sin(t * 3 + n) * 12;
    };
  }
  counter(a, 330, -320, 140, ts(11, '80') - 0.2, ts(11, '80'), ts(11, 'users') + 0.1, 80000000, 34.2, { outS: 'sweepL', minw: 780 });
  mono('USERS AT ITS PEAK', a, 330, -215, 30, ts(11, 'users'), 34.0);
  // 80 dots grid, 1 dot = 1M users
  const grid = document.createElement('div'); grid.style.width = (16 * 26) + 'px'; grid.style.fontSize = '0'; grid.style.whiteSpace = 'normal';
  const dots = [];
  for (let i = 0; i < 80; i++) { const d = document.createElement('span'); Object.assign(d.style, { display: 'inline-block', width: '18px', height: '18px', margin: '4px', background: i % 7 === 3 ? '#c8262c' : '#151413', borderRadius: '2px', opacity: 0 }); grid.appendChild(d); dots.push(d); }
  const ge = add(grid, { a, x: 330, y: -125, tIn: ts(11, '80'), tOut: 34.2, inS: 'none', outS: 'sweepL', shadow: true, silent: true, rot: -1 });
  const gt0 = ts(11, '80');
  ge.fx = (e, t) => dots.forEach((d, i) => { const p = clamp((t - gt0 - i * 0.012) / 0.15); d.style.opacity = p; d.style.transform = `scale(${lerp(2, 1, E.oc(p))})`; });
  mono('■ = 1 MILLION USERS', a, 330, -55, 22, gt0 + 1.0, 34.0);
  stamp('SHUT DOWN', a, 0, 15, 120, ts(11, 'shut'), 34.2, { rot: -10 });
  date('JULY 2001', a, 120, 205, 54, ts(11, 'July'), 34.2, { rot: 4 });
  words([['THEN', ts(12, 'Then')], ['CAME', ts(12, 'came')]], a, 120, -390, { tOut: out, size: 52 });
  tape('KAZAA', a, -230, -270, 66, 'r', ts(12, 'Kazaa'), out, { rot: -5 });
  tape('LIMEWIRE', a, 300, -265, 66, 'k', ts(12, 'LimeWire'), out, { rot: 4 });
  words([['BURN', ts(12, 'burning'), 'red', 170]], a, 20, -40, { tOut: out, rot: -4 });
  doodle(['M-10 90 C 0 40, 30 30, 20 -10 C 50 20, 60 50, 55 90', 'M60 90 C 70 50, 90 30, 85 0 C 110 40, 115 60, 110 92', 'M115 92 C 125 60, 150 50, 140 15 C 170 50, 175 70, 168 94'], a, 20, -175, 180, 100, ts(12, 'burning') + 0.15, 0.45, out, { color: '#e07a00', sw: 8 });
  words([['YOUR', ts(12, 'your')], ['OWN', ts(12, 'own')], ['MIX', ts(12, 'mix'), 'blk'], ['CDs', ts(12, 'CDs'), 'blk', 70, { nocase: true }]], a, 20, 120, { tOut: out, size: 62, width: 700 });
  img('cdr.png', a, 520, 60, 360, ts(12, 'mix') - 0.3, out, { rot: 14 });
  img('spindle.png', a, 760, 320, 280, ts(12, 'CDs') - 0.2, out, { rot: -8 });
}
// S4 iPod
{
  const a = [380, 240], out = 48.35;
  date('OCT 23, 2001', a, -650, -395, 52, ts(13, 'October'), out, { rot: -5 });
  words(pw(13, 3, 7).map(w => [w[0].toUpperCase(), w[1]]), a, -520, -290, { tOut: out, size: 56, width: 760 });
  words([['iPod', ts(13, 'iPod'), 'blk', 130]], a, -520, -165, { tOut: out, nocase: true, rot: -3 });
  img('ipod.png', a, -480, 200, 300, ts(13, 'iPod') - 0.1, out, { inS: 'flip', dIn: 0.55, rot: -4 });
  counter(a, 330, -290, 180, ts(14, 'a') - 0.05, ts(14, 'thousand'), ts(14, 'songs'), 1000, 43.45, { outS: 'sweepR', cls: 'red', minw: 520 });
  words([['SONGS', ts(14, 'songs'), 'blk', 92]], a, 330, -140, { tOut: 43.45, outS: 'sweepR' });
  words([['IN', ts(14, 'in')], ['YOUR', ts(14, 'your')], ['POCKET', ts(14, 'pocket'), 'red', 70]], a, 330, -45, { tOut: 43.45, size: 56, outS: 'sweepR' });
  const g = document.createElement('div'); g.style.width = (50 * 10) + 'px'; g.style.fontSize = '0'; g.style.whiteSpace = 'normal';
  const ds = [];
  for (let i = 0; i < 1000; i++) { const d = document.createElement('span'); Object.assign(d.style, { display: 'inline-block', width: '7px', height: '7px', margin: '1.5px', background: '#151413', opacity: 0 }); g.appendChild(d); ds.push(d); }
  const gt = ts(14, 'thousand');
  const ge = add(g, { a, x: 330, y: 135, tIn: gt, tOut: 43.45, inS: 'none', outS: 'sweepR', silent: true, rot: 1 });
  ge.fx = (e, t) => { const n = Math.floor(1000 * E.oe(clamp((t - gt) / 0.9))); for (let i = 0; i < 1000; i++) { const v = i < n ? '1' : '0'; if (ds[i]._v !== v) { ds[i].style.opacity = v; ds[i]._v = v; } } };
  mono('■ = 1 SONG', a, 330, 245, 22, gt + 0.9, 43.3);
  date('APR 28, 2003', a, 60, -395, 52, ts(15, '2003'), out, { rot: 5 });
  tape('iTUNES STORE', a, 330, -285, 62, 'k', ts(15, 'iTunes'), out, { rot: -3, nocase: true });
  add(`<span class="marker" style="font-size:40px">opens!</span>`, { a, x: 600, y: -210, tIn: ts(15, 'opened'), tOut: out, inS: 'pop', dIn: 0.25, rot: -8, shadow: false });
  words([['ONE', ts(16, 'One')], ['SONG', ts(16, 'song'), 'blk']], a, 300, -145, { tOut: out, size: 72 });
  const tag = add(`<div style="position:relative;background:#fbf8f0 url(assets/paper.jpg);padding:34px 70px 30px 110px;clip-path:polygon(60px 0,100% 0,100% 100%,60px 100%,0 50%)">
      <div style="position:absolute;left:52px;top:50%;width:26px;height:26px;margin-top:-13px;border-radius:50%;background:#2c2620;box-shadow:inset 0 2px 3px #000"></div>
      <span style="font-family:Archivo;font-size:150px;color:#121110;line-height:1">$0.99</span></div>`, { a, x: 320, y: 90, tIn: ts(16, '99') - 0.4, tOut: out, rot: 7 });
  img('earbuds.png', a, 760, 290, 260, ts(15, 'opened'), out, { rot: -10 });
}
// S5 White Stripes
{
  const a = [-420, -200], out = 58.05, o1 = 52.6;
  date('2003', a, -330, -420, 56, ts(17, 'That'), o1, { rot: -6 });
  photo('ph_ws.png', a, -250, -50, 860, ts(17, 'White') - 0.25, o1, { rot: -3 });
  ransom('THE WHITE STRIPES', a, -270, 300, 80, ts(17, 'The', 0), o1, { stagger: 0.035, pal: [['#c8262c', '#fff'], ['#ffffff', '#121110'], ['#121110', '#ffffff'], ['#f4efe3', '#c8262c']] });
  photo('ph_detroit.png', a, 560, -250, 480, ts(17, 'from') - 0.25, o1, { rot: 5 });
  tape('DETROIT, MICHIGAN', a, 560, -55, 40, 'r', ts(17, 'Detroit'), o1, { rot: -3 });
  words([['SEVEN', ts(17, 'Seven')], ['NATION', ts(17, 'Nation'), 'red'], ['ARMY', ts(17, 'Army'), 'blk']], a, 560, 160, { tOut: o1, size: 96, width: 640 });
  // riff explainer
  { const a = [-420, -40];
  words(pw(18, 0, 6).map(w => [w[0].toUpperCase(), w[1]]), a, -150, -330, { tOut: out, size: 54, width: 1400 });
  words([['BASS?', ts(18, 'bass'), 'blk', 140]], a, -470, -150, { tOut: out, rot: -3 });
  doodle(['M-20 30 L 330 -40'], a, -470, -150, 310, 10, ts(19, 'but'), 0.25, out, { color: '#c41d23', sw: 14 });
  stamp('GUITAR', a, -30, -150, 110, ts(19, 'guitar'), out, { rot: -6 });
  words([['+ PEDAL', ts(19, 'pedal'), 'red', 100]], a, 420, -150, { tOut: out, rot: 3 });
  const wave = (cyc, amp, w, h) => { let d = `M0 ${h / 2}`; for (let i = 1; i <= 120; i++) { const x = w * i / 120; d += ` L${x.toFixed(1)} ${(h / 2 - Math.sin(i / 120 * cyc * Math.PI * 2) * amp).toFixed(1)}`; } return d; };
  doodle([wave(8, 55, 460, 140)], a, -560, 170, 460, 140, ts(19, 'guitar') + 0.1, 0.7, out, { color: '#efe9dc', sw: 7 });
  mono('GUITAR NOTE', a, -560, 280, 28, ts(19, 'guitar') + 0.4, out);
  add(`<div style="width:230px;height:300px;border-radius:22px;background:linear-gradient(#b4161c,#7e0c10);box-shadow:inset 0 3px 0 rgba(255,255,255,.25),inset 0 -6px 0 rgba(0,0,0,.35);position:relative">
      <div style="position:absolute;left:30px;right:30px;top:26px;height:120px;border-radius:12px;background:linear-gradient(#2b2b2b,#111)"></div>
      <div style="position:absolute;left:84px;top:52px;width:62px;height:62px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#eee,#888);box-shadow:0 3px 6px #000"></div>
      <div style="position:absolute;left:0;right:0;top:170px;text-align:center;font-family:Archivo;font-size:30px;color:#fff;letter-spacing:.08em">WHAMMY</div>
      <div style="position:absolute;left:30px;right:30px;bottom:26px;height:46px;border-radius:8px;background:repeating-linear-gradient(90deg,#222 0 6px,#3a3a3a 6px 12px)"></div></div>`,
    { a, x: 0, y: 170, tIn: ts(19, 'pedal') - 0.3, tOut: out, rot: -4 });
  doodle(['M0 20 L 120 20', 'M95 0 L 122 20 L 95 40'], a, -255, 170, 130, 40, ts(19, 'pedal'), 0.3, out, { color: '#c41d23', sw: 8 });
  doodle(['M0 20 L 120 20', 'M95 0 L 122 20 L 95 40'], a, 190, 170, 130, 40, ts(19, 'drops'), 0.3, out, { color: '#c41d23', sw: 8 });
  doodle([wave(4, 62, 460, 140)], a, 520, 170, 460, 140, ts(19, 'drops') + 0.1, 0.7, out, { color: '#c41d23', sw: 9 });
  words([['ONE', ts(19, 'one')], ['OCTAVE', ts(19, 'octave'), 'blk'], ['LOWER', ts(19, 'lower'), 'red']], a, 520, 10, { tOut: out, size: 64 });
  mono('1 OCTAVE LOWER = HALF THE FREQUENCY', a, 520, 285, 26, ts(19, 'lower'), out);
  }
}
// S6 phones
{
  const a = [300, -220], out = 67.0;
  words(pw(20, 0, 6).map(w => [w[0].replace(',', '').toUpperCase(), w[1]]), a, -150, -410, { tOut: out, size: 46, width: 1400 });
  const w20 = pw(20, 6, 10).map(w => { const tx = w[0].replace(':', '').toUpperCase(); return [tx, w[1], tx === 'PHONES' ? 'red' : tx === 'PLAYERS' ? 'blk' : '', 88]; });
  words(w20, a, -150, -300, { tOut: out, size: 88, width: 1500 });
  img('razr.png', a, -580, 60, 290, ts(21, 'Motorola') - 0.35, out, { rot: -8 });
  tape('MOTOROLA RAZR · 2004', a, -580, 300, 30, 'k', ts(21, 'RAZR'), out, { rot: 2 });
  const wk = img('walkman.png', a, -170, 70, 280, ts(21, 'Sony') - 0.35, out, { rot: 6 });
  tape('SONY ERICSSON WALKMAN · 2005', a, -170, 305, 30, 'r', ts(21, 'Walkman'), out, { rot: -2 });
  const rt = ts(21, 'ringtones');
  words([['RINGTONES ♪', rt, 'yel', 64]], a, -390, -160, { tOut: out, rot: -4 });
  cue(rt + 0.1, 'ring', 0.8);
  for (let r = 0; r < 3; r++) doodle([`M0 ${40 + r * 30} A ${60 + r * 34} ${60 + r * 34} 0 0 1 ${30 + r * 26} ${-70 - r * 30}`], a, 10 + r * 12, -40, 120, 120, rt + 0.1 + r * 0.12, 0.25, out, { color: '#efe9dc', sw: 6 });
  wk.fx = (e, t, st) => { if (t > rt && t < rt + 1.2) { st.rot += Math.sin(t * 80) * 3 * Math.exp(-(t - rt) * 2.5); } };
  img('laptop.png', a, 500, 110, 420, ts(22, 'On') - 0.35, out, { rot: -4 });
  tape('MySpace', a, 500, -125, 62, 'b', ts(22, 'MySpace'), out, { rot: 3, nocase: true });
  words([['BANDS', ts(22, 'bands')], ['GOT', ts(22, 'got')], ['NOTICED', ts(22, 'noticed'), 'red']], a, 500, 345, { tOut: out, size: 52 });
}
// S7 Arctic Monkeys
{
  const a = [-250, 220], out = 80.85, o1 = 71.95;
  photo('ph_sheffield.png', a, -570, -160, 560, ts(23, 'From') - 0.3, o1, { rot: -5 });
  tape('SHEFFIELD, ENGLAND', a, -570, 30, 38, 'k', ts(23, 'Sheffield'), o1, { rot: 3 });
  photo('ph_am.png', a, 230, -110, 800, ts(23, 'Arctic') - 0.3, o1, { rot: 3 });
  ransom('ARCTIC MONKEYS', a, 230, 250, 80, ts(23, 'Arctic'), o1, { stagger: 0.04 });
  const w23 = pw(23, 8, 13).map(w => { const tx = w[0].replace('.', '').toUpperCase(); return [tx, w[1], tx === 'ONLINE' ? 'red' : tx === 'FANS' ? 'blk' : '', tx === 'ONLINE' || tx === 'FANS' ? 74 : 56]; });
  words(w23, a, -570, 230, { tOut: o1, size: 56, width: 560 });
  doodle(['M0 0 C -60 -30, -120 -10, -170 40', 'M-150 18 L -172 42 L -140 50', 'M0 10 C -40 60, -100 90, -170 100', 'M-148 84 L -172 100 L -144 112'], a, -45, 120, 180, 120, ts(23, 'shared'), 0.5, o1, { color: '#c41d23', sw: 7 });
  date('JAN 23, 2006', a, 0, -405, 58, ts(24, 'January'), out, { rot: -4 });
  words(pw(24, 3, 7).map(w => [w[0].toUpperCase(), w[1]]), a, 0, -305, { tOut: out, size: 54, width: 1400 });
  counter(a, 0, -175, 180, ts(24, '360') - 0.2, ts(24, '360'), ts(24, 'copies'), 363735, out, { cls: 'blk', minw: 720 });
  words([['COPIES', ts(24, 'copies')], ['IN', ts(24, 'in', 1)], ['ONE', ts(24, 'one')], ['WEEK', ts(24, 'week'), 'red', 80]], a, 0, -30, { tOut: out, size: 60 });
  // comparison bars
  const bt = ts(25, 'The');
  const bar = (y, w, col, label, val, d) => {
    const e = add(`<div style="width:900px;text-align:left"><div style="font-family:Plex;font-weight:700;font-size:24px;color:#ece6d8;margin-bottom:6px">${label}</div>
      <div class="b" style="height:46px;width:0;background:${col} url(assets/paper.jpg);background-blend-mode:multiply;position:relative"><span style="position:absolute;right:12px;top:6px;font-family:Anton;font-size:30px;color:#fff">${val}</span></div></div>`,
      { a, x: 0, y, tIn: bt - 0.5 + d, tOut: out, inS: 'fade', dIn: 0.2, rot: 0, silent: true });
    const b = e.inn.querySelector('.b');
    e.fx = (e, t) => { b.style.width = (w * E.oe(clamp((t - (bt - 0.4 + d)) / 0.7))).toFixed(1) + 'px'; };
    cue(bt - 0.4 + d, 'swish', 0.5);
  };
  bar(70, 759, '#6d655a', 'PREVIOUS RECORD · HEAR’SAY · 2001', '306,631', 0);
  bar(150, 900, '#c8262c', 'ARCTIC MONKEYS · 2006', '363,735', 0.25);
  stamp('FASTEST-SELLING FIRST ALBUM IN UK HISTORY', a, 0, 262, 44, ts(25, 'fastest'), out, { rot: -3 });
  mono('SOURCE: OFFICIAL CHARTS COMPANY', a, 560, 410, 20, ts(25, 'history'), out);
}
// S8 chart (3D cardboard bars)
{
  const a = [0, 40], out = 90.7;
  const vals = [942.5, 881.9, 803.3, 746.0, 767.0, 705.4, 614.9, 511.1, 384.7, 292.9, 225.8];
  const t2000 = ts(27, '940'), t2010 = ts(27, '2010', 0);
  words([['LOOK', ts(26, 'Look')], ['AT', ts(26, 'at')], ['THE', ts(26, 'the')], ['NUMBERS', ts(26, 'numbers'), 'red', 92]], a, 0, -500, { tOut: 87.6, size: 70, bill: true, z: 40 });
  const W = 82, D = 82;
  vals.forEach((v, i) => {
    const year = 2000 + i;
    const H = v / 942.5 * 430;
    const tg = i === 0 ? t2000 : i === 10 ? t2010 : lerp(83.75, 86.85, (i - 1) / 8);
    const front = i === 0 ? '#2a2826' : i === 10 ? '#c8262c' : '';
    const faceBG = c => c ? `background:${c} url(assets/paper.jpg);background-blend-mode:multiply;` : `background:url(assets/cardboard.jpg) center/300px;`;
    const html = `<div class="bar3" style="position:absolute;left:0;top:0;transform-style:preserve-3d">
       <div class="top" style="position:absolute;left:0;top:0;width:${W}px;height:${D}px;${faceBG(front)}filter:brightness(1.18);transform-origin:0 0"></div>
       <div class="front" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;${faceBG(front)}transform-origin:0 0;overflow:hidden"></div>
       <div class="side" style="position:absolute;left:0;top:0;width:${D}px;height:${H}px;${faceBG(front)}filter:brightness(.62);transform-origin:0 0"></div></div>`;
    const e = add(html, { a, x: -600 + i * 120, y: 150, tIn: tg - 0.05, tOut: out, inS: 'none', outS: 'fade', dOut: 0.3, rot: 0, shadow: false, p3: true, silent: true });
    e.inn.style.transform = 'none'; e.inn.style.transformStyle = 'preserve-3d';
    const top = e.inn.querySelector('.top'), fr = e.inn.querySelector('.front'), sd = e.inn.querySelector('.side');
    cue(tg, 'thock', 0.6);
    e.fx = (e, t) => {
      const h = Math.max(0.5, H * E.ob(clamp((t - tg) / 0.45)));
      top.style.transform = `translate3d(${-W / 2}px,${-D / 2}px,${h}px)`;
      fr.style.height = h + 'px'; sd.style.height = h + 'px';
      fr.style.transform = `translate3d(${-W / 2}px,${D / 2}px,${h}px) rotateX(-90deg)`;
      sd.style.transform = `translate3d(${W / 2}px,${D / 2}px,${h}px) rotateZ(-90deg) rotateX(-90deg)`;
    };
    // shadow on lid
    const sh = add(`<div style="width:${W + 40}px;height:${D + 40}px;background:radial-gradient(rgba(0,0,0,.6),rgba(0,0,0,0) 70%)"></div>`, { a, x: -600 + i * 120 + 30, y: 150 - 10, tIn: tg, tOut: out, inS: 'fade', dIn: 0.4, outS: 'fade', shadow: false, silent: true, rot: 0 });
    mono(String(year), a, -600 + i * 120, 150 + D / 2 + 40, 30, tg - 0.05, out, { style: { fontWeight: 700 } });
    if (i === 0 || i === 10) {
      const lab = add(`<span class="chip ${i === 0 ? 'blk' : 'red'}" style="font-size:54px">${i === 0 ? '942.5M' : '225.8M'}</span>`, { a, x: -600 + i * 120, y: 150, z: H + 70, tIn: tg + 0.3, tOut: out, inS: 'pop', dIn: 0.3, bill: true, rot: 0 });
    }
  });
  mono('U.S. CD ALBUMS SHIPPED, MILLIONS · SOURCE: RIAA', a, -230, 300, 26, t2000 - 0.3, out);
  mono('2000 → 2010', a, 430, -125, 34, ts(28, 'drop'), out, { bill: true, z: 200, style: { fontWeight: 700 } });
  stamp('−76%', a, 430, -300, 150, ts(28, 'drop'), out, { bill: true, z: 200, rot: -8 });
  add(`<div class="note" style="font-size:40px">+ iTunes passed <b style="font-family:Anton;font-size:56px;color:#c8262c">10 BILLION</b> songs sold (Feb 2010)</div>`, { a, x: 230, y: 430, z: 60, tIn: ts(28, '76') + 0.3, tOut: out, bill: true, rot: -5 });
}
// S9 outro
{
  const a = [0, 0], out = 120;
  date('OCT 7, 2008', a, -120, -300, 56, ts(29, '2008'), 96.85, { rot: -5 });
  img('iphone.png', a, -580, 110, 250, ts(29, 'Spotify') - 0.2, 96.85, { inS: 'flip', dIn: 0.5, rot: -5 });
  words([['Spotify', ts(29, 'Spotify'), 'grn', 120]], a, -540, -255, { tOut: 96.85, nocase: true, rot: -3 });
  words(pw(30, 0, 6).map(w => [w[0].toUpperCase(), w[1]]), a, 300, -390, { tOut: 96.85, size: 50, width: 1000 });
  img('jewel.png', a, 160, -110, 340, ts(30, 'something') - 0.3, 96.85, { rot: 8 });
  words([['OWNED', ts(30, 'owned'), 'blk', 120]], a, 470, -150, { tOut: 96.85, rot: 4 });
  doodle(['M-10 40 L 330 -20'], a, 470, -150, 320, 20, ts(31, 'It') + 0.05, 0.25, 96.85, { color: '#c41d23', sw: 16 });
  words(pw(31, 0, 5).map(w => [w[0].toUpperCase(), w[1]]), a, 300, 150, { tOut: 96.85, size: 46, width: 1000 });
  words([['REACH', ts(31, 'reach'), 'grn', 130]], a, 300, 280, { tOut: 96.85, rot: -2 });
  // finale
  words([['SO…', ts(32, 'So'), 'red', 90]], a, 0, -170, { tOut: out, rot: -4 });
  const w33 = PH[33].words.map(w => { const tx = w[0].replace('?', '').toUpperCase(); return [tx === 'LISTEN' ? 'LISTEN?' : tx, w[1], tx === 'LISTEN' ? 'red' : tx === 'YOU' ? 'blk' : '', 100]; });
  words(w33, a, 0, 10, { tOut: out, size: 100, width: 1300 });
  const rain = [['discman.png', -760, -330, 330, -10], ['ipod.png', -470, 380, 210, 8], ['cdr.png', 760, -330, 300, 15], ['razr.png', 790, 300, 200, -12], ['walkman.png', -820, 210, 200, 10], ['crt.png', 470, 400, 330, -5],
    ['earbuds.png', -220, -420, 220, -14], ['headphones.png', 330, -410, 260, 10], ['jewel.png', -830, -20, 260, 6], ['spindle.png', 860, 40, 240, -8], ['iphone.png', 120, 430, 160, 14], ['laptop.png', -200, 440, 300, -6]];
  rain.forEach((r, i) => img(r[0], a, r[1], r[2], r[3], 97.05 + i * 0.13, out, { rot: r[4], vol: 0.6 }));
  tape('HOW WE LISTENED · 2000–2010', a, 0, 175, 40, 'k', 98.5, out, { rot: 1 });
  mono('SOURCES: RIAA · APPLE · OFFICIAL CHARTS COMPANY', a, 0, 250, 22, 98.8, out);
}

// ---------- subtitles ----------
const SUBSKIP = new Set([0, 1, 2, 9, 32, 33]);
let subIdx = -1, subSpans = [];
function updSub(t) {
  let idx = -1;
  for (let i = 0; i < PH.length; i++) { const nx = PH[i + 1] ? PH[i + 1].start : 999; if (t >= PH[i].start - 0.05 && t < Math.min(nx - 0.05, PH[i].end + 0.9)) idx = i; }
  if (SUBSKIP.has(idx)) idx = -1;
  if (idx !== subIdx) {
    subIdx = idx; subEl.innerHTML = '';
    subSpans = [];
    if (idx >= 0) for (const w of PH[idx].words) { const s = document.createElement('span'); s.textContent = w[0] + ' '; s._t = w[1]; subEl.appendChild(s); subSpans.push(s); }
  }
  for (const s of subSpans) s.style.opacity = t >= s._t - 0.02 ? '1' : '0.0';
}

// ---------- render ----------
let prevCam = null;
window.renderAt = (t) => {
  cam = camAt(t);
  const c1 = camAt(Math.max(0, t - 1 / 30));
  const vx = (cam.x - c1.x) * cam.z, vy = (cam.y - c1.y) * cam.z;
  const bx = Math.min(Math.max(0, Math.abs(vx) - 10) * 0.26, 34), by = Math.min(Math.max(0, Math.abs(vy) - 10) * 0.26, 34);
  if (bx + by > 0.6) { blurG.setAttribute('stdDeviation', `${bx.toFixed(1)} ${by.toFixed(1)}`); camEl.style.filter = 'url(#mblur)'; } else camEl.style.filter = 'none';
  world.style.transform = `scale(${cam.z}) rotateX(${cam.tilt}deg) rotateZ(${cam.rz}deg) translate3d(${(-cam.x + cam.sx).toFixed(2)}px,${(-cam.y + cam.sy).toFixed(2)}px,0)`;
  for (const e of els) upd(e, t);
  updCD(t);
  renderer.render(scene, tcam);
  updSub(t);
  const f = Math.floor(t * 24);
  grainEl.style.transform = `translate(${(f * 137) % 200 - 100}px,${(f * 71) % 200 - 100}px)`;
};
window.cues = cues;
await document.fonts.ready;
await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
window.renderAt(0);
window.READY = true;
