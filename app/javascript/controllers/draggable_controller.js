import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    handleSelector: String,
    persistPath: String,
    top: Number,
    right: Number,
    bottom: Number,
    left: Number
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
    this.applyInitialOffsets()
  }

  start(event) {
    if (event.button !== 0) return
    if (event.target.closest(".ig-note__toggle")) return
    if (this.hasHandleSelectorValue && !event.target.closest(this.handleSelectorValue)) return

    const rect = this.element.getBoundingClientRect()
    const contextRect = this.positioningContextRect()

    this.dragging = true
    this.pointerId = event.pointerId
    this.startX = event.clientX
    this.startY = event.clientY
    this.originLeft = rect.left - contextRect.left
    this.originTop = rect.top - contextRect.top
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
      this.element.style.right = "auto"
      this.element.style.bottom = "auto"
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

    const nextOffsets = this.computeNearestEdgeOffsets()
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

    if (this.moved && wasDragActivated) {
      this.applyOffsets(nextOffsets)
    }

    if (this.hasPersistPathValue && this.moved && wasDragActivated) {
      await this.persistPosition(nextOffsets)
    }
  }

  applyInitialOffsets() {
    if (!this.hasTopValue && !this.hasRightValue && !this.hasBottomValue && !this.hasLeftValue) return

    const initialOffsets = {
      top: this.hasTopValue ? Math.round(this.topValue) : null,
      right: this.hasRightValue ? Math.round(this.rightValue) : null,
      bottom: this.hasBottomValue ? Math.round(this.bottomValue) : null,
      left: this.hasLeftValue ? Math.round(this.leftValue) : null
    }

    this.applyOffsets(initialOffsets)
  }

  computeNearestEdgeOffsets() {
    const rect = this.element.getBoundingClientRect()
    const contextRect = this.positioningContextRect()
    const top = Math.round(rect.top - contextRect.top)
    const left = Math.round(rect.left - contextRect.left)
    const right = Math.round(contextRect.right - rect.right)
    const bottom = Math.round(contextRect.bottom - rect.bottom)

    const offsets = {
      top: null,
      right: null,
      bottom: null,
      left: null
    }

    if (top <= bottom) {
      offsets.top = top
    } else {
      offsets.bottom = bottom
    }

    if (left <= right) {
      offsets.left = left
    } else {
      offsets.right = right
    }

    return offsets
  }

  applyOffsets(offsets) {
    const hasTop = Number.isInteger(offsets.top)
    const hasBottom = Number.isInteger(offsets.bottom)
    const hasLeft = Number.isInteger(offsets.left)
    const hasRight = Number.isInteger(offsets.right)

    if (hasTop || !hasBottom) {
      this.element.style.top = `${hasTop ? offsets.top : 0}px`
      this.element.style.bottom = "auto"
    } else {
      this.element.style.bottom = `${offsets.bottom}px`
      this.element.style.top = "auto"
    }

    if (hasLeft || !hasRight) {
      this.element.style.left = `${hasLeft ? offsets.left : 0}px`
      this.element.style.right = "auto"
    } else {
      this.element.style.right = `${offsets.right}px`
      this.element.style.left = "auto"
    }
  }

  positioningContextRect() {
    const style = window.getComputedStyle(this.element)
    if (style.position === "fixed") {
      return {
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight
      }
    }

    const context = this.element.offsetParent || document.documentElement
    return context.getBoundingClientRect()
  }

  async persistPosition(offsets) {
    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    try {
      await fetch(this.persistPathValue, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify(offsets)
      })
    } catch (error) {
      console.error("[draggable] failed to persist position", error)
    }
  }
}
