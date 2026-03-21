import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    persistPath: String,
    contentPersistPath: String
  }

  static targets = ["body", "toggleControl"]

  connect() {
    this.saveTimer = null
    this.syncState()
  }

  disconnect() {
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer)
      this.saveTimer = null
    }
  }

  toggle() {
    this.element.classList.toggle("ig-note--collapsed")
    this.syncState()
    this.persistExpanded()
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

  scheduleSave() {
    if (!this.hasContentPersistPathValue || !this.hasBodyTarget) return

    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer)
    }

    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null
      this.persistContent()
    }, 350)
  }

  saveNow() {
    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer)
      this.saveTimer = null
    }

    this.persistContent()
  }

  async persistExpanded() {
    if (!this.hasPersistPathValue) return

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content
    const expanded = !this.element.classList.contains("ig-note--collapsed")

    try {
      const response = await fetch(this.persistPathValue, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({ expanded })
      })

      if (!response.ok) {
        const payload = await response.text()
        throw new Error(`HTTP ${response.status}: ${payload}`)
      }
    } catch (error) {
      console.error("[ig-note] failed to persist expanded state", error)
    }
  }

  async persistContent() {
    if (!this.hasContentPersistPathValue || !this.hasBodyTarget) return

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    try {
      const response = await fetch(this.contentPersistPathValue, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({
          note: {
            content: this.bodyTarget.innerHTML
          }
        })
      })

      if (!response.ok) {
        const payload = await response.text()
        throw new Error(`HTTP ${response.status}: ${payload}`)
      }
    } catch (error) {
      console.error("[ig-note] failed to persist note content", error)
    }
  }
}
