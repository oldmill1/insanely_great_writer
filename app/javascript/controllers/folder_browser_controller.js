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
    renameFolderPathTemplate: String,
    renameDocumentPathTemplate: String,
    deleteFolderPathTemplate: String,
    deleteDocumentPathTemplate: String,
    showPath: String
  }

  static targets = ["list", "row", "sortButton", "upButton", "backButton", "deleteButton", "contextMenu"]

  connect() {
    this.sortKey = "kind"
    this.sortDirection = "asc"
    this.selectedRow = null
    this.editingRow = null
    this.renameInput = null
    this.renameTextElement = null
    this.applySort()
    this.updateNavButtons()
    this.updateDeleteButton()
    this.hideContextMenu()
  }

  async createFolder() {
    await this.createItem(this.createFolderPathValue)
  }

  async createDocument() {
    await this.createItem(this.createDocumentPathValue)
  }

  selectRow(event) {
    if (event.target.closest(".folder-window__name-input")) return

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

  clearSelectionFromPane(event) {
    this.hideContextMenu()
    if (event.target.closest(".folder-window__name-input")) return
    if (event.target.closest(".folder-window__row")) return

    this.clearSelection()
  }

  openRowContextMenu(event) {
    event.preventDefault()
    this.selectRow(event)

    if (!this.hasContextMenuTarget) return

    this.contextMenuTarget.hidden = false
    this.contextMenuTarget.style.visibility = "hidden"
    this.contextMenuTarget.style.left = `${event.clientX}px`
    this.contextMenuTarget.style.top = `${event.clientY}px`

    const rect = this.contextMenuTarget.getBoundingClientRect()
    const margin = 8
    const maxLeft = window.innerWidth - rect.width - margin
    const maxTop = window.innerHeight - rect.height - margin
    const left = Math.max(margin, Math.min(event.clientX, maxLeft))
    const top = Math.max(margin, Math.min(event.clientY, maxTop))

    this.contextMenuTarget.style.left = `${left}px`
    this.contextMenuTarget.style.top = `${top}px`
    this.contextMenuTarget.style.visibility = "visible"
  }

  closeContextMenuOnWindowPointerDown(event) {
    if (!this.hasContextMenuTarget || this.contextMenuTarget.hidden) return
    if (this.contextMenuTarget.contains(event.target)) return

    this.hideContextMenu()
  }

  closeContextMenuWithEscape() {
    this.hideContextMenu()
  }

  async handleContextMenuClick(event) {
    const button = event.target.closest("[data-intent]")
    if (!button || !this.hasContextMenuTarget || !this.contextMenuTarget.contains(button)) return

    if (button.dataset.intent === "rename") {
      this.hideContextMenu()
      this.startRenameSelectedItem()
      return
    }

    if (button.dataset.intent === "delete") {
      this.hideContextMenu()
      await this.deleteSelectedItem()
    }
  }

  openItem(event) {
    if (this.editingRow === event.currentTarget) return

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

  navigateToBreadcrumb(event) {
    if (event.type === "keydown") {
      const isActivationKey = event.key === "Enter" || event.key === " "
      if (!isActivationKey) return
      event.preventDefault()
    }

    const { folderId, folderName, folderPath, showPath } = event.currentTarget.dataset
    if (!showPath || folderPath === this.folderPathValue) return

    this.pushCurrentLocationToHistory()
    this.navigateWithinWindow({
      folderId: folderId || null,
      folderName: folderName || "Root",
      showPath
    })
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
    this.cancelRename()
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

    this.hideContextMenu()
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

  startRenameSelectedItem() {
    if (!this.selectedRow) return

    if (this.editingRow && this.editingRow !== this.selectedRow) {
      this.cancelRename()
    }

    if (this.editingRow === this.selectedRow && this.renameInput) {
      this.renameInput.focus()
      this.renameInput.select()
      return
    }

    const nameText = this.selectedRow.querySelector(".folder-window__name-text")
    if (!nameText) return

    const input = document.createElement("input")
    input.type = "text"
    input.className = "folder-window__name-input"
    input.value = this.selectedRow.dataset.itemName || nameText.textContent.trim()
    input.setAttribute("aria-label", `Rename ${this.selectedRow.dataset.itemKind || "item"}`)

    input.addEventListener("click", (event) => event.stopPropagation())
    input.addEventListener("dblclick", (event) => event.stopPropagation())
    input.addEventListener("pointerdown", (event) => event.stopPropagation())
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault()
        this.submitRename()
        return
      }

      if (event.key === "Escape") {
        event.preventDefault()
        this.cancelRename()
      }
    })
    input.addEventListener("blur", () => {
      if (this.renameInput === input) this.cancelRename()
    })

    nameText.hidden = true
    nameText.insertAdjacentElement("afterend", input)

    this.editingRow = this.selectedRow
    this.renameInput = input
    this.renameTextElement = nameText
    input.focus()
    input.select()
  }

  async submitRename() {
    if (!this.editingRow || !this.renameInput || !this.renameTextElement) return

    const nextName = this.renameInput.value.trim()
    const currentName = this.editingRow.dataset.itemName || this.renameTextElement.textContent.trim()
    if (!nextName || nextName === currentName) {
      this.cancelRename()
      return
    }

    const itemKind = this.editingRow.dataset.itemKind
    const itemId = this.editingRow.dataset.itemId
    const path = this.renamePathFor(itemKind, itemId)
    if (!path) {
      this.cancelRename()
      return
    }

    const payloadKey = itemKind === "folder" ? "folder" : "document"
    const payloadNameKey = itemKind === "folder" ? "name" : "title"

    const response = await fetch(path, {
      method: "PATCH",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrfToken()
      },
      credentials: "same-origin",
      body: JSON.stringify({
        [payloadKey]: {
          [payloadNameKey]: nextName
        }
      })
    })

    if (!response.ok) {
      this.renameInput.focus()
      this.renameInput.select()
      return
    }

    const payload = await response.json()
    const savedName = itemKind === "folder"
      ? payload?.folder?.name
      : payload?.document?.title

    this.applyRenameToRow(this.editingRow, savedName || nextName)
    this.cancelRename()
    this.applySort()
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
    this.hideContextMenu()
    this.cancelRename()
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

  renamePathFor(itemKind, itemId) {
    if (!itemKind || !itemId) return null

    if (itemKind === "folder" && this.hasRenameFolderPathTemplateValue) {
      return this.renameFolderPathTemplateValue.replace("__ID__", encodeURIComponent(itemId))
    }

    if (itemKind === "document" && this.hasRenameDocumentPathTemplateValue) {
      return this.renameDocumentPathTemplateValue.replace("__ID__", encodeURIComponent(itemId))
    }

    return null
  }

  applyRenameToRow(row, nextName) {
    if (!row || !nextName) return

    row.dataset.itemName = nextName
    row.dataset.sortName = nextName.toLowerCase()

    const nameText = row.querySelector(".folder-window__name-text")
    if (nameText) {
      nameText.textContent = nextName
      nameText.title = nextName
    }
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
      windowEl.dataset.windowItemId = folderId ? String(folderId) : ""
      windowEl.dataset.windowTitle = folderName
    }

    frame.src = `${showPath}?frame_id=${encodeURIComponent(frame.id)}&refresh=${Date.now()}`
    this.desktopController()?.persistOpenWindows()
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

  hideContextMenu() {
    if (!this.hasContextMenuTarget) return

    this.contextMenuTarget.hidden = true
    this.contextMenuTarget.style.visibility = "hidden"
  }

  cancelRename() {
    if (!this.renameInput || !this.renameTextElement) return

    this.renameInput.remove()
    this.renameTextElement.hidden = false
    this.editingRow = null
    this.renameInput = null
    this.renameTextElement = null
  }
}
