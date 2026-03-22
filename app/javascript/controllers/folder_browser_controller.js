import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = {
    folderId: Number,
    folderName: String,
    folderPath: String,
    parentFolderId: Number,
    parentFolderName: String,
    parentFolderPath: String,
    parentShowPath: String,
    createFolderPath: String,
    createDocumentPath: String,
    deleteFolderPathTemplate: String,
    deleteDocumentPathTemplate: String,
    showPath: String
  }

  static targets = ["list", "row", "sortButton", "upButton", "backButton", "deleteButton"]

  connect() {
    this.sortKey = "kind"
    this.sortDirection = "asc"
    this.selectedRow = null
    this.applySort()
    this.updateNavButtons()
    this.updateDeleteButton()
  }

  async createFolder() {
    await this.createItem(this.createFolderPathValue)
  }

  async createDocument() {
    await this.createItem(this.createDocumentPathValue)
  }

  selectRow(event) {
    const row = event.currentTarget
    if (!row) return

    if (this.selectedRow && this.selectedRow !== row) {
      this.selectedRow.classList.remove("is-selected")
      this.selectedRow.setAttribute("aria-selected", "false")
    }

    this.selectedRow = row
    this.selectedRow.classList.add("is-selected")
    this.selectedRow.setAttribute("aria-selected", "true")
    this.updateDeleteButton()
  }

  openItem(event) {
    const row = event.currentTarget
    const itemKind = row.dataset.itemKind
    const itemId = row.dataset.itemId
    const itemName = row.dataset.itemName
    if (!itemKind || !itemId) return

    if (itemKind === "folder") {
      this.navigateToFolder(itemId, itemName)
      return
    }

    const desktopController = this.desktopController()
    if (!desktopController) return

    desktopController.openDocumentWindow(itemId, itemName)
  }

  goUp() {
    if (!this.hasParentShowPathValue || !this.parentShowPathValue) return

    this.pushCurrentLocationToHistory()
    this.navigateWithinWindow({
      folderId: this.hasParentFolderIdValue ? this.parentFolderIdValue : null,
      folderName: this.parentFolderNameValue || "Root",
      showPath: this.parentShowPathValue
    })
  }

  goBack() {
    const windowEl = this.currentWindow()
    if (!windowEl) return

    const history = this.readHistory(windowEl)
    const previous = history.pop()
    this.writeHistory(windowEl, history)
    this.updateNavButtons()
    if (!previous) return

    this.navigateWithinWindow(previous)
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

    this.clearSelection()
    this.refreshFrame()
  }

  async deleteSelectedItem() {
    if (!this.selectedRow) return

    const itemId = this.selectedRow.dataset.itemId
    const itemKind = this.selectedRow.dataset.itemKind
    const path = this.deletePathFor(itemKind, itemId)
    if (!path) return

    const response = await fetch(path, {
      method: "PATCH",
      headers: {
        "Accept": "application/json",
        "X-CSRF-Token": this.csrfToken()
      },
      credentials: "same-origin"
    })

    if (!response.ok) return

    this.clearSelection()
    this.refreshFrame()
  }

  refreshFrame() {
    const frame = this.element.closest("turbo-frame")
    if (!frame) return

    frame.src = `${this.showPathValue}?frame_id=${encodeURIComponent(frame.id)}&refresh=${Date.now()}`
  }

  navigateToFolder(folderId, folderName) {
    this.pushCurrentLocationToHistory()
    this.navigateWithinWindow({
      folderId,
      folderName,
      showPath: `/folders/${folderId}`
    })
  }

  applySort() {
    if (!this.hasListTarget || !this.hasRowTarget) {
      this.updateSortButtons()
      this.updateDeleteButton()
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
    this.syncSelectionState()
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

  clearSelection() {
    if (this.selectedRow) {
      this.selectedRow.classList.remove("is-selected")
      this.selectedRow.setAttribute("aria-selected", "false")
    }

    this.selectedRow = null
    this.updateDeleteButton()
  }

  syncSelectionState() {
    if (!this.selectedRow || !this.hasRowTarget) {
      this.updateDeleteButton()
      return
    }

    const selectedItemId = this.selectedRow.dataset.itemId
    const selectedItemKind = this.selectedRow.dataset.itemKind
    const nextSelectedRow = this.rowTargets.find((row) => (
      row.dataset.itemId === selectedItemId && row.dataset.itemKind === selectedItemKind
    ))

    if (!nextSelectedRow) {
      this.clearSelection()
      return
    }

    this.selectedRow = nextSelectedRow
    this.selectedRow.classList.add("is-selected")
    this.selectedRow.setAttribute("aria-selected", "true")
    this.updateDeleteButton()
  }

  updateDeleteButton() {
    if (!this.hasDeleteButtonTarget) return

    this.deleteButtonTarget.hidden = !this.selectedRow
    this.deleteButtonTarget.disabled = !this.selectedRow
  }

  deletePathFor(itemKind, itemId) {
    if (!itemKind || !itemId) return null

    if (itemKind === "folder" && this.hasDeleteFolderPathTemplateValue) {
      return this.deleteFolderPathTemplateValue.replace("__ID__", encodeURIComponent(itemId))
    }

    if (itemKind === "document" && this.hasDeleteDocumentPathTemplateValue) {
      return this.deleteDocumentPathTemplateValue.replace("__ID__", encodeURIComponent(itemId))
    }

    return null
  }

  csrfToken() {
    return document.querySelector("meta[name='csrf-token']")?.content
  }

  desktopController() {
    const desktopElement = document.querySelector("[data-controller~='desktop']")
    if (!desktopElement) return null

    return this.application.getControllerForElementAndIdentifier(desktopElement, "desktop")
  }

  navigateWithinWindow({ folderId, folderName, showPath }) {
    const frame = this.element.closest("turbo-frame")
    if (!frame || !showPath) return

    const windowEl = this.currentWindow()
    if (windowEl) {
      const title = windowEl.querySelector(".ig-window__title")
      if (title) title.textContent = folderName

      windowEl.setAttribute("aria-label", folderName)
      windowEl.dataset.desktopWindowKey = folderId ? `folder_window_${folderId}` : "folder_window_root"
    }

    frame.src = `${showPath}?frame_id=${encodeURIComponent(frame.id)}&refresh=${Date.now()}`
  }

  pushCurrentLocationToHistory() {
    const windowEl = this.currentWindow()
    if (!windowEl || !this.showPathValue) return

    const history = this.readHistory(windowEl)
    history.push({
      folderId: this.hasFolderIdValue ? this.folderIdValue : null,
      folderName: this.folderNameValue || "Root",
      folderPath: this.folderPathValue || "root",
      showPath: this.showPathValue
    })
    this.writeHistory(windowEl, history)
    this.updateNavButtons()
  }

  currentWindow() {
    return this.element.closest(".home__window")
  }

  readHistory(windowEl) {
    try {
      const raw = windowEl.dataset.folderBackHistory || "[]"
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  writeHistory(windowEl, history) {
    windowEl.dataset.folderBackHistory = JSON.stringify(history)
  }

  updateNavButtons() {
    const windowEl = this.currentWindow()
    const history = windowEl ? this.readHistory(windowEl) : []

    if (this.hasUpButtonTarget) {
      const canGoUp = this.hasParentShowPathValue && Boolean(this.parentShowPathValue)
      this.upButtonTarget.disabled = !canGoUp
    }

    if (this.hasBackButtonTarget) {
      this.backButtonTarget.disabled = history.length === 0
    }
  }
}
