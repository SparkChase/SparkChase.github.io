'use strict'
// page-agent 的面板由其 demo 脚本运行时动态挂载（#page-agent-runtime_agent-panel）。
// 本文件做三件事：
// 1. 用 CSS 把面板挪到左下角（右下角被音乐播放器和右侧工具栏占用）；
// 2. 在面板下方显示"测试中"标注，并跟随面板位置与展开状态；
// 3. 监听 agent 的 statuschange，在任务完成/出错时弹出全尺寸阅读卡片展示结果，
//    避免读者只能盯着面板里的小字历史卡片。
;(function () {
  var PANEL_ID = 'page-agent-runtime_agent-panel'
  var GAP = 8
  var shown = false
  var lastBottomKey = ''
  var lastResultRef = null

  var style = document.createElement('style')
  style.textContent = [
    /* 面板挪到左下角；demo 脚本用内联 style 写 transform，所以必须 !important */
    '#page-agent-runtime_agent-panel {',
    '  left: 20px !important;',
    '  right: auto !important;',
    '  bottom: 88px !important;',
    '  transform: translateY(0) !important;',
    '}',
    '@media (min-width: 481px) {',
    '  #page-agent-runtime_agent-panel { --width: 400px; }',
    '}',
    '#page-agent-runtime_agent-panel [class*="_historyContent_"] { line-height: 1.65; }',
    /* 阅读卡片 */
    '.ra-result-overlay {',
    '  position: fixed; inset: 0; z-index: 2147483644;',
    '  background: rgba(0,0,0,0.45);',
    '  display: flex; align-items: center; justify-content: center;',
    '  padding: 24px;',
    '}',
    '.ra-result-overlay[hidden] { display: none; }',
    '.ra-result-card {',
    '  width: min(720px, 100%);',
    '  max-height: 72vh; display: flex; flex-direction: column;',
    '  background: rgba(24,26,34,0.94); color: #e8eaf0;',
    '  border: 1px solid rgba(255,255,255,0.12); border-radius: 14px;',
    '  box-shadow: 0 12px 48px rgba(0,0,0,0.4);',
    '  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);',
    '  animation: ra-result-in 0.2s ease-out;',
    '}',
    '@keyframes ra-result-in { from { opacity: 0; transform: translateY(10px) scale(0.98); } }',
    '.ra-result-head {',
    '  display: flex; align-items: center; justify-content: space-between;',
    '  padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.08);',
    '  flex-shrink: 0;',
    '}',
    '.ra-result-title { font-size: 15px; font-weight: 600; }',
    '.ra-result-close {',
    '  border: none; cursor: pointer; color: #9aa0ae; background: transparent;',
    '  font-size: 16px; line-height: 1; padding: 4px 6px; border-radius: 6px;',
    '}',
    '.ra-result-close:hover { color: #fff; background: rgba(255,255,255,0.08); }',
    '.ra-result-body {',
    '  padding: 16px 18px; overflow-y: auto;',
    '  font-size: 15px; line-height: 1.8;',
    '}',
    '.ra-result-body code {',
    '  background: rgba(255,255,255,0.1); border-radius: 4px;',
    '  padding: 1px 5px; font-size: 0.9em;',
    '}',
    '.ra-result-body a { color: #7db4ff; }',
    '.ra-result-body .ra-result-raw {',
    '  margin-top: 10px; font-size: 12px; color: #9aa0ae;',
    '  word-break: break-all;',
    '}',
    '.ra-result-foot {',
    '  padding: 10px 18px; border-top: 1px solid rgba(255,255,255,0.08);',
    '  font-size: 12px; color: #9aa0ae; flex-shrink: 0;',
    '}'
  ].join('\n')

  var badge = document.createElement('div')
  badge.textContent = '🤖 AI 助手测试中，不保证效果'
  badge.style.cssText = [
    'position:fixed',
    'left:50%',
    'transform:translateX(-50%)',
    'z-index:2147483643',
    'padding:3px 10px',
    'border-radius:999px',
    'background:rgba(0,0,0,0.55)',
    'color:#fff',
    'font-size:12px',
    'line-height:18px',
    'letter-spacing:0.5px',
    'pointer-events:none',
    'backdrop-filter:blur(6px)',
    '-webkit-backdrop-filter:blur(6px)',
    'white-space:nowrap',
    'display:none'
  ].join(';')

  function init() {
    if (document.head) document.head.appendChild(style)
    if (document.body) document.body.appendChild(badge)
  }

  // 面板展开时输入框和历史区溢出在 wrapper 盒子之外，取面板及直接子元素的最大底边
  function panelRect() {
    var panel = document.getElementById(PANEL_ID)
    if (!panel) return null
    var r = panel.getBoundingClientRect()
    var bottom = r.bottom
    for (var i = 0; i < panel.children.length; i++) {
      var b = panel.children[i].getBoundingClientRect().bottom
      if (b > bottom) bottom = b
    }
    return { left: r.left, width: r.width, bottom: bottom }
  }

  function sync() {
    var rect = panelRect()
    var present = !!rect
    if (!present) {
      if (shown) {
        shown = false
        badge.style.display = 'none'
        lastBottomKey = ''
      }
      return
    }
    if (!shown) {
      shown = true
      badge.style.display = 'block'
    }
    var bottom = Math.round(rect.bottom)
    var left = Math.round(rect.left + rect.width / 2)
    var key = bottom + 'x' + left
    if (key === lastBottomKey) return
    lastBottomKey = key
    badge.style.left = left + 'px'
    var offset = window.innerHeight - bottom - GAP
    if (offset > 0) badge.style.bottom = offset + 'px'
  }

  var observer = new MutationObserver(sync)
  function startObserve() {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    })
    document.addEventListener('transitionend', sync)
    window.addEventListener('resize', sync)
  }

  /* ---------- 阅读卡片 ---------- */

  var overlay = null
  var els = {}

  function ensureOverlay() {
    if (overlay) return
    overlay = document.createElement('div')
    overlay.className = 'ra-result-overlay'
    overlay.hidden = true
    // 防止 agent 把自己的结果卡片当成页面内容读进去
    overlay.setAttribute('data-page-agent-ignore', 'true')
    overlay.setAttribute('data-browser-use-ignore', 'true')
    overlay.innerHTML =
      '<div class="ra-result-card" role="dialog" aria-modal="true">' +
      '<div class="ra-result-head"><span class="ra-result-title"></span>' +
      '<button class="ra-result-close" aria-label="关闭">✕</button></div>' +
      '<div class="ra-result-body"></div>' +
      '<div class="ra-result-foot">AI 生成内容，仅供参考 · page-agent Demo 模式</div>' +
      '</div>'
    document.body.appendChild(overlay)
    els.title = overlay.querySelector('.ra-result-title')
    els.body = overlay.querySelector('.ra-result-body')
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeResult()
    })
    overlay.querySelector('.ra-result-close').addEventListener('click', closeResult)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) closeResult()
    })
  }

  function openResult(title, bodyHtml) {
    ensureOverlay()
    els.title.textContent = title
    els.body.innerHTML = bodyHtml
    overlay.hidden = false
  }

  function closeResult() {
    if (overlay) overlay.hidden = true
  }

  function safeHref(url) {
    return /^(https?:|mailto:|#|\/)/i.test(url) ? url : '#'
  }

  // 极简 markdown：粗体、行内代码、链接、列表符号、换行
  function renderText(text) {
    var s = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, label, href) {
      return '<a href="' + safeHref(href) + '" target="_blank" rel="noopener noreferrer">' + label + '</a>'
    })
    s = s.replace(/^- (.*)$/gm, '&bull; $1')
    return s.replace(/\n/g, '<br>')
  }

  function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function showAgentResult(result, status) {
    var data = result && typeof result.data === 'string' ? result.data : ''
    if (status === 'completed' && result && result.success) {
      openResult('🤖 AI 助手的结果', renderText(data || '（模型没有返回内容）'))
      return
    }
    // 出错：给访客看得懂的说明
    if (/413|payload too large/i.test(data)) {
      openResult(
        '🤖 这篇文章太长了',
        '演示模型端点处理不了这么长的页面（请求体超限）。' +
          '可以换一篇短一些的文章试试；等博主接入自己的模型后就不会有这个限制啦。' +
          '<div class="ra-result-raw">' + escapeHtml(data) + '</div>'
      )
      return
    }
    openResult(
      '🤖 AI 助手出了点问题',
      '任务没有完成，可以重新试一次。' +
        '<div class="ra-result-raw">' + escapeHtml(data || status) + '</div>'
    )
  }

  /* ---------- 挂接 agent 实例 ---------- */

  function onStatusChange() {
    var agent = window.pageAgent
    if (!agent) return
    var status = agent.status
    if (status !== 'completed' && status !== 'error') return
    var result = agent.lastResult
    if (!result || result === lastResultRef) return
    lastResultRef = result
    showAgentResult(result, status)
  }

  function attach(agent) {
    if (!agent || agent.__rikkaHooked) return
    try {
      agent.__rikkaHooked = true
    } catch (e) {
      return
    }
    agent.addEventListener('statuschange', onStatusChange)
  }

  // demo 脚本每次整页加载都会重新给 window.pageAgent 赋值，用 setter 自动挂接新实例
  try {
    var hookedAgent = window.pageAgent
    Object.defineProperty(window, 'pageAgent', {
      configurable: true,
      get: function () {
        return hookedAgent
      },
      set: function (v) {
        hookedAgent = v
        lastResultRef = null
        attach(v)
      }
    })
  } catch (e) { /* 定义失败时退回轮询前的静态挂接 */ }
  if (window.pageAgent) attach(window.pageAgent)

  // PJAX 换页时收起结果卡片
  document.addEventListener('pjax:complete', closeResult)

  /* ---------- 启动 ---------- */

  function start() {
    init()
    startObserve()
    sync()
  }
  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start)
})()
