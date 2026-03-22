import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    folderId: Number,
    folderName: String,
    folderPath: String,
    createFolderPath: String,
    createDocumentPath: String,
    showPath: String
  }

  static targets = ["list", "row", "sortButton"]

  connect() {
    this.sortKey = "kind"
    this.sortDirection = "asc"
    this.applySort()
  }

  async createFolder() {
    await this.createItem(this.createFolderPathValue)
  }

  async createDocument() {
    await this.createItem(this.createDocumentPathValue)
  }

  openItem(event) {
    const row = event.currentTarget
    const itemKind = row.dataset.itemKind
    const itemId = row.dataset.itemId
    const itemName = row.dataset.itemName
    if (!itemKind || !itemId) return

    const desktopController = this.desktopController()
    if (!desktopController) return

    if (itemKind === "folder") {
      desktopController.openFolderWindow(itemId, itemName)
      return
    }

    desktopController.openDocumentWindow(itemId, itemName)
  }

  sortBy(event) {
    const nextKey = event.currentTarget.dataset.sortKey
    if (!nextKey) return

    if (this.sortKey === nextKey) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc"
    } else {
      this.sortKey = nextKey
      this.sortDirection = nextKey === "kind" ? "asc" : "asc"
    }

    this.applySort()
  }

  async createItem(path) {
    if (!path) return

    const csrfToken = document.querySelector("meta[name='csrf-token']")?.content

    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken
      },
      credentials: "same-origin",
      body: JSON.stringify({ parent_path: this.folderPathValue })
    })

    if (!response.ok) return

    this.refreshFrame()
  }

  refreshFrame() {
    const frame = this.element.closest("turbo-frame")
    if (!frame) return

    frame.src = `${this.showPathValue}?frame_id=${encodeURIComponent(frame.id)}&refresh=${Date.now()}`
  }

  applySort() {
    if (!this.hasListTarget || !this.hasRowTarget) {
      this.updateSortButtons()
      return
    }

    const rows = [...this.rowTargets]
    const direction = this.sortDirection === "desc" ? -1 : 1

    rows.sort((left, right) => {
      const result = this.compareRows(left, right, this.sortKey)
      if (result !== 0) return result * direction

      const kindFallback = this.compareRows(left, right, "kind")
      if (kindFallback !== 0) return kindFallback

      return this.compareRows(left, right, "name")
    })

    rows.forEach((row) => this.listTarget.appendChild(row))
    this.updateSortButtons()
  }

  compareRows(left, right, key) {
    switch (key) {
      case "kind":
        return this.numericValue(left, "sortKind") - this.numericValue(right, "sortKind")
      case "created":
        return this.timeValue(left, "sortCreated") - this.timeValue(right, "sortCreated")
      case "modified":
        return this.timeValue(left, "sortModified") - this.timeValue(right, "sortModified")
      case "name":
      default:
        return this.stringValue(left, "sortName").localeCompare(this.stringValue(right, "sortName"))
    }
  }

  updateSortButtons() {
    if (!this.hasSortButtonTarget) return

    this.sortButtonTargets.forEach((button) => {
      const isActive = button.dataset.sortKey === this.sortKey
      button.classList.toggle("is-active", isActive)
      button.setAttribute(
        "aria-sort",
        isActive ? (this.sortDirection === "asc" ? "ascending" : "descending") : "none"
      )
    })
  }

  stringValue(row, key) {
    return (row.dataset[key] || "").toLowerCase()
  }

  numericValue(row, key) {
    return Number(row.dataset[key] || 0)
  }

  timeValue(row, key) {
    const value = row.dataset[key]
    const time = value ? Date.parse(value) : 0
    return Number.isNaN(time) ? 0 : time
  }

  desktopController() {
    const desktopElement = document.querySelector("[data-controller~='desktop']")
    if (!desktopElement) return null

    return this.application.getControllerForElementAndIdentifier(desktopElement, "desktop")
  }
}
