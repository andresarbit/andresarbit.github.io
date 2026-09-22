import '@fontsource-variable/archivo/wdth.css';
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
let lang = store.get('lang') || ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en');
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
      const words = it.head.split(' ');
      // break long heads into balanced display lines
      const lines = words.length > 2 ? splitBalanced(words) : [it.head];
      return `<li class="ap rv"><h3 class="ap__head">${lines.map((l) => `<span>${l}</span>`).join('')}</h3><p class="ap__body">${it.body}</p></li>`;
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
  // two lines, as even as possible by character count
  let best = 1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ').length, b = words.slice(i).join(' ').length;
    if (Math.abs(a - b) < bestDiff) { bestDiff = Math.abs(a - b); best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

/* ── Work grid ────────────────────────────── */
function renderGrid() {
  $('#grid').innerHTML = visible
    .map((p) => {
      const cls = `tile tile--${p.size}${p.offset ? ' tile--offset' : ''}`;
      const poster = p.kind === 'stills' ? media(p.slug, 'stills/01.webp') : media(p.slug, 'poster.webp');
      const inner = p.kind === 'stills'
        ? `<div class="tile__slides" data-count="${p.stills}"><img src="${poster}" alt="" class="is-on" loading="lazy" decoding="async"></div>`
        : `<img src="${poster}" alt="" loading="lazy" decoding="async"><video muted loop playsinline preload="none" data-src="${media(p.slug, 'preview.mp4')}"></video>`;
      return `<li class="${cls}" data-slug="${p.slug}">
        <a class="tile__link" href="#/p/${p.slug}" aria-label="${p.title}">
          <div class="tile__media">${inner}</div>
          <div class="tile__cap"><h3 class="tile__title">${p.title}</h3><p class="tile__type"></p>${p.draft ? '<p class="tile__draft">Borrador, no se publica</p>' : ''}</div>
        </a></li>`;
    })
    .join('');
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
  s._timer = setInterval(() => {
    const imgs = $$('img', s);
    imgs[i].classList.remove('is-on');
    i = (i + 1) % imgs.length;
    imgs[i].classList.add('is-on');
  }, 1700);
}
function stopSlides(s) { clearInterval(s._timer); s._timer = null; }

/* ── Hero: the name made of the work ──────── */
let stillTimer;
function renderHeroStills() {
  const reel = $('#heroReel');
  reel.innerHTML = heroStills
    .map((n, i) => `<img class="hero__still${i === 0 ? ' is-on' : ''}" src="${n}" alt=""
      ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`)
    .join('');
  clearInterval(stillTimer);
  if (reduceMotion || heroStills.length < 2) return;
  let i = 0;
  stillTimer = setInterval(() => {
    const imgs = $$('.hero__still', reel);
    imgs[i].classList.remove('is-on');
    i = (i + 1) % imgs.length;
    imgs[i].classList.add('is-on');
  }, 5200);
}

let heroMode = '';
function fitHero() {
  const stage = $('.hero__stage');
  const mask = $('#heroMask');
  const edge = $('#heroEdge');
  // portrait phones stack the name in syllables so it can fill the screen
  const mode = window.innerWidth < 768 && window.innerHeight > window.innerWidth * 1.1 ? 'stack' : 'wide';
  if (mode !== heroMode) {
    const words = mode === 'stack' ? ['AN', 'DRÉS', 'AR', 'B|I|T'] : ['ANDRÉS', 'ARB|I|T'];
    const html = words
      .map((w) => `<span class="hero__line">${w.replace('|I|', '<span class="hero__i">I</span>')}</span>`)
      .join('');
    mask.innerHTML = html;
    edge.innerHTML = html;
    heroMode = mode;
  }
  const lines = $$('.hero__line', mask);
  const target = stage.clientWidth - 2 * gutterPx();
  const maxSize = (stage.clientHeight * 0.74) / (lines.length * 0.84);
  justifyByWidth(lines, target, maxSize);
  // the outline layer traces the same letters, so the name reads over any image
  $$('.hero__line', edge).forEach((el, i) => {
    el.style.fontSize = lines[i].style.fontSize;
    el.style.fontStretch = lines[i].style.fontStretch;
  });
  return mode;
}

let heroTl;
function heroMotion() {
  if (reduceMotion) return;
  heroTl && heroTl.scrollTrigger && heroTl.scrollTrigger.kill();
  heroTl && heroTl.kill();
  const mask = $('#heroMask');
  const edge = $('#heroEdge');
  const layers = [mask, edge];
  // centre of the I's stem, in the mask's own (untransformed) space
  const point = () => {
    gsap.set(layers, { clearProps: 'transform' });
    const i = $('#heroMask .hero__i').getBoundingClientRect();
    const m = mask.getBoundingClientRect();
    return { x: i.left + i.width / 2 - m.left, y: i.top + i.height * 0.55 - m.top, w: m.width, h: m.height };
  };
  let pt = point();
  const origin = () => `${pt.x}px ${pt.y}px`;
  gsap.set(layers, { transformOrigin: origin(), scale: 1 });
  heroTl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: () => '+=' + window.innerHeight * 1.25,
      pin: '.hero__stage',
      scrub: 0.6,
      invalidateOnRefresh: true,
      onRefreshInit: () => { pt = point(); gsap.set(layers, { transformOrigin: origin() }); },
    },
  });
  heroTl
    .fromTo('.hero__role, .hero__line-small', { opacity: 1, y: 0 }, { opacity: 0, y: -10, duration: 0.15, immediateRender: false }, 0)
    .to(layers, { scale: 60, duration: 1, ease: 'power2.in' }, 0)
    // carry the I to the centre of the frame while we fly into it
    .to(layers, { x: () => pt.w / 2 - pt.x, y: () => pt.h / 2 - pt.y, duration: 0.7, ease: 'power1.inOut' }, 0)
    .fromTo('#heroReel', { scale: 1.1 }, { scale: 1, duration: 1 }, 0)
    .to(layers, { opacity: 0, duration: 0.12 }, 0.88);
}

/* ── Statement: lines that justify by stretching ── */
const statementPlan = [
  { from: 125, to: 62, fill: 1 },
  { from: 62, to: 125, fill: 1 },
  { from: 125, to: 62, fill: 1 },
  { from: 62, to: 112, fill: 0.62 },
];
let stTweens = [];
function fitStatement() {
  const lines = $$('.st-line');
  const width = $('.statement').clientWidth - 2 * gutterPx();
  lines.forEach((el, i) => {
    const plan = statementPlan[i] || statementPlan[0];
    const fill = window.innerWidth < 768 && i === lines.length - 1 ? 0.8 : plan.fill;
    fitToWidth(el, width * fill, plan.to);
  });
}
function statementMotion() {
  stTweens.forEach((tw) => { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); });
  stTweens = [];
  const lines = $$('.st-line');
  if (reduceMotion) { lines.forEach((el, i) => { el.style.fontStretch = (statementPlan[i] || statementPlan[0]).to + '%'; }); return; }
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

/* ── Approach sheen follows the scroll (lacquer) ── */
function approachSheen() {
  if (reduceMotion) return;
  gsap.fromTo('.approach__sheen', { '--sx': '15%', '--sy': '8%', '--shift': '-6%' }, {
    '--sx': '82%', '--sy': '88%', '--shift': '6%', ease: 'none',
    scrollTrigger: { trigger: '.approach', start: 'top bottom', end: 'bottom top', scrub: 1 },
  });
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
renderHeroStills();
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
  approachSheen();
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
    layout();
    if (heroMode !== before) heroMotion();
    ScrollTrigger.refresh();
  }, 150);
});
