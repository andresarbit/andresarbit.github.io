import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/schibsted-grotesk';
import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { copy, contact, projects, heroStills } from './content.js';
import { fitToWidth, justifyByWidth } from './fit.js';
import { createTheater } from './theater.js';

gsap.registerPlugin(ScrollTrigger);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveData = navigator.connection && navigator.connection.saveData;
const media = (slug, file) => `/media/${slug}/${file}`;
// Drafts stay in the local preview and never reach the published build
const visible = projects.filter((p) => import.meta.env.DEV || !p.draft);

/* ── Language ─────────────────────────────── */
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
// Español primero; el visitante puede cambiar a inglés y queda guardado
let lang = store.get('lang') || 'es';
const t = (path) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), copy[lang]);

/* ── Static render ────────────────────────── */
function renderText() {
  document.documentElement.lang = lang;
  document.title = t('metaTitle');
  $('meta[name="description"]').setAttribute('content', t('metaDesc'));
  $$('[data-i18n]').forEach((el) => {
    const v = t(el.dataset.i18n);
    if (typeof v === 'string') el.textContent = v;
  });
  $$('.lang span').forEach((s) => s.classList.toggle('is-on', s.dataset.lang === lang));
  $('#lang').setAttribute('aria-label', lang === 'es' ? 'Switch to English' : 'Cambiar a español');

  // statement lines
  const st = $('.statement__type');
  st.innerHTML = t('statement.lines')
    .map((l, i, a) => `<span class="st-line${i === a.length - 1 ? ' st-line--end' : ''}">${l}</span>`)
    .join('');

  // approach
  $('#approachList').innerHTML = t('approach.items')
    .map((it) => {
      // a marked phrase travels as one token, so a line break never splits it
      const words = it.head.match(/\*[^*]+\*|\S+/g) || [it.head];
      // break long heads into balanced display lines, then widen the marked words
      const lines = words.length > 2 ? splitBalanced(words) : [it.head];
      const type = (l) => l.replace(/\*([^*]+)\*/g, '<em class="ap__wide">$1</em>');
      // one sentence per line: a full stop followed by text becomes a line break
      const prose = it.body.replace(/\.\s+(?=\S)/g, '.\n');
      return `<li class="ap rv"><h3 class="ap__head">${lines.map((l) => `<span>${type(l)}</span>`).join('')}</h3><p class="ap__body">${prose}</p></li>`;
    })
    .join('');

  $('#services').innerHTML = t('bio.services').map((s) => `<li>${s}</li>`).join('');
  $('#brands').innerHTML = t('bio.brands').map((s) => `<li>${s}</li>`).join('');

  $('.bio__img').alt = t('bio.photoAltAi');

  $('#contactRows').innerHTML = `
    <div class="crow"><span class="crow__label">${t('contact.email')}</span>
      <a class="crow__value" href="mailto:${contact.email}">${contact.email}</a>
      <button class="crow__btn" type="button" data-copy="${contact.email}">${t('contact.copy')}</button></div>
    <div class="crow"><span class="crow__label">${t('contact.whatsapp')}</span>
      <a class="crow__value" href="${contact.whatsappUrl}" target="_blank" rel="noopener">${contact.whatsappLabel}</a><span></span></div>
    <div class="crow"><span class="crow__label">${t('contact.instagram')}</span>
      <a class="crow__value" href="${contact.instagramUrl}" target="_blank" rel="noopener">${contact.instagramLabel}</a><span></span></div>`;

  // tile type lines
  $$('.tile').forEach((li) => {
    const p = visible.find((x) => x.slug === li.dataset.slug);
    $('.tile__type', li).textContent = p.type[lang];
  });
}

