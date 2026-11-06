/* 收藏馆按需加载。数据与键盘行为由 rikka-gallery.js 管理。 */
(() => {
  const { gsap, Flip } = window;
  if (!gsap || !Flip) return;
  gsap.registerPlugin(Flip);

  window.createRikkaGalleryMotion = ({ gallery, dialog, image, reducedMotion }) => {
    const controller = new AbortController();
    const on = (target, name, handler) => target.addEventListener(name, handler, { signal: controller.signal });
    const cards = [...gallery.querySelectorAll('.rg-artwork')];
    const filters = gallery.querySelector('.rg-filters');
    const chrome = [...dialog.querySelectorAll('.rg-dialog-head, .rg-dialog-foot')];
    const counter = document.createElement('p');
    counter.className = 'rg-dialog-count';
    dialog.querySelector('.rg-dialog-head > div').prepend(counter);
    dialog.classList.add('rg-viewer');
    gallery.dataset.motion = 'ready';
    let scene, rearrange, entrance, flight, source;
    const canAnimate = () => !reducedMotion.matches && !document.hidden;
    const clear = targets => gsap.set(targets, { clearProps: 'transform,opacity,visibility' });
    const removeFlight = () => {
      flight?.remove();
      flight = null;
      if (source) source.style.removeProperty('visibility');
      source = null;
    };
    const reset = () => {
      scene?.kill();
      scene = null;
      removeFlight();
      clear([image, ...chrome]);
      dialog.style.removeProperty('--rg-shade');
      delete dialog.dataset.phase;
    };
    const settleLayout = () => {
      entrance?.progress(1).kill();
      entrance = null;
      rearrange?.progress(1).kill();
      rearrange = null;
      Flip.killFlipsOf(cards, true);
      gsap.killTweensOf(cards);
      clear(cards);
      delete gallery.dataset.filtering;
    };
    const positionTab = animate => {
      const active = filters.querySelector('[aria-pressed="true"]');
      if (!active) return;
      const vars = { '--rg-tab-x': `${active.offsetLeft}px`, '--rg-tab-width': `${active.offsetWidth}px` };
      gsap.killTweensOf(filters);
      if (animate && canAnimate()) gsap.to(filters, { ...vars, duration: .42, ease: 'power3.out' });
      else gsap.set(filters, vars);
    };
    positionTab(false);

    // object-fit: contain 的可见图像范围，避免把留白一起缩放。
    const imageBounds = () => {
      const rect = image.getBoundingClientRect();
      const dimensions = dialog.querySelector('#rg-dialog-size').textContent.match(/(\d+)\s*×\s*(\d+)/);
      const ratio = dimensions ? Number(dimensions[1]) / Number(dimensions[2]) : (image.naturalWidth / image.naturalHeight || 1);
      const width = Math.min(rect.width, rect.height * ratio);
      const height = width / ratio;
      return { x: rect.left + (rect.width - width) / 2, y: rect.top + (rect.height - height) / 2, width, height };
    };
    const makeFlight = link => {
      const thumbnail = link.querySelector('img');
      flight = document.createElement('img');
      flight.className = 'rg-flight';
      flight.alt = '';
      flight.setAttribute('aria-hidden', 'true');
      flight.src = image.complete && image.naturalWidth ? image.currentSrc : thumbnail.currentSrc || thumbnail.src;
      dialog.append(flight);
      gsap.set(flight, { ...imageBounds(), transformOrigin: '0 0' });
      source = thumbnail;
      thumbnail.style.visibility = 'hidden';
      gsap.set(image, { opacity: 0 });
      return flight;
    };
    const revealLoadedImage = () => {
      if (dialog.dataset.phase !== 'open' || !image.complete) return;
      removeFlight();
      clear(image);
    };
    on(image, 'load', revealLoadedImage);
    on(image, 'error', revealLoadedImage);

    const open = link => {
      settleLayout();
      reset();
      if (!canAnimate()) return;
      dialog.dataset.phase = 'opening';
      const target = imageBounds();
      const flying = makeFlight(link);
      Flip.fit(flying, link.querySelector('img'), { scale: true });
      gsap.set(dialog, { '--rg-shade': 0 });
      gsap.set(chrome, { opacity: 0, y: 14 });
      scene = gsap.timeline({ onComplete: () => {
        scene = null;
        dialog.dataset.phase = 'open';
        revealLoadedImage();
      } });
      scene.to(dialog, { '--rg-shade': .96, duration: .48, ease: 'power2.out' }, 0)
        .to(flying, { x: target.x, y: target.y, scaleX: 1, scaleY: 1, rotation: 0, borderRadius: 4, duration: .72, ease: 'expo.inOut' }, 0)
        .to(chrome, { opacity: 1, y: 0, stagger: .06, duration: .36, ease: 'power3.out', clearProps: 'transform,opacity' }, .34);
    };

    const close = link => {
      if (!dialog.open || dialog.dataset.phase === 'closing') return;
      if (dialog.dataset.phase === 'opening' && scene && canAnimate() && scene.progress() > 0) {
        dialog.dataset.phase = 'closing';
        scene.eventCallback('onComplete', null);
        scene.eventCallback('onReverseComplete', () => { reset(); dialog.close(); });
        scene.reverse();
        return;
      }
      reset();
      if (!canAnimate() || !link?.isConnected) { dialog.close(); return; }
      dialog.dataset.phase = 'closing';
      const rect = link.getBoundingClientRect();
      const rail = link.closest('.rg-rail').getBoundingClientRect();
      const visible = rect.right > rail.left && rect.left < rail.right && rect.bottom > 0 && rect.top < innerHeight;
      scene = gsap.timeline({ onComplete: () => { reset(); dialog.close(); } });
      scene.to(chrome, { opacity: 0, y: 8, duration: .16 }, 0)
        .to(dialog, { '--rg-shade': 0, duration: .48, ease: 'power2.inOut' }, 0);
      if (visible) {
        const flying = makeFlight(link);
        const fit = Flip.fit(flying, link.querySelector('img'), { scale: true, getVars: true });
        scene.to(flying, { ...fit, borderRadius: 10, duration: .52, ease: 'power3.inOut' }, 0);
      } else {
        scene.to(image, { opacity: 0, scale: .97, duration: .3, ease: 'power2.in' }, 0);
      }
    };

    const step = (change, direction) => {
      reset();
      if (!canAnimate()) { change(); return; }
      const old = image.cloneNode();
      old.removeAttribute('id');
      old.className = 'rg-flight';
      old.alt = '';
      old.setAttribute('aria-hidden', 'true');
      dialog.append(old);
      gsap.set(old, { ...imageBounds(), transformOrigin: '50% 50%' });
      flight = old;
      change();
      dialog.dataset.phase = 'switching';
      gsap.set(image, { opacity: 0, x: direction * 44, scale: .985 });
      scene = gsap.timeline({ onComplete: () => { reset(); dialog.dataset.phase = 'open'; } });
      scene.to(old, { opacity: 0, x: `-=${direction * 44}`, scale: .985, duration: .28, ease: 'power2.in' }, 0)
        .to(image, { opacity: 1, x: 0, scale: 1, duration: .46, ease: 'power3.out' }, .08);
    };

    const filter = change => {
      settleLayout();
      if (!canAnimate()) { change(); positionTab(false); return; }
      const state = Flip.getState(cards);
      change();
      positionTab(true);
      gallery.dataset.filtering = 'true';
      rearrange = Flip.from(state, {
        duration: .62, ease: 'power3.inOut', scale: true, prune: true,
        onEnter: elements => gsap.fromTo(elements, { opacity: 0 }, { opacity: 1, duration: .4, clearProps: 'opacity' }),
        onComplete: () => { clear(cards); rearrange = null; delete gallery.dataset.filtering; }
      });
    };

    const settle = () => {
      const closing = dialog.dataset.phase === 'closing';
      reset();
      settleLayout();
      positionTab(false);
      if (closing) dialog.close();
    };
    on(window, 'resize', settle);
    on(document, 'visibilitychange', () => { if (document.hidden) settle(); });
    on(reducedMotion, 'change', settle);
    const visibleCards = cards.filter(card => {
      const rect = card.getBoundingClientRect();
      return rect.width && rect.top < innerHeight && rect.left < innerWidth && rect.right > 0;
    });
    if (canAnimate() && !dialog.open) entrance = gsap.from(visibleCards, {
      y: '+=22', opacity: 0, duration: .64, stagger: .035, ease: 'power3.out', clearProps: 'transform,opacity'
    });
    const destroy = () => {
      controller.abort();
      reset();
      settleLayout();
      gsap.killTweensOf(filters);
      filters.style.removeProperty('--rg-tab-x');
      filters.style.removeProperty('--rg-tab-width');
      counter.remove();
      dialog.classList.remove('rg-viewer');
      delete gallery.dataset.motion;
    };
    return { open, close, step, filter, reset, destroy };
  };
})();
