import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    shortcuts: Array
  }

  static SYSTEM_SHORTCUT_COOKIE = "desktop_system_shortcut_positions"
  static WINDOW_LAYOUT_COOKIE = "desktop_window_layouts"
  static WINDOW_Z_BASE = 24

  connect() {
    this.selectedShortcutId = null
    this.windowZCounter = this.constructor.WINDOW_Z_BASE
    this.draggingWindow = null
    this.resizePersistTimers = new Map()
    this.windowPointerMoveHandler = this.onWindowPointerMove.bind(this)
    this.windowPointerEndHandler = this.onWindowPointerEnd.bind(this)
    this.windowResizeObserver = null
    this.windowCleanupCallbacks = []

    this.render()
    this.bindWindows()
  }

  disconnect() {
    window.removeEventListener("pointermove", this.windowPointerMoveHandler)
    window.removeEventListener("pointerup", this.windowPointerEndHandler)
    window.removeEventListener("pointercancel", this.windowPointerEndHandler)

    if (this.windowResizeObserver) {
      this.windowResizeObserver.disconnect()
      this.windowResizeObserver = null
    }

    this.windowCleanupCallbacks.forEach((cleanup) => cleanup())
    this.windowCleanupCallbacks = []

    this.resizePersistTimers.forEach((timerId) => window.clearTimeout(timerId))
    this.resizePersistTimers.clear()
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

    const burst = this.createBurst(thumbnail)
    if (!burst) return

    document.body.appendChild(burst)

    const cleanup = () => {
      burst.remove()
    }

    burst.addEventListener("animationend", cleanup, { once: true })
    window.setTimeout(cleanup, 600)
  }

  createBurst(thumbnail) {
    const rect = thumbnail.getBoundingClientRect()
    const width = Math.round(rect.width)
    const height = Math.round(rect.height)
    if (width <= 0 || height <= 0) return null

    const burst = thumbnail.cloneNode(true)
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

  bindWindows() {
    this.windowElements = Array.from(document.querySelectorAll(".home__window[data-desktop-window-key]"))
    if (this.windowElements.length === 0) return

    if ("ResizeObserver" in window) {
      this.windowResizeObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => this.scheduleWindowPersist(entry.target, 140))
      })
    }

    this.windowElements.forEach((windowEl) => {
      this.applyWindowLayout(windowEl)
      this.bringWindowToFront(windowEl)

      const titlebar = windowEl.querySelector(".ig-window__titlebar")
      if (titlebar) {
        const onTitlebarPointerDown = (event) => this.startWindowDrag(event)
        titlebar.addEventListener("pointerdown", onTitlebarPointerDown)
        this.windowCleanupCallbacks.push(() => titlebar.removeEventListener("pointerdown", onTitlebarPointerDown))
      }

      const onWindowPointerDown = () => this.bringWindowToFront(windowEl)
      const onWindowPointerUp = () => this.scheduleWindowPersist(windowEl, 80)
      windowEl.addEventListener("pointerdown", onWindowPointerDown)
      windowEl.addEventListener("pointerup", onWindowPointerUp)
      this.windowCleanupCallbacks.push(() => windowEl.removeEventListener("pointerdown", onWindowPointerDown))
      this.windowCleanupCallbacks.push(() => windowEl.removeEventListener("pointerup", onWindowPointerUp))

      if (this.windowResizeObserver) {
        this.windowResizeObserver.observe(windowEl)
      }
    })
  }

  startWindowDrag(event) {
    if (event.button !== 0) return

    const windowEl = event.currentTarget.closest(".home__window")
    if (!windowEl) return

    this.bringWindowToFront(windowEl)

    const rect = windowEl.getBoundingClientRect()

    this.draggingWindow = {
      element: windowEl,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startLeft: Math.round(rect.left),
      startTop: Math.round(rect.top)
    }

    windowEl.classList.add("is-dragging")
    window.addEventListener("pointermove", this.windowPointerMoveHandler)
    window.addEventListener("pointerup", this.windowPointerEndHandler)
    window.addEventListener("pointercancel", this.windowPointerEndHandler)

    event.preventDefault()
  }

  onWindowPointerMove(event) {
    if (!this.draggingWindow) return
    if (event.pointerId !== this.draggingWindow.pointerId) return

    const deltaX = event.clientX - this.draggingWindow.startClientX
    const deltaY = event.clientY - this.draggingWindow.startClientY

    const width = this.draggingWindow.element.offsetWidth
    const height = this.draggingWindow.element.offsetHeight
    const nextLeft = Math.round(this.draggingWindow.startLeft + deltaX)
    const nextTop = Math.round(this.draggingWindow.startTop + deltaY)

    const margin = 8
    const clampedLeft = Math.max(margin - width, Math.min(nextLeft, window.innerWidth - margin))
    const clampedTop = Math.max(0, Math.min(nextTop, window.innerHeight - 34))

    this.draggingWindow.element.style.left = `${clampedLeft}px`
    this.draggingWindow.element.style.top = `${clampedTop}px`

    event.preventDefault()
  }

  onWindowPointerEnd(event) {
    if (!this.draggingWindow) return
    if (event.pointerId !== this.draggingWindow.pointerId) return

    const windowEl = this.draggingWindow.element
    windowEl.classList.remove("is-dragging")

    this.draggingWindow = null
    window.removeEventListener("pointermove", this.windowPointerMoveHandler)
    window.removeEventListener("pointerup", this.windowPointerEndHandler)
    window.removeEventListener("pointercancel", this.windowPointerEndHandler)

    this.persistWindowLayout(windowEl)
  }

  applyWindowLayout(windowEl) {
    const key = windowEl.dataset.desktopWindowKey
    if (!key) return

    const defaults = {
      x: this.toInteger(windowEl.dataset.desktopWindowX) ?? 280,
      y: this.toInteger(windowEl.dataset.desktopWindowY) ?? 120,
      width: this.toInteger(windowEl.dataset.desktopWindowWidth) ?? 380,
      height: this.toInteger(windowEl.dataset.desktopWindowHeight) ?? 240
    }

    const persisted = this.loadWindowLayout(key)
    const layout = persisted || defaults

    windowEl.style.left = `${layout.x}px`
    windowEl.style.top = `${layout.y}px`
    windowEl.style.width = `${layout.width}px`
    windowEl.style.height = `${layout.height}px`
  }

  scheduleWindowPersist(windowEl, delay = 120) {
    const key = windowEl.dataset.desktopWindowKey
    if (!key) return

    const existing = this.resizePersistTimers.get(key)
    if (existing) {
      window.clearTimeout(existing)
    }

    const timerId = window.setTimeout(() => {
      this.persistWindowLayout(windowEl)
      this.resizePersistTimers.delete(key)
    }, delay)

    this.resizePersistTimers.set(key, timerId)
  }

  persistWindowLayout(windowEl) {
    const key = windowEl.dataset.desktopWindowKey
    if (!key) return

    const rect = windowEl.getBoundingClientRect()
    const allLayouts = this.readWindowLayoutCookie()
    allLayouts[key] = {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }

    this.writeWindowLayoutCookie(allLayouts)
  }

  loadWindowLayout(windowKey) {
    const allLayouts = this.readWindowLayoutCookie()
    const layout = allLayouts[windowKey]
    if (!layout || typeof layout !== "object") return null

    const x = this.toInteger(layout.x)
    const y = this.toInteger(layout.y)
    const width = this.toInteger(layout.width)
    const height = this.toInteger(layout.height)
    if (x == null || y == null || width == null || height == null) return null

    return { x, y, width, height }
  }

  readWindowLayoutCookie() {
    const rawValue = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${this.constructor.WINDOW_LAYOUT_COOKIE}=`))
      ?.split("=")[1]

    if (!rawValue) return {}

    try {
      const parsed = JSON.parse(decodeURIComponent(rawValue))
      return parsed && typeof parsed === "object" ? parsed : {}
    } catch (_) {
      return {}
    }
  }

  writeWindowLayoutCookie(value) {
    const encoded = encodeURIComponent(JSON.stringify(value))
    const oneYearInSeconds = 60 * 60 * 24 * 365
    document.cookie =
      `${this.constructor.WINDOW_LAYOUT_COOKIE}=${encoded}; path=/; max-age=${oneYearInSeconds}; samesite=lax`
  }

  bringWindowToFront(windowEl) {
    this.windowZCounter += 1
    windowEl.style.zIndex = String(this.windowZCounter)
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
    button.dataset.shortcutKind = shortcut.kind || "record"

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

  removeShortcutById(shortcutId) {
    const normalizedId = String(shortcutId)
    this.shortcutsValue = this.shortcutsValue.filter((shortcut) => {
      if (shortcut.kind !== "record") return true
      return String(shortcut.id) !== normalizedId
    })

    if (this.selectedShortcutId === normalizedId) {
      this.selectedShortcutId = null
    }

    this.render()
  }

  applySelectionState() {
    this.element.querySelectorAll(".ig-shortcut").forEach((button) => {
      const isSelected = button.dataset.shortcutId === this.selectedShortcutId
      button.setAttribute("aria-pressed", String(isSelected))

      if (isSelected) {
        button.style.outline = "2px solid #78C9F1"
        button.style.outlineOffset = "-2px"
      } else {
        button.style.outline = "none"
      }
    })
  }
}