function splitBalanced(words) {
  const plain = (w) => w.replace(/\*/g, '');
  // two lines, as even as possible by character count
  let best = 1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = plain(words.slice(0, i).join(' ')).length, b = plain(words.slice(i).join(' ')).length;
    if (Math.abs(a - b) < bestDiff) { bestDiff = Math.abs(a - b); best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

/* ── Work grid ────────────────────────────── */
const isPhone = () => window.matchMedia('(max-width: 767px)').matches;
let gridPhone = null;

function renderGrid() {
  // Each row is justified: widths follow each piece's own ratio, so every tile in
  // a row starts and ends on the same line, whatever shape it is. On a phone the
  // same rule applies to pairs, and the wide films take a line of their own.
  const phone = isPhone();
  gridPhone = phone;
  const source = [];
  visible.forEach((p) => {
    const r = p.row || 1;
    (source[r] ||= []).push(p);
  });

  const rows = [];
  if (!phone) {
    source.filter(Boolean).forEach((row) => rows.push(row));
  } else {
    // phones pair the pieces in order, across the desktop rows, so none is left alone
    const all = source.filter(Boolean).flat();
    for (let i = 0; i < all.length; i += 2) rows.push(all.slice(i, i + 2));
  }

  $('#grid').innerHTML = rows
    .map((row) => {
      const tiles = row
        .map((p) => {
          const poster = p.kind === 'stills' ? media(p.slug, 'stills/01.webp') : media(p.slug, 'poster.webp');
          const inner = p.kind === 'stills'
            ? `<div class="tile__slides" data-count="${p.stills}"><img src="${poster}" alt="" class="is-on" loading="lazy" decoding="async"></div>`
            : `<img src="${poster}" alt="" loading="lazy" decoding="async"><video muted loop playsinline preload="none" data-src="${media(p.slug, 'preview.mp4')}"></video>`;
          const [w, h] = p.ratio.split('/').map(Number);
          return `<li class="tile" data-slug="${p.slug}" style="--ratio:${p.ratio};--aspect:${(w / h).toFixed(4)}">
            <a class="tile__link" href="#/p/${p.slug}" aria-label="${p.title}">
              <div class="tile__media">${inner}</div>
              <div class="tile__cap"><h3 class="tile__title">${p.title}</h3><p class="tile__type"></p></div>
            </a></li>`;
        })
        .join('');
      return `<li class="grid__row"><ul class="grid__inner" role="list">${tiles}</ul></li>`;
    })
    .join('');
}

/* Every tile drifts a little as the page moves: small pieces travel further */
let tileParallax = [];
function gridMotion() {
  tileParallax.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
  tileParallax = [];
  if (reduceMotion || window.innerWidth < 768) return;
  $$('.tile').forEach((tile) => {
    const aspect = +getComputedStyle(tile).getPropertyValue('--aspect') || 0.8;
    const drift = 16 + (1 - Math.min(aspect, 1.4) / 1.4) * 14;
    tileParallax.push(
      gsap.fromTo(tile, { y: drift }, {
        y: -drift, ease: 'none',
        scrollTrigger: { trigger: tile, start: 'top bottom', end: 'bottom top', scrub: 0.7 },
      })
    );
  });
}

function wireTiles() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const m = $('.tile__media', e.target);
        const v = $('video', m);
        if (v) {
          if (e.isIntersecting) {
            if (!v.src && !reduceMotion && !saveData) v.src = v.dataset.src;
            if (v.src) v.play().then(() => m.classList.add('is-playing')).catch(() => {});
          } else if (v.src) {
            v.pause();
          }
        } else {
          const s = $('.tile__slides', m);
          if (e.isIntersecting && !reduceMotion) startSlides(s); else stopSlides(s);
        }
      });
    },
    { threshold: 0.3 }
  );
  $$('.tile').forEach((el) => io.observe(el));

  const reveal = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); reveal.unobserve(e.target); } }),
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  );
  $$('.tile').forEach((el) => reveal.observe(el));
}

