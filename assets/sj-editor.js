/* THE MO SCALP 편집 모드 도구 (/edit 에서만 불러옴)
 * - 글자: 눌러서 바로 고치기 (같은 문구는 사이트 전체에서 함께 바뀜, 후기 칸은 칸마다 따로)
 * - 사진: 눌러서 새 사진 고르기 (브라우저에서 1600px 로 줄여서 올림, 색 보정 없음)
 * - 저장: 바뀐 문구·사진을 커밋 1개로 저장 → 배포가 끝나면 자동 새로고침
 */
(function () {
  var E = window.__CMS_EDIT || {}, C = window.__CMS || {};
  var PAGES = [['home', '홈', '/'], ['brand', 'BRAND 브랜드', '/brand'], ['smp', 'SMP 시술 부위', '/smp'], ['case', 'CASE 작업 사례', '/case'], ['process', 'PROCESS 과정·후기', '/process'], ['contact', 'CONTACT 상담 안내', '/contact'], ['education', 'EDUCATION 교육', '/education']];
  E.page = E.page || 'home';
  var norm = window.__sjNorm || function (s) { return String(s || '').replace(/\u00a0/g, ' ').replace(/[ \t\r\f\v]+/g, ' ').replace(/ *\n */g, '\n').trim(); };
  var text = JSON.parse(JSON.stringify((C.text && C.text.t) || {}));
  var media = JSON.parse(JSON.stringify((C.media && C.media.m) || {}));
  var rev = {}; Object.keys(media).forEach(function (k) { rev[media[k]] = k; });
  var images = [], upN = 0, dirty = { text: false, media: false }, changes = 0, on = true;
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  var pathOf = function (u) { try { return new URL(u, location.href).pathname; } catch (e) { return u; } };

  var css = document.createElement('style');
  css.textContent = '' +
    '#sj-bar{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px 10px;max-width:calc(100vw - 24px);box-sizing:border-box;padding:10px 12px;border-radius:16px;background:rgba(18,18,18,.96);border:1px solid #333;color:#fff;font:500 13px/1.3 Pretendard,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.4)}' +
    '#sj-bar b{color:#F05A24;font-weight:700}#sj-bar select,#sj-bar button{font:600 13px Pretendard,sans-serif;border:0;border-radius:10px;padding:9px 12px;cursor:pointer}' +
    '#sj-bar select{background:#2a2a2a;color:#fff}#sj-bar .sj-g{background:#3a3a3a;color:#fff}#sj-bar .sj-p{background:#F05A24;color:#090909}#sj-bar label{display:flex;gap:6px;align-items:center;cursor:pointer;color:#ddd}' +
    '#sj-bar .sj-hint{color:#bbb}#sj-bar .sj-cnt{color:#F05A24}' +
    '.sj-hov{outline:2px dashed #F05A24!important;outline-offset:2px;cursor:text!important}.sj-hov-img{outline:3px solid #F05A24!important;outline-offset:-3px;cursor:pointer!important}' +
    'body.sj-show .sj-ok{outline:1px dashed rgba(240,90,36,.6);outline-offset:2px}' +
    '[contenteditable].sj-editing{outline:2px solid #F05A24!important;outline-offset:3px;background:rgba(240,90,36,.12)!important;cursor:text!important}' +
    '.sj-img-tag{position:fixed;z-index:2147483001;pointer-events:none;background:#F05A24;color:#090909;font:700 12px Pretendard,sans-serif;padding:7px 11px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,.3)}' +
    '#sj-toast{position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:2147483002;background:#F3F1EC;color:#090909;padding:12px 18px;border-radius:12px;font:600 14px Pretendard,sans-serif;display:none;max-width:90vw}' +
    '@media(max-width:759px){#sj-bar .sj-hint{display:none}#sj-bar{bottom:80px}}';
  document.head.appendChild(css);

  var bar = document.createElement('div'); bar.id = 'sj-bar';
  bar.innerHTML = '<b>편집 모드</b><select id="sj-page">' + PAGES.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === E.page ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') + '</select>' +
    '<label><input type="checkbox" id="sj-on" checked> 편집 켜기</label><label><input type="checkbox" id="sj-show"> 고칠 수 있는 곳 보기</label>' +
    '<span class="sj-hint" id="sj-hint">글자는 눌러서 고치고, 사진은 눌러서 바꾸세요</span><span class="sj-cnt" id="sj-cnt"></span>' +
    '<button class="sj-g" id="sj-undo">되돌리기</button><button class="sj-p" id="sj-save">저장하기</button><button class="sj-g" id="sj-exit">나가기</button>';
  document.body.appendChild(bar);
  var toast = document.createElement('div'); toast.id = 'sj-toast'; document.body.appendChild(toast);
  var tag = document.createElement('div'); tag.className = 'sj-img-tag'; tag.textContent = '📷 사진 바꾸기'; tag.style.display = 'none'; document.body.appendChild(tag);
  var file = document.createElement('input'); file.type = 'file'; file.accept = 'image/jpeg,image/png,image/webp'; file.style.display = 'none'; document.body.appendChild(file);
  function say(m, ms) { toast.textContent = m; toast.style.display = 'block'; clearTimeout(say.t); if (ms !== 0) say.t = setTimeout(function () { toast.style.display = 'none'; }, ms || 2600); }
  function upd() { document.getElementById('sj-cnt').textContent = changes ? '· 바뀐 곳 ' + changes + '개' : ''; }

  function inBar(el) { return el && el.closest && (el.closest('#sj-bar') || el.closest('#sj-toast')); }
  function leafText(el) {
    if (!el || el.nodeType !== 1 || inBar(el) || /^(SCRIPT|STYLE|TEMPLATE|SVG|PATH|INPUT|TEXTAREA|SELECT|OPTION|VIDEO|IMG|IMAGE-SLOT|HTML|BODY|IFRAME|CANVAS)$/.test(el.tagName)) return null;
    var txt = '', has = false;
    for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) { txt += n.nodeValue; if (/[A-Za-z0-9가-힣]/.test(n.nodeValue)) has = true; }
      else if (n.nodeType === 1 && n.tagName === 'BR') txt += '\n';
      else return null;
    }
    return has ? norm(txt) : null;
  }
  function textTarget(el) { for (var i = 0; el && i < 3; i++, el = el.parentElement) { if (leafText(el) !== null) return el; } return null; }
  function slotOf(el) {
    if (!el || inBar(el)) return null;
    if (el.tagName === 'IMAGE-SLOT' && el.id && el.getBoundingClientRect().width > 40) return el;
    if (el.tagName === 'IMG' && el.getAttribute('src') && /\/(images|assets\/uploads)\/|^images\//.test(el.getAttribute('src')) && el.getBoundingClientRect().width > 40) return el;
    return null;
  }
  // 사진 위에 글자·그라데이션이 겹쳐 있어도 그 아래 사진을 찾음
  function slotAt(x, y) {
    var list = document.elementsFromPoint(x, y);
    for (var i = 0; i < list.length; i++) { var s = slotOf(list[i]); if (s) return s; if (list[i].tagName === 'VIDEO' || list[i].tagName === 'IFRAME') return null; }
    return null;
  }

  var hov = null, hovImg = null, raf = 0, lx = 0, ly = 0, editing = null;
  function clearHov() { if (hov) hov.classList.remove('sj-hov'); if (hovImg) hovImg.classList.remove('sj-hov-img'); hov = hovImg = null; tag.style.display = 'none'; }
  function frame() {
    raf = 0; if (!on || editing) { clearHov(); return; }
    var el = document.elementFromPoint(lx, ly); if (!el || inBar(el)) { clearHov(); return; }
    var t = textTarget(el), s = t ? null : slotAt(lx, ly);
    if (t !== hov) { if (hov) hov.classList.remove('sj-hov'); hov = t; if (t) t.classList.add('sj-hov'); }
    if (s !== hovImg) { if (hovImg) hovImg.classList.remove('sj-hov-img'); hovImg = s; if (s) s.classList.add('sj-hov-img'); }
    if (s) { var r = s.getBoundingClientRect(); tag.style.display = 'block'; tag.style.left = (r.left + r.width / 2 - 52) + 'px'; tag.style.top = (r.top + Math.min(r.height / 2, 120)) + 'px'; } else tag.style.display = 'none';
  }
  document.addEventListener('mousemove', function (e) { lx = e.clientX; ly = e.clientY; if (!raf) raf = requestAnimationFrame(frame); }, { passive: true });
  window.addEventListener('scroll', function () { if (hovImg || hov) { if (!raf) raf = requestAnimationFrame(frame); } }, { passive: true });

  function keyOf(el) { var id = el.getAttribute('data-sj-id'); return id ? '#' + id : null; }
  function startEdit(el) {
    var orig = el.getAttribute('data-sj-orig') || leafText(el);
    el.setAttribute('data-sj-orig', orig);
    el.__sjBefore = leafText(el);
    editing = el; clearHov();
    try { el.contentEditable = 'plaintext-only'; } catch (e) { el.contentEditable = 'true'; }
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.classList.add('sj-editing'); el.focus();
    var sel = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(el); rg.collapse(false); sel.removeAllRanges(); sel.addRange(rg);
  }
  function endEdit() {
    var el = editing; if (!el) return; editing = null;
    el.removeAttribute('contenteditable'); el.classList.remove('sj-editing');
    var v = norm(el.innerText), orig = el.getAttribute('data-sj-orig'), key = keyOf(el);
    if (!v) { el.innerHTML = esc(el.__sjBefore).replace(/\n/g, '<br>'); say('빈 칸으로는 저장할 수 없어요. 원래 글자로 돌려놨어요.'); return; }
    el.innerHTML = esc(v).replace(/\n/g, '<br>');
    if (v === el.__sjBefore) return;
    if (key) {
      if (v === el.getAttribute('data-sj-base')) delete text[key]; else text[key] = v;
      document.querySelectorAll('[data-sj-id="' + key.slice(1) + '"]').forEach(function (o) { if (o !== el) o.innerHTML = esc(v).replace(/\n/g, '<br>'); });
    } else {
      if (v === orig) delete text[orig]; else text[orig] = v;
    }
    dirty.text = true; changes++; upd();
  }
  document.querySelectorAll('[data-sj-id]').forEach(function (o) { if (!o.hasAttribute('data-sj-base')) o.setAttribute('data-sj-base', o.getAttribute('data-sj-orig') || leafText(o) || ''); });
  document.addEventListener('keydown', function (e) { if (editing && e.key === 'Escape') { editing.innerText = editing.__sjBefore; editing.blur(); } }, true);
  document.addEventListener('focusout', function (e) { if (editing && e.target === editing) endEdit(); }, true);

  var pickSlot = null;
  document.addEventListener('click', function (e) {
    if (!on || inBar(e.target)) return;
    if (editing) { if (editing.contains(e.target)) { e.preventDefault(); e.stopPropagation(); } return; }
    var t = textTarget(e.target);
    if (t) { e.preventDefault(); e.stopPropagation(); startEdit(t); return; }
    var s = slotAt(e.clientX, e.clientY);
    if (s) { e.preventDefault(); e.stopPropagation(); pickSlot = s; file.value = ''; file.click(); return; }
    var a = e.target.closest && e.target.closest('a[href]');
    if (a) { e.preventDefault(); say('편집 중에는 링크로 이동하지 않아요. 위쪽 메뉴에서 페이지를 고르세요.'); }
  }, true);
  function showInSlot(o, data) {
    if (!o._img) return;
    o._img.src = data; o._img.style.display = 'block';
    if (o._empty) o._empty.style.display = 'none';
  }
  file.addEventListener('change', function () {
    var f = file.files && file.files[0], s = pickSlot; if (!f || !s) return;
    if (f.size > 25 * 1024 * 1024) { say('사진이 너무 커요 (25MB 이하로 골라주세요)'); return; }
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      var M = 1600, k = Math.min(1, M / Math.max(im.naturalWidth, im.naturalHeight));
      var c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, c.width, c.height);
      var data = c.toDataURL('image/jpeg', 0.88); URL.revokeObjectURL(url);
      var isSlot = s.tagName === 'IMAGE-SLOT', key;
      if (isSlot) key = 'slot:' + s.id;
      else { var cp = pathOf(s.getAttribute('src') || ''); key = s.getAttribute('data-sj-key') || rev[cp] || cp; }
      var id = '__UP' + (++upN) + '__';
      images.push({ id: id, type: 'image/jpeg', data: data.split(',')[1] });
      media[key] = id; dirty.media = true; changes++; upd();
      if (isSlot) document.querySelectorAll('image-slot').forEach(function (o) { if (o.id === s.id) showInSlot(o, data); });
      else document.querySelectorAll('img[src]').forEach(function (o) { var op = pathOf(o.getAttribute('src')); if (o === s || op === key || o.getAttribute('data-sj-key') === key) { o.setAttribute('data-sj-key', key); o.setAttribute('src', data); } });
      say('사진을 바꿨어요. "저장하기"를 눌러야 홈페이지에 반영돼요.');
    };
    im.onerror = function () { say('이 사진은 열 수 없어요. JPG나 PNG로 골라주세요.'); };
    im.src = url;
  });

  document.getElementById('sj-on').onchange = function (e) { on = e.target.checked; clearHov(); document.getElementById('sj-hint').textContent = on ? '글자는 눌러서 고치고, 사진은 눌러서 바꾸세요' : '편집이 꺼져 있어요. 탭·버튼을 눌러 화면을 옮긴 뒤 다시 켜세요'; };
  document.getElementById('sj-show').onchange = function (e) {
    document.body.classList.toggle('sj-show', e.target.checked);
    if (e.target.checked) document.querySelectorAll('body *').forEach(function (el) { if (leafText(el) !== null || slotOf(el)) el.classList.add('sj-ok'); });
    else document.querySelectorAll('.sj-ok').forEach(function (el) { el.classList.remove('sj-ok'); });
  };
  document.getElementById('sj-page').onchange = function (e) { if (changes && !confirm('저장하지 않은 수정이 있어요. 이동할까요?')) { e.target.value = E.page; return; } window.__sjSaved = true; location.href = '/edit?p=' + e.target.value; };
  document.getElementById('sj-undo').onclick = function () { if (!changes || confirm('저장하지 않은 수정을 모두 되돌릴까요?')) { window.__sjSaved = true; location.reload(); } };
  document.getElementById('sj-exit').onclick = function () { if (changes && !confirm('저장하지 않은 수정이 있어요. 나갈까요?')) return; window.__sjSaved = true; var p = (PAGES.find(function (x) { return x[0] === E.page; }) || PAGES[0])[2]; location.href = p; };
  window.addEventListener('beforeunload', function (e) { if (changes && !window.__sjSaved) { e.preventDefault(); e.returnValue = ''; } });

  document.getElementById('sj-save').onclick = async function () {
    if (editing) endEdit();
    if (!changes) { say('바뀐 곳이 없어요.'); return; }
    var btn = this; btn.disabled = true; btn.textContent = '저장 중…';
    var files = {}; if (dirty.text) files.text = { t: text }; if (dirty.media) files.media = { m: media };
    try {
      var r = await fetch('/api/cms/commit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ files: files, images: images }) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok || !j.ok) throw new Error(j.error || ('저장 실패 (' + r.status + ')'));
      var want = JSON.stringify(files.text ? files.text : files.media).replace(/__UP\d+__/g, function (m) { return (j.map || {})[m] || m; });
      var probe = files.text ? 'text' : 'media';
      say('저장했어요. 홈페이지에 반영되는 중이에요 (보통 1분 안쪽)…', 0); btn.textContent = '반영 중…';
      for (var i = 0; i < 60; i++) {
        await new Promise(function (ok) { setTimeout(ok, 4000); });
        try { var c = await (await fetch('/content/' + probe + '.json?ts=' + Date.now(), { cache: 'no-store' })).json(); if (JSON.stringify(c) === want) break; } catch (e) { }
      }
      window.__sjSaved = true; say('반영 완료! 새로고침할게요.', 0); setTimeout(function () { location.reload(); }, 800);
    } catch (e) { btn.disabled = false; btn.textContent = '저장하기'; say('저장하지 못했어요: ' + e.message, 6000); }
  };
  upd();
})();
