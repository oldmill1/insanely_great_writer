import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menu"]
  static values = {
    loginPath: String,
    registerPath: String,
    logoutPath: String
  }

  open(event) {
    event.preventDefault()
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
        break
      case "register":
        if (this.hasRegisterPathValue) window.location.assign(this.registerPathValue)
        break
      case "logout":
        if (this.hasLogoutPathValue) this.submitLogoutForm()
        break
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