function startSlides(s) {
  if (s._timer) return;
  const slug = s.closest('.tile').dataset.slug;
  const n = +s.dataset.count;
  if (!s._built) {
    for (let i = 2; i <= Math.min(n, 6); i++) {
      const img = new Image();
      img.alt = ''; img.decoding = 'async';
      img.src = media(slug, `stills/${String(i).padStart(2, '0')}.webp`);
      s.appendChild(img);
    }
    s._built = true;
  }
  let i = 0;
  // no two tiles tick together: each gets its own period and starting offset
  const seat = [...$$('.tile__slides')].indexOf(s);
  const period = 2200 + (seat % 4) * 450;
  s._timer = setTimeout(function tick() {
    const imgs = $$('img', s);
    imgs[i].classList.remove('is-on');
    i = (i + 1) % imgs.length;
    imgs[i].classList.add('is-on');
    s._timer = setTimeout(tick, period);
  }, 600 + seat * 700);
}
function stopSlides(s) { clearTimeout(s._timer); s._timer = null; }

/* ── Hero: the name made of the work ──────── */
/* One photo at a time: dimmed across the frame, full strength inside the letters.
   Two letter layers crossfade so the image dissolves without the type moving. */
const photoSize = new Map();
function loadPhoto(src) {
  return new Promise((res) => {
    if (photoSize.has(src)) return res(photoSize.get(src));
    const img = new Image();
    img.onload = () => { photoSize.set(src, { w: img.naturalWidth, h: img.naturalHeight }); res(photoSize.get(src)); };
    img.onerror = () => { photoSize.set(src, { w: 1600, h: 2000 }); res(photoSize.get(src)); };
    img.src = src;
  });
}

function renderHero() {
  $('#heroGhosts').innerHTML = heroStills
    .slice(0, 2)
    .map(({ src }, i) => `<img class="hero__ghost${i === 0 ? ' is-on' : ''}" src="${src}" alt=""
      ${i === 0 ? 'fetchpriority="high"' : ''} decoding="async">`)
    .join('');
  $('#heroType').innerHTML = '<div class="hero__letters is-on"></div><div class="hero__letters"></div>';
  $('#heroEdge').innerHTML = '<div class="hero__letters"></div>';
  heroStills.forEach(({ src }) => loadPhoto(src));
}

const letterGeom = new WeakMap();

/* Keeps the photo inside the letters lined up with the ghost behind them */
function alignLetters(layer) {
  const g = letterGeom.get(layer);
  if (!g) return;
  $$('.hero__line', layer).forEach((line) => {
    line.style.backgroundPosition = `${g.gx - line.offsetLeft}px ${g.gy - line.offsetTop}px`;
  });
}

/* Paints one photo inside the letters of a layer, lined up with the ghost behind */
async function paintLetters(layer, still) {
  const { src, fx = 0.5 } = still;
  const stage = $('.hero__stage');
  const { w: iw, h: ih } = await loadPhoto(src);
  const W = stage.clientWidth, H = stage.clientHeight;
  const cover = Math.max(W / iw, H / ih);
  const cw = iw * cover, ch = ih * cover;
  // keep the point of interest on screen when the frame is narrower than the photo
  const gx = Math.min(0, Math.max(W - cw, W / 2 - fx * cw));
  const gy = (H - ch) / 2;
  const ghost = $$('.hero__ghost').find((g) => g.getAttribute('src') === src);
  if (ghost) ghost.style.objectPosition = cw > W ? `${(gx / (W - cw)) * 100}% 50%` : '50% 50%';
  letterGeom.set(layer, { gx, gy });
  // offsetLeft/Top, never getBoundingClientRect: a transformed measurement
  // would paint the photo outside the letters
  $$('.hero__line', layer).forEach((line) => {
    line.style.backgroundImage = `url("${src}")`;
    line.style.backgroundSize = `${cw}px ${ch}px`;
  });
  alignLetters(layer);
}

