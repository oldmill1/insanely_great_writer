import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["item"]

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

    const intent = button.dataset.intent
    if (intent === "new_draft") {
      this.submitPost(button.dataset.path)
    }
  }

  resetScale() {
    this.itemTargets.forEach((item) => {
      item.style.setProperty("--ig-dock-scale", "1")
      item.style.setProperty("--ig-dock-lift", "0px")
    })
  }

  submitPost(path) {
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

    document.body.append(form)
    form.submit()
  }
}
