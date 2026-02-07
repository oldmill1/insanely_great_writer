import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.sync()
  }

  sync() {
    const min = Number(this.element.min)
    const max = Number(this.element.max)
    const value = Number(this.element.value)
    const range = max - min
    if (range <= 0) return

    const percent = ((value - min) / range) * 100
    this.element.style.setProperty("--ig-slider-percent", `${percent}%`)
  }
}