let heroIndex = 0;
let heroTimer;
if (import.meta.env.DEV) {
  // local preview only: jump to a hero photo to check its framing
  window.__heroShow = async (i) => {
    clearInterval(heroTimer);
    const layer = $('#heroType .hero__letters.is-on');
    heroIndex = i;
    $('.hero__ghost.is-on').src = heroStills[i].src;
    await paintLetters(layer, heroStills[i]);
  };
}
function heroRotate() {
  clearInterval(heroTimer);
  const layers = $$('#heroType .hero__letters');
  const ghosts = $$('.hero__ghost');
  paintLetters(layers[0], heroStills[0]);
  if (reduceMotion || saveData || heroStills.length < 2) return;
  heroTimer = setInterval(async () => {
    const next = (heroIndex + 1) % heroStills.length;
    const still = heroStills[next];
    const showing = layers.findIndex((l) => l.classList.contains('is-on'));
    const hidden = showing === 0 ? 1 : 0;
    ghosts[hidden].src = still.src;
    await paintLetters(layers[hidden], still);
    layers[hidden].classList.add('is-on');
    layers[showing].classList.remove('is-on');
    ghosts[hidden].classList.add('is-on');
    ghosts[showing].classList.remove('is-on');
    heroIndex = next;
  }, 5400);
}

let heroMode = '';
function fitHero() {
  const stage = $('.hero__stage');
  const layers = [...$$('#heroType .hero__letters'), ...$$('#heroEdge .hero__letters')];
  // portrait phones stack the name in syllables so it can fill the screen
  const mode = window.innerWidth < 1024 && window.innerHeight > window.innerWidth * 1.05 ? 'stack' : 'wide';
  if (mode !== heroMode) {
    const words = mode === 'stack' ? ['AN', 'DRÉS', 'AR', 'BIT'] : ['ANDRÉS', 'ARBIT'];
    const html = words
      .map((w) => `<span class="hero__line">${[...w].map((c) => `<span class="hero__ch">${c}</span>`).join('')}</span>`)
      .join('');
    layers.forEach((l) => { l.innerHTML = html; });
    heroMode = mode;
  }
  const lines = $$('.hero__line', layers[0]);
  const target = stage.clientWidth - 2 * gutterPx();
  const maxSize = (stage.clientHeight * 0.74) / (lines.length * 0.84);
  justifyByWidth(lines, target, maxSize);
  layers.slice(1).forEach((layer) => {
    $$('.hero__line', layer).forEach((el, i) => {
      el.style.fontSize = lines[i].style.fontSize;
      el.style.fontStretch = lines[i].style.fontStretch;
    });
  });
  const onLayer = $('#heroType .hero__letters.is-on') || layers[0];
  paintLetters(onLayer, heroStills[heroIndex]);
  return mode;
}

let heroTl;
function heroMotion() {
  if (reduceMotion) return;
  heroTl && heroTl.scrollTrigger && heroTl.scrollTrigger.kill();
  heroTl && heroTl.kill();
  const layers = $$('.hero__letters');
  const lines = $$('.hero__line', layers[0]);
  const base = lines.map((el) => parseFloat(el.style.fontStretch) || 100);

  // Each letter narrows to its own width, and the wave runs left to right:
  // letter j of a line starts at j/n of the scroll and takes the second half.
  const targets = [62, 84, 66, 96, 62, 74, 88, 62, 70, 92, 62, 80];
  const plan = lines.map((line) => {
    const n = $$('.hero__ch', line).length;
    return [...Array(n)].map((_, j) => ({ start: (j / n) * 0.5, target: targets[j % targets.length] }));
  });

  const state = { k: 0 };
  const applyWidth = () => {
    layers.forEach((layer) => {
      $$('.hero__line', layer).forEach((line, i) => {
        $$('.hero__ch', line).forEach((ch, j) => {
          const { start, target } = plan[i][j];
          const p = Math.min(1, Math.max(0, (state.k - start) / 0.5));
          ch.style.fontStretch = (base[i] + (target - base[i]) * p).toFixed(2) + '%';
        });
      });
    });
    $$('#heroType .hero__letters').forEach(alignLetters);
  };

  // no pin: the page moves as soon as you scroll, and the name works while it leaves
  heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.4,
      invalidateOnRefresh: true,
    },
  });
  heroTl.fromTo(state, { k: 0 }, { k: 1, duration: 1, ease: 'none', onUpdate: applyWidth, immediateRender: false }, 0);
}

