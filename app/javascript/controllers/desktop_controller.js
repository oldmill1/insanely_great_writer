import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    shortcuts: Array
  }

  static SYSTEM_SHORTCUT_COOKIE = "desktop_system_shortcut_positions"

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

  animateShortcut(event) {
    event.preventDefault()

    const shortcutButton = event.currentTarget
    const thumbnail = shortcutButton.querySelector(".ig-shortcut__thumbnail")
    if (!thumbnail) return

    const burst = this.createBurst(thumbnail, event.clientX, event.clientY)
    if (!burst) return

    document.body.appendChild(burst)

    const cleanup = () => {
      burst.remove()
    }

    burst.addEventListener("animationend", cleanup, { once: true })
    window.setTimeout(cleanup, 600)
  }

  createBurst(thumbnail, clientX, clientY) {
    const rect = thumbnail.getBoundingClientRect()
    const width = Math.round(rect.width)
    const height = Math.round(rect.height)
    if (width <= 0 || height <= 0) return null

    const burst = thumbnail.cloneNode(true)
    
    // Position the burst exactly where the original thumbnail is
    burst.style.position = "fixed"
    burst.style.left = `${rect.left}px`
    burst.style.top = `${rect.top}px`
    burst.style.width = `${width}px`
    burst.style.height = `${height}px`

    burst.classList.add("ig-shortcut__thumbnail-burst")

    return burst
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
      const resolvedShortcut = this.resolveShortcutPosition(shortcut)
      const item = document.createElement("div")
      item.className = "home__desktop-item"
      this.applyEdgeOffsets(item, resolvedShortcut)
      item.dataset.controller = "draggable"
      item.dataset.draggableHandleSelectorValue = ".ig-shortcut"
      if (this.isRecordShortcut(resolvedShortcut) && resolvedShortcut.id) {
        item.dataset.draggablePersistPathValue = `/shortcuts/${resolvedShortcut.id}/position`
      }
      if (this.isSystemShortcut(resolvedShortcut)) {
        item.dataset.systemShortcutKey = resolvedShortcut.system_key
      }
      item.dataset.action = [
        "pointerdown->draggable#start",
        "pointermove->draggable#move",
        "pointerup->draggable#end",
        "pointercancel->draggable#end",
        "pointerup->desktop#persistSystemShortcut",
        "pointercancel->desktop#persistSystemShortcut"
      ].join(" ")

      item.appendChild(this.buildShortcut(resolvedShortcut))
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
    if (value == null || value === "") return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? Math.round(parsed) : null
  }

  isRecordShortcut(shortcut) {
    return shortcut.kind === "record"
  }

  isSystemShortcut(shortcut) {
    return shortcut.kind === "system" && shortcut.system_key
  }

  resolveShortcutPosition(shortcut) {
    if (!this.isSystemShortcut(shortcut)) return shortcut

    const persistedPosition = this.loadSystemShortcutPosition(shortcut.system_key)
    if (!persistedPosition) return shortcut

    return {
      ...shortcut,
      ...persistedPosition
    }
  }

  buildShortcut(shortcut) {
    const button = document.createElement("button")
    button.type = "button"
    const shortcutId = this.shortcutDomId(shortcut)
    button.className = "ig-shortcut ig-shortcut--64"
    button.setAttribute("aria-pressed", "false")
    button.dataset.action = "click->desktop#selectShortcut dblclick->desktop#animateShortcut"

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

  shortcutDomId(shortcut) {
    if (shortcut.id != null) return String(shortcut.id)
    if (this.isSystemShortcut(shortcut)) return `system:${shortcut.system_key}`

    return null
  }

  persistSystemShortcut(event) {
    const item = event.currentTarget
    const systemKey = item.dataset.systemShortcutKey
    if (!systemKey) return

    const position = this.extractXYPosition(item)
    if (!position) return

    const allPositions = this.readSystemShortcutCookie()
    allPositions[systemKey] = position
    this.writeSystemShortcutCookie(allPositions)
  }

  extractXYPosition(item) {
    const itemRect = item.getBoundingClientRect()
    const desktopRect = this.element.getBoundingClientRect()

    return {
      x: Math.round(itemRect.left - desktopRect.left),
      y: Math.round(itemRect.top - desktopRect.top)
    }
  }

  loadSystemShortcutPosition(systemKey) {
    const allPositions = this.readSystemShortcutCookie()
    const position = allPositions[systemKey]
    if (!position || typeof position !== "object") return null

    const x = this.toInteger(position.x)
    const y = this.toInteger(position.y)
    if (x == null || y == null) return null

    return {
      top: y,
      right: null,
      bottom: null,
      left: x
    }
  }

  readSystemShortcutCookie() {
    const rawValue = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${this.constructor.SYSTEM_SHORTCUT_COOKIE}=`))
      ?.split("=")[1]

    if (!rawValue) return {}

    try {
      const parsed = JSON.parse(decodeURIComponent(rawValue))
      return parsed && typeof parsed === "object" ? parsed : {}
    } catch (_) {
      return {}
    }
  }

  writeSystemShortcutCookie(value) {
    const encoded = encodeURIComponent(JSON.stringify(value))
    const oneYearInSeconds = 60 * 60 * 24 * 365
    document.cookie =
      `${this.constructor.SYSTEM_SHORTCUT_COOKIE}=${encoded}; path=/; max-age=${oneYearInSeconds}; samesite=lax`
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
