/* A finite entrance for the homepage words and About portrait. Visible without JS. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set();
  let generation = 0;
  let coverObserver;
  let portraitObserver;
  let releasePortrait = () => {};
  let resumePortrait = () => {};
  const cancelAnimations = () => {
    running.forEach(animation => animation.cancel());
    running.clear();
  };
  const stop = () => {
    generation++;
    cancelAnimations();
    portraitObserver?.disconnect();
    portraitObserver = null;
    releasePortrait();
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
    const photo = portrait.querySelector('.yp-photo');
    const caption = portrait.querySelector('figcaption');
    let visible = !('IntersectionObserver' in window);
    let started = false;
    releasePortrait = () => {
      image.removeEventListener('load', reveal);
      image.removeEventListener('error', abandon);
      releasePortrait = () => {};
      resumePortrait = () => {};
    };
    const abandon = () => {
      portraitObserver?.disconnect();
      portraitObserver = null;
      releasePortrait();
    };
    const reveal = () => {
      if (started || !visible || document.hidden || reduced.matches || token !== generation || !surface.isConnected || !image.complete || !image.naturalWidth) return;
      started = true;
      abandon();
      animate(portrait, [
        {opacity: 0, transform: 'translateY(32px) rotate(2.4deg) scale(.96)'},
        {opacity: 1, transform: 'translateY(0) rotate(0deg) scale(1)'}
      ], {duration: 1000});
      animate(photo, [
        {clipPath: 'inset(0 0 34% 0)'},
        {clipPath: 'inset(0 0 0% 0)'}
      ], {duration: 1100});
      animate(image, [
        {transform: 'translateY(12px) scale(1.08)'},
        {transform: 'translateY(0) scale(1)'}
      ], {duration: 1200});
      animate(caption, [
        {opacity: 0, transform: 'translateY(8px)'},
        {opacity: 1, transform: 'translateY(0)'}
      ], {duration: 500, delay: 320, fill: 'backwards'});
    };
    resumePortrait = reveal;
    if (reduced.matches) return;
    if ('IntersectionObserver' in window) {
      portraitObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting && entry.intersectionRatio >= .18;
        reveal();
      }, {threshold: .18});
      portraitObserver.observe(portrait);
    }
    image.addEventListener('load', reveal, {once: true});
    image.addEventListener('error', abandon, {once: true});
    reveal();
  };
  document.addEventListener('pjax:send', leave);
  document.addEventListener('pjax:complete', init);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimations();
    else resumePortrait();
  });
  window.addEventListener('pagehide', stop);
  reduced.addEventListener('change', () => { if (reduced.matches) stop(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
