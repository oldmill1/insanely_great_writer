import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["item"]
  static values = {
    authed: Boolean,
    registerPath: String
  }

  connect() {
    this.resetScale()
  }

  hover(event) {
    const pointerX = event.clientX
    const range = 130
    const maxScale = 1.46
    const minScale = 1

    this.itemTargets.forEach((item) => {
      const rect = item.getBoundingClientRect()
      const centerX = rect.left + (rect.width / 2)
      const distance = Math.abs(pointerX - centerX)
      const proximity = Math.max(0, 1 - (distance / range))
      const eased = proximity * proximity
      const scale = minScale + ((maxScale - minScale) * eased)

      item.style.setProperty("--ig-dock-scale", scale.toFixed(3))
      item.style.setProperty("--ig-dock-lift", `${Math.round((scale - 1) * 18)}px`)
    })
  }

  leave() {
    this.resetScale()
  }

  handleClick(event) {
    const button = event.target.closest("[data-intent]")
    if (!button || !this.element.contains(button)) return

    if (!this.authedValue) {
      if (this.hasRegisterPathValue) {
        window.location.assign(this.registerPathValue)
      }
      return
    }

    const intent = button.dataset.intent
    if (intent === "new_draft") {
      this.submitPost(button.dataset.path, {
        parent_path: button.dataset.parentPath
      })
      return
    }

    if (intent === "new_folder") {
      this.createDesktopItem(button.dataset.path, {
        parent_path: button.dataset.parentPath
      })
    }
  }

  resetScale() {
    this.itemTargets.forEach((item) => {
      item.style.setProperty("--ig-dock-scale", "1")
      item.style.setProperty("--ig-dock-lift", "0px")
    })
  }

  submitPost(path, params = {}) {
    if (!path) return

    const form = document.createElement("form")
    form.method = "post"
    form.action = path
    form.style.display = "none"

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    if (csrfToken) {
      const tokenInput = document.createElement("input")
      tokenInput.type = "hidden"
      tokenInput.name = "authenticity_token"
      tokenInput.value = csrfToken
      form.append(tokenInput)
    }

    Object.entries(params).forEach(([key, value]) => {
      if (value == null || value === "") return

      const input = document.createElement("input")
      input.type = "hidden"
      input.name = key
      input.value = value
      form.append(input)
    })

    document.body.append(form)
    form.submit()
  }

  async createDesktopItem(path, params = {}) {
    if (!path) return

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken
      },
      credentials: "same-origin",
      body: JSON.stringify(params)
    })

    if (!response.ok) return

    await this.refreshDesktopShortcuts()
  }

  async refreshDesktopShortcuts() {
    const response = await fetch("/desktop_items", {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      credentials: "same-origin"
    })

    if (!response.ok) return

    const payload = await response.json()
    if (!Array.isArray(payload?.shortcuts)) return

    const desktopElement = document.querySelector("[data-controller~='desktop']")
    if (!desktopElement) return

    const desktopController = this.application.getControllerForElementAndIdentifier(
      desktopElement,
      "desktop"
    )
    if (!desktopController?.replaceShortcuts) return

    desktopController.replaceShortcuts(payload.shortcuts)
  }
}
