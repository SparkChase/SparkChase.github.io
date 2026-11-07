// PJAX may execute this file again; keep one controller and one set of listeners.
(() => {
  if (window.homeSliderController) {
    window.homeSliderController.init()
    return
  }
  let disposeSlider = () => {}
  // The first slide stays readable even if the carousel library cannot load.
  function initHomeSlider() {
    const element = document.getElementById('swiper_container')
    if (element?.swiper) return
    disposeSlider()
    disposeSlider = () => {}
    if (!element) return
    // 分类插件也会前插卡片，保持精选轮播在文章区最前面。
    const card = element.closest('.recent-post-item')
    if (card && card.parentElement.firstElementChild !== card) card.parentElement.prepend(card)
    const slides = element.querySelectorAll('.swiper-slide')
    if (!slides.length) { element.closest('.recent-post-item')?.remove(); return }
    // Capture also covers the duplicate slides created by Swiper's loop mode.
    const fallback = img => {
      if (img.tagName === 'IMG' && img.getAttribute('src') !== '/assets/r1.jpg') img.src = '/assets/r1.jpg'
    }
    const onImageError = event => fallback(event.target)
    element.addEventListener('error', onImageError, true)
    disposeSlider = () => element.removeEventListener('error', onImageError, true)
    element.querySelectorAll('img').forEach(img => { if (img.complete && !img.naturalWidth) fallback(img) })
    // Failed stylesheets must not turn a readable first slide into a broken layout.
    if (typeof Swiper !== 'function' || getComputedStyle(element.querySelector('.swiper-wrapper')).display !== 'flex') return
    // Reveal slides before Swiper measures them; restore the fallback on failure.
    element.dataset.sliderReady = 'true'
    let slider
    try { slider = new Swiper(element, {
      passiveListeners:true, spaceBetween:30, effect:'fade', loop:slides.length > 1,
      preloadImages:false,
      autoplay:matchMedia('(prefers-reduced-motion: reduce)').matches ? false : {disableOnInteraction:true, delay:3000},
      // Scrolling the page should not be intercepted by the slider.
      mousewheel:false,
      pagination:{
        el:element.querySelector('.blog-slider__pagination'), clickable:true,
        renderBullet:(index, className) => `<button type="button" class="${className}" aria-label="切换到第 ${index + 1} 篇精选文章"></button>`
      }
    }) } catch (error) {
      delete element.dataset.sliderReady
      console.error('轮播初始化失败', error)
      return
    }
    const rail = element.querySelector('.blog-slider__pagination')
    const selectSlide = index => {
      slider.autoplay?.stop()
      slider.slideTo(index + (slider.params.loop ? slider.loopedSlides : 0))
    }
    let lastWheel = -Infinity
    rail.addEventListener('wheel', event => {
      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (!delta || slides.length < 2) return
      event.preventDefault()
      if (performance.now() - lastWheel < 300) return
      lastWheel = performance.now()
      selectSlide((slider.realIndex + (delta > 0 ? 1 : -1) + slides.length) % slides.length)
    }, {passive:false})
    const pointToSlide = event => {
      const bullets = [...rail.querySelectorAll('.swiper-pagination-bullet')]
      const vertical = getComputedStyle(rail).flexDirection === 'column'
      let nearest = 0, distance = Infinity
      bullets.forEach((bullet, index) => {
        const rect = bullet.getBoundingClientRect()
        const d = Math.abs(vertical ? event.clientY - rect.top - rect.height / 2 : event.clientX - rect.left - rect.width / 2)
        if (d < distance) { nearest = index; distance = d }
      })
      selectSlide(nearest)
    }
    let dragging = false
    rail.addEventListener('pointerdown', event => {
      if (event.button !== 0) return
      dragging = true
      rail.setPointerCapture(event.pointerId)
      pointToSlide(event)
      event.preventDefault()
    })
    rail.addEventListener('pointermove', event => { if (dragging) pointToSlide(event) })
    rail.addEventListener('pointerup', event => {
      dragging = false
      if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId)
    })
    rail.addEventListener('pointercancel', () => { dragging = false })
    rail.addEventListener('keydown', event => {
      const directions = {ArrowDown:1, ArrowRight:1, ArrowUp:-1, ArrowLeft:-1}
      if (!directions[event.key]) return
      event.preventDefault()
      const index = (slider.realIndex + directions[event.key] + slides.length) % slides.length
      selectSlide(index)
      rail.querySelectorAll('.swiper-pagination-bullet')[index]?.focus()
    })
    element.addEventListener('mouseenter', () => slider.autoplay?.stop())
    element.addEventListener('mouseleave', () => {
      if (!document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches) slider.autoplay?.start()
    })
    const onVisibilityChange = () => {
      if (document.hidden) slider.autoplay?.stop()
      else if (!matchMedia('(prefers-reduced-motion: reduce)').matches) slider.autoplay?.start()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    disposeSlider = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      element.removeEventListener('error', onImageError, true)
      slider.destroy(true, true)
      delete element.dataset.sliderReady
    }
  }
  window.homeSliderController = {init:initHomeSlider}
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHomeSlider, {once:true})
  else initHomeSlider()
  document.addEventListener('pjax:complete', initHomeSlider)
})()
