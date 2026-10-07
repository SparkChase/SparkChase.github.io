/* Finite portrait/title entrance. No continuous loop, pointer tracking or hidden default. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set();
  let generation = 0;
  const stop = () => {
    generation++;
    running.forEach(animation => animation.cancel());
    running.clear();
  };
  const animate = (element, frames, options) => {
    if (!element?.animate || reduced.matches || document.hidden) return;
    const animation = element.animate(frames, {easing: 'cubic-bezier(.16,1,.3,1)', ...options});
    running.add(animation);
    animation.finished.catch(() => {}).finally(() => running.delete(animation));
  };
  const init = () => {
    const hero = document.querySelector('.rikka-portrait-home');
    if (!hero || hero.dataset.portraitReady) return;
    hero.dataset.portraitReady = 'true';
    const token = generation;
    hero.querySelectorAll('[data-rp-enter]').forEach((element, index) => {
      animate(element, [
        {opacity: .15, transform: 'translateY(18px)', filter: 'blur(5px)'},
        {opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)'}
      ], {duration: 640, delay: index * 65, fill: 'backwards'});
    });
    const portrait = hero.querySelector('.rp-portrait');
    const image = portrait?.querySelector('img');
    if (!image) return;
    const reveal = () => {
      if (token !== generation || !hero.isConnected) return;
      if (!image.naturalWidth) {
        portrait.classList.add('is-unavailable');
        return;
      }
      animate(portrait, [
        {opacity: .25, transform: 'translateX(24px)'},
        {opacity: 1, transform: 'translateX(0)'}
      ], {duration: 820});
    };
    if (image.complete) reveal();
    else {
      image.addEventListener('load', reveal, {once: true});
      image.addEventListener('error', () => portrait.classList.add('is-unavailable'), {once: true});
    }
  };
  document.addEventListener('pjax:send', stop);
  document.addEventListener('pjax:complete', init);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
