// Project view: opens from the tile it was clicked on, deep-linkable as #/p/<slug>.

const EASE = 'cubic-bezier(0.77, 0, 0.175, 1)';

export function createTheater({ projects, copy, lang: initialLang, media }) {
  const root = document.getElementById('theater');
  const body = document.getElementById('thBody');
  const btnClose = document.getElementById('thClose');
  const btnPrev = document.getElementById('thPrev');
  const btnNext = document.getElementById('thNext');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let lang = initialLang;
  let current = -1;
  let pushed = false;
  let lastFocus = null;
  let paused = [];
  let idleTimer;

  const L = (k) => copy[lang].theater[k];
  const idx = (slug) => projects.findIndex((p) => p.slug === slug);
  const fmt = (s) => {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  /* ── markup ─────────────────────────────── */
  function view(p) {
    const layout = p.kind === 'stills' ? 'pj--s' : p.size === 'w' ? 'pj--w' : 'pj--v';
    const mediaHtml = p.kind === 'video'
      ? `<div class="player" data-player>
           <video src="${media(p.slug, 'full.mp4')}" poster="${media(p.slug, 'poster.webp')}" playsinline preload="metadata"></video>
           <div class="player__ui">
             <button type="button" data-act="play">${L('play')}</button>
             <input class="player__bar" type="range" min="0" max="1000" value="0" step="1" aria-label="${L('progress')}">
             <span class="player__time">0:00</span>
             <button type="button" data-act="sound" aria-pressed="true">${L('sound')}</button>
             <button type="button" data-act="fs">${L('fullscreen')}</button>
           </div>
         </div>`
      : `<img src="${media(p.slug, 'stills/01.webp')}" alt="${p.title}" decoding="async" style="width:100%;height:auto;background:#141414">`;

    const meta = [
      [L('type'), p.type[lang]],
      p.client ? [L('client'), p.client] : null,
      [L('year'), p.year],
      [L('roles'), p.roles[lang]],
    ].filter(Boolean).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

    const stillStart = p.kind === 'stills' ? 2 : 1;
    const stills = p.stills
      ? `<div class="stills">${Array.from({ length: p.stills - stillStart + 1 }, (_, i) => {
          const n = String(i + stillStart).padStart(2, '0');
          return `<img src="${media(p.slug, `stills/${n}.webp`)}" alt="${p.title} ${n}" loading="lazy" decoding="async">`;
        }).join('')}</div>`
      : '';

    return `<article class="pj ${layout}">
      <div class="pj__top">
        <div class="pj__media">${mediaHtml}</div>
        <div class="pj__info">
          <h2 class="pj__title" id="thTitle">${p.title}</h2>
          <p class="pj__text">${p.text[lang]}</p>
          <dl class="pj__meta">${meta}</dl>
        </div>
      </div>
      ${stills}
    </article>`;
  }

  /* ── player ─────────────────────────────── */
  function wirePlayer(autoplay) {
    const wrap = body.querySelector('[data-player]');
    if (!wrap) return;
    const v = wrap.querySelector('video');
    const bar = wrap.querySelector('.player__bar');
    const time = wrap.querySelector('.player__time');
    const bPlay = wrap.querySelector('[data-act="play"]');
    const bSound = wrap.querySelector('[data-act="sound"]');
    const bFs = wrap.querySelector('[data-act="fs"]');

    const sync = () => {
      bPlay.textContent = v.paused ? L('play') : L('pause');
      bSound.textContent = v.muted ? L('muted') : L('sound');
      bSound.setAttribute('aria-pressed', String(!v.muted));
    };
    const toggle = () => (v.paused ? v.play() : v.pause());
    const wake = () => {
      wrap.classList.remove('is-idle');
      clearTimeout(idleTimer);
      if (!v.paused) idleTimer = setTimeout(() => wrap.classList.add('is-idle'), 2200);
    };

    v.addEventListener('click', toggle);
    bPlay.addEventListener('click', toggle);
    bSound.addEventListener('click', () => { v.muted = !v.muted; sync(); });
    bFs.addEventListener('click', () => {
      if (v.requestFullscreen) v.requestFullscreen();
      else if (v.webkitEnterFullscreen) v.webkitEnterFullscreen();
    });
    v.addEventListener('play', () => { sync(); wake(); });
    v.addEventListener('pause', () => { sync(); wake(); });
    v.addEventListener('loadedmetadata', () => { time.textContent = `0:00 / ${fmt(v.duration)}`; });
    v.addEventListener('timeupdate', () => {
      const p = v.duration ? v.currentTime / v.duration : 0;
      bar.value = Math.round(p * 1000);
      bar.style.setProperty('--p', p * 100 + '%');
      time.textContent = `${fmt(v.currentTime)} / ${fmt(v.duration)}`;
    });
    v.addEventListener('ended', () => { wrap.classList.remove('is-idle'); });
    bar.addEventListener('input', () => { if (v.duration) v.currentTime = (bar.value / 1000) * v.duration; });
    wrap.addEventListener('pointermove', wake);
    wrap.addEventListener('focusin', wake);
    sync();

    if (autoplay) {
      v.play().catch(() => { v.muted = true; sync(); v.play().catch(() => {}); });
    }
  }

  function stopPlayer() {
    const v = body.querySelector('video');
    if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
    clearTimeout(idleTimer);
  }

  /* ── open / close ───────────────────────── */
  function tileRect(slug) {
    const m = document.querySelector(`.tile[data-slug="${slug}"] .tile__media`);
    if (!m) return null;
    const r = m.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return null;
    return r;
  }
  const insetFrom = (r) => `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px)`;

  function pauseBackground() {
    paused = [...document.querySelectorAll('main video')].filter((v) => !v.paused);
    paused.forEach((v) => v.pause());
  }
  function resumeBackground() {
    paused.forEach((v) => v.play().catch(() => {}));
    paused = [];
  }

  function show(i, { animate = true, autoplay = true } = {}) {
    const p = projects[i];
    if (!p) return;
    const wasOpen = !root.hidden;
    stopPlayer();
    current = i;
    body.innerHTML = view(p);
    root.scrollTop = 0;
    wirePlayer(autoplay);

    if (wasOpen) return;
    lastFocus = document.activeElement;
    pauseBackground();
    document.documentElement.style.overflow = 'hidden';
    root.hidden = false;
    const r = animate && !reduce ? tileRect(p.slug) : null;
    if (r) {
      root.animate([{ clipPath: insetFrom(r) }, { clipPath: 'inset(0px 0px 0px 0px)' }], { duration: 760, easing: EASE });
      setTimeout(() => root.classList.add('is-shown'), 280);
    } else {
      root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 0 : 320, easing: 'ease-out' });
      requestAnimationFrame(() => root.classList.add('is-shown'));
    }
    btnClose.focus({ preventScroll: true });
  }

  function hide() {
    if (root.hidden) return;
    const p = projects[current];
    stopPlayer();
    root.classList.remove('is-shown');
    const done = () => {
      root.hidden = true;
      body.innerHTML = '';
      document.documentElement.style.overflow = '';
      resumeBackground();
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      current = -1;
    };
    const r = !reduce && p ? tileRect(p.slug) : null;
    const anim = r
      ? root.animate([{ clipPath: 'inset(0px 0px 0px 0px)' }, { clipPath: insetFrom(r) }], { duration: 560, easing: EASE })
      : root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 0 : 260, easing: 'ease-out' });
    anim.onfinish = done;
  }

  /* ── routing ────────────────────────────── */
  function route() {
    const m = location.hash.match(/^#\/p\/([\w-]+)/);
    if (m && idx(m[1]) > -1) {
      const i = idx(m[1]);
      if (i !== current) show(i, { animate: pushed });
    } else if (!root.hidden) {
      hide();
    }
  }

  function close() {
    if (pushed) { pushed = false; history.back(); }
    else { history.replaceState(null, '', '#trabajo'); hide(); }
  }

  function step(d) {
    const i = (current + d + projects.length) % projects.length;
    history.replaceState(null, '', `#/p/${projects[i].slug}`);
    body.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 0 : 160, easing: 'ease-out' }).onfinish = () => {
      show(i);
      body.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: reduce ? 0 : 420, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    };
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest('.tile__link');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const slug = a.closest('.tile').dataset.slug;
    pushed = true;
    history.pushState({ p: slug }, '', `#/p/${slug}`);
    show(idx(slug));
  });
  window.addEventListener('popstate', () => { pushed = false; route(); });
  window.addEventListener('hashchange', route);

  btnClose.addEventListener('click', close);
  btnPrev.addEventListener('click', () => step(-1));
  btnNext.addEventListener('click', () => step(1));

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.target.matches('input[type="range"]')) return;
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'Tab') {
      const f = [...root.querySelectorAll('button, [href], input, video')].filter((el) => !el.disabled && el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  return {
    route,
    setLang(next) {
      lang = next;
      if (current > -1 && !root.hidden) show(current, { autoplay: false });
    },
  };
}
