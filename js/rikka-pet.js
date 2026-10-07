// Web adaptation of the state-based companion in YibinLi188/Rikka-desk-pet.
// Artwork origin and separate usage terms: /assets/rikka-pet/ATTRIBUTION.txt
(() => {
  if (window.rikkaPixelPet) return;
  window.rikkaPixelPet = {loading: true};
  const storageKey = 'rikka-pixel-pet-v1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 800px)');
  const states = {
    idle: {label: '待机', message: '邪王真眼，待命中。'},
    eat: {label: '开饭', message: '补充一点能量！'},
    daydream: {label: '发呆', message: '正在寻找不可视境界线……'},
    sleep: {label: '睡觉', message: '晚安，明天再继续冒险。'},
    shy: {label: '害羞', message: '才、才没有害羞呢。'},
    confused: {label: '疑惑', message: '嗯？是在叫我吗？'}
  };
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch (_) {}
  let shown = typeof stored.shown === 'boolean' ? stored.shown : !mobile.matches;
  let paused = stored.paused === true;
  let baseState = ['idle', 'eat', 'daydream', 'sleep'].includes(stored.state) ? stored.state : 'idle';
  let currentState = baseState, frameTimer, reactionTimer, speechTimer, request = 0;
  let position = stored.position && Number.isFinite(stored.position.x) && Number.isFinite(stored.position.y)
    ? {x: Math.max(0, Math.min(1, stored.position.x)), y: Math.max(0, Math.min(1, stored.position.y))} : null;
  let pet, menu, restore, picture, manifest, dragging, suppressClick = false, menuReturnFocus;
  const loaded = new Map();
  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({shown, paused, state: baseState, position})); } catch (_) {}
  };
  const active = () => shown && !paused && !reduced.matches && !document.hidden &&
    !document.body.matches('.read-mode, .rh-wallpaper-only');
  const loadFrame = name => {
    if (!loaded.has(name)) {
      const image = new Image(); image.decoding = 'async';
      const promise = new Promise((resolve, reject) => {
        image.onload = () => resolve(image.src);
        image.onerror = () => { loaded.delete(name); reject(new Error('Pet frame unavailable: ' + name)); };
      });
      image.src = manifest.frames[name]; loaded.set(name, promise);
    }
    return loaded.get(name);
  };
  function stopBlink() {
    clearTimeout(frameTimer);
    if (picture && currentState === 'idle' && picture.src) picture.src = manifest.frames.idle;
  }
  function scheduleBlink() {
    stopBlink();
    if (!active() || currentState !== 'idle' || dragging) return;
    frameTimer = setTimeout(async () => {
      try {
        const blink = await loadFrame('idle-blink');
        if (!active() || currentState !== 'idle' || dragging) return;
        picture.src = blink;
        frameTimer = setTimeout(() => { picture.src = manifest.frames.idle; scheduleBlink(); }, 140);
      } catch (_) { /* Keep the normal pose when the optional blink frame fails. */ }
    }, 2800 + Math.random() * 2400);
  }
  function say(text) {
    const bubble = pet.querySelector('.rp-speech');
    clearTimeout(speechTimer); bubble.textContent = text; bubble.hidden = false;
    const rect = pet.getBoundingClientRect();
    bubble.dataset.below = String(rect.top < 80);
    bubble.dataset.align = rect.left + 210 > innerWidth - 12 ? 'right' : 'left';
    speechTimer = setTimeout(() => { bubble.hidden = true; }, 3500);
  }
  function syncControls() {
    menu.querySelectorAll('[data-state]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.state === baseState)));
    const pause = menu.querySelector('[data-action="pause"]');
    pause.textContent = reduced.matches ? '已跟随系统减少动态效果' : paused ? '恢复眨眼' : '暂停眨眼';
    pause.disabled = reduced.matches;
    pause.setAttribute('aria-pressed', String(paused || reduced.matches));
    pet.dataset.paused = String(!active());
  }
  async function setState(name, transient = false, announce = true) {
    const token = ++request;
    clearTimeout(reactionTimer); stopBlink();
    try {
      const src = await loadFrame(name);
      if (token !== request || !shown) return;
      currentState = name; pet.dataset.state = name;
      picture.src = src;
      pet.querySelector('.rp-character').setAttribute('aria-label', `六花正在${states[name].label}，点击摸摸头，按方向键移动`);
      if (!transient) { baseState = name; save(); }
      syncControls(); scheduleBlink();
      if (announce) say(states[name].message);
      if (transient) reactionTimer = setTimeout(() => setState(baseState, false, false), 2800);
    } catch (_) {
      if (token === request && shown) { say('这张表情还没准备好，稍后再试试。'); scheduleBlink(); }
    }
  }
  function closeMenu(returnFocus = false) {
    menu.hidden = true;
    pet.querySelector('[data-action="menu"]').setAttribute('aria-expanded', 'false');
    if (returnFocus && menuReturnFocus?.isConnected) menuReturnFocus.focus({preventScroll: true});
  }
  function placeMenu() {
    if (menu.hidden) return;
    const rect = pet.getBoundingClientRect(), popup = menu.getBoundingClientRect();
    menu.style.left = Math.max(12, Math.min(innerWidth - popup.width - 12, rect.left)) + 'px';
    const preferred = rect.top >= popup.height + 20 ? rect.top - popup.height - 8 : rect.bottom + 8;
    menu.style.top = Math.max(12, Math.min(innerHeight - popup.height - 12, preferred)) + 'px';
  }
  function openMenu() {
    menuReturnFocus = pet.querySelector('[data-action="menu"]');
    menu.hidden = false; pet.querySelector('.rp-speech').hidden = true;
    menuReturnFocus.setAttribute('aria-expanded', 'true');
    syncControls(); placeMenu(); menu.querySelector('[data-state]').focus({preventScroll: true});
    ['eat', 'daydream', 'sleep'].forEach(name => loadFrame(name).catch(() => {}));
  }
  function moveTo(x, y, persist = false) {
    const width = pet.offsetWidth, height = pet.offsetHeight;
    const maxX = Math.max(8, innerWidth - width - 8), maxY = Math.max(8, innerHeight - height - 8);
    const left = Math.max(8, Math.min(maxX, x)), top = Math.max(8, Math.min(maxY, y));
    pet.style.left = left + 'px'; pet.style.top = top + 'px'; pet.style.bottom = 'auto';
    if (persist) { position = {x: (left - 8) / Math.max(1, maxX - 8), y: (top - 8) / Math.max(1, maxY - 8)}; save(); }
    placeMenu();
  }
  function restorePosition() {
    if (!shown || pet.hidden) return;
    if (position) moveTo(8 + position.x * Math.max(0, innerWidth - pet.offsetWidth - 16),
      8 + position.y * Math.max(0, innerHeight - pet.offsetHeight - 16));
    else { pet.style.left = ''; pet.style.top = ''; pet.style.bottom = ''; }
    placeMenu();
  }
  async function showPet(focus = false) {
    shown = true;
    try {
      // Decode before revealing the character so there is never a broken image.
      const src = await loadFrame(baseState);
      if (!shown) return;
      picture.src = src; pet.hidden = false; restore.hidden = true;
      restorePosition(); await setState(baseState, false, false);
      if (focus) pet.querySelector('.rp-character').focus({preventScroll: true});
      if (baseState === 'idle') loadFrame('idle-blink').catch(() => {});
    } catch (_) { shown = false; restore.hidden = false; restore.querySelector('span').textContent = '重试召唤六花'; }
  }
  function hidePet() {
    shown = false; ++request; clearTimeout(reactionTimer); clearTimeout(speechTimer); stopBlink();
    pet.hidden = true; pet.querySelector('.rp-speech').hidden = true;
    closeMenu(); restore.hidden = false; save(); restore.focus({preventScroll: true});
  }
  function onMotionChange() {
    if (!active()) {
      stopBlink(); clearTimeout(reactionTimer);
      if (currentState !== baseState && shown) setState(baseState, false, false);
      if (document.body.matches('.read-mode, .rh-wallpaper-only')) closeMenu();
    } else scheduleBlink();
    syncControls();
  }
  async function init() {
    const response = await fetch('/assets/rikka-pet/manifest.json');
    if (!response.ok) throw new Error('Pet manifest unavailable');
    manifest = await response.json();
    if (!manifest.frames || !['idle', 'idle-blink', 'shy', 'confused', 'sleep', 'eat', 'daydream'].every(name =>
      typeof manifest.frames[name] === 'string' && manifest.frames[name].startsWith('/assets/rikka-pet/'))) throw new Error('Invalid pet manifest');
    pet = document.createElement('aside'); pet.id = 'rikka-pet'; pet.hidden = true; pet.setAttribute('aria-label', '六花像素伙伴');
    pet.innerHTML = '<div class="rp-speech" role="status" aria-live="polite" hidden></div><button class="rp-character" type="button" aria-label="摸摸六花，可拖动位置"><img class="rp-frame" alt="" width="256" height="320" draggable="false"></button><div class="rp-controls"><button type="button" data-action="menu" aria-label="打开六花菜单" aria-expanded="false" aria-controls="rikka-pet-menu" title="六花菜单">···</button><button type="button" data-action="hide" aria-label="收起六花" title="收起六花">−</button></div>';
    menu = document.createElement('section'); menu.id = 'rikka-pet-menu'; menu.hidden = true;
    menu.setAttribute('role', 'dialog'); menu.setAttribute('aria-label', '六花的小菜单');
    menu.innerHTML = '<div class="rp-menu-heading"><strong>六花的小世界</strong><button class="rp-menu-close" type="button" data-action="close" aria-label="关闭六花菜单">×</button></div><p class="rp-menu-hint">点点六花，或拖着她换个位置。</p><div class="rp-states">' +
      ['idle', 'eat', 'daydream', 'sleep'].map(name => `<button type="button" data-state="${name}" aria-pressed="false">${states[name].label}</button>`).join('') +
      '</div><div class="rp-options"><button type="button" data-action="pause">暂停眨眼</button><button type="button" data-action="reset">回到角落</button><button type="button" data-action="hide">收起六花</button></div>';
    restore = document.createElement('button'); restore.id = 'rikka-pet-restore'; restore.type = 'button'; restore.hidden = shown;
    restore.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z"/></svg><span>召唤六花</span>';
    document.body.append(pet, menu, restore); picture = pet.querySelector('img');
    const character = pet.querySelector('.rp-character');
    character.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      closeMenu(); setState(currentState === 'shy' ? 'confused' : 'shy', true);
    });
    character.addEventListener('contextmenu', event => { event.preventDefault(); event.stopPropagation(); openMenu(); });
    character.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      const rect = pet.getBoundingClientRect();
      dragging = {id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false};
      suppressClick = false; character.setPointerCapture(event.pointerId); stopBlink();
    });
    character.addEventListener('pointermove', event => {
      if (!dragging || dragging.id !== event.pointerId) return;
      const dx = event.clientX - dragging.x, dy = event.clientY - dragging.y;
      if (!dragging.moved && Math.hypot(dx, dy) < 6) return;
      dragging.moved = true; pet.dataset.dragging = 'true'; closeMenu(); pet.querySelector('.rp-speech').hidden = true;
      moveTo(dragging.left + dx, dragging.top + dy);
    });
    function endDrag(event) {
      if (!dragging || event.pointerId !== dragging.id) return;
      suppressClick = dragging.moved;
      if (dragging.moved) { const rect = pet.getBoundingClientRect(); moveTo(rect.left, rect.top, true); }
      dragging = null; pet.dataset.dragging = 'false'; scheduleBlink();
      if (character.hasPointerCapture(event.pointerId)) character.releasePointerCapture(event.pointerId);
    }
    character.addEventListener('pointerup', endDrag); character.addEventListener('pointercancel', endDrag);
    character.addEventListener('lostpointercapture', endDrag);
    character.addEventListener('keydown', event => {
      const directions = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
      const d = directions[event.key]; if (!d) return;
      event.preventDefault(); const rect = pet.getBoundingClientRect(), step = event.shiftKey ? 40 : 12;
      moveTo(rect.left + d[0] * step, rect.top + d[1] * step, true);
    });
    function action(event) {
      const button = event.target.closest('button'); if (!button) return;
      if (button.dataset.state) { setState(button.dataset.state); closeMenu(true); return; }
      switch (button.dataset.action) {
        case 'menu': menu.hidden ? openMenu() : closeMenu(true); break;
        case 'close': closeMenu(true); break;
        case 'hide': hidePet(); break;
        case 'pause': if (!reduced.matches) { paused = !paused; save(); onMotionChange(); } break;
        case 'reset': position = null; save(); restorePosition(); closeMenu(true); break;
      }
    }
    pet.addEventListener('click', action); menu.addEventListener('click', action);
    restore.addEventListener('click', () => { save(); showPet(true); });
    document.addEventListener('pointerdown', event => { if (!pet.contains(event.target) && !menu.contains(event.target)) closeMenu(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { event.preventDefault(); closeMenu(true); } });
    document.addEventListener('focusin', event => { if (!menu.hidden && !menu.contains(event.target) && !pet.contains(event.target)) closeMenu(); });
    document.addEventListener('visibilitychange', onMotionChange);
    reduced.addEventListener('change', onMotionChange);
    new MutationObserver(onMotionChange).observe(document.body, {attributes: true, attributeFilter: ['class']});
    window.addEventListener('resize', () => { restorePosition(); closeMenu(); });
    document.addEventListener('pjax:send', () => { closeMenu(); stopBlink(); });
    document.addEventListener('pjax:complete', () => { restorePosition(); onMotionChange(); });
    window.addEventListener('pagehide', () => { stopBlink(); clearTimeout(reactionTimer); clearTimeout(speechTimer); });
    window.addEventListener('pageshow', onMotionChange);
    syncControls();
    if (shown) await showPet();
    window.rikkaPixelPet.loading = false;
  }
  const start = () => init().catch(error => { console.warn('六花像素伙伴暂不可用', error); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
})();
