import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    handleSelector: String
  }

  connect() {
    this.dragging = false
    this.pointerId = null
    this.startX = 0
    this.startY = 0
    this.originLeft = 0
    this.originTop = 0
  }

  start(event) {
    if (event.button !== 0) return
    if (event.target.closest(".ig-note__toggle")) return
    if (this.hasHandleSelectorValue && !event.target.closest(this.handleSelectorValue)) return

    const rect = this.element.getBoundingClientRect()

    this.dragging = true
    this.pointerId = event.pointerId
    this.startX = event.clientX
    this.startY = event.clientY
    this.originLeft = rect.left
    this.originTop = rect.top

    this.element.classList.add("is-dragging")
    this.element.setPointerCapture(event.pointerId)
    event.preventDefault()
  }

  move(event) {
    if (!this.dragging || event.pointerId !== this.pointerId) return

    const deltaX = event.clientX - this.startX
    const deltaY = event.clientY - this.startY

    this.element.style.left = `${Math.round(this.originLeft + deltaX)}px`
    this.element.style.top = `${Math.round(this.originTop + deltaY)}px`
  }

  end(event) {
    if (!this.dragging || event.pointerId !== this.pointerId) return

    this.dragging = false
    this.pointerId = null
    this.element.classList.remove("is-dragging")

    if (this.element.hasPointerCapture(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId)
    }
  }
}
