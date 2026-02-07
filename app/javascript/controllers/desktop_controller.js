import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    shortcuts: Array
  }

  connect() {
    this.selectedShortcutId = null
    this.render()
  }

  select(event) {
    const shortcutButton = event.target.closest(".ig-shortcut")
    if (!shortcutButton || !this.element.contains(shortcutButton)) return

    this.selectByButton(shortcutButton)
  }

  selectShortcut(event) {
    this.selectByButton(event.currentTarget)
  }

  selectByButton(shortcutButton) {
    const shortcutId = shortcutButton.dataset.shortcutId
    if (!shortcutId) return

    this.selectedShortcutId = shortcutId
    this.applySelectionState()
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
    const shortcutId = shortcut.id != null ? String(shortcut.id) : null
    button.className = "ig-shortcut ig-shortcut--64"
    button.setAttribute("aria-pressed", "false")
    button.dataset.action = "click->desktop#selectShortcut"

    if (shortcutId) {
      button.dataset.shortcutId = shortcutId
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

  isShortcutSelected(shortcut, shortcutId) {
    if (this.selectedShortcutId) {
      return shortcutId === this.selectedShortcutId
    }

    return shortcut.isSelected === true || shortcut.is_selected === true
  }

  applySelectionState() {
    this.element.querySelectorAll(".ig-shortcut").forEach((button) => {
      const isSelected = button.dataset.shortcutId === this.selectedShortcutId
      button.setAttribute("aria-pressed", String(isSelected))
      
      if (isSelected) {
        button.style.outline = '2px solid #78C9F1'
        button.style.outlineOffset = '-2px'
      } else {
        button.style.outline = 'none'
      }
    })
  }
}
