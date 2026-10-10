/* One APlayer instance lives outside Butterfly's PJAX replacement regions. */
(() => {
  'use strict'
  const init = () => {
    if (window.siteMusic) return
    const root = document.getElementById('global-music')
    if (!root) return
    const config = JSON.parse(document.getElementById('global-music-config').textContent)
    const $ = selector => root.querySelector(selector)
    const panel = $('#gm-panel')
    const expand = $('.gm-expand')
    const status = $('.gm-status')
    const storageKey = 'rikka-site-music-position'
    let position = null
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey))
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        position = { x: Math.max(0, Math.min(1, saved.x)), y: Math.max(0, Math.min(1, saved.y)) }
      }
    } catch (_) { /* Storage may be disabled; dragging still works. */ }
    const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)))
    const viewport = () => {
      const view = window.visualViewport
      const style = getComputedStyle(root)
      return {
        left: (view?.offsetLeft || 0) + parseFloat(style.scrollPaddingLeft),
        top: (view?.offsetTop || 0) + parseFloat(style.scrollPaddingTop),
        right: (view?.offsetLeft || 0) + (view?.width || document.documentElement.clientWidth) - parseFloat(style.scrollPaddingRight),
        bottom: (view?.offsetTop || 0) + (view?.height || innerHeight) - parseFloat(style.scrollPaddingBottom)
      }
    }
    const placePanel = () => {
      if (panel.hidden) return
      const bounds = viewport()
      const anchor = root.getBoundingClientRect()
      panel.style.maxWidth = `${bounds.right - bounds.left}px`
      panel.style.maxHeight = `${bounds.bottom - bounds.top}px`
      const width = panel.offsetWidth
      const height = panel.offsetHeight
      const above = anchor.top - height - 10
      const below = anchor.bottom + 10
      let left = clamp(anchor.right - width, bounds.left, bounds.right - width)
      const top = clamp(above >= bounds.top ? above : below, bounds.top, bounds.bottom - height)
      if (above < bounds.top && below + height > bounds.bottom) {
        if (anchor.left - width - 10 >= bounds.left) left = anchor.left - width - 10
        else if (anchor.right + width + 10 <= bounds.right) left = anchor.right + 10
      }
      panel.style.left = `${left}px`
      panel.style.top = `${top}px`
      // On a short/narrow viewport the panel can cover its anchor. Keep the
      // duplicate entry point from covering controls; the header still closes it.
      root.dataset.overlap = String(left < anchor.right && left + width > anchor.left && top < anchor.bottom && top + height > anchor.top)
    }
    const moveTo = (left, top, persist = false) => {
      const bounds = viewport()
      const maxX = bounds.right - root.offsetWidth
      const maxY = bounds.bottom - root.offsetHeight
      left = clamp(left, bounds.left, maxX)
      top = clamp(top, bounds.top, maxY)
      root.style.left = `${left}px`
      root.style.top = `${top}px`
      root.style.right = 'auto'
      root.style.bottom = 'auto'
      if (persist) {
        position = { x: (left - bounds.left) / Math.max(1, maxX - bounds.left), y: (top - bounds.top) / Math.max(1, maxY - bounds.top) }
        try { localStorage.setItem(storageKey, JSON.stringify(position)) } catch (_) {}
      }
      placePanel()
    }
    const restorePosition = () => {
      const bounds = viewport()
      moveTo(position ? bounds.left + position.x * (bounds.right - bounds.left - root.offsetWidth) : bounds.right - 104,
        position ? bounds.top + position.y * (bounds.bottom - bounds.top - root.offsetHeight) : bounds.bottom - 56)
    }
    const setOpen = open => {
      panel.hidden = !open
      if (!open) delete root.dataset.overlap
      expand.setAttribute('aria-expanded', String(open))
      expand.setAttribute('aria-label', `${open ? '收起' : '打开'}随身听`)
      placePanel()
      if (!open && panel.contains(document.activeElement)) expand.focus()
    }
    let suppressClick = false
    expand.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return }
      setOpen(panel.hidden)
      if (!panel.hidden) $('.gm-close').focus({ preventScroll: true })
    })
    $('.gm-close').addEventListener('click', () => setOpen(false))
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); setOpen(false); expand.focus() }
    })
    for (const handle of [expand, $('.gm-move')]) {
      let drag = null
      handle.addEventListener('pointerdown', event => {
        if (event.button !== 0 || !event.isPrimary) return
        const rect = root.getBoundingClientRect()
        suppressClick = false
        drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false }
        handle.setPointerCapture(event.pointerId)
      })
      handle.addEventListener('pointermove', event => {
        if (!drag || drag.id !== event.pointerId) return
        const dx = event.clientX - drag.x
        const dy = event.clientY - drag.y
        if (!drag.moved && Math.hypot(dx, dy) < 6) return
        drag.moved = true
        root.dataset.dragging = 'true'
        moveTo(drag.left + dx, drag.top + dy)
      })
      const endDrag = event => {
        if (!drag || drag.id !== event.pointerId) return
        if (drag.moved) {
          suppressClick = handle === expand
          const rect = root.getBoundingClientRect()
          moveTo(rect.left, rect.top, true)
        }
        drag = null
        delete root.dataset.dragging
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId)
      }
      handle.addEventListener('pointerup', endDrag)
      handle.addEventListener('pointercancel', endDrag)
      handle.addEventListener('lostpointercapture', endDrag)
      handle.addEventListener('keydown', event => {
        const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
        if (event.key === 'Home') {
          event.preventDefault()
          position = null
          try { localStorage.removeItem(storageKey) } catch (_) {}
          restorePosition()
        } else if (arrows[event.key]) {
          event.preventDefault()
          const rect = root.getBoundingClientRect()
          const step = event.shiftKey ? 48 : 16
          moveTo(rect.left + arrows[event.key][0] * step, rect.top + arrows[event.key][1] * step, true)
        }
        if (event.key === 'Enter' || event.key === ' ') suppressClick = false
      })
    }
    document.addEventListener('pointerdown', event => {
      if (!panel.hidden && !root.contains(event.target)) setOpen(false)
    })
    document.addEventListener('pjax:send', () => setOpen(false))
    window.addEventListener('resize', restorePosition)
    window.visualViewport?.addEventListener('resize', restorePosition)
    window.visualViewport?.addEventListener('scroll', restorePosition)
    new ResizeObserver(placePanel).observe(panel)
    restorePosition()
    let loading = false
    const loadPlaylist = async () => {
      if (loading || window.siteMusic) return
      loading = true
      $('.gm-retry').hidden = true
      status.textContent = '正在加载在线歌单…'
      try {
        const endpoint = new URL(config.playlist.api)
        endpoint.search = new URLSearchParams({ server: config.playlist.server, type: 'playlist', id: config.playlist.id })
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000), credentials: 'omit' })
        if (!response.ok) throw new Error(`Playlist HTTP ${response.status}`)
        const songs = await response.json()
        if (!Array.isArray(songs) || !songs.length) throw new Error('The online playlist is empty or unavailable')
        config.tracks = songs.map(song => {
          // Meting v1 uses title/author/pic; v2-compatible APIs may use name/artist/cover.
          const track = { name: song.name ?? song.title, artist: song.artist ?? song.author,
            url: song.url, cover: song.cover ?? song.pic, lrc: song.lrc }
          if (typeof track.name !== 'string' || typeof track.artist !== 'string') throw new Error('Invalid track metadata')
          for (const key of ['url', 'cover', 'lrc']) {
            if (key !== 'url' && !track[key]) continue
            if (typeof track[key] !== 'string' || new URL(track[key]).protocol !== 'https:') throw new Error(`Invalid track ${key}`)
          }
          return track
        })
      } catch (error) {
        loading = false
        status.textContent = '在线歌单暂时无法加载，请重试，或前往网易云收听。'
        expand.title = '随身听 · 歌单加载失败，点击重试'
        $('.gm-retry').hidden = false
        console.error('Online playlist failed:', error)
        return
      }
      if (typeof APlayer !== 'function') {
        status.textContent = '播放器未能加载，请刷新页面重试。'
        expand.title = '随身听 · 播放器加载失败，请刷新'
        throw new Error('The local APlayer script did not load')
      }
      const player = new APlayer({
        container: $('#gm-aplayer'), audio: config.tracks,
        autoplay: false, preload: 'none', volume: config.volume,
        theme: getComputedStyle(root).getPropertyValue('--gm-accent').trim(), loop: 'all', order: 'list', mutex: true,
        listFolded: false, listMaxHeight: '180px',
        lrcType: config.tracks.some(track => track.lrc) ? 3 : 0,
        storageName: 'rikka-site-music'
      })
      const audio = player.audio
      const playButton = $('.gm-play')
      const seek = $('.gm-seek')
      const volume = $('.gm-volume')
      const trackButtons = [...root.querySelectorAll('.aplayer-list li')]
      const loopLabels = { all: '列表循环', one: '单曲循环', none: '播完停止' }
      let playRequest = 0
      player.container.querySelector('.aplayer-body').after($('.gm-controls'))
      const list = $('.aplayer-list')
      const listToggle = $('.gm-list-toggle')
      list.id = 'gm-playlist'
      list.hidden = true
      list.setAttribute('aria-label', '在线歌单')
      listToggle.disabled = false
      $('.gm-list-label').textContent = `歌单 · ${config.tracks.length} 首`
      listToggle.addEventListener('click', () => {
        list.hidden = !list.hidden
        listToggle.setAttribute('aria-expanded', String(!list.hidden))
        placePanel()
      })
      const clock = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
      const renderTime = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0
        seek.disabled = duration === 0
        seek.max = duration || 100
        seek.value = audio.currentTime
        seek.style.setProperty('--gm-progress', `${duration ? audio.currentTime / duration * 100 : 0}%`)
        seek.setAttribute('aria-valuetext', `${clock(audio.currentTime)}，共 ${clock(duration)}`)
        $('.gm-time').textContent = `${clock(audio.currentTime)} / ${clock(duration)}`
      }
      const render = () => {
        const track = player.list.audios[player.list.index]
        root.dataset.playing = String(!audio.paused)
        expand.title = `${audio.paused ? '随身听' : '正在播放'} · ${track.name} · 点击展开，拖动移位`
        playButton.setAttribute('aria-label', `${audio.paused ? '播放' : '暂停'}《${track.name}》`)
        volume.value = audio.volume * 100
        volume.style.setProperty('--gm-progress', `${audio.volume * 100}%`)
        trackButtons.forEach((button, i) => {
          button.setAttribute('aria-pressed', String(i === player.list.index))
        })
        renderTime()
      }
      const pause = () => { ++playRequest; player.pause(); render() }
      const play = async () => {
        const request = ++playRequest
        try {
          if (audio.error) audio.load()
          await audio.play()
          if (request !== playRequest) return
          status.textContent = `正在播放《${player.list.audios[player.list.index].name}》。`
        } catch (error) {
          if (request !== playRequest) return
          player.pause()
          status.textContent = error.name === 'NotAllowedError'
            ? '浏览器暂停了播放，请再点一次播放按钮。'
            : '这首歌暂时无法播放，请重试或选择其他歌曲。'
          console.error('Music playback failed:', error)
        }
        render()
      }
      const toggle = () => audio.paused ? play() : pause()
      const choose = index => { pause(); player.list.switch(index); render(); play() }
      const skip = offset => choose((player.list.index + offset + config.tracks.length) % config.tracks.length)
      playButton.disabled = false
      playButton.addEventListener('click', toggle)
      for (const [selector, offset] of [['.gm-prev', -1], ['.gm-next', 1]]) {
        $(selector).disabled = config.tracks.length < 2
        $(selector).addEventListener('click', () => skip(offset))
      }
      trackButtons.forEach((button, index) => {
        button.tabIndex = 0
        button.setAttribute('role', 'button')
        button.setAttribute('aria-label', `播放《${config.tracks[index].name}》，${config.tracks[index].artist}`)
        button.addEventListener('click', event => {
          event.stopPropagation()
          index === player.list.index ? toggle() : choose(index)
        })
        button.addEventListener('keydown', event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); button.click() }
        })
      })
      volume.disabled = false
      volume.addEventListener('input', () => player.volume(Number(volume.value) / 100))
      seek.addEventListener('input', () => player.seek(Number(seek.value)))
      $('.gm-loop').disabled = false
      $('.gm-loop').addEventListener('click', () => {
        const modes = Object.keys(loopLabels)
        player.options.loop = modes[(modes.indexOf(player.options.loop) + 1) % modes.length]
        $('.gm-loop').textContent = loopLabels[player.options.loop]
        $('.gm-loop').setAttribute('aria-label', `循环方式：${loopLabels[player.options.loop]}，点击切换`)
      })
      // Report failures and stop. APlayer's default error handler otherwise keeps
      // advancing automatically through a playlist of unavailable files.
      audio.addEventListener('error', event => {
        event.stopImmediatePropagation()
        pause()
        status.textContent = '这首歌暂时无法在线播放，请换一首或前往网易云收听。'
        expand.title = '随身听 · 音频加载失败，请展开换一首'
        console.error('Music resource failed:', audio.currentSrc, audio.error)
      }, { capture: true })
      audio.addEventListener('play', render)
      audio.addEventListener('pause', render)
      audio.addEventListener('volumechange', render)
      audio.addEventListener('timeupdate', renderTime)
      audio.addEventListener('loadedmetadata', renderTime)
      audio.addEventListener('emptied', renderTime)
      // APlayer emits listswitch before updating its current index.
      player.on('listswitch', () => queueMicrotask(() => {
        render()
        status.textContent = `已选择《${player.list.audios[player.list.index].name}》。`
      }))
      window.addEventListener('pagehide', pause)
      window.siteMusic = { player, pause, open: () => setOpen(true) }
      status.textContent = '点击播放，浏览文章时也能继续听。'
      render()
    }
    $('.gm-retry').addEventListener('click', loadPlaylist)
    loadPlaylist()
  }
  // This script precedes APlayer in the HTML, so wait for all deferred scripts.
  if (document.readyState === 'complete') init()
  else document.addEventListener('DOMContentLoaded', init, { once: true })
})()
