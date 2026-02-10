import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu"]
  static values = {
    loginPath: String,
    registerPath: String,
    logoutPath: String
  }

  connect() {
    this.defaultMenuMarkup = this.hasMenuTarget ? this.menuTarget.innerHTML : ""
    this.selectedRecordShortcutId = null
  }

  open(event) {
    event.preventDefault()
    const shouldOpen = this.renderMenuForTarget(event.target)
    if (!shouldOpen) {
      this.hide()
      return
    }

    this.showAt(event.clientX, event.clientY)
  }

  close(event) {
    if (!this.isOpen()) return
    if (event && this.menuTarget.contains(event.target)) return

    this.hide()
  }

  closeWithEscape(event) {
    if (event.key === "Escape") {
      this.hide()
    }
  }

  handleMenuClick(event) {
    const button = event.target.closest("[data-intent]")
    if (!button || !this.menuTarget.contains(button)) return

    const intent = button.dataset.intent
    if (!intent) return

    switch (intent) {
      case "login":
        if (this.hasLoginPathValue) window.location.assign(this.loginPathValue)
        this.hide()
        return
      case "register":
        if (this.hasRegisterPathValue) window.location.assign(this.registerPathValue)
        this.hide()
        return
      case "logout":
        if (this.hasLogoutPathValue) this.submitLogoutForm()
        this.hide()
        return
      case "delete":
        this.deleteSelectedRecordShortcut()
        return
      default:
        break
    }

    this.hide()
  }

  hide() {
    if (!this.hasMenuTarget) return
    this.menuTarget.hidden = true
  }

  isOpen() {
    return this.hasMenuTarget && !this.menuTarget.hidden
  }

  showAt(x, y) {
    if (!this.hasMenuTarget) return

    this.menuTarget.hidden = false
    this.menuTarget.style.visibility = "hidden"
    this.menuTarget.style.left = `${x}px`
    this.menuTarget.style.top = `${y}px`

    const rect = this.menuTarget.getBoundingClientRect()
    const margin = 8
    const maxLeft = window.innerWidth - rect.width - margin
    const maxTop = window.innerHeight - rect.height - margin
    const left = Math.max(margin, Math.min(x, maxLeft))
    const top = Math.max(margin, Math.min(y, maxTop))

    this.menuTarget.style.left = `${left}px`
    this.menuTarget.style.top = `${top}px`
    this.menuTarget.style.visibility = "visible"
  }

  renderMenuForTarget(target) {
    if (!this.hasMenuTarget) return false

    const shortcutButton = target?.closest?.(".ig-shortcut")
    if (shortcutButton && this.element.contains(shortcutButton)) {
      if (shortcutButton.dataset.shortcutKind !== "record") {
        this.selectedRecordShortcutId = null
        return false
      }

      this.selectShortcut(shortcutButton)
      this.menuTarget.innerHTML = this.shortcutMenuMarkup()
      this.selectedRecordShortcutId = shortcutButton.dataset.shortcutId || null
      return true
    }

    this.selectedRecordShortcutId = null
    this.menuTarget.innerHTML = this.defaultMenuMarkup
    return true
  }

  selectShortcut(shortcutButton) {
    const desktopElement = this.element.querySelector("[data-controller~='desktop']")
    if (!desktopElement) return

    const desktopController = this.application.getControllerForElementAndIdentifier(
      desktopElement,
      "desktop"
    )
    if (!desktopController?.selectByButton) return

    desktopController.selectByButton(shortcutButton)
  }

  shortcutMenuMarkup() {
    return `
      <div class="ig-menu" role="menu" aria-orientation="vertical">
        <button type="button" role="menuitem" class="ig-menu__item" data-intent="edit_name" data-kind="action" data-payload="">Edit Name</button>
        <button type="button" role="menuitem" class="ig-menu__item" data-intent="view" data-kind="action" data-payload="">View</button>
        <div class="ig-menu__separator" role="separator" aria-hidden="true"></div>
        <button type="button" role="menuitem" class="ig-menu__item" data-intent="delete" data-kind="action" data-payload="">Delete</button>
      </div>
    `
  }

  async deleteSelectedRecordShortcut() {
    if (!this.selectedRecordShortcutId) {
      this.hide()
      return
    }

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    try {
      const response = await fetch(`/shortcuts/${this.selectedRecordShortcutId}/delete_document`, {
        method: "PATCH",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken
        },
        credentials: "same-origin"
      })

      if (!response.ok) return

      const contentType = response.headers.get("content-type") || ""
      if (!contentType.includes("application/json")) return

      const payload = await response.json()
      if (payload?.is_deleted !== true) return

      this.removeShortcutFromDesktop(this.selectedRecordShortcutId)
    } finally {
      this.hide()
    }
  }

  removeShortcutFromDesktop(shortcutId) {
    const desktopElement = this.element.querySelector("[data-controller~='desktop']")
    if (!desktopElement) return

    const desktopController = this.application.getControllerForElementAndIdentifier(
      desktopElement,
      "desktop"
    )
    if (!desktopController?.removeShortcutById) return

    desktopController.removeShortcutById(shortcutId)
  }

  submitLogoutForm() {
    const form = document.createElement("form")
    form.method = "post"
    form.action = this.logoutPathValue
    form.style.display = "none"

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    if (csrfToken) {
      const tokenInput = document.createElement("input")
      tokenInput.type = "hidden"
      tokenInput.name = "authenticity_token"
      tokenInput.value = csrfToken
      form.append(tokenInput)
    }

    const methodInput = document.createElement("input")
    methodInput.type = "hidden"
    methodInput.name = "_method"
    methodInput.value = "delete"
    form.append(methodInput)

    document.body.append(form)
    form.submit()
  }
}
