export function initMotion() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = 'cubic-bezier(.2,.7,.1,1)';
  const from = {
    up: el => { el.style.opacity = '0'; el.style.transform = 'translateY(28px)'; },
    fade: el => { el.style.opacity = '0'; },
    mask: el => { el.style.clipPath = 'inset(100% 0 0 0)'; },
    'mask-x': el => { el.style.clipPath = 'inset(0 100% 0 0)'; },
    line: el => { el.style.transformOrigin = 'left center'; el.style.transform = 'scaleX(0)'; },
    clip: el => { el.style.transform = 'translateY(105%)'; },
  };
  const to = {
    up: el => { el.style.opacity = '1'; el.style.transform = 'none'; },
    fade: el => { el.style.opacity = '1'; },
    mask: el => { el.style.clipPath = 'inset(0 0 0 0)'; },
    'mask-x': el => { el.style.clipPath = 'inset(0 0 0 0)'; },
    line: el => { el.style.transform = 'scaleX(1)'; },
    clip: el => { el.style.transform = 'translateY(0)'; },
  };
  const dur = { up: 900, fade: 900, mask: 1300, 'mask-x': 1300, line: 1100, clip: 1000 };
  const els = [...document.querySelectorAll('[data-reveal]')];
  let io = null, sweep = null;
  if (!reduce) {
    els.forEach(el => {
      const t = el.dataset.reveal; if (!from[t]) return;
      from[t](el);
      el.style.transition = `opacity ${dur[t]}ms ${ease}, transform ${dur[t]}ms ${ease}, clip-path ${dur[t]}ms ${ease}`;
      el.style.transitionDelay = (el.dataset.delay || 0) + 'ms';
    });
    const targetOf = new Map();
    const pending = new Set(els.filter(el => from[el.dataset.reveal]));
    const show = el => { if (!pending.has(el)) return; pending.delete(el); to[el.dataset.reveal](el); const t = targetOf.get(el); t && io.unobserve(t); };
    io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) show(e.target.__rv || e.target); });
    }, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
    pending.forEach(el => {
      const t = (el.dataset.reveal.startsWith('mask') || el.dataset.reveal === 'clip') && el.parentElement ? el.parentElement : el;
      t.__rv = el; targetOf.set(el, t); io.observe(t);
    });
    sweep = () => {
      const vh = window.innerHeight;
      const hit = []; pending.forEach(el => { const t = targetOf.get(el) || el; if (t.getBoundingClientRect().top < vh * 0.94) hit.push(el); }); hit.forEach(show);
    };
  }

  const parallax = [...document.querySelectorAll('[data-parallax]')];
  const zoom = [...document.querySelectorAll('[data-zoom]')];
  const progRoots = [...document.querySelectorAll('[data-progress-root]')];
  let rafId = 0;
  const onScroll = () => { if (!rafId) rafId = requestAnimationFrame(tick); };
  const tick = () => {
    rafId = 0;
    const y = window.scrollY, vh = window.innerHeight;
    sweep && sweep();
    if (!reduce) {
      parallax.forEach(el => { el.style.translate = `0 ${(y * parseFloat(el.dataset.parallax)).toFixed(1)}px`; });
      zoom.forEach(el => { el.style.scale = (1 + Math.min(y / vh, 1) * 0.04).toFixed(4); });
    }
    const rects = progRoots.map(root => root.getBoundingClientRect());
    progRoots.forEach((root, ri) => {
      const r = rects[ri];
      const p = Math.max(0, Math.min(1, (vh * 0.75 - r.top) / (r.height * 0.9)));
      const line = root.querySelector('[data-progress-line]');
      if (line) line.style.transform = line.dataset.axis === 'y' ? `scaleY(${p})` : `scaleX(${p})`;
      const steps = root.querySelectorAll('[data-step]');
      const n = parseInt(root.dataset.progressRoot) || steps.length;
      steps.forEach((s, i) => {
        const idx = s.dataset.step !== '' && !isNaN(parseInt(s.dataset.step)) ? parseInt(s.dataset.step) : i;
        const on = p >= (idx / Math.max(1, n - 1)) * 0.98;
        s.style.color = on ? (s.dataset.on || '#F3F1EC') : (s.dataset.off || '#3a3a3a');
      });
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  tick();

  const mags = [...document.querySelectorAll('[data-magnetic]')];
  const magH = [];
  if (!reduce && matchMedia('(hover: hover)').matches) {
    mags.forEach(el => {
      el.style.transition = 'translate 400ms ' + ease;
      const mv = e => { const r = el.getBoundingClientRect(); el.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`; };
      const lv = () => { el.style.translate = '0 0'; };
      el.addEventListener('mousemove', mv); el.addEventListener('mouseleave', lv); magH.push([el, mv, lv]);
    });
  }

  const followRoots = [...document.querySelectorAll('[data-follow-root]')];
  const fH = [];
  followRoots.forEach(root => {
    const f = root.querySelector('[data-follow]'); if (!f) return;
    const xs = f.querySelector('[data-follow-x]'), ys = f.querySelector('[data-follow-y]');
    let fr = 0, ev = null;
    const mv = e => { ev = e; if (!fr) fr = requestAnimationFrame(mvNow); };
    const mvNow = () => {
      fr = 0; const e = ev;
      const r = root.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
      f.style.opacity = '1'; f.style.transform = `translate(${x}px, ${y}px)`;
      if (xs) xs.textContent = String(Math.round(x)).padStart(4, '0');
      if (ys) ys.textContent = String(Math.round(y)).padStart(4, '0');
    };
    const lv = () => { f.style.opacity = '0'; };
    root.addEventListener('mousemove', mv); root.addEventListener('mouseleave', lv); fH.push([root, mv, lv]);
  });

  return () => {
    io && io.disconnect();
    window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(rafId);
    magH.forEach(([el, a, b]) => { el.removeEventListener('mousemove', a); el.removeEventListener('mouseleave', b); });
    fH.forEach(([el, a, b]) => { el.removeEventListener('mousemove', a); el.removeEventListener('mouseleave', b); });
  };
}
