/* Local synthesis: no playlist API, audio download, or autoplay dependency. */
(() => {
  'use strict'
  if (window.rikkaMusic) { window.rikkaMusic.init(); return }
  const pitches = [72, 74, 76, 77, 79, 81, 83, 84]
  const melodies = [
    { title: '小星星', description: '一闪一闪，熟悉的第一段旋律。', beat: .43,
      notes: [[0,1],[0,1],[4,1],[4,1],[5,1],[5,1],[4,2],[3,1],[3,1],[2,1],[2,1],[1,1],[1,1],[0,2],[4,1],[4,1],[3,1],[3,1],[2,1],[2,1],[1,2],[4,1],[4,1],[3,1],[3,1],[2,1],[2,1],[1,2],[0,1],[0,1],[4,1],[4,1],[5,1],[5,1],[4,2],[3,1],[3,1],[2,1],[2,1],[1,1],[1,1],[0,2]] },
    { title: '欢乐颂', description: '把一点轻快，留给此刻。', beat: .45,
      notes: [[2,1],[2,1],[3,1],[4,1],[4,1],[3,1],[2,1],[1,1],[0,1],[0,1],[1,1],[2,1],[2,1.5],[1,.5],[1,2],[2,1],[2,1],[3,1],[4,1],[4,1],[3,1],[2,1],[1,1],[0,1],[0,1],[1,1],[2,1],[1,1.5],[0,.5],[0,2]] },
    { title: '两只老虎', description: '小时候的旋律，今天再听一遍。', beat: .46,
      notes: [[0,1],[1,1],[2,1],[0,1],[0,1],[1,1],[2,1],[0,1],[2,1],[3,1],[4,2],[2,1],[3,1],[4,2],[4,.5],[5,.5],[4,.5],[3,.5],[2,1],[0,1],[4,.5],[5,.5],[4,.5],[3,.5],[2,1],[0,1],[0,1],[4,1],[0,2],[0,1],[4,1],[0,2]] }
  ].map(track => {
    let duration = 0
    const score = track.notes.map(([key, beats]) => {
      const note = { key, at: duration }
      duration += beats * track.beat
      return note
    })
    return { ...track, score, duration: duration + .8 }
  })
  let cleanup = () => {}
  const init = () => {
    const root = document.querySelector('.rikka-music')
    if (!root || root.dataset.ready) return
    cleanup()
    root.dataset.ready = 'true'
    const $ = selector => root.querySelector(selector)
    const play = $('.rm-play')
    const status = $('.rm-status')
    const keys = [...root.querySelectorAll('[data-rm-note]')]
    const tracks = [...root.querySelectorAll('[data-rm-track]')]
    const AudioEngine = window.AudioContext || window.webkitAudioContext
    const events = new AbortController()
    const listen = (element, name, callback) => element.addEventListener(name, callback, { signal: events.signal })
    let context, master, selected = 0, elapsed = 0, startedAt = 0, playing = false, frame = 0, revision = 0
    const voices = new Set()
    const keyTimers = new Map()
    const clock = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
    const render = () => {
      const track = melodies[selected]
      root.dataset.playing = String(playing)
      $('.rm-play-symbol').textContent = playing ? 'Ⅱ' : '▶'
      $('.rm-play-label').textContent = playing ? '暂停' : '播放'
      play.setAttribute('aria-label', `${playing ? '暂停' : '播放'}${track.title}`)
      $('.rm-timeline progress').max = track.duration
      $('.rm-timeline progress').value = elapsed
      $('.rm-time').textContent = `${clock(elapsed)} / ${clock(track.duration)}`
    }
    const silence = () => {
      voices.forEach(voice => {
        voice.gain.gain.cancelScheduledValues(context.currentTime)
        voice.gain.gain.setTargetAtTime(0, context.currentTime, .006)
        voice.osc.stop(context.currentTime + .035)
      })
      keyTimers.forEach(timer => clearTimeout(timer))
      keyTimers.clear()
      keys.forEach(key => key.classList.remove('is-sounding'))
    }
    const pause = () => {
      revision++
      if (playing) elapsed = Math.min(melodies[selected].duration, Math.max(0, context.currentTime - startedAt))
      playing = false
      cancelAnimationFrame(frame)
      silence()
      render()
    }
    const enableAudio = async () => {
      if (!context) {
        context = new AudioEngine()
        master = context.createGain()
        master.gain.value = Number($('.rm-volume input').value) / 100
        master.connect(context.destination)
        context.addEventListener('statechange', () => {
          if (playing && context.state !== 'running') {
            pause()
            status.textContent = '声音已暂停，点击播放继续。'
          }
        }, { signal: events.signal })
      }
      if (context.state !== 'running') await context.resume()
      if (context.state !== 'running') throw new Error('Audio unavailable')
    }
    const tone = (key, when) => {
      const frequency = 440 * 2 ** ((pitches[key] - 69) / 12)
      // A soft fundamental and two quickly decaying partials suggest metal tines.
      ;[[1, .20, 1.15], [2.76, .035, .34], [5.4, .012, .12]].forEach(([ratio, level, decay]) => {
        const osc = context.createOscillator()
        const gain = context.createGain()
        osc.type = 'sine'
        osc.frequency.value = frequency * ratio
        gain.gain.setValueAtTime(0, when)
        gain.gain.linearRampToValueAtTime(level, when + .007)
        gain.gain.exponentialRampToValueAtTime(.0001, when + decay)
        osc.connect(gain)
        gain.connect(master)
        const voice = { osc, gain }
        voices.add(voice)
        osc.onended = () => { osc.disconnect(); gain.disconnect(); voices.delete(voice) }
        osc.start(when)
        osc.stop(when + decay + .02)
      })
    }
    const tick = () => {
      if (!playing) return
      const track = melodies[selected]
      elapsed = Math.max(0, context.currentTime - startedAt)
      if (elapsed >= track.duration) {
        pause()
        elapsed = track.duration
        render()
        status.textContent = '这一曲结束了。再听一次，或换一首。'
        return
      }
      const current = track.score.findLast(note => note.at <= elapsed)
      keys.forEach((key, index) => key.classList.toggle('is-sounding', Boolean(current && current.key === index && elapsed - current.at < .22)))
      render()
      frame = requestAnimationFrame(tick)
    }
    const start = async () => {
      const request = ++revision
      try {
        await enableAudio()
        if (request !== revision || !root.isConnected) return
        if (elapsed >= melodies[selected].duration) elapsed = 0
        silence()
        startedAt = context.currentTime + .04 - elapsed
        melodies[selected].score.filter(note => note.at >= elapsed).forEach(note => tone(note.key, startedAt + note.at))
        playing = true
        status.textContent = `正在播放《${melodies[selected].title}》。`
        tick()
      } catch {
        if (request !== revision) return
        pause()
        status.textContent = '声音暂时无法启用，请再次点击播放。'
      }
    }
    render()
    if (!AudioEngine) {
      status.textContent = '当前浏览器不支持八音盒播放，请使用新版 Chrome、Safari 或 Firefox。'
      return
    }
    root.querySelectorAll('button, input').forEach(control => { control.disabled = false })
    status.textContent = '选一首小曲，或者试试下面的音键。'
    listen(play, 'click', () => {
      if (playing) { pause(); status.textContent = '已暂停，点击播放继续。' }
      else start()
    })
    listen($('.rm-reset'), 'click', () => { pause(); elapsed = 0; render(); start() })
    tracks.forEach((button, index) => listen(button, 'click', () => {
      pause()
      selected = index
      elapsed = 0
      $('#rm-track-title').textContent = melodies[index].title
      $('#rm-track-description').textContent = melodies[index].description
      tracks.forEach((track, i) => {
        track.setAttribute('aria-pressed', String(i === index))
        track.querySelector('.rm-track-marker').textContent = i === index ? '♪' : '↗'
      })
      render()
      start()
    }))
    listen($('.rm-volume input'), 'input', event => {
      if (master) master.gain.setTargetAtTime(Number(event.target.value) / 100, context.currentTime, .02)
    })
    const strike = async index => {
      if (playing) pause()
      const request = revision
      try {
        await enableAudio()
        if (request !== revision || !root.isConnected) return
        tone(index, context.currentTime)
        keys[index].classList.add('is-sounding')
        clearTimeout(keyTimers.get(index))
        keyTimers.set(index, setTimeout(() => { keys[index].classList.remove('is-sounding'); keyTimers.delete(index) }, 200))
        status.textContent = '自由弹奏中。按下音键，拼出自己的旋律。'
      } catch { status.textContent = '声音暂时无法启用，请再次点按音键。' }
    }
    keys.forEach((key, index) => listen(key, 'click', () => strike(index)))
    listen($('.rm-instrument'), 'keydown', event => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return
      const index = 'asdfghjk'.indexOf(event.key.toLowerCase())
      if (index < 0 || event.key.length !== 1) return
      event.preventDefault()
      strike(index)
    })
    listen(document, 'visibilitychange', () => {
      if (document.hidden) { pause(); status.textContent = '离开页面时已暂停，点击播放继续。' }
    })
    listen(window, 'pagehide', pause)
    cleanup = () => {
      pause()
      events.abort()
      if (context) context.close().catch(() => {})
      delete root.dataset.ready
    }
  }
  window.rikkaMusic = { init }
  document.addEventListener('pjax:send', () => cleanup())
  document.addEventListener('pjax:complete', init)
  init()
})()
