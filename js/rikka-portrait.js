/* A finite entrance for the homepage words and About portrait. Visible without JS. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set();
  let generation = 0;
  let coverObserver;
  const stop = () => {
    generation++;
    running.forEach(animation => animation.cancel());
    running.clear();
  };
  const leave = () => {
    stop();
    coverObserver?.disconnect();
    document.body.classList.remove('rp-on-cover');
  };
  const animate = (element, frames, options) => {
    if (!element?.animate || reduced.matches || document.hidden) return;
    const animation = element.animate(frames, {easing: 'cubic-bezier(.16,1,.3,1)', ...options});
    running.add(animation);
    animation.finished.catch(() => {}).finally(() => running.delete(animation));
  };
  const init = () => {
    const surface = document.querySelector('.rikka-hero, .rikka-profile');
    if (!surface || surface.dataset.entranceReady) return;
    surface.dataset.entranceReady = 'true';
    const cover = surface.closest('#page-header') || surface.querySelector('.yp-hero');
    if (cover && 'IntersectionObserver' in window) {
      coverObserver?.disconnect();
      coverObserver = new IntersectionObserver(([entry]) => {
        document.body.classList.toggle('rp-on-cover', entry.intersectionRatio >= .2);
      }, {threshold: [0, .2]});
      coverObserver.observe(cover);
    }
    const token = generation;
    surface.querySelectorAll('[data-rp-enter]').forEach((element, index) => {
      animate(element, [
        {opacity: .25, transform: 'translateY(12px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 560, delay: index * 65, fill: 'backwards'});
    });
    const portrait = surface.querySelector('[data-rp-portrait]');
    const image = portrait?.querySelector('img');
    if (!image) return;
    const reveal = () => {
      if (token !== generation || !surface.isConnected || !image.naturalWidth) return;
      animate(portrait, [{opacity: .3}, {opacity: 1}], {duration: 680});
    };
    if (image.complete) reveal();
    else image.addEventListener('load', reveal, {once: true});
  };
  document.addEventListener('pjax:send', leave);
  document.addEventListener('pjax:complete', init);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