/* ── Statement: lines that justify by stretching ── */
const statementPlan = [
  { from: 125, to: 62, fill: 1 },
  { from: 62, to: 125, fill: 1 },
  { from: 125, to: 72, fill: 1 },
];
let stTweens = [];
function fitStatement() {
  const lines = $$('.st-line');
  const width = $('.statement').clientWidth - 2 * gutterPx();
  lines.forEach((el, i) => {
    const plan = statementPlan[i] || statementPlan[0];
    fitToWidth(el, width * plan.fill, plan.to);
  });
}
function statementMotion() {
  stTweens.forEach((tw) => { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); });
  stTweens = [];
  const lines = $$('.st-line');
  if (reduceMotion || isPhone()) { lines.forEach((el, i) => { el.style.fontStretch = (statementPlan[i] || statementPlan[0]).to + '%'; }); return; }
  lines.forEach((el, i) => {
    const plan = statementPlan[i] || statementPlan[0];
    const o = { w: plan.from };
    const tw = gsap.to(o, {
      w: plan.to,
      ease: 'power1.inOut',
      onUpdate: () => { el.style.fontStretch = o.w.toFixed(2) + '%'; },
      scrollTrigger: { trigger: el, start: 'top 96%', end: 'top 52%', scrub: 0.8 },
    });
    stTweens.push(tw);
  });
}

/* ── Contact title fills the width ────────── */
function fitContact() {
  const el = $('.contact__title > span');
  fitToWidth(el, $('.contact').clientWidth - 2 * gutterPx(), 62);
}

function gutterPx() {
  const probe = $('.statement');
  return parseFloat(getComputedStyle(probe).paddingLeft) || 24;
}

/* ── Slow drift: nothing on the page sits perfectly still ── */
let driftTweens = [];
function drift(target, from, to, opts = {}) {
  const tw = gsap.fromTo(target, from, {
    ...to, ease: 'none',
    scrollTrigger: { trigger: opts.trigger || target, start: opts.start || 'top bottom', end: opts.end || 'bottom top', scrub: opts.scrub ?? 0.8 },
  });
  driftTweens.push(tw);
  return tw;
}

function sectionMotion() {
  driftTweens.forEach((t) => { t.scrollTrigger && t.scrollTrigger.kill(); t.kill(); });
  driftTweens = [];
  if (reduceMotion) return;

  // lacquer sheen sliding across the approach
  drift('.approach__sheen', { '--sx': '15%', '--sy': '8%', '--shift': '-6%' },
    { '--sx': '82%', '--sy': '88%', '--shift': '6%' }, { trigger: '.approach', scrub: 1 });

  // each approach line leans a little further into the margin
  $$('.ap').forEach((ap, i) => {
    const dir = i % 2 ? -1 : 1;
    drift($('.ap__head', ap), { xPercent: 0 }, { xPercent: dir * 1.6 }, { trigger: ap });
    drift($('.ap__body', ap), { y: 26 }, { y: -26 }, { trigger: ap });
  });

  // the marked words breathe on the width axis as the line passes
  $$('.ap').forEach((ap, i) => {
    const em = $('.ap__wide', ap);
    if (!em) return;
    const base = parseFloat(getComputedStyle(em).fontStretch) || 100;
    const o = { w: base * 0.9 };
    const tw = gsap.to(o, {
      w: Math.min(125, base * 1.06), ease: 'power1.inOut',
      onUpdate: () => { em.style.fontStretch = o.w.toFixed(1) + '%'; },
      scrollTrigger: { trigger: ap, start: 'top 92%', end: 'bottom 45%', scrub: 0.9 },
    });
    driftTweens.push(tw);
  });

  // the portrait lags behind its own text
  drift('.bio__photo', { y: 40 }, { y: -40 }, { trigger: '.bio' });
  drift('.bio__title', { y: -18 }, { y: 18 }, { trigger: '.bio' });

  // statement and closing lines breathe with the scroll
  drift('.statement__body', { y: 34 }, { y: -20 }, { trigger: '.statement' });
  drift('.contact__title', { xPercent: -1.2 }, { xPercent: 0.6 }, { trigger: '.contact' });
  drift('.contact__body', { y: 26 }, { y: -18 }, { trigger: '.contact' });
  drift('.work__title', { xPercent: -1.5 }, { xPercent: 1 }, { trigger: '.work' });
}

