import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    shortcuts: Array
  }

  connect() {
    this.render()
  }

  render() {
    this.element.innerHTML = ""

    this.shortcutsValue.forEach((shortcut) => {
      const item = document.createElement("div")
      item.className = "home__desktop-item"
      item.style.left = `${Math.round(Number(shortcut.x) || 0)}px`
      item.style.top = `${Math.round(Number(shortcut.y) || 0)}px`
      item.dataset.controller = "draggable"
      item.dataset.draggableHandleSelectorValue = ".ig-shortcut"
      if (shortcut.id) {
        item.dataset.draggablePersistPathValue = `/shortcuts/${shortcut.id}/position`
      }
      item.dataset.action = [
        "pointerdown->draggable#start",
        "pointermove->draggable#move",
        "pointerup->draggable#end",
        "pointercancel->draggable#end"
      ].join(" ")

      item.appendChild(this.buildShortcut(shortcut))
      this.element.appendChild(item)
    })
  }

  buildShortcut(shortcut) {
    const button = document.createElement("button")
    button.type = "button"
    const selected = shortcut.isSelected === true || shortcut.is_selected === true
    button.className = selected ? "ig-shortcut ig-shortcut--64 ig-shortcut--selected" : "ig-shortcut ig-shortcut--64"
    button.setAttribute("aria-pressed", String(selected))

    if (shortcut.id) {
      button.dataset.shortcutId = String(shortcut.id)
    }

    const thumbnail = document.createElement("img")
    thumbnail.className = "ig-shortcut__thumbnail"
    thumbnail.src = shortcut.thumbnail || ""
    thumbnail.alt = ""
    thumbnail.setAttribute("aria-hidden", "true")

    const label = document.createElement("span")
    label.className = "ig-shortcut__label"
    label.textContent = shortcut.label || "Shortcut"

    button.appendChild(thumbnail)
    button.appendChild(label)

    return button
  }
}
