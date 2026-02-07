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
      this.applyEdgeOffsets(item, shortcut)
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

  applyEdgeOffsets(element, shortcut) {
    const top = this.toInteger(shortcut.top)
    const right = this.toInteger(shortcut.right)
    const bottom = this.toInteger(shortcut.bottom)
    const left = this.toInteger(shortcut.left)

    if (top != null) {
      element.style.top = `${top}px`
      element.style.bottom = "auto"
      element.dataset.draggableTopValue = String(top)
      delete element.dataset.draggableBottomValue
    } else if (bottom != null) {
      element.style.bottom = `${bottom}px`
      element.style.top = "auto"
      element.dataset.draggableBottomValue = String(bottom)
      delete element.dataset.draggableTopValue
    } else {
      element.style.top = "0px"
      element.style.bottom = "auto"
      element.dataset.draggableTopValue = "0"
      delete element.dataset.draggableBottomValue
    }

    if (left != null) {
      element.style.left = `${left}px`
      element.style.right = "auto"
      element.dataset.draggableLeftValue = String(left)
      delete element.dataset.draggableRightValue
    } else if (right != null) {
      element.style.right = `${right}px`
      element.style.left = "auto"
      element.dataset.draggableRightValue = String(right)
      delete element.dataset.draggableLeftValue
    } else {
      element.style.left = "0px"
      element.style.right = "auto"
      element.dataset.draggableLeftValue = "0"
      delete element.dataset.draggableRightValue
    }
  }

  toInteger(value) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.round(parsed) : null
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