/* ── Reveals ──────────────────────────────── */
function wireReveals() {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }),
    { threshold: 0.25, rootMargin: '0px 0px -8% 0px' }
  );
  $$('.rv').forEach((el) => io.observe(el));
}

/* ── Nav: current section ─────────────────── */
function wireNav() {
  const links = $$('.nav__links a');
  ScrollTrigger.create({
    start: () => window.innerHeight * 0.9,
    onToggle: (self) => $('#nav').classList.toggle('is-stuck', self.isActive),
  });
  ['trabajo', 'enfoque', 'bio', 'contacto'].forEach((id) => {
    ScrollTrigger.create({
      trigger: '#' + id, start: 'top 50%', end: 'bottom 50%',
      onToggle: (self) => links.forEach((a) => {
        if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', self.isActive ? 'true' : 'false');
      }),
    });
  });

  const btn = $('#menuBtn'), menu = $('#menu');
  const setMenu = (open) => {
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? t('nav.close') : t('nav.menu');
    if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); document.documentElement.style.overflow = 'hidden'; }
    else { menu.classList.remove('is-open'); document.documentElement.style.overflow = ''; setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 600); }
  };
  btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') setMenu(false); });
}

/* ── Copy email ───────────────────────────── */
function wireCopy() {
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
      b.textContent = t('contact.copied');
      $('#live').textContent = t('contact.copied');
      setTimeout(() => { b.textContent = t('contact.copy'); }, 1800);
    } catch {
      location.href = 'mailto:' + b.dataset.copy;
    }
  });
}

/* ── Layout pass ──────────────────────────── */
function layout() {
  fitHero();
  fitStatement();
  fitContact();
}

function setLang(next) {
  lang = next;
  store.set('lang', lang);
  renderText();
  theater.setLang(lang);
  layout();
  statementMotion();
  wireReveals();
  $$('.rv').forEach((el) => el.classList.add('is-in'));
  ScrollTrigger.refresh();
}

/* ── Boot ─────────────────────────────────── */
// A reload restoring a mid-hero scroll used to show a letter blown up instead of
// the name, so the page starts at the top unless the visitor takes over first.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
let userScrolled = false;
['wheel', 'touchstart', 'keydown'].forEach((e) =>
  window.addEventListener(e, () => { userScrolled = true; }, { once: true, passive: true })
);
const goTop = () => { if (!location.hash && !userScrolled && window.scrollY) window.scrollTo(0, 0); };
goTop();
window.addEventListener('load', () => { goTop(); requestAnimationFrame(goTop); });

renderGrid();
renderText();
renderHero();
heroRotate();
wireTiles();
wireNav();
wireCopy();

const theater = createTheater({ projects: visible, copy, lang, media });

$('#lang').addEventListener('click', () => setLang(lang === 'es' ? 'en' : 'es'));

const fontsReady = Promise.race([
  document.fonts.load('900 100px "Archivo Variable"').then(() => document.fonts.ready),
  new Promise((r) => setTimeout(r, 2500)),
]);

fontsReady.then(() => {
  layout();
  heroMotion();
  statementMotion();
  sectionMotion();
  gridMotion();
  wireReveals();
  goTop();
  requestAnimationFrame(() => document.body.classList.add('is-ready'));
  ScrollTrigger.refresh();
  theater.route();
});

let rz;
let lastW = window.innerWidth;
window.addEventListener('resize', () => {
  clearTimeout(rz);
  rz = setTimeout(() => {
    // ignore mobile URL-bar height jitter; only re-fit on width changes
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    const before = heroMode;
    if (isPhone() !== gridPhone) { renderGrid(); renderText(); wireTiles(); }
    layout();
    gridMotion();
    if (heroMode !== before) heroMotion();
    ScrollTrigger.refresh();
  }, 150);
});
