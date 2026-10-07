// The first slide stays readable even if the carousel library cannot load.
function initHomeSlider() {
  const element = document.getElementById('swiper_container')
  if (!element || element.swiper || typeof Swiper !== 'function') return
  const slides = element.querySelectorAll('.swiper-slide')
  if (!slides.length) { element.closest('.recent-post-item')?.remove(); return }
  element.querySelectorAll('img').forEach(img => {
    img.removeAttribute('onerror')
    img.addEventListener('error', () => { img.src = '/assets/r1.jpg' }, {once:true})
  })
  // Reveal slides before Swiper measures them; restore the fallback on failure.
  element.dataset.sliderReady = 'true'
  let slider
  try { slider = new Swiper(element, {
    passiveListeners:true, spaceBetween:30, effect:'fade', loop:slides.length > 1,
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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) slider.autoplay?.stop()
    else if (!matchMedia('(prefers-reduced-motion: reduce)').matches) slider.autoplay?.start()
  })
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHomeSlider, {once:true})
else initHomeSlider()
document.addEventListener('pjax:complete', initHomeSlider)
