(() => {
  // Hexo can replace the page through PJAX; initialize once per actual surface.
  const init = () => {
    const gallery = document.querySelector('.rikka-gallery');
    const dialog = document.querySelector('.rg-dialog');
    if (!gallery || !dialog || gallery.dataset.ready) return;
    gallery.dataset.ready = 'true';
    const cards = [...gallery.querySelectorAll('.rg-artwork')];
    const filters = gallery.querySelector('.rg-filters');
    const collection = gallery.querySelector('.rg-collection');
    const status = gallery.querySelector('.rg-status');
    const image = dialog.querySelector('.rg-full-image');
    const download = dialog.querySelector('.rg-download');
    let current = null;
    let returnFocus = null;
    const visibleLinks = () => cards.filter(card => !card.hidden).map(card => card.querySelector('[data-rg-preview]'));

    filters.hidden = false;
    filters.addEventListener('click', event => {
      const button = event.target.closest('[data-rg-filter]');
      if (!button) return;
      const format = button.dataset.rgFilter;
      filters.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      cards.forEach(card => { card.hidden = format !== 'all' && card.dataset.format !== format; });
      collection.dataset.filter = format;
      status.textContent = `正在展示 ${visibleLinks().length} 张${({ all: '图片', desktop: '横屏壁纸', mobile: '竖屏壁纸', meme: '表情包', cute: '可爱图片' })[format]}。点击图片可放大查看。`;
    });

    function show(link) {
      current = link;
      image.src = window.matchMedia('(prefers-reduced-motion: reduce)').matches && link.dataset.poster ? link.dataset.poster : link.href;
      image.alt = link.dataset.title;
      dialog.querySelector('#rg-dialog-title').textContent = link.dataset.title;
      dialog.querySelector('#rg-dialog-size').textContent = link.dataset.size;
      download.href = link.href;
      download.download = link.closest('.rg-artwork').querySelector('[download]').download;
      dialog.querySelectorAll('[data-rg-step]').forEach(button => { button.disabled = visibleLinks().length < 2; });
    }

    gallery.addEventListener('click', event => {
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
    dialog.addEventListener('click', event => {
      if (event.target.closest('.rg-close')) dialog.close();
      const button = event.target.closest('[data-rg-step]');
      if (button) step(Number(button.dataset.rgStep));
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      }
    });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    });
    dialog.addEventListener('close', () => { image.removeAttribute('src'); if (returnFocus?.isConnected) returnFocus.focus(); });
    image.addEventListener('error', () => {
      dialog.querySelector('#rg-dialog-size').textContent = '图片暂时无法加载，请关闭预览后重试。';
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  document.addEventListener('pjax:complete', init);
})();
