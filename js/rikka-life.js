/* Progressive enhancement: all notes and training entries exist in static HTML. */
(() => {
  'use strict'
  if (window.rikkaLife) { window.rikkaLife.init(); return }
  let cleanup = () => {}
  const init = () => {
    const root = document.querySelector('.rikka-life')
    if (!root || root.dataset.ready) return
    cleanup()
    root.dataset.ready = 'true'
    const events = new AbortController()
    const on = (node, event, callback, options = {}) => node.addEventListener(event, callback, { ...options, signal: events.signal })
    const dialog = document.querySelector('.rl-dialog')
    const reviews = [...root.querySelectorAll('.rl-film-review')]
    const contents = dialog.querySelector('.rl-dialog-body')
    const heading = dialog.querySelector('#rl-dialog-title')
    const previous = dialog.querySelector('[data-life-step="-1"]')
    const next = dialog.querySelector('[data-life-step="1"]')
    const footer = dialog.querySelector('.rl-dialog-foot')
    let current = null, opener = null, ownsHistory = false, frame = 0
    const pageURL = () => location.pathname + location.search
    const restoreFocus = () => {
      if (opener && opener.isConnected) opener.focus({ preventScroll: true })
      opener = null
    }
    const openReview = (index, trigger, updateURL) => {
      if (index < 0 || index >= reviews.length) return
      const review = reviews[index]
      if (trigger) opener = trigger
      if (updateURL) {
        if (dialog.open) history.replaceState(null, '', `${pageURL()}#${review.id}`)
        else { history.pushState(null, '', `${pageURL()}#${review.id}`); ownsHistory = true }
      }
      current = index
      dialog.dataset.view = 'review'
      heading.textContent = review.dataset.title
      contents.replaceChildren(review.querySelector('.rl-reader').cloneNode(true))
      footer.hidden = false
      previous.disabled = index === 0
      next.disabled = index === reviews.length - 1
      dialog.querySelector('.rl-dialog-position').textContent = `${index + 1} / ${reviews.length}`
      if (!dialog.open) dialog.showModal()
      dialog.scrollTop = 0
    }
    const syncHash = () => {
      const index = reviews.findIndex(review => `#${review.id}` === location.hash)
      if (index >= 0) openReview(index, null, false)
      else if (dialog.open && dialog.dataset.view === 'review') {
        ownsHistory = false
        current = null
        dialog.close()
      }
    }
    if (typeof dialog.showModal === 'function') {
      root.querySelectorAll('[data-life-open], [data-life-photo]').forEach(link => link.setAttribute('aria-haspopup', 'dialog'))
      on(root, 'click', event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        const reviewLink = event.target.closest('[data-life-open]')
        const photoLink = event.target.closest('[data-life-photo]')
        if (reviewLink) {
          const index = reviews.findIndex(review => review.id === reviewLink.dataset.lifeOpen)
          if (index < 0) return
          event.preventDefault()
          openReview(index, reviewLink, true)
        } else if (photoLink) {
          event.preventDefault()
          opener = photoLink
          current = null
          dialog.dataset.view = 'photo'
          heading.textContent = photoLink.querySelector('img').alt
          const image = new Image()
          image.className = 'rl-photo-full'
          image.alt = heading.textContent
          image.src = photoLink.href
          contents.replaceChildren(image)
          footer.hidden = true
          dialog.showModal()
          dialog.scrollTop = 0
        }
      })
      on(dialog.querySelector('.rl-dialog-close'), 'click', () => dialog.close())
      on(dialog, 'click', event => {
        const rect = dialog.getBoundingClientRect()
        if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close()
      })
      on(dialog, 'close', () => {
        if (current !== null && location.hash === `#${reviews[current].id}`) {
          if (ownsHistory) history.back()
          else history.replaceState(null, '', pageURL())
        }
        ownsHistory = false
        current = null
        restoreFocus()
      })
      const step = amount => {
        if (current === null) return
        openReview(current + amount, null, true)
        heading.tabIndex = -1
        heading.focus({ preventScroll: true })
      }
      on(previous, 'click', () => step(-1))
      on(next, 'click', () => step(1))
      on(window, 'hashchange', syncHash)
      on(window, 'popstate', syncHash)
      syncHash()
      // Hide the inline fallback only after the reading layer is fully connected.
      const fallback = root.querySelector('.rl-film-reviews')
      if (fallback) fallback.hidden = true
    }
    const books = [...root.querySelectorAll('.rl-book')]
    const bookLinks = [...root.querySelectorAll('[data-book-link]')]
    if (books.length) {
      const updateBook = () => {
        frame = 0
        let active = books[0]
        for (const book of books) if (book.getBoundingClientRect().top <= 170) active = book
        bookLinks.forEach(link => {
          if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location')
          else link.removeAttribute('aria-current')
        })
      }
      const queueUpdate = () => { if (!frame) frame = requestAnimationFrame(updateBook) }
      on(window, 'scroll', queueUpdate, { passive: true })
      on(window, 'resize', queueUpdate, { passive: true })
      updateBook()
    }
    cleanup = () => {
      events.abort()
      cancelAnimationFrame(frame)
      if (dialog.open) dialog.close()
      const fallback = root.querySelector('.rl-film-reviews')
      if (fallback) fallback.hidden = false
      delete root.dataset.ready
    }
  }
  window.rikkaLife = { init }
  document.addEventListener('pjax:send', () => cleanup())
  document.addEventListener('pjax:complete', init)
  init()
})()
