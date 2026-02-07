import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu"]

  open(event) {
    event.preventDefault()
    this.showAt(event.clientX, event.clientY)
  }

  close(event) {
    if (!this.isOpen()) return
    if (event && this.menuTarget.contains(event.target)) return

    this.hide()
  }

  closeWithEscape(event) {
    if (event.key === "Escape") {
      this.hide()
    }
  }

  hide() {
    if (!this.hasMenuTarget) return
    this.menuTarget.hidden = true
  }

  isOpen() {
    return this.hasMenuTarget && !this.menuTarget.hidden
  }

  showAt(x, y) {
    if (!this.hasMenuTarget) return

    this.menuTarget.hidden = false
    this.menuTarget.style.visibility = "hidden"
    this.menuTarget.style.left = `${x}px`
    this.menuTarget.style.top = `${y}px`

    const rect = this.menuTarget.getBoundingClientRect()
    const margin = 8
    const maxLeft = window.innerWidth - rect.width - margin
    const maxTop = window.innerHeight - rect.height - margin
    const left = Math.max(margin, Math.min(x, maxLeft))
    const top = Math.max(margin, Math.min(y, maxTop))

    this.menuTarget.style.left = `${left}px`
    this.menuTarget.style.top = `${top}px`
    this.menuTarget.style.visibility = "visible"
  }
}
