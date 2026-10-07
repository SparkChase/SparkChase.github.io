// Bind as soon as the DOM exists; decorative images must not delay search.
const initLocalSearch = () => {
  const mask = document.getElementById('search-mask')
  const input = document.querySelector('#local-search-input input')
  const results = document.getElementById('local-search-results')
  const status = document.getElementById('loading-status')
  if (!mask || !input || !results) return
  let indexPromise, timer, revision = 0
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
  const highlight = (text, keywords) => {
    // Match literal text, including C++, brackets, and other regex characters.
    const pattern = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    return text.split(new RegExp(`(${pattern})`, 'gi')).map((part, i) => i % 2
      ? '<span class="search-keyword">' + escape(part) + '</span>' : escape(part)).join('')
  }
  const loadIndex = () => {
    if (indexPromise) return indexPromise
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    indexPromise = fetch(GLOBAL_CONFIG.localSearch.path, {signal:controller.signal})
      .then(response => { if (!response.ok) throw new Error('Search HTTP ' + response.status); return response.json() })
      .then(data => data.map(item => ({...item, normalizedTitle:item.title.toLowerCase(), normalizedContent:item.content.toLowerCase()})))
      .then(data => {
        const loading = document.getElementById('loading-database')
        if (loading) { if (loading.nextElementSibling) loading.nextElementSibling.style.display = 'block'; loading.remove() }
        return data
      })
      .catch(error => { indexPromise = null; throw error })
      .finally(() => clearTimeout(timeout))
    return indexPromise
  }
  const render = async () => {
    const current = ++revision
    const query = input.value.trim()
    const keywords = query.toLowerCase().split(/\s+/).filter(Boolean)
    results.replaceChildren()
    if (!keywords.length) { if (status) status.textContent = ''; return }
    if (status) status.textContent = '正在搜索…'
    try {
      const data = await loadIndex()
      if (current !== revision) return
      const hits = data.filter(item => keywords.every(k => item.normalizedTitle.includes(k) || item.normalizedContent.includes(k)))
      results.innerHTML = hits.length ? '<div class="search-result-list">' + hits.slice(0,50).map(item => {
        const first = Math.max(0, item.normalizedContent.indexOf(keywords[0]) - 30)
        const excerpt = item.content.slice(first, first + 160)
        return '<div class="local-search__hit-item"><a class="search-result-title" href="' + escape(item.url) + '">' + highlight(item.title, keywords) + '</a><p class="search-result">' + (first ? '…' : '') + highlight(excerpt, keywords) + '</p></div>'
      }).join('') + '</div>' : '<div id="local-search__hits-empty">没有找到：' + escape(query) + '</div>'
      if (status) status.textContent = hits.length > 50 ? `找到 ${hits.length} 篇，显示前 50 篇；可增加关键词缩小范围。` : ''
      window.pjax && window.pjax.refresh(results)
    } catch (error) {
      if (current !== revision) return
      if (status) status.textContent = '搜索加载失败，请重试。'
      const retry = document.createElement('button')
      retry.type = 'button'; retry.textContent = '重新加载搜索'
      retry.addEventListener('click', render)
      results.replaceChildren(retry)
    }
  }
  const close = () => {
    document.body.style.width = ''; document.body.style.overflow = ''
    btf.animateOut(document.querySelector('#local-search .search-dialog'), 'search_close .5s')
    btf.animateOut(mask, 'to_hide .5s')
    document.removeEventListener('keydown', escapeKey)
  }
  const escapeKey = event => { if (event.code === 'Escape') close() }
  const open = () => {
    document.body.style.width = '100%'; document.body.style.overflow = 'hidden'
    btf.animateIn(mask, 'to_show .2s')
    btf.animateIn(document.querySelector('#local-search .search-dialog'), 'titleScale .2s')
    setTimeout(() => input.focus(), 100)
    document.addEventListener('keydown', escapeKey)
    document.querySelector('#local-search .search-wrap').style.display = 'block'
    // Download only on deliberate opening. Catch immediately; typing can retry.
    loadIndex().catch(() => {
      const loading = document.getElementById('loading-database')
      if (loading) loading.style.display = 'none'
      if (status) status.textContent = '索引加载失败，输入关键词或重新打开后重试。'
    })
  }
  const bind = () => document.querySelector('#search-button > .search')?.addEventListener('click', open)
  bind()
  document.querySelector('#local-search .search-close-button')?.addEventListener('click', close)
  mask.addEventListener('click', close)
  input.addEventListener('input', () => { ++revision; clearTimeout(timer); timer = setTimeout(render, 100) })
  document.addEventListener('pjax:complete', bind)
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLocalSearch, {once:true})
else initLocalSearch()
