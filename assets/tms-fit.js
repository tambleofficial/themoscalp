/* THE MO SCALP: 사진 틀은 디자인 크기 그대로, 사람 사진은 자르지 않고 전체 표시
 * (남는 곳은 같은 사진을 흐리게 깔아 채움, 사진 자체는 보정 없음)
 * - 공간 사진(brand-space)과 화면 폭 전체 사진은 틀을 꽉 채운 그대로
 * - 원장님 프로필 사진은 디자인에서 잡은 얼굴 위치(object-position) 그대로 */
(function () {
  var KEEP = /brand-space|director-|logo|icon-|favicon/;
  var blurs = {}, done = new WeakMap();
  var css = document.createElement('style');
  css.textContent = 'image-slot[data-tms-fit]::part(frame){background:var(--tms-blur) center/cover no-repeat}';
  document.head.appendChild(css);
  function blurOf(u, im) {
    if (blurs[u] !== undefined) return blurs[u];
    try { var c = document.createElement('canvas'); c.width = 48; c.height = Math.max(8, Math.round(48 * im.naturalHeight / im.naturalWidth)); var x = c.getContext('2d'); x.filter = 'blur(3px)'; x.drawImage(im, -6, -6, c.width + 12, c.height + 12); blurs[u] = c.toDataURL('image/jpeg', 0.7); } catch (e) { blurs[u] = ''; }
    return blurs[u];
  }
  function gapOf(r, im) { var ir = im.naturalWidth / im.naturalHeight, br = r.width / r.height; return 1 - Math.min(ir / br, br / ir); }
  function slot(el) {
    var im = el.shadowRoot && el.shadowRoot.querySelector('.frame img');
    if (im && !im.__tmsL) { im.__tmsL = 1; im.addEventListener('load', soon); new MutationObserver(soon).observe(im, { attributes: true, attributeFilter: ['src'] }); }
    if (!im || !im.naturalWidth || im.style.display === 'none') return;
    var u = im.currentSrc || im.src, r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var key = u + '|' + Math.round(r.width) + 'x' + Math.round(r.height);
    if (done.get(el) === key) return; done.set(el, key);
    var vw = document.documentElement.clientWidth;
    var keep = KEEP.test(u) || KEEP.test(el.id || '') || r.width >= vw * 0.95;
    var g = gapOf(r, im);
    if (keep || g < 0.02) { if (el.hasAttribute('data-tms-fit')) { el.removeAttribute('data-tms-fit'); el.removeAttribute('fit'); } return; }
    var b = blurOf(u, im);
    if (b) el.style.setProperty('--tms-blur', 'url("' + b + '")');
    el.setAttribute('data-tms-fit', ''); if (el.getAttribute('fit') !== 'contain') el.setAttribute('fit', 'contain');
  }
  function img(el) {
    if (!el.naturalWidth || KEEP.test(el.src)) return;
    if (!/\/images\/|\/assets\/uploads\//.test(el.src)) return;
    var cs = getComputedStyle(el); if (cs.objectFit !== 'cover' && !el.hasAttribute('data-tms-fit')) return;
    var r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    var key = el.src + '|' + Math.round(r.width) + 'x' + Math.round(r.height);
    if (done.get(el) === key) return; done.set(el, key);
    var vw = document.documentElement.clientWidth, g = gapOf(r, el);
    if (r.width >= vw * 0.95 || g < 0.02) return;
    var b = blurOf(el.src, el);
    el.setAttribute('data-tms-fit', '');
    el.style.setProperty('object-fit', 'contain', 'important');
    if (b) el.style.setProperty('background', 'url("' + b + '") center / cover no-repeat', 'important');
  }
  function scan() {
    var s = document.querySelectorAll('image-slot'); for (var i = 0; i < s.length; i++) slot(s[i]);
    var m = document.querySelectorAll('img'); for (var j = 0; j < m.length; j++) img(m[j]);
  }
  var t = 0; function soon() { if (t) return; t = requestAnimationFrame(function () { t = 0; scan(); }); }
  new MutationObserver(soon).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
  document.addEventListener('load', function (e) { if (e.target && e.target.tagName === 'IMG') soon(); }, true);
  [0, 300, 1000, 2500, 5000].forEach(function (d) { setTimeout(soon, d); });
  addEventListener('load', soon);
  addEventListener('click', function () { setTimeout(soon, 60); setTimeout(soon, 500); }, true);
  var rz = 0; addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { done = new WeakMap(); soon(); }, 150); });
})();
