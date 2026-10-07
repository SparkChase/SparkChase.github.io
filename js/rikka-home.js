(() => {
  const home = document.querySelector('.rikka-home');
  if (!home) return;
  const clock = home.querySelector('#rh-time');
  const date = home.querySelector('#rh-date');
  const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false });
  const dateFormat = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'long', day: 'numeric', weekday: 'long' });
  const update = () => { const now = new Date(); clock.textContent = timeFormat.format(now); date.textContent = dateFormat.format(now); date.dateTime = now.toISOString(); };
  update();
  const timer = setInterval(() => { if (!document.hidden) update(); }, 1000 * 15);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  const button = home.querySelector('#rh-wallpaper');
  const content = home.querySelector('#rh-content');
  function showWallpaper(show) {
    document.body.classList.toggle('rh-wallpaper-only', show);
    content.inert = show;
    button.setAttribute('aria-pressed', String(show));
    button.innerHTML = show ? '返回主页 <span aria-hidden="true">↩</span>' : '欣赏壁纸 <span aria-hidden="true">⛶</span>';
  }
  button.addEventListener('click', () => showWallpaper(button.getAttribute('aria-pressed') !== 'true'));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') showWallpaper(false); });
})();
