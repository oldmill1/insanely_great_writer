import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["item"]

  connect() {
    this.resetScale()
  }

  hover(event) {
    const pointerX = event.clientX
    const range = 130
    const maxScale = 1.72
    const minScale = 1

    this.itemTargets.forEach((item) => {
      const rect = item.getBoundingClientRect()
      const centerX = rect.left + (rect.width / 2)
      const distance = Math.abs(pointerX - centerX)
      const proximity = Math.max(0, 1 - (distance / range))
      const eased = proximity * proximity
      const scale = minScale + ((maxScale - minScale) * eased)

      item.style.setProperty("--ig-dock-scale", scale.toFixed(3))
      item.style.setProperty("--ig-dock-lift", `${Math.round((scale - 1) * 28)}px`)
    })
  }

  leave() {
    this.resetScale()
  }

  resetScale() {
    this.itemTargets.forEach((item) => {
      item.style.setProperty("--ig-dock-scale", "1")
      item.style.setProperty("--ig-dock-lift", "0px")
    })
  }
}
