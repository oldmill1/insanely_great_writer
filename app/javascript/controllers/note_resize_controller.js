import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    persistPath: String,
    width: Number,
    height: Number
  }

  connect() {
    this.pointerId = null
    this.handle = null
    this.startX = 0
    this.startY = 0
    this.startLeft = 0
    this.startTop = 0
    this.startWidth = 0
    this.startHeight = 0
    this.moveHandler = this.move.bind(this)
    this.endHandler = this.end.bind(this)
    this.applyInitialSize()
  }

  disconnect() {
    this.teardownListeners()
  }

  start(event) {
    if (event.button !== 0) return

    const handle = event.target.closest("[data-resize-handle]")
    if (!handle) return

    event.preventDefault()
    event.stopPropagation()

    const note = this.noteElement()
    const rect = this.element.getBoundingClientRect()
    const noteRect = note?.getBoundingClientRect()
    if (!note || !noteRect) return

    this.pointerId = event.pointerId
    this.handle = handle.dataset.resizeHandle
    this.startX = event.clientX
    this.startY = event.clientY
    this.startLeft = rect.left
    this.startTop = rect.top
    this.startWidth = Math.round(noteRect.width)
    this.startHeight = Math.round(noteRect.height)

    this.element.classList.add("is-resizing")
    handle.setPointerCapture(event.pointerId)
    window.addEventListener("pointermove", this.moveHandler)
    window.addEventListener("pointerup", this.endHandler)
    window.addEventListener("pointercancel", this.endHandler)
  }

  move(event) {
    if (event.pointerId !== this.pointerId) return

    const deltaX = event.clientX - this.startX
    const deltaY = event.clientY - this.startY
    const nextHeight = this.clamp(this.startHeight + deltaY, 120, 720)

    if (this.handle === "bottom-left") {
      const nextWidth = this.clamp(this.startWidth - deltaX, 220, 960)
      const consumedDeltaX = this.startWidth - nextWidth
      this.applyFrame({
        left: this.startLeft + consumedDeltaX,
        top: this.startTop,
        width: nextWidth,
        height: nextHeight
      })
    } else {
      const nextWidth = this.clamp(this.startWidth + deltaX, 220, 960)
      this.applyFrame({
        left: this.startLeft,
        top: this.startTop,
        width: nextWidth,
        height: nextHeight
      })
    }

    event.preventDefault()
  }

  async end(event) {
    if (event.pointerId !== this.pointerId) return

    const handle = event.target.closest?.("[data-resize-handle]") || this.element.querySelector(`[data-resize-handle="${this.handle}"]`)
    if (handle?.hasPointerCapture?.(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId)
    }

    const geometry = this.currentGeometry()
    this.pointerId = null
    this.handle = null
    this.element.classList.remove("is-resizing")
    this.teardownListeners()
    await this.persistGeometry(geometry)
  }

  applyInitialSize() {
    const note = this.noteElement()
    if (!note) return

    if (this.hasWidthValue) {
      note.style.setProperty("--ig-note-width", `${Math.round(this.widthValue)}px`)
    }

    if (this.hasHeightValue) {
      note.style.setProperty("--ig-note-height", `${Math.round(this.heightValue)}px`)
    }
  }

  applyFrame({ left, top, width, height }) {
    this.element.style.left = `${Math.round(left)}px`
    this.element.style.top = `${Math.round(top)}px`
    this.element.style.right = "auto"
    this.element.style.bottom = "auto"

    const note = this.noteElement()
    if (!note) return

    note.style.setProperty("--ig-note-width", `${Math.round(width)}px`)
    note.style.setProperty("--ig-note-height", `${Math.round(height)}px`)
  }

  currentGeometry() {
    const rect = this.element.getBoundingClientRect()
    const noteRect = this.noteElement().getBoundingClientRect()

    return {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      right: null,
      bottom: null,
      width: Math.round(noteRect.width),
      height: Math.round(noteRect.height)
    }
  }

  async persistGeometry(geometry) {
    if (!this.hasPersistPathValue) return

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    try {
      const response = await fetch(this.persistPathValue, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({ note: geometry })
      })

      if (!response.ok) {
        const payload = await response.text()
        throw new Error(`HTTP ${response.status}: ${payload}`)
      }
    } catch (error) {
      console.error("[note-resize] failed to persist note geometry", error)
    }
  }

  noteElement() {
    return this.element.querySelector(".ig-note")
  }

  teardownListeners() {
    window.removeEventListener("pointermove", this.moveHandler)
    window.removeEventListener("pointerup", this.endHandler)
    window.removeEventListener("pointercancel", this.endHandler)
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(value, max))
  }
}
