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
    createSidebarShortcutPath: String,
    deleteSidebarShortcutPathTemplate: String,
    renameFolderPathTemplate: String,
    renameDocumentPathTemplate: String,
    deleteFolderPathTemplate: String,
    deleteDocumentPathTemplate: String,
    showPath: String
  }

  static targets = [
    "list",
    "row",
    "sortButton",
    "upButton",
    "backButton",
    "deleteButton",
    "contextMenu",
    "sidebarContextMenu",
    "sidebarGroup",
    "shortcutDropzone",
    "temporaryShortcuts"
  ]

  connect() {
    this.sortKey = "kind"
    this.sortDirection = "asc"
    this.selectedRow = null
    this.editingRow = null
    this.renameInput = null
    this.renameTextElement = null
    this.selectedSidebarShortcut = null
    this.dragThreshold = 6
    this.dragState = null
    this.dragPreview = null
    this.consumeNextRowActivation = false
    this.applySort()
    this.updateNavButtons()
    this.updateDeleteButton()
    this.hideContextMenu()
  }

  disconnect() {
    this.cleanupDragState()
  }

  async createFolder() {
    await this.createItem(this.createFolderPathValue)
  }

  async createDocument() {
    await this.createItem(this.createDocumentPathValue)
  }

  selectRow(event) {
    if (event.target.closest(".folder-window__name-input")) return
    if (this.consumeRowActivation()) return

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
    this.hideSidebarContextMenu()
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
    const clickedInsideRowMenu = this.hasContextMenuTarget && !this.contextMenuTarget.hidden && this.contextMenuTarget.contains(event.target)
    const clickedInsideSidebarMenu = this.hasSidebarContextMenuTarget && !this.sidebarContextMenuTarget.hidden && this.sidebarContextMenuTarget.contains(event.target)
    if (clickedInsideRowMenu || clickedInsideSidebarMenu) return

    this.hideContextMenu()
    this.hideSidebarContextMenu()
  }

  closeContextMenuWithEscape() {
    this.hideContextMenu()
    this.hideSidebarContextMenu()
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

  openSidebarShortcutContextMenu(event) {
    event.preventDefault()

    const shortcut = event.currentTarget
    if (!shortcut?.dataset.userSidebarShortcutId) return
    if (!this.hasSidebarContextMenuTarget) return

    this.hideContextMenu()
    this.selectedSidebarShortcut = shortcut
    this.showMenuAtPointer(this.sidebarContextMenuTarget, event.clientX, event.clientY)
  }

  async handleSidebarContextMenuClick(event) {
    const button = event.target.closest("[data-intent]")
    if (!button || !this.hasSidebarContextMenuTarget || !this.sidebarContextMenuTarget.contains(button)) return

    if (button.dataset.intent === "remove_sidebar_shortcut") {
      await this.removeSelectedSidebarShortcut()
    }
  }

  openItem(event) {
    if (this.editingRow === event.currentTarget) return
    if (this.consumeRowActivation()) return

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

  toggleSidebarGroup(event) {
    const trigger = event.currentTarget
    const group = trigger.closest(".folder-window__sidebar-group")
    if (!group) return

    const isCollapsed = group.classList.toggle("is-collapsed")
    trigger.setAttribute("aria-expanded", String(!isCollapsed))
  }

  navigateSidebarItem(event) {
    this.hideContextMenu()
    this.clearSelection()

    const item = event.currentTarget
    const itemKind = item.dataset.itemKind

    if (itemKind === "document") {
      this.openDocumentShortcut(item)
      return
    }

    const { folderId, folderName, folderPath, showPath } = item.dataset
    if (!showPath) return
    if ((itemKind === "desktop" && folderPath === this.folderPathValue) || String(this.folderIdValue) === String(folderId)) return

    this.pushCurrentLocationToHistory()
    this.navigateWithinWindow({
      folderId: folderId || null,
      folderName: folderName || "Root",
      showPath
    })
  }

  startRowDrag(event) {
    if (event.button !== 0) return
    if (event.target.closest(".folder-window__name-input")) return
    if (this.editingRow) return

    const row = event.currentTarget
    if (!row) return

    this.dragState = {
      pointerId: event.pointerId,
      row,
      startX: event.clientX,
      startY: event.clientY,
      activated: false,
      overDropzone: false,
      payload: this.dragPayloadForRow(row)
    }

    if (row.setPointerCapture) {
      row.setPointerCapture(event.pointerId)
    }
  }

  moveDrag(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) return

    const deltaX = event.clientX - this.dragState.startX
    const deltaY = event.clientY - this.dragState.startY
    const movedEnough = Math.abs(deltaX) >= this.dragThreshold || Math.abs(deltaY) >= this.dragThreshold
    if (!this.dragState.activated && !movedEnough) return

    if (!this.dragState.activated) {
      this.activateRowDrag()
    }

    this.positionDragPreview(event.clientX, event.clientY)
    this.updateDropzoneState(event.clientX, event.clientY)
    event.preventDefault()
  }

  endDrag(event) {
    if (!this.dragState || event.pointerId !== this.dragState.pointerId) return

    const { row, activated, payload } = this.dragState
    const droppedOnShortcutArea = activated && this.pointIsInsideShortcutDropzone(event.clientX, event.clientY)

    if (row?.hasPointerCapture?.(event.pointerId)) {
      row.releasePointerCapture(event.pointerId)
    }

    this.cleanupDragState()

    if (!activated) return

    this.consumeNextRowActivation = true
    window.setTimeout(() => {
      this.consumeNextRowActivation = false
    }, 0)

    if (!droppedOnShortcutArea) return

    void this.createSidebarShortcut(payload)
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

  async removeSelectedSidebarShortcut() {
    const shortcut = this.selectedSidebarShortcut
    const shortcutId = shortcut?.dataset.userSidebarShortcutId
    const path = this.sidebarShortcutDeletePath(shortcutId)
    if (!shortcut || !path) return

    const response = await fetch(path, {
      method: "DELETE",
      headers: {
        "Accept": "application/json",
        "X-CSRF-Token": this.csrfToken()
      },
      credentials: "same-origin"
    })

    if (!response.ok) return

    this.hideSidebarContextMenu(false)
    shortcut.remove()
    this.selectedSidebarShortcut = null
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

  hideSidebarContextMenu(clearSelection = true) {
    if (this.hasSidebarContextMenuTarget) {
      this.sidebarContextMenuTarget.hidden = true
      this.sidebarContextMenuTarget.style.visibility = "hidden"
    }

    if (clearSelection) {
      this.selectedSidebarShortcut = null
    }
  }

  cancelRename() {
    if (!this.renameInput || !this.renameTextElement) return

    this.renameInput.remove()
    this.renameTextElement.hidden = false
    this.editingRow = null
    this.renameInput = null
    this.renameTextElement = null
  }

  consumeRowActivation() {
    if (!this.consumeNextRowActivation) return false

    this.consumeNextRowActivation = false
    return true
  }

  activateRowDrag() {
    if (!this.dragState) return

    this.dragState.activated = true
    this.dragState.row.classList.add("is-dragging")
    this.dragPreview = this.buildDragPreview(this.dragState.payload)
    if (this.dragPreview) {
      document.body.appendChild(this.dragPreview)
    }
  }

  cleanupDragState() {
    if (this.dragState?.row) {
      this.dragState.row.classList.remove("is-dragging")
    }

    this.dragState = null
    this.setDropzoneReceiving(false)

    if (this.dragPreview) {
      this.dragPreview.remove()
      this.dragPreview = null
    }
  }

  dragPayloadForRow(row) {
    return {
      itemKind: row.dataset.itemKind,
      itemId: row.dataset.itemId,
      label: row.dataset.itemName,
      icon: row.dataset.itemIcon || (row.dataset.itemKind === "folder" ? "/icons/folders/blue.png" : "/icons/write.png")
    }
  }

  buildDragPreview(payload) {
    if (!payload?.label) return null

    const preview = document.createElement("div")
    preview.className = "folder-window__drag-preview"

    const icon = document.createElement("img")
    icon.className = "folder-window__drag-preview-icon"
    icon.src = payload.icon || ""
    icon.alt = ""
    icon.setAttribute("aria-hidden", "true")

    const label = document.createElement("span")
    label.className = "folder-window__drag-preview-label"
    label.textContent = payload.label

    preview.appendChild(icon)
    preview.appendChild(label)
    return preview
  }

  positionDragPreview(clientX, clientY) {
    if (!this.dragPreview) return

    this.dragPreview.style.left = `${Math.round(clientX + 16)}px`
    this.dragPreview.style.top = `${Math.round(clientY + 18)}px`
  }

  updateDropzoneState(clientX, clientY) {
    this.setDropzoneReceiving(this.pointIsInsideShortcutDropzone(clientX, clientY))
  }

  pointIsInsideShortcutDropzone(clientX, clientY) {
    if (!this.hasShortcutDropzoneTarget) return false
    if (!this.shortcutDropzoneTarget.offsetParent && this.shortcutDropzoneTarget !== document.body) return false

    const rect = this.shortcutDropzoneTarget.getBoundingClientRect()
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  }

  setDropzoneReceiving(isReceiving) {
    if (!this.hasShortcutDropzoneTarget) return

    this.shortcutDropzoneTarget.classList.toggle("is-receiving-drop", isReceiving)
  }

  async createSidebarShortcut(payload) {
    if (!payload?.itemKind || !payload?.itemId || !payload?.label) return
    if (this.sidebarShortcutExists(payload.itemKind, payload.itemId)) return

    if (!this.hasCreateSidebarShortcutPathValue) return

    const response = await fetch(this.createSidebarShortcutPathValue, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrfToken()
      },
      credentials: "same-origin",
      body: JSON.stringify({
        item_kind: payload.itemKind,
        item_id: payload.itemId
      })
    })

    if (!response.ok) return

    const responsePayload = await response.json()
    const shortcut = responsePayload?.shortcut
    if (!shortcut || this.sidebarShortcutExists(shortcut.item_kind, shortcut.item_id)) return
    if (!this.hasTemporaryShortcutsTarget) return

    this.temporaryShortcutsTarget.appendChild(this.buildSidebarShortcutButton(shortcut))
  }

  buildSidebarShortcutButton(shortcut) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "folder-window__sidebar-item"
    button.dataset.action = "folder-browser#navigateSidebarItem contextmenu->folder-browser#openSidebarShortcutContextMenu"
    button.dataset.sidebarItemKind = "persisted"
    button.dataset.userSidebarShortcutId = String(shortcut.id)
    button.dataset.itemKind = shortcut.item_kind
    button.dataset.itemId = String(shortcut.item_id)
    button.dataset.folderId = shortcut.item_kind === "folder" ? String(shortcut.item_id) : ""
    button.dataset.folderName = shortcut.label
    button.dataset.showPath = shortcut.show_path || ""

    const icon = document.createElement("img")
    icon.className = "folder-window__sidebar-icon"
    icon.src = shortcut.thumbnail || ""
    icon.alt = ""
    icon.setAttribute("aria-hidden", "true")

    const label = document.createElement("span")
    label.textContent = shortcut.label

    button.appendChild(icon)
    button.appendChild(label)
    return button
  }

  sidebarShortcutExists(itemKind, itemId) {
    return this.element.querySelector(
      `.folder-window__sidebar-item[data-item-kind="${itemKind}"][data-item-id="${itemId}"]`
    )
  }

  openDocumentShortcut(item) {
    const itemId = item.dataset.itemId
    if (!itemId) return

    const label = item.querySelector("span")?.textContent?.trim() || item.dataset.folderName || "Item"
    this.desktopController()?.openDocumentWindow(itemId, label)
  }

  sidebarShortcutDeletePath(shortcutId) {
    if (!shortcutId || !this.hasDeleteSidebarShortcutPathTemplateValue) return null

    return this.deleteSidebarShortcutPathTemplateValue.replace("__ID__", encodeURIComponent(shortcutId))
  }

  showMenuAtPointer(menu, clientX, clientY) {
    menu.hidden = false
    menu.style.visibility = "hidden"
    menu.style.left = `${clientX}px`
    menu.style.top = `${clientY}px`

    const rect = menu.getBoundingClientRect()
    const margin = 8
    const maxLeft = window.innerWidth - rect.width - margin
    const maxTop = window.innerHeight - rect.height - margin
    const left = Math.max(margin, Math.min(clientX, maxLeft))
    const top = Math.max(margin, Math.min(clientY, maxTop))

    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
    menu.style.visibility = "visible"
  }
}
