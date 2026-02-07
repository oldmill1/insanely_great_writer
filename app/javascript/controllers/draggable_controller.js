import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    handleSelector: String,
    persistPath: String
  }

  connect() {
    this.dragging = false
    this.pointerId = null
    this.startX = 0
    this.startY = 0
    this.originLeft = 0
    this.originTop = 0
    this.moved = false
    this.dragThreshold = 4
    this.dragActivated = false
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
    this.moved = false
    this.dragActivated = false

  }

  move(event) {
    if (!this.dragging || event.pointerId !== this.pointerId) return

    const deltaX = event.clientX - this.startX
    const deltaY = event.clientY - this.startY
    const movedEnough = Math.abs(deltaX) >= this.dragThreshold || Math.abs(deltaY) >= this.dragThreshold

    if (!this.dragActivated && !movedEnough) return

    if (!this.dragActivated) {
      this.dragActivated = true
      this.element.classList.add("is-dragging")
      this.element.setPointerCapture(event.pointerId)
    }

    this.element.style.left = `${Math.round(this.originLeft + deltaX)}px`
    this.element.style.top = `${Math.round(this.originTop + deltaY)}px`
    this.moved = true
    event.preventDefault()
  }

  async end(event) {
    if (!this.dragging || event.pointerId !== this.pointerId) return

    const nextLeft = parseInt(this.element.style.left || `${Math.round(this.originLeft)}`, 10)
    const nextTop = parseInt(this.element.style.top || `${Math.round(this.originTop)}`, 10)
    const wasDragActivated = this.dragActivated

    this.dragging = false
    this.pointerId = null
    if (wasDragActivated) {
      this.element.classList.remove("is-dragging")
    }
    this.dragActivated = false

    if (this.element.hasPointerCapture(event.pointerId)) {
      this.element.releasePointerCapture(event.pointerId)
    }

    if (this.hasPersistPathValue && this.moved && wasDragActivated) {
      await this.persistPosition(nextLeft, nextTop)
    }
  }

  async persistPosition(x, y) {
    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    try {
      await fetch(this.persistPathValue, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({ x, y })
      })
    } catch (error) {
      console.error("[draggable] failed to persist position", error)
    }
  }
}
