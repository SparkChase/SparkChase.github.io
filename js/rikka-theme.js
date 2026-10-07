/* Share one state across the header, sidebar and PJAX-rendered pages. */
(() => {
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let seal = null;
  let sealTimer = 0;
  let sealTrigger = null;
  const stopClip = () => {
    const video = seal?.querySelector('video');
    if (!video) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
  const dismissSeal = () => {
    clearTimeout(sealTimer);
    if (!seal) return;
    if (seal.contains(document.activeElement) && sealTrigger?.isConnected) {
      sealTrigger.focus({preventScroll: true});
    }
    stopClip();
    seal.remove();
    seal = null;
  };
  const showSeal = () => {
    dismissSeal();
    const dark = root.dataset.theme === 'dark';
    sealTrigger = document.activeElement;
    const panel = document.createElement('aside');
    panel.className = 'rikka-seal';
    panel.dataset.mode = dark ? 'night' : 'day';
    panel.setAttribute('aria-label', '六花的模式切换提示');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'rikka-seal-close';
    close.setAttribute('aria-label', '关闭六花动画');
    close.textContent = '×';
    close.addEventListener('click', dismissSeal);

    let video;
    if (dark) {
      const scene = document.createElement('div');
      scene.className = 'rikka-seal-scene';
      video = document.createElement('video');
      video.poster = '/assets/rikka-collection/rikka-03-poster.webp';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'none';
      video.setAttribute('aria-hidden', 'true');
      video.tabIndex = -1;
      scene.append(video);
      panel.append(scene);
    }
    const copy = document.createElement('div');
    copy.className = 'rikka-seal-copy';
    const title = document.createElement('strong');
    title.textContent = dark ? '邪王真眼最强！' : '封印完成，回归日常。';
    const detail = document.createElement('p');
    detail.textContent = dark ? '封印解除 · 夜间模式已开启' : '日间模式已开启';
    copy.append(title, detail);
    panel.append(copy, close);
    seal = panel;
    document.body.append(panel);

    let status = document.getElementById('rikka-theme-status');
    if (!status) {
      status = document.createElement('div');
      status.id = 'rikka-theme-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-atomic', 'true');
      document.body.append(status);
    }
    status.textContent = `${title.textContent} ${detail.textContent}`;
    sealTimer = setTimeout(dismissSeal, dark ? 5200 : 2600);
    // Load the two-second, non-looping clip only after an explicit interaction.
    // The poster and message remain useful when playback is unavailable.
    if (video && !reducedMotion.matches) {
      video.src = '/assets/rikka-collection/rikka-seal-release.mp4';
      video.addEventListener('ended', () => {
        if (seal !== panel) return;
        clearTimeout(sealTimer);
        sealTimer = setTimeout(dismissSeal, 2000);
      }, {once: true});
      video.play().catch(() => { if (seal === panel) stopClip(); });
    }
  };
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') dismissSeal();
  });
  document.addEventListener('pjax:send', dismissSeal);
  document.addEventListener('visibilitychange', () => { if (document.hidden) dismissSeal(); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) stopClip(); });
  const sync = () => {
    const dark = root.dataset.theme === 'dark';
    const label = dark ? '收起结界 · 切换日间模式' : '解除封印 · 切换夜间模式';
    document.querySelectorAll('.rikka-mode-toggle').forEach(button => {
      button.title = label;
      button.setAttribute('aria-label', label);
      button.setAttribute('aria-pressed', String(dark));
    });
  };
  new MutationObserver(sync).observe(root, {attributes: true, attributeFilter: ['data-theme']});
  document.addEventListener('pjax:complete', sync);
  document.addEventListener('rikka:theme-change', () => {
    sync();
    showSeal();
    document.querySelectorAll('.rikka-mode-toggle').forEach(button => {
      button.getAnimations().forEach(animation => animation.cancel());
      if (!reducedMotion.matches) button.animate([
        {outline: '1px solid transparent', outlineOffset: '0px'},
        {outline: '1px solid #e7c477', outlineOffset: '6px', offset: .3},
        {outline: '1px solid transparent', outlineOffset: '12px'}
      ], {duration: 480, easing: 'cubic-bezier(.16,1,.3,1)'});
    });
    // A brief ring belongs to the homepage illustration, never covers the reader.
    const sigil = document.querySelector('.rikka-sigil');
    if (sigil && !reducedMotion.matches) {
      sigil.getAnimations().forEach(animation => animation.cancel());
      sigil.animate([{transform: 'rotate(-35deg) scale(.85)'}, {transform: 'rotate(0) scale(1)'}],
        {duration: 480, easing: 'cubic-bezier(.16,1,.3,1)'});
    }
  });
  // The ordinary anchor works without JS. Smooth movement honors motion preferences.
  document.addEventListener('click', event => {
    const link = event.target.closest('.rikka-read');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const content = document.getElementById('content-inner');
    if (!content) return;
    event.preventDefault();
    content.tabIndex = -1;
    content.focus({preventScroll: true});
    content.scrollIntoView({behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  });
  sync();
})();
