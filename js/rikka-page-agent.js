'use strict'
// page-agent demo 脚本会在 window.pageAgent 上挂 agent 实例（showPanel=false，自带面板不显示，
// 这里再 panel.dispose() 彻底移除），本文件用自建聊天 UI 驱动它：
// 左下角启动气泡 + 对话窗口，markdown 结果渲染（marked + DOMPurify），任务可中途停止。
// 整个 UI 带 data-page-agent-ignore，避免 agent 把自己的对话当成页面内容读进去。
;(function () {
  var AGENT_ID = 'page-agent-runtime_agent-panel'

  /* ---------- 样式 ---------- */

  var style = document.createElement('style')
  style.textContent = [
    '.ra-launcher {',
    '  position: fixed; left: 20px; bottom: 88px; z-index: 2147483640;',
    '  width: 48px; height: 48px; border-radius: 50%; border: none; cursor: pointer;',
    '  background: linear-gradient(135deg, rgb(57,182,255), rgb(189,69,251));',
    '  box-shadow: 0 4px 20px rgba(90, 80, 255, 0.35);',
    '  font-size: 22px; display: flex; align-items: center; justify-content: center;',
    '  transition: transform 0.15s ease;',
    '}',
    '.ra-launcher:hover { transform: scale(1.08); }',
    '.ra-launcher.ra-unread::after {',
    '  content: ""; position: absolute; top: 2px; right: 2px; width: 10px; height: 10px;',
    '  border-radius: 50%; background: #ff5751; border: 2px solid rgba(24,26,34,0.9);',
    '}',
    '.ra-launcher-label {',
    '  position: fixed; left: 78px; bottom: 100px; z-index: 2147483639;',
    '  padding: 3px 10px; border-radius: 999px; background: rgba(0,0,0,0.55); color: #fff;',
    '  font-size: 12px; line-height: 18px; letter-spacing: 0.5px; pointer-events: none;',
    '  backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); white-space: nowrap;',
    '}',
    '.ra-widget {',
    '  position: fixed; left: 20px; bottom: 148px; z-index: 2147483641;',
    '  width: min(400px, calc(100vw - 40px)); height: min(560px, 72vh);',
    '  display: flex; flex-direction: column;',
    '  background: rgba(24,26,34,0.96); color: #e8eaf0;',
    '  border: 1px solid rgba(255,255,255,0.12); border-radius: 16px;',
    '  box-shadow: 0 16px 60px rgba(0,0,0,0.45);',
    '  backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);',
    '  overflow: hidden;',
    '}',
    '.ra-widget[hidden] { display: none; }',
    '.ra-head {',
    '  display: flex; align-items: center; gap: 8px; padding: 12px 14px; flex-shrink: 0;',
    '  border-bottom: 1px solid rgba(255,255,255,0.08);',
    '}',
    '.ra-head-title { font-weight: 600; font-size: 14px; }',
    '.ra-chip {',
    '  font-size: 11px; padding: 2px 8px; border-radius: 999px;',
    '  background: rgba(189,69,251,0.18); color: #d9b8ff; border: 1px solid rgba(189,69,251,0.35);',
    '}',
    '.ra-min {',
    '  margin-left: auto; border: none; cursor: pointer; color: #9aa0ae; background: transparent;',
    '  font-size: 15px; line-height: 1; padding: 4px 8px; border-radius: 6px;',
    '}',
    '.ra-min:hover { color: #fff; background: rgba(255,255,255,0.08); }',
    '.ra-msgs { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }',
    '.ra-msg { max-width: 88%; padding: 10px 12px; border-radius: 12px; font-size: 14px; line-height: 1.7; word-break: break-word; }',
    '.ra-msg.user {',
    '  align-self: flex-end; color: #fff; border-bottom-right-radius: 4px;',
    '  background: linear-gradient(135deg, rgb(57,182,255), rgb(189,69,251));',
    '}',
    '.ra-msg.bot {',
    '  align-self: flex-start; background: rgba(255,255,255,0.07);',
    '  border: 1px solid rgba(255,255,255,0.08); border-bottom-left-radius: 4px;',
    '}',
    '.ra-msg.bot :is(h1,h2,h3,h4,h5) { font-size: 14px; margin: 10px 0 4px; }',
    '.ra-msg.bot :is(p,ul,ol,pre,table,blockquote) { margin: 0 0 8px; }',
    '.ra-msg.bot :is(p,ul,ol):last-child { margin-bottom: 0; }',
    '.ra-msg.bot ul, .ra-msg.bot ol { padding-left: 18px; }',
    '.ra-msg.bot pre { background: rgba(0,0,0,0.35); padding: 10px; border-radius: 8px; overflow-x: auto; }',
    '.ra-msg.bot pre code { background: none; padding: 0; }',
    '.ra-msg.bot code { background: rgba(255,255,255,0.1); border-radius: 4px; padding: 1px 5px; font-size: 0.9em; }',
    '.ra-msg.bot table { border-collapse: collapse; font-size: 13px; }',
    '.ra-msg.bot :is(td,th) { border: 1px solid rgba(255,255,255,0.15); padding: 4px 8px; }',
    '.ra-msg.bot img { max-width: 100%; border-radius: 8px; }',
    '.ra-msg.bot a { color: #7db4ff; }',
    '.ra-msg.bot blockquote { border-left: 3px solid rgba(255,255,255,0.2); margin-left: 0; padding-left: 10px; color: #b8bdc9; }',
    '.ra-msg.raw { color: #b8bdc9; }',
    '.ra-msg.raw .ra-raw-detail { margin-top: 8px; font-size: 12px; color: #8a90a0; word-break: break-all; }',
    '.ra-status { align-self: flex-start; font-size: 12.5px; color: #9aa0ae; padding: 0 4px; }',
    '.ra-status:empty { display: none; }',
    '.ra-inputbar { display: flex; gap: 8px; padding: 10px; border-top: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }',
    '.ra-input {',
    '  flex: 1; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);',
    '  color: #e8eaf0; border-radius: 10px; padding: 9px 12px; font-size: 13.5px; outline: none;',
    '  min-width: 0;',
    '}',
    '.ra-input:focus { border-color: rgba(124,108,255,0.6); }',
    '.ra-input:disabled { opacity: 0.5; }',
    '.ra-send {',
    '  border: none; border-radius: 10px; padding: 0 14px; cursor: pointer; font-size: 13px;',
    '  background: linear-gradient(135deg, rgb(57,182,255), rgb(189,69,251)); color: #fff;',
    '  flex-shrink: 0;',
    '}',
    '.ra-send:disabled { opacity: 0.45; cursor: default; }',
    '.ra-send.stop { background: rgba(255,87,51,0.85); }',
    '.ra-foot { padding: 6px 12px 9px; font-size: 11px; color: #8a90a0; text-align: center; flex-shrink: 0; }',
    /* 序号调试徽章兜底隐藏（正常应在源头关闭） */
    '#playwright-highlight-container { display: none !important; }',
    '@media (max-width: 480px) {',
    '  .ra-widget { left: 16px; bottom: 148px; width: calc(100vw - 32px); }',
    '}'
  ].join('\n')

  /* ---------- DOM ---------- */

  var launcher, label, widget, msgs, statusEl, input, sendBtn

  function el(tag, cls, text) {
    var e = document.createElement(tag)
    if (cls) e.className = cls
    if (text != null) e.textContent = text
    return e
  }

  function md(text) {
    var html
    if (window.marked && window.DOMPurify) {
      try {
        html = window.DOMPurify.sanitize(window.marked.parse(String(text), { breaks: true, gfm: true }))
      } catch (e) {
        html = null
      }
    }
    if (html == null) {
      // 渲染库缺失时的兜底：转义后仅处理加粗和换行
      html = String(text)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>')
    }
    var div = el('div', 'ra-msg bot')
    div.innerHTML = html
    return div
  }

  function escapeHtml(text) {
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  function addMsg(node) {
    msgs.appendChild(node)
    msgs.scrollTop = msgs.scrollHeight
    return node
  }

  function addUserMsg(text) {
    addMsg(el('div', 'ra-msg user', text))
  }

  function addBotHtml(html, cls) {
    var div = el('div', 'ra-msg bot' + (cls ? ' ' + cls : ''))
    div.innerHTML = html
    return addMsg(div)
  }

  function setStatus(text) {
    statusEl.textContent = text || ''
  }

  var ACTIVITY_TEXT = {
    click_element_by_index: '正在点击页面元素…',
    input_text: '正在输入内容…',
    select_dropdown_option: '正在选择下拉选项…',
    scroll: '正在滚动页面…',
    scroll_horizontally: '正在滚动页面…',
    wait: '等待页面加载…',
    execute_javascript: '正在执行页面脚本…'
  }

  function activityText(a) {
    if (!a) return ''
    switch (a.type) {
      case 'thinking': return '正在思考…'
      case 'executing': return ACTIVITY_TEXT[a.tool] || '正在操作页面…'
      case 'retrying': return '模型调用失败，自动重试中 (' + a.attempt + '/' + a.maxAttempts + ')…'
      case 'error': return '执行出错：' + a.message
      default: return ''
    }
  }

  function errorHtml(data) {
    var raw = String(data || '未知错误')
    if (/413|payload too large/i.test(raw)) {
      return '这篇文章太长了，演示模型端点处理不了（请求体超限）。' +
        '可以换一篇短一些的文章试试；等博主接入自己的模型后就不会有这个限制啦。' +
        '<div class="ra-raw-detail">' + escapeHtml(raw) + '</div>'
    }
    return '任务没有完成，可以重新试一次。' +
      '<div class="ra-raw-detail">' + escapeHtml(raw) + '</div>'
  }

  /* ---------- 状态与任务流 ---------- */

  var state = { running: false, awaitingAnswer: false, askDeferred: null }

  function setRunning(running, awaiting) {
    state.running = running
    state.awaitingAnswer = !!awaiting
    input.disabled = running && !awaiting
    sendBtn.disabled = false
    if (running && !awaiting) {
      sendBtn.textContent = '停止'
      sendBtn.classList.add('stop')
    } else {
      sendBtn.textContent = '发送'
      sendBtn.classList.remove('stop')
    }
  }

  function runTask(text) {
    if (!window.pageAgent || typeof window.pageAgent.execute !== 'function') {
      addBotHtml('AI 助手还没加载好，稍等一下再试吧。', 'raw')
      return
    }
    setRunning(true)
    setStatus('正在思考…')
    // 兜底：万一 agent 仍滚动了页面，任务结束后把读者送回原位
    var savedScroll = { x: window.scrollX, y: window.scrollY }
    window.pageAgent.execute(text).then(function (result) {
      if (result && result.success) {
        addMsg(md(result.data || '（模型没有返回内容）'))
      } else {
        addBotHtml(errorHtml(result && result.data), 'raw')
      }
    }).catch(function (e) {
      addBotHtml(errorHtml(e && (e.message || String(e))), 'raw')
    }).then(function () {
      window.scrollTo(savedScroll.x, savedScroll.y)
      setRunning(false)
      setStatus('')
      if (!widget.hidden) input.focus()
    })
  }

  function stopTask() {
    if (state.askDeferred) {
      var d = state.askDeferred
      state.askDeferred = null
      d.reject(new Error('已停止'))
    }
    if (window.pageAgent && window.pageAgent.stop) window.pageAgent.stop()
  }

  function onSend() {
    var text = input.value.trim()
    if (!text) return
    if (state.running && !state.awaitingAnswer) {
      stopTask()
      return
    }
    input.value = ''
    addUserMsg(text)
    if (state.askDeferred) {
      var d = state.askDeferred
      state.askDeferred = null
      setRunning(true)
      d.resolve(text)
      return
    }
    runTask(text)
  }

  function askUser(question) {
    return new Promise(function (resolve, reject) {
      addMsg(md(question))
      setStatus('等待你的回答…')
      state.askDeferred = { resolve: resolve, reject: reject }
      setRunning(true, true)
      input.focus()
    })
  }

  /* ---------- agent 挂接 ---------- */

  // 读者可能正在阅读：让 agent 尽量安静（不滚动、不点击、无高亮遮罩）
  var QUIET_SYSTEM_INSTRUCTIONS = [
    '读者可能正在阅读当前页面，请保持页面安静：',
    '1) 页面全文已在当前状态中（包括视口外的部分），总结/查找/问答类任务直接基于全文回答，不要滚动页面；',
    '2) 仅当用户的任务明确要求操作页面（如点击某个按钮、填写表单）时才执行对应动作，否则不要点击任何链接或按钮、不要提交任何内容；',
    '3) 回答使用用户使用的语言，保持简洁。'
  ].join('\n')

  function makeQuiet(agent) {
    try {
      var pc = agent.pageController
      if (pc) {
        pc.config = pc.config || {}
        // 整页文本一次性可见，agent 读全文无需滚动页面（不抢读者视口）
        pc.config.viewportExpansion = -1
        pc.config.enableMask = false
        // 序号徽章无法从配置关闭（getFlatTree 写死 doHighlightElements:true），
        // 靠样式表隐藏 #playwright-highlight-container，这里只清一次存留
        if (pc.cleanUpHighlights) pc.cleanUpHighlights()
        if (pc.showMask) pc.showMask = function () {} // 覆盖实例方法，动作不再闪高亮
        if (pc.mask && pc.mask.hide) pc.mask.hide()
      }
      agent.config = agent.config || {}
      agent.config.instructions = { system: QUIET_SYSTEM_INSTRUCTIONS }
    } catch (e) { /* 属性不可写时保持默认行为 */ }
  }

  function attach(agent) {
    if (!agent || agent.__rikkaHooked) return
    try {
      agent.__rikkaHooked = true
    } catch (e) {
      return
    }
    // 丢弃自带面板（只拆 UI，不影响 agent 本体），避免它和自建界面并存
    try {
      if (agent.panel && agent.panel.dispose) agent.panel.dispose()
    } catch (e) { /* 面板不存在时忽略 */ }
    makeQuiet(agent)
    agent.onAskUser = askUser
    agent.addEventListener('activity', function (e) {
      if (state.running && !state.awaitingAnswer) setStatus(activityText(e.detail))
    })
    agent.addEventListener('statuschange', function () {
      if (state.askDeferred) return
      var s = agent.status
      if (s === 'running') setRunning(true)
      if (s === 'completed' || s === 'error' || s === 'stopped') setRunning(false)
      if ((s === 'completed' || s === 'error') && widget.hidden) launcher.classList.add('ra-unread')
    })
  }

  try {
    var hookedAgent = window.pageAgent
    Object.defineProperty(window, 'pageAgent', {
      configurable: true,
      get: function () {
        return hookedAgent
      },
      set: function (v) {
        hookedAgent = v
        attach(v)
      }
    })
  } catch (e) { /* 无法拦截时退回静态挂接 */ }
  if (window.pageAgent) attach(window.pageAgent)

  /* ---------- 构建 UI ---------- */

  function build() {
    document.head.appendChild(style)

    label = el('div', 'ra-launcher-label', '🤖 AI 助手 · 测试中，不保证效果')
    document.body.appendChild(label)

    launcher = el('button', 'ra-launcher', '🤖')
    launcher.setAttribute('aria-label', '打开 AI 助手')
    launcher.addEventListener('click', function () {
      widget.hidden = !widget.hidden
      launcher.classList.remove('ra-unread')
      if (!widget.hidden) {
        msgs.scrollTop = msgs.scrollHeight
        input.focus()
      }
    })
    document.body.appendChild(launcher)

    widget = el('div', 'ra-widget')
    widget.hidden = true
    // 防止 agent 把自己的对话 UI 当成页面内容
    widget.setAttribute('data-page-agent-ignore', 'true')
    widget.setAttribute('data-browser-use-ignore', 'true')

    var head = el('div', 'ra-head')
    head.appendChild(el('span', 'ra-head-title', 'AI 助手'))
    head.appendChild(el('span', 'ra-chip', '测试中'))
    var minBtn = el('button', 'ra-min', '—')
    minBtn.setAttribute('aria-label', '收起')
    minBtn.addEventListener('click', function () {
      widget.hidden = true
    })
    head.appendChild(minBtn)
    widget.appendChild(head)

    msgs = el('div', 'ra-msgs')
    widget.appendChild(msgs)

    addBotHtml('你好，我是这个页面里的 AI 助手 🤖<br>可以让我「总结这篇文章」或者「找一下页面里的某个东西」。实验功能，效果不保证，输入不会离开你的浏览器以外的用途（只会发给我背后的演示模型）。')

    statusEl = el('div', 'ra-status')
    widget.appendChild(statusEl)

    var bar = el('div', 'ra-inputbar')
    input = el('input', 'ra-input')
    input.type = 'text'
    input.maxLength = 1000
    input.placeholder = '输入任务，回车发送'
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) onSend()
    })
    sendBtn = el('button', 'ra-send', '发送')
    sendBtn.addEventListener('click', onSend)
    bar.appendChild(input)
    bar.appendChild(sendBtn)
    widget.appendChild(bar)

    widget.appendChild(el('div', 'ra-foot', 'AI 生成内容，仅供参考 · page-agent Demo 模式'))
    document.body.appendChild(widget)
  }

  function start() {
    build()
  }
  if (document.body) start()
  else document.addEventListener('DOMContentLoaded', start)
})()
