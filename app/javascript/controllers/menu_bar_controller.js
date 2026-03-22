import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["menus", "dropdowns"]
  static values = {
    contexts: Object,
    defaultContext: String,
    currentContext: String
  }

  connect() {
    this.boundDocumentPointerDown = this.handleDocumentPointerDown.bind(this)
    this.boundWindowKeydown = this.handleWindowKeydown.bind(this)
    this.boundContextChange = this.handleContextChange.bind(this)

    document.addEventListener("pointerdown", this.boundDocumentPointerDown)
    window.addEventListener("keydown", this.boundWindowKeydown)
    window.addEventListener("ig:menu-context", this.boundContextChange)

    this.activeMenuIndex = null
    this.activeSubmenuIndex = null

    const initialContext = this.currentContextValue || this.defaultContextValue || this.availableContexts()[0] || "default"
    this.setContext(initialContext)
  }

  disconnect() {
    document.removeEventListener("pointerdown", this.boundDocumentPointerDown)
    window.removeEventListener("keydown", this.boundWindowKeydown)
    window.removeEventListener("ig:menu-context", this.boundContextChange)
  }

  toggleMenu(event) {
    event.preventDefault()
    event.stopPropagation()

    const menuIndex = Number(event.currentTarget.dataset.menuIndex)
    if (Number.isNaN(menuIndex)) return

    if (this.activeMenuIndex === menuIndex) {
      this.closeMenus()
      return
    }

    this.openMenu(menuIndex)
  }

  hoverMenu(event) {
    if (this.activeMenuIndex == null) return

    const menuIndex = Number(event.currentTarget.dataset.menuIndex)
    if (Number.isNaN(menuIndex) || this.activeMenuIndex === menuIndex) return

    this.openMenu(menuIndex)
  }

  openSubmenu(event) {
    const menuIndex = Number(event.currentTarget.dataset.menuIndex)
    const itemIndex = Number(event.currentTarget.dataset.itemIndex)
    if (Number.isNaN(menuIndex) || Number.isNaN(itemIndex)) return
    if (this.activeMenuIndex !== menuIndex) return
    if (this.activeSubmenuIndex === itemIndex) return

    this.activeSubmenuIndex = itemIndex
    this.render()
  }

  closeSubmenu(event) {
    const itemIndex = Number(event.currentTarget.dataset.itemIndex)
    if (Number.isNaN(itemIndex)) return
    if (this.activeSubmenuIndex !== itemIndex) return

    this.activeSubmenuIndex = null
    this.render()
  }

  activateItem(event) {
    event.preventDefault()
    event.stopPropagation()

    const menuIndex = Number(event.currentTarget.dataset.menuIndex)
    const itemIndex = Number(event.currentTarget.dataset.itemIndex)
    if (Number.isNaN(menuIndex) || Number.isNaN(itemIndex)) return

    const item = this.contextMenuItems()[menuIndex]?.items?.[itemIndex]
    if (!item || item.disabled) return
    if (item.type === "submenu") return

    this.performItem(item)
  }

  activateSubmenuItem(event) {
    event.preventDefault()
    event.stopPropagation()

    const menuIndex = Number(event.currentTarget.dataset.menuIndex)
    const itemIndex = Number(event.currentTarget.dataset.itemIndex)
    const childIndex = Number(event.currentTarget.dataset.childIndex)
    if ([menuIndex, itemIndex, childIndex].some((value) => Number.isNaN(value))) return

    const item = this.contextMenuItems()[menuIndex]?.items?.[itemIndex]?.items?.[childIndex]
    if (!item || item.disabled) return

    this.performItem(item)
  }

  setContext(contextName) {
    const nextContext = this.contextsValue[contextName] ? contextName : (this.defaultContextValue || this.availableContexts()[0])
    this.currentContextValue = nextContext
    this.closeMenus(false)
    this.render()
  }

  handleContextChange(event) {
    const contextName = event.detail?.context
    if (!contextName) return

    this.setContext(contextName)
  }

  performItem(item) {
    if (item.href) {
      window.location.assign(item.href)
      return
    }

    if (item.action) {
      window.dispatchEvent(new CustomEvent("ig:menu-action", {
        detail: {
          action: item.action,
          context: this.currentContextValue,
          item
        }
      }))
    }

    this.closeMenus()
  }

  closeMenus(shouldRender = true) {
    this.activeMenuIndex = null
    this.activeSubmenuIndex = null

    if (shouldRender) {
      this.render()
    }
  }

  handleDocumentPointerDown(event) {
    if (this.element.contains(event.target)) return
    this.closeMenus()
  }

  handleWindowKeydown(event) {
    if (event.key === "Escape") {
      this.closeMenus()
      return
    }

    const menuItem = this.findShortcutMatch(event)
    if (!menuItem) return

    event.preventDefault()
    this.performItem(menuItem)
  }

  availableContexts() {
    return Object.keys(this.contextsValue || {})
  }

  openMenu(menuIndex) {
    this.activeMenuIndex = menuIndex
    this.activeSubmenuIndex = null
    this.render()
  }

  findShortcutMatch(event) {
    const commandPressed = event.metaKey || event.ctrlKey
    if (!commandPressed || event.altKey) return null

    const pressedKey = String(event.key || "").toUpperCase()
    if (!pressedKey) return null

    const queue = []
    this.contextMenuItems().forEach((menu) => {
      ;(menu.items || []).forEach((item) => {
        const normalized = this.normalizeItem(item)
        if (normalized.type === "submenu") {
          ;(normalized.items || []).forEach((child) => queue.push(this.normalizeItem(child, true)))
        } else {
          queue.push(normalized)
        }
      })
    })

    return queue.find((item) => {
      if (!item || item.disabled || item.type === "separator" || item.type === "submenu") return false
      const shortcut = String(item.shortcut || "")
      if (!shortcut.includes("⌘") && !shortcut.toUpperCase().includes("CTRL")) return false

      const normalizedShortcut = shortcut.toUpperCase()
      return normalizedShortcut.endsWith(pressedKey)
    })
  }

  currentContextDefinition() {
    return this.contextsValue?.[this.currentContextValue] || { menus: [] }
  }

  contextMenuItems() {
    return this.currentContextDefinition().menus || []
  }

  render() {
    this.renderMenus()
    this.renderDropdowns()
  }

  renderMenus() {
    const definition = this.currentContextDefinition()
    const menus = definition.menus || []

    this.menusTarget.innerHTML = menus.map((menu, index) => {
      const isOpen = this.activeMenuIndex === index
      return `
        <button
          type="button"
          class="ig-global-menu-bar__menu${isOpen ? " is-open" : ""}"
          data-menu-index="${index}"
          data-action="pointerdown->menu-bar#toggleMenu pointerenter->menu-bar#hoverMenu"
          aria-haspopup="true"
          aria-expanded="${isOpen ? "true" : "false"}"
        >
          <span>${this.escapeHtml(menu.label || "Menu")}</span>
        </button>
      `
    }).join("")
  }

  renderDropdowns() {
    const menus = this.contextMenuItems()
    if (this.activeMenuIndex == null || !menus[this.activeMenuIndex]) {
      this.dropdownsTarget.innerHTML = ""
      return
    }

    const menu = menus[this.activeMenuIndex]
    const dropdown = this.renderDropdown(menu, this.activeMenuIndex)
    this.dropdownsTarget.innerHTML = dropdown
  }

  renderDropdown(menu, menuIndex) {
    const items = Array.isArray(menu.items) ? menu.items : []
    const button = this.menusTarget.querySelector(`[data-menu-index="${menuIndex}"]`)
    const left = button ? Math.max(4, Math.round(button.offsetLeft)) : 4

    return `
      <div class="ig-global-menu-bar__dropdown" role="menu" aria-label="${this.escapeHtml(menu.label || "Menu")}" style="left: ${left}px;">
        ${items.map((item, itemIndex) => this.renderItem(item, menuIndex, itemIndex)).join("")}
      </div>
    `
  }

  renderItem(item, menuIndex, itemIndex) {
    const normalized = this.normalizeItem(item)

    if (normalized.type === "separator") {
      return '<div class="ig-global-menu-bar__separator" role="separator"></div>'
    }

    const disabled = normalized.disabled ? " disabled aria-disabled=\"true\"" : ""
    const classes = ["ig-global-menu-bar__item"]
    if (normalized.type === "submenu") classes.push("ig-global-menu-bar__item--submenu")
    if (normalized.disabled) classes.push("is-disabled")

    const shortcut = normalized.shortcut ? `<span class="ig-global-menu-bar__shortcut">${this.escapeHtml(normalized.shortcut)}</span>` : ""
    const submenuArrow = normalized.type === "submenu" ? '<span class="ig-global-menu-bar__submenu-arrow">▶</span>' : ""
    const submenu = normalized.type === "submenu" && this.activeSubmenuIndex === itemIndex
      ? this.renderSubmenu(normalized, menuIndex, itemIndex)
      : ""

    const rowAction = normalized.type === "submenu"
      ? 'pointerenter->menu-bar#openSubmenu pointerleave->menu-bar#closeSubmenu'
      : ''
    const itemAction = normalized.type === "submenu"
      ? ''
      : 'click->menu-bar#activateItem'

    return `
      <div class="ig-global-menu-bar__item-row${normalized.type === "submenu" ? " has-submenu" : ""}"
        data-menu-index="${menuIndex}"
        data-item-index="${itemIndex}"
        data-action="${rowAction}">
        <button
          type="button"
          class="${classes.join(" ")}"
          role="menuitem"
          data-menu-index="${menuIndex}"
          data-item-index="${itemIndex}"
          data-action="${itemAction}"
          ${disabled}
        >
          <span class="ig-global-menu-bar__item-label">${this.escapeHtml(normalized.label || "")}</span>
          <span class="ig-global-menu-bar__item-meta">${shortcut}${submenuArrow}</span>
        </button>
        ${submenu}
      </div>
    `
  }

  renderSubmenu(item, menuIndex, itemIndex) {
    const children = Array.isArray(item.items) ? item.items.slice(0, 50) : []

    return `
      <div class="ig-global-menu-bar__submenu" role="menu" aria-label="${this.escapeHtml(item.label || "Submenu")}">
        ${children.map((child, childIndex) => this.renderSubmenuItem(child, menuIndex, itemIndex, childIndex)).join("")}
      </div>
    `
  }

  renderSubmenuItem(item, menuIndex, itemIndex, childIndex) {
    const normalized = this.normalizeItem(item, true)

    if (normalized.type === "separator") {
      return '<div class="ig-global-menu-bar__separator" role="separator"></div>'
    }

    const disabled = normalized.disabled ? " disabled aria-disabled=\"true\"" : ""
    const shortcut = normalized.shortcut ? `<span class="ig-global-menu-bar__shortcut">${this.escapeHtml(normalized.shortcut)}</span>` : ""

    return `
      <button
        type="button"
        class="ig-global-menu-bar__item${normalized.disabled ? " is-disabled" : ""}"
        role="menuitem"
        data-menu-index="${menuIndex}"
        data-item-index="${itemIndex}"
        data-child-index="${childIndex}"
        data-action="click->menu-bar#activateSubmenuItem"
        ${disabled}
      >
        <span class="ig-global-menu-bar__item-label">${this.escapeHtml(normalized.label || "")}</span>
        <span class="ig-global-menu-bar__item-meta">${shortcut}</span>
      </button>
    `
  }

  normalizeItem(item, withinSubmenu = false) {
    const normalized = { ...(item || {}) }
    if (normalized.type === "separator") return normalized

    if (withinSubmenu && normalized.type === "submenu") {
      return {
        type: "action",
        label: normalized.label,
        disabled: true,
        shortcut: normalized.shortcut
      }
    }

    if (normalized.type === "submenu") {
      normalized.items = Array.isArray(normalized.items)
        ? normalized.items.map((child) => child?.type === "submenu" ? { ...child, type: "action", disabled: true } : child)
        : []
    }

    return normalized
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }
}
