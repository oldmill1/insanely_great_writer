import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["body", "toggleControl"]

  connect() {
    this.syncState()
  }

  toggle() {
    this.element.classList.toggle("ig-note--collapsed")
    this.syncState()
  }

  syncState() {
    const expanded = !this.element.classList.contains("ig-note--collapsed")

    this.element.dataset.noteMode = expanded ? "expanded" : "collapsed"

    if (this.hasToggleControlTarget) {
      this.toggleControlTarget.setAttribute("aria-expanded", String(expanded))
    }

    if (this.hasBodyTarget) {
      this.bodyTarget.hidden = !expanded
    }
  }
}
