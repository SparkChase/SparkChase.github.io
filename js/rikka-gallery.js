(() => {
  let cleanup = () => {};
  const init = () => {
    const gallery = document.querySelector('.rikka-gallery');
    const dialog = document.querySelector('.rg-dialog');
    if (gallery?.dataset.ready) return;
    cleanup();
    if (!gallery || !dialog) return;
    gallery.dataset.ready = 'true';
    const controller = new AbortController();
    const on = (target, type, listener, options = {}) => target.addEventListener(type, listener, { ...options, signal: controller.signal });
    const cards = [...gallery.querySelectorAll('.rg-artwork')];
    const filters = gallery.querySelector('.rg-filters');
    const collection = gallery.querySelector('.rg-collection');
    const status = gallery.querySelector('.rg-status');
    const image = dialog.querySelector('.rg-full-image');
    const download = dialog.querySelector('.rg-download');
    const motionButton = gallery.querySelector('.rg-motion');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reducedMotion.matches;
    let current = null;
    let returnFocus = null;
    let suppressClickUntil = 0;
    let frame = 0;
    const visibleLinks = () => cards.filter(card => !card.hidden).map(card => card.querySelector('[data-rg-preview]'));
    const shelves = [...gallery.querySelectorAll('.rg-shelf')].map(shelf => ({
      shelf,
      rail: shelf.querySelector('.rg-rail'),
      cards: [...shelf.querySelectorAll('.rg-artwork')],
      position: shelf.querySelector('.rg-shelf-position'),
      previous: shelf.querySelector('[data-rg-scroll="-1"]'),
      next: shelf.querySelector('[data-rg-scroll="1"]')
    }));

    function updateRails() {
      frame = 0;
      shelves.forEach(({ shelf, rail, cards: items, position, previous, next }) => {
        if (shelf.hidden) return;
        const visible = items.filter(card => !card.hidden);
        const fits = rail.scrollWidth <= rail.clientWidth + 2;
        rail.dataset.fit = String(fits);
        let nearest = 0;
        let distance = Infinity;
        visible.forEach((card, index) => {
          const x = card.offsetLeft + card.offsetWidth / 2 - rail.scrollLeft - rail.clientWidth / 2;
          const normalized = Math.max(-1, Math.min(1, x / (rail.clientWidth / 2)));
          const curve = Number(shelf.dataset.curve);
          const arc = rail.clientWidth < 700 ? 18 : 32;
          card.style.setProperty('--rg-y', `${fits || reducedMotion.matches ? 0 : curve * (normalized * normalized * arc - arc / 2)}px`);
          card.style.setProperty('--rg-rotate', `${fits || reducedMotion.matches ? 0 : curve * normalized * 7}deg`);
          if (Math.abs(x) < distance) { nearest = index; distance = Math.abs(x); }
        });
        position.textContent = `${nearest + 1} / ${visible.length}`;
        previous.disabled = rail.scrollLeft <= 2;
        next.disabled = rail.scrollLeft >= rail.scrollWidth - rail.clientWidth - 2;
      });
    }
    const scheduleRails = () => { if (!frame) frame = requestAnimationFrame(updateRails); };
    const scrollShelf = (rail, direction) => {
      rail.scrollBy({ left: direction * rail.clientWidth * .7, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    };
    shelves.forEach(({ shelf, rail }) => {
      shelf.querySelector('.rg-shelf-nav').hidden = false;
      on(rail, 'scroll', scheduleRails, { passive: true });
      on(shelf, 'click', event => {
        const button = event.target.closest('[data-rg-scroll]');
        if (button) scrollShelf(rail, Number(button.dataset.rgScroll));
      });
      on(rail, 'keydown', event => {
        if (event.target !== rail || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'Home' || event.key === 'End') {
          rail.scrollTo({ left: event.key === 'Home' ? 0 : rail.scrollWidth, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
        } else scrollShelf(rail, event.key === 'ArrowLeft' ? -1 : 1);
      });
      // Touch uses native scrolling; pointer dragging adds the same affordance on desktop.
      let drag = null;
      on(rail, 'pointerdown', event => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        drag = { x: event.clientX, scroll: rail.scrollLeft, id: event.pointerId, moved: false };
      });
      on(rail, 'pointermove', event => {
        if (!drag) return;
        const delta = event.clientX - drag.x;
        if (!drag.moved && Math.abs(delta) < 6) return;
        if (!drag.moved) {
          drag.moved = true;
          rail.setPointerCapture(drag.id);
          rail.dataset.dragging = 'true';
        }
        event.preventDefault();
        rail.scrollLeft = drag.scroll - delta;
      });
      const endDrag = () => {
        if (!drag) return;
        if (drag.moved) suppressClickUntil = performance.now() + 250;
        const id = drag.id;
        drag = null;
        delete rail.dataset.dragging;
        if (rail.hasPointerCapture(id)) rail.releasePointerCapture(id);
      };
      on(rail, 'pointerup', endDrag);
      on(rail, 'pointercancel', endDrag);
      on(rail, 'lostpointercapture', endDrag);
      on(rail, 'pointerleave', () => { if (drag && !drag.moved) drag = null; });
    });
    const resizeObserver = new ResizeObserver(scheduleRails);
    shelves.forEach(({ rail }) => resizeObserver.observe(rail));
    updateRails();

    const updateStatus = () => {
      const format = collection.dataset.filter || 'all';
      const label = { all: '收藏', desktop: '横屏壁纸', mobile: '竖屏壁纸', meme: '表情包', cute: '可爱图片' }[format];
      status.textContent = `${visibleLinks().length} 张${label} · 左右滑动，点击放大。${paused ? '动图已暂停。' : '动图自动播放。'}`;
    };
    const updateMotion = () => {
      gallery.querySelectorAll('[data-poster]').forEach(link => {
        const src = paused ? link.dataset.poster : link.href;
        link.querySelector('img').src = src;
        link.querySelector('source').srcset = src;
      });
      motionButton.textContent = paused ? '播放动图' : '暂停动图';
      motionButton.setAttribute('aria-pressed', String(paused));
      if (current && dialog.open) image.src = paused && current.dataset.poster ? current.dataset.poster : current.href;
      updateStatus();
    };
    motionButton.hidden = false;
    on(motionButton, 'click', () => { paused = !paused; updateMotion(); });
    on(reducedMotion, 'change', event => { paused = event.matches; updateMotion(); scheduleRails(); });
    updateMotion();

    filters.hidden = false;
    on(filters, 'click', event => {
      const button = event.target.closest('[data-rg-filter]');
      if (!button) return;
      const format = button.dataset.rgFilter;
      filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      cards.forEach(card => { card.hidden = format !== 'all' && card.dataset.format !== format; });
      collection.dataset.filter = format;
      shelves.forEach(({ shelf, rail, cards: items }) => {
        shelf.hidden = items.every(card => card.hidden);
        delete rail.dataset.fit;
        rail.scrollLeft = 0;
      });
      updateRails();
      updateStatus();
    });

    function show(link) {
      current = link;
      image.src = paused && link.dataset.poster ? link.dataset.poster : link.href;
      image.alt = link.dataset.title;
      dialog.querySelector('#rg-dialog-title').textContent = link.dataset.title;
      dialog.querySelector('#rg-dialog-size').textContent = link.dataset.size;
      download.href = link.href;
      download.download = link.closest('.rg-artwork').querySelector('[download]').download;
      dialog.querySelectorAll('[data-rg-step]').forEach(button => { button.disabled = visibleLinks().length < 2; });
    }
    on(gallery, 'click', event => {
      if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); return; }
      const link = event.target.closest('[data-rg-preview]');
      if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || typeof dialog.showModal !== 'function') return;
      event.preventDefault();
      returnFocus = link;
      show(link);
      dialog.showModal();
      dialog.querySelector('.rg-close').focus();
    });
    const step = amount => {
      const links = visibleLinks();
      if (!links.length) return;
      show(links[(links.indexOf(current) + amount + links.length) % links.length]);
    };
    on(dialog, 'click', event => {
      if (event.target.closest('.rg-close')) dialog.close();
      const button = event.target.closest('[data-rg-step]');
      if (button) step(Number(button.dataset.rgStep));
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      }
    });
    on(dialog, 'keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    });
    on(dialog, 'close', () => { image.removeAttribute('src'); if (returnFocus?.isConnected) returnFocus.focus(); });
    on(image, 'error', () => {
      dialog.querySelector('#rg-dialog-size').textContent = '图片暂时无法加载，请关闭预览后重试。';
    });
    cleanup = () => {
      controller.abort();
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      if (dialog.open) dialog.close();
      image.removeAttribute('src');
      delete gallery.dataset.ready;
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  document.addEventListener('pjax:complete', init);
  document.addEventListener('pjax:send', () => cleanup());
})();
