import { Controller } from "@hotwired/stimulus"

const SAVE_IDLE_MS = 2000

export default class extends Controller {
  static values = {
    savePath: String
  }

  static targets = ["content", "statusLight"]

  connect() {
    this.pendingSaveTimeout = null
    this.lastSavedContent = this.contentTarget.textContent || ""
    this.setStatus("idle")
  }

  disconnect() {
    if (this.pendingSaveTimeout) {
      clearTimeout(this.pendingSaveTimeout)
      this.pendingSaveTimeout = null
    }
  }

  queueSave() {
    if (this.pendingSaveTimeout) {
      clearTimeout(this.pendingSaveTimeout)
    }

    this.setStatus("pending")
    this.pendingSaveTimeout = setTimeout(() => {
      this.pendingSaveTimeout = null
      this.save()
    }, SAVE_IDLE_MS)
  }

  async save() {
    if (!this.hasSavePathValue) return

    const content = this.contentTarget.textContent || ""

    if (content === this.lastSavedContent) {
      this.setStatus("idle")
      return
    }

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    try {
      const response = await fetch(this.savePathValue, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-CSRF-Token": csrfToken
        },
        body: JSON.stringify({
          document: {
            content
          }
        })
      })

      if (!response.ok) {
        const payload = await response.text()
        throw new Error(`HTTP ${response.status}: ${payload}`)
      }

      this.lastSavedContent = content
      this.setStatus("saved")
    } catch (error) {
      console.error("[doc-editor] failed to save document", error)
      this.setStatus("error")
    }
  }

  setStatus(state) {
    if (!this.hasStatusLightTarget) return

    this.statusLightTarget.dataset.state = state
  }
}
